/**
 * BMAD V4 - Scoring Calculation Endpoints
 * 
 * @description Routes for lead scoring
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const scoringController = require('../controllers/scoring.controller');

router.use(authenticate);

/**
 * @route   POST /api/scoring/calculate
 * @desc    Calculate lead score
 * @access  Private
 */
router.post('/calculate',
  scoringController.calculateScore
);

/**
 * @route   GET /api/scoring/:leadId
 * @desc    Get lead score history
 * @access  Private
 */
router.get('/:leadId',
  scoringController.getLeadScore
);

/**
 * @route   GET /api/scoring/leaderboard
 * @desc    Get top scored leads
 * @access  Private
 */
router.get('/leaderboard',
  scoringController.getLeaderboard
);

module.exports = router;
