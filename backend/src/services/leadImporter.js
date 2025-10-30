const Lead = require('../database/mongodb/schemas/lead.schema');
const leadParser = require('./leadParser');
const logger = require('../utils/logger');

/**
 * Lead Importer Service
 * Handles lead import with duplicate detection and batch processing
 *
 * @author James Taylor - Lead Management Developer
 * @uses Sarah Chen's Lead Schema (lead.schema.js)
 */

class LeadImporter {
  /**
   * Import leads from Gmail emails
   * @param {Array} emails - Array of email objects from Gmail
   * @returns {Object} Import results
   */
  async importFromEmails(emails) {
    const results = {
      total: emails.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
      importedLeads: [],
      duplicateLeads: []
    };

    logger.info(`[Lead Importer] Processing ${emails.length} emails`);

    for (const email of emails) {
      try {
        // Parse email body
        const parseResult = leadParser.parseLeadEmail(email.body, {
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          date: email.date
        });

        if (!parseResult.success) {
          results.errors++;
          results.errorDetails.push({
            emailId: email.id,
            error: parseResult.errors || parseResult.error,
            rawData: parseResult.rawData
          });
          continue;
        }

        // Check for duplicates
        const duplicateCheck = await this.checkDuplicate(parseResult.data);

        if (duplicateCheck.isDuplicate) {
          results.duplicates++;
          results.duplicateLeads.push({
            emailId: email.id,
            phone: parseResult.data.phone,
            email: parseResult.data.email,
            existingId: duplicateCheck.existingLead._id
          });

          logger.info(`[Lead Importer] Duplicate found: ${parseResult.data.email} (${parseResult.data.phone})`);
          continue;
        }

        // Import new lead
        const lead = await this.importLead(parseResult.data);

        if (lead) {
          results.imported++;
          results.importedLeads.push({
            id: lead._id,
            name: `${lead.firstName} ${lead.lastName}`,
            phone: lead.phone,
            email: lead.email
          });

          logger.info(`[Lead Importer] Imported: ${lead.firstName} ${lead.lastName} (ID: ${lead._id})`);
        } else {
          results.errors++;
          results.errorDetails.push({
            emailId: email.id,
            error: 'Failed to save lead',
            data: parseResult.data
          });
        }

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          emailId: email.id,
          error: error.message
        });
        logger.error(`[Lead Importer] Error processing email ${email.id}:`, error);
      }
    }

    logger.info(`[Lead Importer] Complete: ${results.imported} imported, ${results.duplicates} duplicates, ${results.errors} errors`);

    return results;
  }

  /**
   * Check if lead already exists (duplicate detection)
   * @param {Object} leadData - Lead data to check
   * @returns {Object} Duplicate check result
   */
  async checkDuplicate(leadData) {
    try {
      // Search by phone OR email
      const existing = await Lead.findOne({
        $or: [
          { phone: leadData.phone },
          { email: leadData.email }
        ]
      });

      if (existing) {
        return {
          isDuplicate: true,
          existingLead: existing,
          matchedBy: existing.phone === leadData.phone ? 'phone' : 'email'
        };
      }

      return {
        isDuplicate: false
      };

    } catch (error) {
      logger.error('[Lead Importer] Duplicate check error:', error);
      // On error, assume not duplicate to avoid losing leads
      return {
        isDuplicate: false,
        error: error.message
      };
    }
  }

  /**
   * Import a single lead into MongoDB
   * @param {Object} leadData - Lead data matching Lead schema
   * @returns {Object} Saved lead document
   */
  async importLead(leadData) {
    try {
      const lead = new Lead(leadData);
      await lead.save();
      return lead;

    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error (race condition)
        logger.warn('[Lead Importer] Duplicate key error (race condition):', error.keyPattern);
        return null;
      }

      logger.error('[Lead Importer] Error saving lead:', error);
      throw error;
    }
  }

  /**
   * Import leads from bulk data (CSV, JSON, text)
   * @param {Array} leadsData - Array of lead objects
   * @param {String} source - Import source identifier
   * @returns {Object} Import results
   */
  async importBulk(leadsData, source = 'bulk_import') {
    const results = {
      total: leadsData.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
      importedLeads: []
    };

    logger.info(`[Lead Importer] Bulk import: ${leadsData.length} leads from ${source}`);

    for (let i = 0; i < leadsData.length; i++) {
      const leadData = leadsData[i];

      try {
        // Check for duplicates
        const duplicateCheck = await this.checkDuplicate(leadData);

        if (duplicateCheck.isDuplicate) {
          results.duplicates++;
          continue;
        }

        // Import lead
        const lead = await this.importLead(leadData);

        if (lead) {
          results.imported++;
          results.importedLeads.push(lead._id);

          // Log progress every 100 leads
          if (results.imported % 100 === 0) {
            logger.info(`[Lead Importer] Progress: ${results.imported}/${leadsData.length}`);
          }
        } else {
          results.errors++;
        }

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          index: i,
          leadData,
          error: error.message
        });
      }
    }

    logger.info(`[Lead Importer] Bulk import complete: ${results.imported} imported, ${results.duplicates} duplicates, ${results.errors} errors`);

    return results;
  }

  /**
   * Update existing lead with new information
   * @param {String} leadId - Lead ID to update
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated lead
   */
  async updateLead(leadId, updateData) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (lead) {
        logger.info(`[Lead Importer] Updated lead: ${leadId}`);
      }

      return lead;

    } catch (error) {
      logger.error(`[Lead Importer] Error updating lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Get import statistics
   * @param {Date} startDate - Start date for stats
   * @param {Date} endDate - End date for stats
   * @returns {Object} Import statistics
   */
  async getImportStats(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            'customFields.importSource': 'gmail',
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 },
            categories: {
              $push: '$customFields.category'
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const stats = await Lead.aggregate(pipeline);

      return stats;

    } catch (error) {
      logger.error('[Lead Importer] Error getting import stats:', error);
      throw error;
    }
  }

  /**
   * Validate lead data before import
   * @param {Object} leadData - Lead data to validate
   * @returns {Object} Validation result
   */
  validateLeadData(leadData) {
    const errors = [];

    // Required fields
    if (!leadData.firstName) errors.push('firstName is required');
    if (!leadData.lastName) errors.push('lastName is required');
    if (!leadData.phone) errors.push('phone is required');

    // Email validation
    if (leadData.email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(leadData.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation (E.164 format)
    if (leadData.phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(leadData.phone)) {
        errors.push('Invalid phone format (must be E.164 format)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new LeadImporter();
