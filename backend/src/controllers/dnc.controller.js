/**
 * DNC (Do Not Call) Controller
 *
 * @description API endpoints for DNC list management and compliance reporting
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 *
 * Endpoints:
 * - POST /api/dnc - Add to DNC
 * - GET /api/dnc/check - Check DNC status
 * - DELETE /api/dnc - Remove from DNC (master admin only)
 * - GET /api/dnc - List DNC entries
 * - POST /api/dnc/scrub - Bulk DNC check
 * - GET /api/dnc/compliance-report - Compliance audit report
 * - POST /api/dnc/export - Export to CSV
 */

const dncService = require('../services/dncService');
const dncBloomFilter = require('../services/dncBloomFilter');
const { analyzeTranscriptForOptOut } = require('../utils/dncTranscriptAnalyzer');
const logger = require('../utils/logger');

/**
 * Add phone number to DNC list
 * POST /api/dnc
 */
exports.addToDNC = async (req, res, next) => {
  try {
    const {
      phoneNumber,
      reason,
      source = 'manual_entry',
      notes,
      detectedPhrase,
      expiresAt
    } = req.body;

    // Validation
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required (lead_requested, legal_requirement, admin_added, manual)'
      });
    }

    // Get organization from user
    const organizationId = req.user.organization_id;
    const addedByUserId = req.user.id;

    logger.info('Adding phone to DNC via API', {
      phoneNumber,
      reason,
      userId: addedByUserId,
      organizationId
    });

    // Add to DNC
    const dncEntry = await dncService.addToDNC({
      phoneNumber,
      reason,
      source,
      addedByUserId,
      organizationId,
      notes,
      detectedPhrase,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    // Add to bloom filter for fast lookups
    await dncBloomFilter.add(phoneNumber);

    res.status(201).json({
      success: true,
      message: 'Phone number added to DNC list',
      data: dncEntry
    });

  } catch (error) {
    logger.error('Error adding to DNC:', error);
    next(error);
  }
};

/**
 * Check if phone number is on DNC list
 * GET /api/dnc/check?phoneNumber=+1234567890
 */
exports.checkDNC = async (req, res, next) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const organizationId = req.user.organization_id;

    // Check bloom filter first (ultra-fast)
    const mightBeOnDNC = await dncBloomFilter.check(phoneNumber);

    if (!mightBeOnDNC) {
      // Definitely not on DNC (no false negatives in bloom filter)
      return res.json({
        success: true,
        data: {
          onDNCList: false,
          reason: null,
          addedAt: null,
          canCall: true,
          checkMethod: 'bloom_filter'
        }
      });
    }

    // Bloom filter says might be on DNC - verify with PostgreSQL
    const result = await dncService.checkDNC(phoneNumber, organizationId);

    res.json({
      success: true,
      data: {
        onDNCList: result.onDNCList,
        reason: result.reason,
        addedAt: result.addedAt,
        canCall: !result.onDNCList,
        checkMethod: 'database_verified',
        entry: result.entry
      }
    });

  } catch (error) {
    logger.error('Error checking DNC:', error);
    next(error);
  }
};

/**
 * Remove phone number from DNC list (Master Admin only)
 * DELETE /api/dnc?phoneNumber=+1234567890
 */
exports.removeFromDNC = async (req, res, next) => {
  try {
    const { phoneNumber } = req.query;
    const { reason } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user is master admin
    if (req.user.role !== 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only master admins can remove numbers from DNC list'
      });
    }

    const organizationId = req.user.organization_id;
    const removedByUserId = req.user.id;

    logger.info('Removing phone from DNC via API', {
      phoneNumber,
      userId: removedByUserId,
      reason
    });

    const success = await dncService.removeFromDNC(
      phoneNumber,
      organizationId,
      removedByUserId,
      reason || 'Master admin removal'
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found on DNC list'
      });
    }

    // Remove from bloom filter
    await dncBloomFilter.remove(phoneNumber);

    res.json({
      success: true,
      message: 'Phone number removed from DNC list'
    });

  } catch (error) {
    logger.error('Error removing from DNC:', error);
    next(error);
  }
};

/**
 * Get DNC list with pagination and filters
 * GET /api/dnc?page=1&limit=50&reason=lead_requested&search=555
 */
