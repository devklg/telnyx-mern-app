/**
 * DNC (Do Not Call) Routes
 *
 * @description API routes for DNC compliance management
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 */

const express = require('express');
const router = express.Router();
const dncController = require('../controllers/dnc.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rate-limit.middleware');

// Apply authentication to all DNC routes
router.use(authenticate);

/**
 * @route   POST /api/dnc
 * @desc    Add phone number to DNC list
 * @access  Private
 * @body    { phoneNumber, reason, source, notes, detectedPhrase, expiresAt }
 */
router.post('/', rateLimiter({ max: 100, windowMs: 60000 }), dncController.addToDNC);

/**
 * @route   GET /api/dnc/check
 * @desc    Check if phone number is on DNC list
 * @access  Private
 * @query   phoneNumber
 */
router.get('/check', rateLimiter({ max: 1000, windowMs: 60000 }), dncController.checkDNC);

/**
 * @route   DELETE /api/dnc
 * @desc    Remove phone number from DNC list (Master Admin only)
 * @access  Private (Master Admin)
 * @query   phoneNumber
 * @body    { reason }
 */
router.delete('/', rateLimiter({ max: 50, windowMs: 60000 }), dncController.removeFromDNC);

/**
 * @route   GET /api/dnc
 * @desc    Get DNC list with pagination and filters
 * @access  Private
 * @query   page, limit, reason, source, startDate, endDate, search
 */
router.get('/', rateLimiter({ max: 100, windowMs: 60000 }), dncController.getDNCList);

/**
 * @route   POST /api/dnc/scrub
 * @desc    Bulk check phone numbers against DNC (for import scrubbing)
 * @access  Private
 * @body    { phoneNumbers: [] }
 */
router.post('/scrub', rateLimiter({ max: 10, windowMs: 60000 }), dncController.scrubLeadList);

/**
 * @route   GET /api/dnc/compliance-report
 * @desc    Get DNC compliance report for audits
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/compliance-report', rateLimiter({ max: 20, windowMs: 60000 }), dncController.getComplianceReport);

/**
 * @route   POST /api/dnc/export
 * @desc    Export DNC list to CSV
 * @access  Private
 */
router.post('/export', rateLimiter({ max: 10, windowMs: 60000 }), dncController.exportDNC);

/**
 * @route   POST /api/dnc/analyze-transcript
 * @desc    Analyze call transcript for opt-out intent
 * @access  Private
 * @body    { transcript, context }
 */
router.post('/analyze-transcript', rateLimiter({ max: 100, windowMs: 60000 }), dncController.analyzeTranscript);

/**
 * @route   GET /api/dnc/bloom-stats
 * @desc    Get bloom filter statistics
 * @access  Private
 */
router.get('/bloom-stats', rateLimiter({ max: 50, windowMs: 60000 }), dncController.getBloomStats);

/**
 * @route   POST /api/dnc/rebuild-bloom-filter
 * @desc    Rebuild DNC bloom filter (Admin only)
 * @access  Private (Admin)
 */
router.post('/rebuild-bloom-filter', rateLimiter({ max: 5, windowMs: 3600000 }), dncController.rebuildBloomFilter);

module.exports = router;
