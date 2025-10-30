const logger = require('../utils/logger');

/**
 * Lead Email Parser
 * Parses simple email format into Sarah Chen's comprehensive Lead schema
 *
 * @author James Taylor - Lead Management Developer
 * @maps Simple email format → Lead Schema (lead.schema.js)
 *
 * EMAIL FORMAT:
 * LEAD Category:   FRESH TELEPHONE INTERVIEWED LEAD
 * FIRST NAME:      Rodney
 * LAST NAME:       Roberson
 * EMAIL:           rdnyroberson@gmail.com
 * PHONE:           3363502553
 * IP ADDRESS:      107.77.249.8
 */

class LeadParser {
  /**
   * Parse lead email body into structured data
   * @param {String} emailBody - Raw email body text
   * @param {Object} emailMetadata - Email metadata (subject, from, date)
   * @returns {Object} Parsed lead data matching Lead schema
   */
  parseLeadEmail(emailBody, emailMetadata = {}) {
    try {
      const lines = emailBody.split('\n').map(line => line.trim());
      const rawData = {};

      // Parse each line for lead data
      for (const line of lines) {
        if (!line.includes(':')) continue;

        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        if (!value) continue;

        const normalizedKey = key.trim().toUpperCase();

        // Map email fields to raw data
        if (normalizedKey.includes('FIRST NAME')) {
          rawData.firstName = this.cleanString(value);
        } else if (normalizedKey.includes('LAST NAME')) {
          rawData.lastName = this.cleanString(value);
        } else if (normalizedKey.includes('EMAIL')) {
          rawData.email = this.cleanEmail(value);
        } else if (normalizedKey.includes('PHONE')) {
          rawData.phone = this.cleanPhone(value);
        } else if (normalizedKey.includes('IP ADDRESS') || normalizedKey.includes('IP')) {
          rawData.ipAddress = this.cleanString(value);
        } else if (normalizedKey.includes('LEAD CATEGORY') || normalizedKey.includes('CATEGORY')) {
          rawData.category = this.parseCategory(value);
        }
      }

      // Validate required fields
      const validation = this.validateParsedData(rawData);
      if (!validation.valid) {
        logger.error('[Lead Parser] Validation failed:', validation.errors);
        return {
          success: false,
          errors: validation.errors,
          rawData
        };
      }

      // Map to Sarah Chen's Lead schema
      const leadData = this.mapToLeadSchema(rawData, emailMetadata);

      return {
        success: true,
        data: leadData,
        rawData
      };

    } catch (error) {
      logger.error('[Lead Parser] Parse error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map parsed raw data to comprehensive Lead schema
   * @param {Object} rawData - Parsed raw data from email
   * @param {Object} emailMetadata - Email metadata
   * @returns {Object} Lead data matching Sarah's schema
   */
  mapToLeadSchema(rawData, emailMetadata) {
    const leadData = {
      // Direct mappings from email
      firstName: rawData.firstName,
      lastName: rawData.lastName,
      email: rawData.email,
      phone: this.formatPhoneE164(rawData.phone), // Convert to E.164 format

      // Company information (not in email - set to empty)
      company: {
        name: null,
        title: null,
        industry: null,
        size: null,
        website: null,
        linkedinUrl: null
      },

      // Lead management
      source: 'other', // Can be 'gmail_import' if we add to enum
      status: 'new',
      priority: this.determinePriority(rawData.category),

      // Qualification data
      qualificationScore: 0,
      qualificationCriteria: {
        budget: false,
        authority: false,
        need: false,
        timeline: false
      },

      // Tags for categorization
      tags: this.buildTags(rawData),

      // Custom fields for extra data
      customFields: {
        category: rawData.category || 'unknown',
        ipAddress: rawData.ipAddress,
        importSource: 'gmail',
        importedFrom: emailMetadata.from,
        importedSubject: emailMetadata.subject,
        importedDate: emailMetadata.date
      },

      // Consent and compliance (default to allowing contact)
      consent: {
        canCall: true,
        canEmail: true,
        canSMS: true,
        recordCalls: true,
        gdprConsent: false,
        consentDate: new Date()
      },

      // Metadata
      metadata: {
        importMethod: 'gmail_automation',
        importedBy: 'james_taylor_gmail_bot',
        emailId: emailMetadata.emailId,
        rawEmailBody: emailMetadata.preserveRaw ? emailMetadata.body : undefined
      },

      // Lifecycle
      isActive: true
    };

    return leadData;
  }

  /**
   * Parse category from email (FRESH TELEPHONE INTERVIEWED LEAD)
   * @param {String} categoryText - Raw category text
   * @returns {String} Normalized category
   */
  parseCategory(categoryText) {
    const normalized = categoryText.toUpperCase();

    if (normalized.includes('FRESH')) {
      return 'fresh';
    } else if (normalized.includes('AGED')) {
      return 'aged';
    } else if (normalized.includes('HOT')) {
      return 'hot';
    } else if (normalized.includes('WARM')) {
      return 'warm';
    } else if (normalized.includes('COLD')) {
      return 'cold';
    }

    return 'unknown';
  }

  /**
   * Determine priority based on category
   * @param {String} category - Lead category
   * @returns {String} Priority level (low, medium, high, urgent)
   */
  determinePriority(category) {
    const priorityMap = {
      hot: 'urgent',
      fresh: 'high',
      warm: 'medium',
      aged: 'low',
      cold: 'low'
    };

    return priorityMap[category] || 'medium';
  }

  /**
   * Build tags array from raw data
   * @param {Object} rawData - Raw parsed data
   * @returns {Array} Tags array
   */
  buildTags(rawData) {
    const tags = ['gmail_import'];

    if (rawData.category) {
      tags.push(`category:${rawData.category}`);
    }

    // Add tag for phone interviewed leads
    if (rawData.category === 'fresh') {
      tags.push('phone_interviewed');
    }

    return tags;
  }

  /**
   * Format phone number to E.164 format
   * @param {String} phone - Phone number (10 digits or with country code)
   * @returns {String} E.164 formatted phone (+1XXXXXXXXXX)
   */
  formatPhoneE164(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // If 10 digits, assume US and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If 11 digits starting with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // If already has +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Default: add + prefix
    return `+${digits}`;
  }

  /**
   * Clean and normalize string
   * @param {String} str - Input string
   * @returns {String} Cleaned string
   */
  cleanString(str) {
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean and normalize email
   * @param {String} email - Input email
   * @returns {String} Cleaned lowercase email
   */
  cleanEmail(email) {
    return email.trim().toLowerCase();
  }

  /**
   * Clean phone number (remove formatting but keep digits)
   * @param {String} phone - Input phone
   * @returns {String} Cleaned phone
   */
  cleanPhone(phone) {
    return phone.trim().replace(/\s+/g, '');
  }

  /**
   * Validate parsed data
   * @param {Object} data - Parsed data
   * @returns {Object} Validation result
   */
  validateParsedData(data) {
    const errors = [];

    if (!data.firstName || data.firstName.length < 1) {
      errors.push('First name is required');
    }

    if (!data.lastName || data.lastName.length < 1) {
      errors.push('Last name is required');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.phone || !this.isValidPhone(data.phone)) {
      errors.push('Valid phone number is required (10+ digits)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   * @param {String} phone - Phone to validate
   * @returns {Boolean}
   */
  isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  }

  /**
   * Parse bulk leads from CSV or text format
   * @param {String} content - File content
   * @param {String} format - Format type (csv, text)
   * @returns {Array} Array of parsed lead results
   */
  parseBulkLeads(content, format = 'text') {
    const results = [];

    if (format === 'text') {
      // Split by double newlines (each lead separated by blank line)
      const leadBlocks = content.split(/\n\s*\n/);

      for (const block of leadBlocks) {
        if (block.trim()) {
          const result = this.parseLeadEmail(block);
          results.push(result);
        }
      }
    }

    return results;
  }
}

module.exports = new LeadParser();
