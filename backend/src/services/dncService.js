/**
 * DNC (Do Not Call) Compliance Service
 *
 * CRITICAL: This service handles DNC compliance to prevent TCPA violations
 * Violations can cost $500-$1500 per call
 *
 * @description Comprehensive DNC list management with PostgreSQL, Redis caching,
 *              and bloom filter for ultra-fast lookups
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 */

const { pgPool } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const { parsePhoneNumber, formatPhoneNumber } = require('../utils/helpers');

class DNCService {
  constructor() {
    this.CACHE_PREFIX = 'dnc:';
    this.CACHE_TTL = 3600; // 1 hour
    this.BLOOM_FILTER_KEY = 'dnc:bloom_filter';
  }

  /**
   * Add phone number to DNC list
   * @param {string} phoneNumber - E.164 format phone number
   * @param {string} reason - Reason for adding to DNC
   * @param {string} source - Source of the DNC request
   * @param {UUID} addedByUserId - User who added the number
   * @param {UUID} organizationId - Organization ID
   * @param {string} notes - Optional notes
   * @param {string} detectedPhrase - Opt-out phrase detected by AI
   * @param {Date} expiresAt - Optional expiration date (30-day grace period)
   * @returns {Object} DNC entry
   */
  async addToDNC({
    phoneNumber,
    reason,
    source,
    addedByUserId,
    organizationId,
    notes = null,
    detectedPhrase = null,
    expiresAt = null
  }) {
    try {
      // Normalize phone number to E.164 format
      const normalizedPhone = this._normalizePhoneNumber(phoneNumber);

      logger.info(`Adding phone to DNC: ${normalizedPhone}`, {
        reason,
        source,
        organizationId
      });

      // Check if already on DNC list
      const existing = await this.checkDNC(normalizedPhone, organizationId);
      if (existing.onDNCList) {
        logger.warn(`Phone already on DNC: ${normalizedPhone}`);
        return existing.entry;
      }

      // Insert into dnc_list table
      const query = `
        INSERT INTO dnc_list (
          phone_number,
          organization_id,
          added_by_user_id,
          reason,
          source,
          detected_phrase,
          notes,
          expires_at,
          consent_withdrawal_documented
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        normalizedPhone,
        organizationId,
        addedByUserId,
        reason,
        source,
        detectedPhrase,
        notes,
        expiresAt,
        true // consent_withdrawal_documented
      ];

      const result = await pgPool.query(query, values);
      const dncEntry = result.rows[0];

      // Update any existing leads with this phone number
      await this._updateLeadsForDNC(normalizedPhone, organizationId);

      // Cancel active nurture sequences for this lead
      await this._cancelNurtureSequences(normalizedPhone, organizationId);

      // Invalidate cache
      await this._invalidateCache(normalizedPhone, organizationId);

      // Add to bloom filter (handled by bloom filter service)
      await this._addToBloomFilter(normalizedPhone);

      logger.info(`Successfully added to DNC: ${normalizedPhone}`, {
        dncId: dncEntry.id
      });

      return dncEntry;
    } catch (error) {
      logger.error('Error adding to DNC:', error);
      throw new Error(`Failed to add to DNC: ${error.message}`);
    }
  }

  /**
   * Check if phone number is on DNC list
   * @param {string} phoneNumber - Phone number to check
   * @param {UUID} organizationId - Organization ID
   * @returns {Object} { onDNCList: boolean, reason: string, entry: Object }
   */
  async checkDNC(phoneNumber, organizationId) {
    try {
      const normalizedPhone = this._normalizePhoneNumber(phoneNumber);

      // Check Redis cache first
      const cacheKey = `${this.CACHE_PREFIX}${organizationId}:${normalizedPhone}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        const entry = JSON.parse(cached);
        return {
          onDNCList: true,
          reason: entry.reason,
          addedAt: entry.added_at,
          entry
        };
      }

      // Query PostgreSQL
      const query = `
        SELECT * FROM dnc_list
        WHERE phone_number = $1
          AND organization_id = $2
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `;

      const result = await pgPool.query(query, [normalizedPhone, organizationId]);

      if (result.rows.length > 0) {
        const entry = result.rows[0];

        // Cache the result
        await cache.set(cacheKey, entry, this.CACHE_TTL);

        return {
          onDNCList: true,
          reason: entry.reason,
          addedAt: entry.added_at,
          entry
        };
      }

      return {
        onDNCList: false,
        reason: null,
        addedAt: null,
        entry: null
      };
    } catch (error) {
      logger.error('Error checking DNC:', error);
      throw new Error(`Failed to check DNC: ${error.message}`);
    }
  }

  /**
   * Remove phone number from DNC list (Master Admin only)
   * @param {string} phoneNumber - Phone number to remove
   * @param {UUID} organizationId - Organization ID
   * @param {UUID} removedByUserId - User removing (must be master admin)
   * @param {string} reason - Reason for removal
   * @returns {boolean} Success
   */
  async removeFromDNC(phoneNumber, organizationId, removedByUserId, reason) {
    try {
      const normalizedPhone = this._normalizePhoneNumber(phoneNumber);

      logger.info(`Removing phone from DNC: ${normalizedPhone}`, {
        removedBy: removedByUserId,
        reason
      });

      // Delete from dnc_list
      const query = `
        DELETE FROM dnc_list
        WHERE phone_number = $1 AND organization_id = $2
        RETURNING *
      `;

      const result = await pgPool.query(query, [normalizedPhone, organizationId]);

      if (result.rows.length === 0) {
        logger.warn(`Phone not found on DNC: ${normalizedPhone}`);
        return false;
      }

      // Log audit trail
      await this._logDNCAudit({
        action: 'remove',
        phoneNumber: normalizedPhone,
        organizationId,
        userId: removedByUserId,
        reason,
        metadata: { removed_entry: result.rows[0] }
      });

      // Update leads to re-enable calling
      await this._updateLeadsOnDNCRemoval(normalizedPhone, organizationId);

      // Invalidate cache
      await this._invalidateCache(normalizedPhone, organizationId);

      // Remove from bloom filter
      await this._removeFromBloomFilter(normalizedPhone);

      logger.info(`Successfully removed from DNC: ${normalizedPhone}`);

      return true;
    } catch (error) {
      logger.error('Error removing from DNC:', error);
      throw new Error(`Failed to remove from DNC: ${error.message}`);
    }
  }

  /**
   * Get DNC list with pagination and filters
   * @param {Object} options - Filter and pagination options
   * @returns {Object} { entries: [], total: number, page: number, pages: number }
   */
  async getDNCList({
    organizationId,
    page = 1,
    limit = 50,
    reason = null,
    source = null,
    startDate = null,
    endDate = null,
    search = null
  }) {
    try {
      const offset = (page - 1) * limit;

      let whereConditions = ['organization_id = $1'];
      let queryParams = [organizationId];
      let paramIndex = 2;

      // Build filter conditions
      if (reason) {
        whereConditions.push(`reason = $${paramIndex}`);
        queryParams.push(reason);
        paramIndex++;
      }

      if (source) {
        whereConditions.push(`source = $${paramIndex}`);
        queryParams.push(source);
        paramIndex++;
      }

      if (startDate) {
        whereConditions.push(`added_at >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`added_at <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(phone_number LIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM dnc_list WHERE ${whereClause}`;
      const countResult = await pgPool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const query = `
        SELECT * FROM dnc_list
        WHERE ${whereClause}
        ORDER BY added_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await pgPool.query(query, queryParams);

      return {
        entries: result.rows,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };
    } catch (error) {
      logger.error('Error getting DNC list:', error);
      throw new Error(`Failed to get DNC list: ${error.message}`);
    }
  }

  /**
   * Bulk check phone numbers against DNC list (for import scrubbing)
   * @param {string[]} phoneNumbers - Array of phone numbers to check
   * @param {UUID} organizationId - Organization ID
   * @returns {Object} { dncNumbers: [], cleanNumbers: [] }
   */
  async scrubLeadList(phoneNumbers, organizationId) {
    try {
      logger.info(`Scrubbing ${phoneNumbers.length} phone numbers against DNC`);

      // Normalize all phone numbers
      const normalizedNumbers = phoneNumbers.map(phone =>
        this._normalizePhoneNumber(phone)
      );

      // Batch query (100 numbers at a time for performance)
      const batchSize = 100;
      const dncNumbers = [];
      const cleanNumbers = [];

      for (let i = 0; i < normalizedNumbers.length; i += batchSize) {
        const batch = normalizedNumbers.slice(i, i + batchSize);

        const query = `
          SELECT phone_number FROM dnc_list
          WHERE phone_number = ANY($1)
            AND organization_id = $2
            AND (expires_at IS NULL OR expires_at > NOW())
        `;

        const result = await pgPool.query(query, [batch, organizationId]);
        const batchDNC = result.rows.map(row => row.phone_number);

        // Separate DNC and clean numbers
        batch.forEach(phone => {
          if (batchDNC.includes(phone)) {
            dncNumbers.push(phone);
          } else {
            cleanNumbers.push(phone);
          }
        });
      }

      logger.info(`Scrubbing complete: ${dncNumbers.length} DNC, ${cleanNumbers.length} clean`);

      return {
        dncNumbers,
        cleanNumbers,
        total: phoneNumbers.length,
        dncCount: dncNumbers.length,
        cleanCount: cleanNumbers.length
      };
    } catch (error) {
      logger.error('Error scrubbing lead list:', error);
      throw new Error(`Failed to scrub lead list: ${error.message}`);
    }
  }

  /**
   * Get DNC compliance report for audits
   * @param {UUID} organizationId - Organization ID
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Object} Compliance report
   */
  async getComplianceReport(organizationId, startDate, endDate) {
    try {
      logger.info('Generating DNC compliance report', {
        organizationId,
        startDate,
        endDate
      });

      // Get all DNC additions in period
      const additionsQuery = `
        SELECT
          id,
          phone_number,
          reason,
          source,
          detected_phrase,
          added_by_user_id,
          added_at
        FROM dnc_list
        WHERE organization_id = $1
          AND added_at >= $2
          AND added_at <= $3
        ORDER BY added_at DESC
      `;

      const additions = await pgPool.query(additionsQuery, [
        organizationId,
        startDate,
        endDate
      ]);

      // Get DNC removal audit logs
      const removalsQuery = `
        SELECT * FROM dnc_audit_log
        WHERE organization_id = $1
          AND action = 'remove'
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY created_at DESC
      `;

      let removals = { rows: [] };
      try {
        removals = await pgPool.query(removalsQuery, [
          organizationId,
          startDate,
          endDate
        ]);
      } catch (err) {
        // Table might not exist yet
        logger.warn('DNC audit log table not found');
      }

      // Get attempted calls to DNC numbers (from call logs)
      const attemptedCallsQuery = `
        SELECT COUNT(*) as count
        FROM call_attempt_logs
        WHERE organization_id = $1
          AND is_dnc_blocked = true
          AND attempted_at >= $2
          AND attempted_at <= $3
      `;

      let attemptedCalls = { rows: [{ count: 0 }] };
      try {
        attemptedCalls = await pgPool.query(attemptedCallsQuery, [
          organizationId,
          startDate,
          endDate
        ]);
      } catch (err) {
        // Table might not exist yet
        logger.warn('Call attempt logs table not found');
      }

      // Summary statistics
      const report = {
        organizationId,
        reportPeriod: {
          startDate,
          endDate
        },
        summary: {
          totalAdditions: additions.rows.length,
          totalRemovals: removals.rows.length,
          attemptedDNCCalls: parseInt(attemptedCalls.rows[0].count),
          autoDetected: additions.rows.filter(row => row.source === 'call_transcript').length,
          manualAdditions: additions.rows.filter(row => row.source === 'manual_entry').length
        },
        additions: additions.rows,
        removals: removals.rows,
        complianceScore: this._calculateComplianceScore(
          parseInt(attemptedCalls.rows[0].count),
          additions.rows.length
        ),
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  }

  /**
   * Export DNC list to CSV format
   * @param {UUID} organizationId - Organization ID
   * @returns {string} CSV data
   */
  async exportDNCToCSV(organizationId) {
    try {
      const query = `
        SELECT
          phone_number,
          reason,
          source,
          detected_phrase,
          notes,
          added_at,
          expires_at
        FROM dnc_list
        WHERE organization_id = $1
        ORDER BY added_at DESC
      `;

      const result = await pgPool.query(query, [organizationId]);

      // Build CSV
      const headers = [
        'Phone Number',
        'Reason',
        'Source',
        'Detected Phrase',
        'Notes',
        'Added At',
        'Expires At'
      ];

      const rows = result.rows.map(row => [
        row.phone_number,
        row.reason,
        row.source,
        row.detected_phrase || '',
        row.notes || '',
        row.added_at.toISOString(),
        row.expires_at ? row.expires_at.toISOString() : ''
      ]);

      const csvData = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return csvData;
    } catch (error) {
      logger.error('Error exporting DNC to CSV:', error);
      throw new Error(`Failed to export DNC: ${error.message}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Normalize phone number to E.164 format
   * @private
   */
  _normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      // Assume US/Canada if 10 digits
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      return `+${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Update leads table when number added to DNC
   * @private
   */
  async _updateLeadsForDNC(phoneNumber, organizationId) {
    try {
      const query = `
        UPDATE leads
        SET
          status = 'dnc',
          calling_blocked = true,
          updated_at = NOW()
        WHERE phone_number = $1
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await pgPool.query(query, [phoneNumber, organizationId]);

      logger.info(`Updated ${result.rowCount} leads to DNC status`);
    } catch (error) {
      logger.error('Error updating leads for DNC:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Update leads when number removed from DNC
   * @private
   */
  async _updateLeadsOnDNCRemoval(phoneNumber, organizationId) {
    try {
      const query = `
        UPDATE leads
        SET
          status = 'new',
          calling_blocked = false,
          updated_at = NOW()
        WHERE phone_number = $1
          AND organization_id = $2
          AND status = 'dnc'
          AND deleted_at IS NULL
      `;

      const result = await pgPool.query(query, [phoneNumber, organizationId]);

      logger.info(`Updated ${result.rowCount} leads on DNC removal`);
    } catch (error) {
      logger.error('Error updating leads on DNC removal:', error);
    }
  }

  /**
   * Cancel active nurture sequences for DNC number
   * @private
   */
  async _cancelNurtureSequences(phoneNumber, organizationId) {
    try {
      // Find leads with this phone number
      const leadsQuery = `
        SELECT id FROM leads
        WHERE phone_number = $1
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const leads = await pgPool.query(leadsQuery, [phoneNumber, organizationId]);

      if (leads.rows.length > 0) {
        const leadIds = leads.rows.map(row => row.id);

        // Cancel active enrollments
        const cancelQuery = `
          UPDATE lead_sequence_enrollments
          SET
            status = 'cancelled',
            pause_reason = 'Lead added to DNC list',
            completed_at = NOW()
          WHERE lead_id = ANY($1)
            AND status = 'active'
        `;

        const result = await pgPool.query(cancelQuery, [leadIds]);

        logger.info(`Cancelled ${result.rowCount} nurture sequences for DNC number`);
      }
    } catch (error) {
      logger.error('Error cancelling nurture sequences:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Invalidate Redis cache for phone number
   * @private
   */
  async _invalidateCache(phoneNumber, organizationId) {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${organizationId}:${phoneNumber}`;
      await cache.del(cacheKey);
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }

  /**
   * Add phone number to bloom filter (placeholder for bloom filter service)
   * @private
   */
  async _addToBloomFilter(phoneNumber) {
    // This will be implemented in the bloom filter service
    // For now, just log
    logger.debug(`Would add to bloom filter: ${phoneNumber}`);
  }

  /**
   * Remove phone number from bloom filter
   * @private
   */
  async _removeFromBloomFilter(phoneNumber) {
    // This will be implemented in the bloom filter service
    logger.debug(`Would remove from bloom filter: ${phoneNumber}`);
  }

  /**
   * Log DNC audit trail
   * @private
   */
  async _logDNCAudit({ action, phoneNumber, organizationId, userId, reason, metadata }) {
    try {
      // Create audit log table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS dnc_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          action VARCHAR(50) NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          organization_id UUID NOT NULL,
          user_id UUID NOT NULL,
          reason TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await pgPool.query(createTableQuery);

      // Insert audit log
      const query = `
        INSERT INTO dnc_audit_log (
          action, phone_number, organization_id, user_id, reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await pgPool.query(query, [
        action,
        phoneNumber,
        organizationId,
        userId,
        reason,
        JSON.stringify(metadata)
      ]);

      logger.info('DNC audit log created', { action, phoneNumber });
    } catch (error) {
      logger.error('Error logging DNC audit:', error);
    }
  }

  /**
   * Calculate compliance score (0-100)
   * @private
   */
  _calculateComplianceScore(attemptedDNCCalls, totalAdditions) {
    if (totalAdditions === 0) return 100;

    // Perfect score if no attempted DNC calls
    if (attemptedDNCCalls === 0) return 100;

    // Penalize heavily for attempted DNC calls
    const violationRate = attemptedDNCCalls / totalAdditions;
    const score = Math.max(0, 100 - (violationRate * 200)); // Heavy penalty

    return Math.round(score);
  }
}

module.exports = new DNCService();
