const { google } = require('googleapis');
const Lead = require('../models/Lead');

class GmailService {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Gmail API client with OAuth2 credentials
   */
  async initialize() {
    try {
      const {
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REDIRECT_URI,
        GMAIL_REFRESH_TOKEN
      } = process.env;

      if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        throw new Error('Gmail API credentials not configured in environment variables');
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REDIRECT_URI
      );

      // Set credentials with refresh token
      this.oauth2Client.setCredentials({
        refresh_token: GMAIL_REFRESH_TOKEN
      });

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.isInitialized = true;

      console.log('✅ Gmail API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gmail API:', error.message);
      throw error;
    }
  }

  /**
   * Ensure Gmail API is initialized before operations
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Parse lead data from email content
   * @param {string} emailBody - Email body text
   * @returns {object} Parsed lead data
   */
  parseLeadFromEmail(emailBody) {
    const lead = {};

    // Extract LEAD Category
    const categoryMatch = emailBody.match(/LEAD Category:\s*([^\n]+)/i);
    if (categoryMatch) {
      lead.leadCategory = categoryMatch[1].trim().replace(/]/g, '');
    }

    // Extract First Name
    const firstNameMatch = emailBody.match(/(?:FIRST NAME|First Name)\s*:\s*([^\n]+)/i);
    if (firstNameMatch) {
      lead.firstName = firstNameMatch[1].trim();
    }

    // Extract Last Name
    const lastNameMatch = emailBody.match(/(?:LAST NAME|Last Name)\s*:\s*([^\n]+)/i);
    if (lastNameMatch) {
      lead.lastName = lastNameMatch[1].trim();
    }

    // Extract Email
    const emailMatch = emailBody.match(/(?:EMAIL|Email Address)\s*:\s*([^\s\n]+)/i);
    if (emailMatch) {
      lead.email = emailMatch[1].trim().toLowerCase();
    }

    // Extract Phone (try to get the full number first, fallback to just number)
    const phoneMatch = emailBody.match(/(?:PHONE|Phone)\s*:\s*(\d+)/i);
    if (phoneMatch) {
      lead.phone = phoneMatch[1].trim();
    }

    // Extract Phone Area Code
    const areaCodeMatch = emailBody.match(/Phone Area Code\s*:\s*(\d+)/i);
    if (areaCodeMatch) {
      lead.phoneAreaCode = areaCodeMatch[1].trim();
    }

    // Extract IP Address
    const ipMatch = emailBody.match(/(?:IP ADDRESS|Applicant's Originating IP Address)\s*:\s*([^\s\n]+)/i);
    if (ipMatch) {
      lead.ipAddress = ipMatch[1].trim();
    }

    // Extract Gender (optional)
    const genderMatch = emailBody.match(/Gender\s*:\s*([^\n]+)/i);
    if (genderMatch && genderMatch[1].trim()) {
      lead.gender = genderMatch[1].trim();
    }

    // Extract Misc fields (optional)
    for (let i = 1; i <= 8; i++) {
      const miscMatch = emailBody.match(new RegExp(`Misc${i}\\s*:\\s*([^\\n]+)`, 'i'));
      if (miscMatch && miscMatch[1].trim()) {
        lead[`misc${i}`] = miscMatch[1].trim();
      }
    }

    return lead;
  }

  /**
   * Get message content from Gmail
   * @param {string} messageId - Gmail message ID
   * @returns {object} Message data with body
   */
  async getMessage(messageId) {
    await this.ensureInitialized();

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      let body = '';

      // Extract body from message parts
      if (message.payload.parts) {
        const textPart = message.payload.parts.find(
          part => part.mimeType === 'text/plain'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      } else if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      }

      return {
        id: message.id,
        threadId: message.threadId,
        subject: this.getHeader(message.payload.headers, 'Subject'),
        from: this.getHeader(message.payload.headers, 'From'),
        date: this.getHeader(message.payload.headers, 'Date'),
        body: body
      };
    } catch (error) {
      console.error(`❌ Error fetching message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get header value from headers array
   * @param {Array} headers - Message headers
   * @param {string} name - Header name
   * @returns {string} Header value
   */
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  /**
   * Import leads from Gmail
   * @param {object} options - Import options
   * @returns {object} Import results
   */
  async importLeads(options = {}) {
    await this.ensureInitialized();

    const {
      labelName = process.env.GMAIL_IMPORT_LABEL || 'Leads',
      fromEmail = process.env.GMAIL_CHECK_FROM_EMAIL || 'register@leadpower.com',
      maxResults = 100
    } = options;

    try {
      console.log(`📧 Starting Gmail lead import from label: ${labelName}`);

      // Build search query
      let query = `from:${fromEmail}`;
      if (labelName) {
        query += ` label:${labelName}`;
      }

      // Search for messages
      const searchResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      const messages = searchResponse.data.messages || [];
      
      if (messages.length === 0) {
        console.log('ℹ️  No new lead emails found');
        return {
          success: true,
          processed: 0,
          imported: 0,
          duplicates: 0,
          errors: 0
        };
      }

      console.log(`📨 Found ${messages.length} messages to process`);

      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      // Process each message
      for (const message of messages) {
        try {
          // Get full message content
          const fullMessage = await this.getMessage(message.id);
          
          // Parse lead data from email body
          const leadData = this.parseLeadFromEmail(fullMessage.body);

          // Validate required fields
          if (!leadData.firstName || !leadData.lastName || !leadData.email || !leadData.phone) {
            console.warn(`⚠️  Skipping message ${message.id}: Missing required fields`);
            errors++;
            continue;
          }

          // Check for duplicate
          const existingLead = await Lead.findDuplicate(leadData.email, leadData.phone);
          
          if (existingLead) {
            console.log(`⏭️  Skipping duplicate lead: ${leadData.email}`);
            duplicates++;
            continue;
          }

          // Create new lead
          const newLead = new Lead({
            ...leadData,
            gmailMessageId: fullMessage.id,
            gmailThreadId: fullMessage.threadId,
            status: 'new',
            importSource: 'gmail',
            importedAt: new Date()
          });

          await newLead.save();
          console.log(`✅ Imported lead: ${newLead.fullName} (${newLead.email})`);
          imported++;

        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error.message);
          errors++;
        }
      }

      const results = {
        success: true,
        processed: messages.length,
        imported,
        duplicates,
        errors
      };

      console.log('📊 Import Summary:', results);
      return results;

    } catch (error) {
      console.error('❌ Gmail import failed:', error.message);
      throw error;
    }
  }

  /**
   * Test Gmail connection
   * @returns {object} Connection test results
   */
  async testConnection() {
    try {
      await this.ensureInitialized();

      // Try to get user profile
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });

      return {
        success: true,
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      console.error('❌ Gmail connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new GmailService();
