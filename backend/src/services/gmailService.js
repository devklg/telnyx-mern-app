const gmailConfig = require('../config/gmail.config');
const logger = require('../utils/logger');

/**
 * Gmail Service for Automated Lead Email Fetching
 *
 * @author James Taylor - Lead Management Developer
 * @purpose Fetch unread lead emails from dedicated Gmail account
 */

class GmailService {
  constructor() {
    this.gmail = null;
    this.leadLabel = process.env.GMAIL_IMPORT_LABEL || 'LEADS';
    this.fromEmail = process.env.GMAIL_CHECK_FROM_EMAIL;
    this.initialized = false;
  }

  /**
   * Initialize Gmail API connection
   */
  async initialize() {
    try {
      if (!gmailConfig.isConfigured()) {
        logger.warn('[Gmail Service] Gmail API not configured. Lead import disabled.');
        return false;
      }

      this.gmail = gmailConfig.getGmailAPI();
      this.initialized = true;
      logger.info('[Gmail Service] Initialized successfully');
      return true;

    } catch (error) {
      logger.error('[Gmail Service] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get unread lead emails from Gmail
   * @returns {Array} Array of email objects with parsed content
   */
  async getUnreadLeadEmails() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return [];
    }

    try {
      // Build query to find unread lead emails
      let query = 'is:unread';

      // Filter by specific sender if configured
      if (this.fromEmail) {
        query += ` from:${this.fromEmail}`;
      }

      // Add label filter if configured
      if (this.leadLabel) {
        query += ` label:${this.leadLabel}`;
      }

      logger.info(`[Gmail Service] Fetching emails with query: ${query}`);

      // List messages matching query
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50 // Process up to 50 emails per run
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
        logger.info('[Gmail Service] No unread lead emails found');
        return [];
      }

      logger.info(`[Gmail Service] Found ${messages.length} unread emails`);

      // Fetch full message content for each email
      const emails = await Promise.all(
        messages.map(msg => this.getEmailContent(msg.id))
      );

      return emails.filter(email => email !== null);

    } catch (error) {
      logger.error('[Gmail Service] Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Get full content of a specific email
   * @param {String} messageId - Gmail message ID
   * @returns {Object} Email object with id, subject, body, from, date
   */
  async getEmailContent(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      // Extract email metadata
      const subject = this.getHeader(headers, 'Subject');
      const from = this.getHeader(headers, 'From');
      const date = this.getHeader(headers, 'Date');

      // Extract email body
      const body = this.extractBody(message.payload);

      return {
        id: messageId,
        subject,
        from,
        date,
        body,
        snippet: message.snippet
      };

    } catch (error) {
      logger.error(`[Gmail Service] Error fetching message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract email body from message payload
   * @param {Object} payload - Message payload
   * @returns {String} Email body text
   */
  extractBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      // Handle multipart messages
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }

      // If no plain text, try HTML
      if (!body) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            // Strip HTML tags (basic)
            body = body.replace(/<[^>]*>/g, '');
            break;
          }
        }
      }
    }

    return body;
  }

  /**
   * Get header value from headers array
   * @param {Array} headers - Message headers
   * @param {String} name - Header name
   * @returns {String} Header value
   */
  getHeader(headers, name) {
    const header = headers.find(h => h.name === name);
    return header ? header.value : '';
  }

  /**
   * Mark emails as read
   * @param {Array} messageIds - Array of message IDs to mark as read
   */
  async markEmailsAsRead(messageIds) {
    if (!this.initialized || messageIds.length === 0) {
      return;
    }

    try {
      await Promise.all(
        messageIds.map(id =>
          this.gmail.users.messages.modify({
            userId: 'me',
            id: id,
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          })
        )
      );

      logger.info(`[Gmail Service] Marked ${messageIds.length} emails as read`);

    } catch (error) {
      logger.error('[Gmail Service] Error marking emails as read:', error);
    }
  }

  /**
   * Apply label to emails
   * @param {Array} messageIds - Array of message IDs
   * @param {String} labelName - Label to apply
   */
  async applyLabel(messageIds, labelName) {
    if (!this.initialized || messageIds.length === 0) {
      return;
    }

    try {
      // Get or create label
      const labels = await this.gmail.users.labels.list({ userId: 'me' });
      let label = labels.data.labels.find(l => l.name === labelName);

      if (!label) {
        const created = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: labelName,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        label = created.data;
      }

      // Apply label to messages
      await Promise.all(
        messageIds.map(id =>
          this.gmail.users.messages.modify({
            userId: 'me',
            id: id,
            requestBody: {
              addLabelIds: [label.id]
            }
          })
        )
      );

      logger.info(`[Gmail Service] Applied label "${labelName}" to ${messageIds.length} emails`);

    } catch (error) {
      logger.error('[Gmail Service] Error applying label:', error);
    }
  }

  /**
   * Test Gmail connection
   * @returns {Object} Connection status and user info
   */
  async testConnection() {
    try {
      await this.initialize();

      if (!this.initialized) {
        return {
          success: false,
          message: 'Gmail API not configured'
        };
      }

      const profile = await this.gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        message: 'Gmail connection successful',
        email: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal
      };

    } catch (error) {
      logger.error('[Gmail Service] Connection test failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new GmailService();
