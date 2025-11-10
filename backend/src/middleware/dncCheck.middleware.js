/**
 * DNC Check Middleware
 *
 * @description Middleware to check DNC status before initiating calls
 *              Integrates with Story 2.1 (Call Initiation)
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 *
 * CRITICAL: This middleware MUST be called before any call initiation
 * TCPA violations can cost $500-$1500 per call
 */

const dncService = require('../services/dncService');
const dncBloomFilter = require('../services/dncBloomFilter');
const logger = require('../utils/logger');
const { pgPool } = require('../config/database');

/**
 * Check if phone number is on DNC list before allowing call
 * Middleware for call initiation endpoints
 */
async function checkDNCBeforeCall(req, res, next) {
  try {
    const { phoneNumber, to, lead_id } = req.body;

    // Get phone number from request (different fields in different endpoints)
    const targetPhone = phoneNumber || to;

    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
        error: 'MISSING_PHONE_NUMBER'
      });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    logger.debug('Checking DNC before call initiation', {
      phoneNumber: targetPhone,
      userId,
      organizationId
    });

    // Step 1: Check bloom filter first (ultra-fast < 1ms)
    const mightBeOnDNC = await dncBloomFilter.check(targetPhone);

    if (!mightBeOnDNC) {
      // Definitely not on DNC - allow call
      logger.debug('DNC check passed (bloom filter)', { phoneNumber: targetPhone });
      return next();
    }

    // Step 2: Bloom filter says might be on DNC - verify with database
    const dncCheck = await dncService.checkDNC(targetPhone, organizationId);

    if (dncCheck.onDNCList) {
      // Phone is on DNC - BLOCK CALL
      logger.warn('Call blocked: Phone number on DNC list', {
        phoneNumber: targetPhone,
        userId,
        reason: dncCheck.reason,
        addedAt: dncCheck.addedAt
      });

      // Log attempted call to DNC number (audit trail)
      await logDNCViolationAttempt({
        phoneNumber: targetPhone,
        userId,
        organizationId,
        leadId: lead_id,
        dncReason: dncCheck.reason,
        requestBody: req.body
      });

      // Update lead status if lead_id provided
      if (lead_id) {
        await updateLeadDNCStatus(lead_id, organizationId);
      }

      // Return error response
      return res.status(403).json({
        success: false,
        message: 'Call blocked: Lead on Do Not Call list',
        error: 'LEAD_ON_DNC_LIST',
        data: {
          phoneNumber: targetPhone,
          reason: dncCheck.reason,
          addedAt: dncCheck.addedAt,
          complianceMessage: 'This phone number has requested to not be contacted. Calling would violate TCPA compliance.'
        }
      });
    }

    // Not on DNC - allow call
    logger.debug('DNC check passed (database verified)', { phoneNumber: targetPhone });
    next();

  } catch (error) {
    logger.error('Error in DNC check middleware:', error);

    // FAIL-SAFE: On error, block the call (better safe than sorry)
    return res.status(500).json({
      success: false,
      message: 'Unable to verify DNC status. Call blocked for compliance safety.',
      error: 'DNC_CHECK_FAILED',
      details: error.message
    });
  }
}

/**
 * Check DNC for bulk operations (e.g., campaign launches)
 */
async function checkDNCBulk(req, res, next) {
  try {
    const { leadIds, phoneNumbers } = req.body;

    if (!leadIds && !phoneNumbers) {
      return res.status(400).json({
        success: false,
        message: 'leadIds or phoneNumbers array is required'
      });
    }

    const organizationId = req.user.organization_id;

    let phonesToCheck = phoneNumbers;

    // If leadIds provided, fetch phone numbers from database
    if (leadIds && !phoneNumbers) {
      const query = `
        SELECT id, phone_number FROM leads
        WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
      `;
      const result = await pgPool.query(query, [leadIds, organizationId]);
      phonesToCheck = result.rows.map(row => row.phone_number);
    }

    logger.info('Bulk DNC check', {
      count: phonesToCheck.length,
      userId: req.user.id
    });

    // Scrub the list
    const scrubResult = await dncService.scrubLeadList(phonesToCheck, organizationId);

    if (scrubResult.dncCount > 0) {
      logger.warn(`Bulk operation contains ${scrubResult.dncCount} DNC numbers`, {
        userId: req.user.id
      });

      // Attach scrub results to request for downstream processing
      req.dncScrubResult = scrubResult;

      // If ALL numbers are on DNC, block the entire operation
      if (scrubResult.cleanCount === 0) {
        return res.status(403).json({
          success: false,
          message: 'All phone numbers are on DNC list. Operation blocked.',
          error: 'ALL_ON_DNC_LIST',
          data: scrubResult
        });
      }

      // Some numbers on DNC - log warning but allow operation to continue
      // The downstream handler should filter out DNC numbers
      logger.warn('Bulk operation proceeding with DNC filtering', {
        cleanCount: scrubResult.cleanCount,
        dncCount: scrubResult.dncCount
      });
    }

    next();

  } catch (error) {
    logger.error('Error in bulk DNC check:', error);

    // FAIL-SAFE: Block operation on error
    return res.status(500).json({
      success: false,
      message: 'Unable to verify DNC status for bulk operation',
      error: 'BULK_DNC_CHECK_FAILED'
    });
  }
}

