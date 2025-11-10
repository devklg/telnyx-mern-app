/**
 * Lead Scoring Routes
 *
 * API routes for lead scoring operations
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const express = require('express');
const router = express.Router();
const leadScoringController = require('../controllers/leadScoring.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin, isMasterAdmin } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * Lead-specific scoring endpoints
 */

// Calculate/recalculate score for a specific lead
// POST /api/leads/:lead_id/calculate-score?async=true
router.post('/:lead_id/calculate-score', leadScoringController.calculateScore);

// Get score history for a lead
// GET /api/leads/:lead_id/score-history?limit=10
router.get('/:lead_id/score-history', leadScoringController.getScoreHistory);

// Get detailed score breakdown for a lead
// GET /api/leads/:lead_id/score-breakdown
router.get('/:lead_id/score-breakdown', leadScoringController.getScoreBreakdown);

// Get score comparison across time periods
// GET /api/leads/:lead_id/score-comparison?periods=3
router.get('/:lead_id/score-comparison', leadScoringController.getScoreComparison);

// Apply score decay to a specific lead
// POST /api/leads/:lead_id/apply-decay
router.post('/:lead_id/apply-decay', leadScoringController.applyDecay);

/**
 * General scoring endpoints
 */

// Get top-scored leads (hot leads list)
// GET /api/leads/top-scored?limit=50&minScore=80
router.get('/top-scored', leadScoringController.getTopScored);

/**
 * Admin configuration endpoints
 * Require admin or master admin permissions
 */

// Get current scoring configuration
// GET /api/admin/lead-scoring/config
router.get('/admin/config', isAdmin, leadScoringController.getConfig);

// Update scoring configuration weights (master admin only)
// PATCH /api/admin/lead-scoring/config
router.patch('/admin/config', isMasterAdmin, leadScoringController.updateConfig);

// Get scoring statistics and distribution
// GET /api/admin/lead-scoring/stats
router.get('/admin/stats', isAdmin, leadScoringController.getStats);

// Batch recalculate all lead scores (master admin only)
// POST /api/admin/lead-scoring/recalculate-all
router.post('/admin/recalculate-all', isMasterAdmin, leadScoringController.recalculateAll);

module.exports = router;