exports.getDNCList = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      reason,
      source,
      startDate,
      endDate,
      search
    } = req.query;

    const organizationId = req.user.organization_id;

    const result = await dncService.getDNCList({
      organizationId,
      page: parseInt(page),
      limit: parseInt(limit),
      reason,
      source,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      search
    });

    res.json({
      success: true,
      data: result.entries,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: result.limit,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });

  } catch (error) {
    logger.error('Error getting DNC list:', error);
    next(error);
  }
};

/**
 * Bulk check phone numbers against DNC (for import scrubbing)
 * POST /api/dnc/scrub
 * Body: { phoneNumbers: ["+1234567890", "+0987654321"] }
 */
exports.scrubLeadList = async (req, res, next) => {
  try {
    const { phoneNumbers } = req.body;

    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumbers array is required'
      });
    }

    if (phoneNumbers.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10,000 phone numbers per scrub request'
      });
    }

    const organizationId = req.user.organization_id;

    logger.info('Scrubbing lead list', {
      count: phoneNumbers.length,
      userId: req.user.id
    });

    const result = await dncService.scrubLeadList(phoneNumbers, organizationId);

    res.json({
      success: true,
      message: `Scrubbing complete: ${result.dncCount} on DNC, ${result.cleanCount} clean`,
      data: result
    });

  } catch (error) {
    logger.error('Error scrubbing lead list:', error);
    next(error);
  }
};

/**
 * Get DNC compliance report
 * GET /api/dnc/compliance-report?startDate=2024-01-01&endDate=2024-01-31
 */
exports.getComplianceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (YYYY-MM-DD format)'
      });
    }

    const organizationId = req.user.organization_id;

    logger.info('Generating compliance report', {
      startDate,
      endDate,
      userId: req.user.id
    });

    const report = await dncService.getComplianceReport(
      organizationId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Error generating compliance report:', error);
    next(error);
  }
};

/**
 * Export DNC list to CSV
 * POST /api/dnc/export
 */
exports.exportDNC = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;

    logger.info('Exporting DNC list to CSV', {
      userId: req.user.id,
      organizationId
    });

    const csvData = await dncService.exportDNCToCSV(organizationId);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dnc_list_${Date.now()}.csv"`);

    res.send(csvData);

  } catch (error) {
    logger.error('Error exporting DNC:', error);
    next(error);
  }
};

/**
 * Analyze transcript for opt-out intent
 * POST /api/dnc/analyze-transcript
 * Body: { transcript: "...", context: {...} }
 */
exports.analyzeTranscript = async (req, res, next) => {
  try {
    const { transcript, context = {} } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required'
      });
    }

    logger.info('Analyzing transcript for opt-out', {
      transcriptLength: transcript.length,
      userId: req.user.id
    });

    const analysis = await analyzeTranscriptForOptOut(transcript, context);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Error analyzing transcript:', error);
    next(error);
  }
};

/**
 * Get DNC bloom filter statistics
 * GET /api/dnc/bloom-stats
 */
exports.getBloomStats = async (req, res, next) => {
  try {
    const stats = await dncBloomFilter.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting bloom stats:', error);
    next(error);
  }
};

/**
 * Initialize/Rebuild DNC bloom filter (Admin only)
 * POST /api/dnc/rebuild-bloom-filter
 */
exports.rebuildBloomFilter = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'master_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can rebuild bloom filter'
      });
    }

    logger.info('Rebuilding DNC bloom filter', {
      userId: req.user.id
    });

    // Get all DNC numbers from database
    const { pgPool } = require('../config/database');
    const result = await pgPool.query(
      'SELECT phone_number FROM dnc_list WHERE organization_id = $1',
      [req.user.organization_id]
    );

    const phoneNumbers = result.rows.map(row => row.phone_number);

    // Clear and reinitialize bloom filter
    await dncBloomFilter.clear();
    await dncBloomFilter.initialize(phoneNumbers);

    res.json({
      success: true,
      message: `Bloom filter rebuilt with ${phoneNumbers.length} numbers`
    });

  } catch (error) {
    logger.error('Error rebuilding bloom filter:', error);
    next(error);
  }
};

module.exports = exports;