/**
 * Log attempted call to DNC number (audit trail)
 */
async function logDNCViolationAttempt({
  phoneNumber,
  userId,
  organizationId,
  leadId,
  dncReason,
  requestBody
}) {
  try {
    // Create call_attempt_logs table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS call_attempt_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(20) NOT NULL,
        user_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        lead_id UUID,
        is_dnc_blocked BOOLEAN DEFAULT TRUE,
        dnc_reason VARCHAR(100),
        request_metadata JSONB,
        attempted_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await pgPool.query(createTableQuery);

    // Log the attempt
    const insertQuery = `
      INSERT INTO call_attempt_logs (
        phone_number, user_id, organization_id, lead_id,
        is_dnc_blocked, dnc_reason, request_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pgPool.query(insertQuery, [
      phoneNumber,
      userId,
      organizationId,
      leadId,
      true,
      dncReason,
      JSON.stringify({
        endpoint: requestBody.endpoint || 'unknown',
        userAgent: requestBody.userAgent,
        timestamp: new Date().toISOString()
      })
    ]);

    logger.info('DNC violation attempt logged', {
      phoneNumber,
      userId,
      dncReason
    });

  } catch (error) {
    logger.error('Error logging DNC violation attempt:', error);
    // Don't throw - logging failure shouldn't break the flow
  }
}

/**
 * Update lead status to DNC and block calling
 */
async function updateLeadDNCStatus(leadId, organizationId) {
  try {
    const query = `
      UPDATE leads
      SET
        status = 'dnc',
        calling_blocked = true,
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;

    await pgPool.query(query, [leadId, organizationId]);

    logger.info('Lead updated to DNC status', { leadId });

  } catch (error) {
    logger.error('Error updating lead DNC status:', error);
  }
}

/**
 * Validate that user has permission to override DNC (emergency only)
 * This should be used VERY sparingly and only with documented consent
 */
async function checkDNCOverridePermission(req, res, next) {
  try {
    const { dncOverride, overrideReason, consentDocumented } = req.body;

    if (!dncOverride) {
      // No override requested - proceed with normal DNC check
      return next();
    }

    // Only master admin can override DNC
    if (req.user.role !== 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'DNC override requires master admin permission',
        error: 'INSUFFICIENT_PERMISSION'
      });
    }

    // Require documented reason and consent
    if (!overrideReason || !consentDocumented) {
      return res.status(400).json({
        success: false,
        message: 'DNC override requires documented reason and consent verification',
        error: 'MISSING_OVERRIDE_DOCUMENTATION'
      });
    }

    logger.warn('DNC OVERRIDE GRANTED', {
      userId: req.user.id,
      reason: overrideReason,
      phoneNumber: req.body.phoneNumber
    });

    // Log the override
    await logDNCOverride({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      phoneNumber: req.body.phoneNumber,
      reason: overrideReason,
      consentDocumented
    });

    // Skip DNC check
    next();

  } catch (error) {
    logger.error('Error in DNC override check:', error);
    next(error);
  }
}

/**
 * Log DNC override (critical audit trail)
 */
async function logDNCOverride({
  userId,
  organizationId,
  phoneNumber,
  reason,
  consentDocumented
}) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS dnc_override_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        consent_documented BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await pgPool.query(createTableQuery);

    const insertQuery = `
      INSERT INTO dnc_override_log (
        user_id, organization_id, phone_number, reason, consent_documented
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await pgPool.query(insertQuery, [
      userId,
      organizationId,
      phoneNumber,
      reason,
      consentDocumented
    ]);

    logger.warn('DNC override logged', { userId, phoneNumber, reason });

  } catch (error) {
    logger.error('Error logging DNC override:', error);
  }
}

module.exports = {
  checkDNCBeforeCall,
  checkDNCBulk,
  checkDNCOverridePermission,
  logDNCViolationAttempt,
  updateLeadDNCStatus
};
