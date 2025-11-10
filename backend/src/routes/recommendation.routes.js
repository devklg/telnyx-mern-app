/**
 * Recommendation Routes
 *
 * API routes for AI-powered follow-up recommendations and script generation
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');

// Note: Add authentication middleware as needed
// const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/recommendations
 * @desc    Get top recommendations for a user
 * @query   user_id - User/Partner ID (required)
 * @query   limit - Number of recommendations to return (default: 10)
 * @query   status - Filter by lead status (optional)
 * @query   force_refresh - Force cache refresh (optional)
 * @access  Private
 */
router.get('/', recommendationController.getUserRecommendations);

/**
 * @route   GET /api/recommendations/stats
 * @desc    Get recommendation statistics
 * @query   user_id - User/Partner ID (required)
 * @access  Private
 */
router.get('/stats', recommendationController.getRecommendationStats);

/**
 * @route   GET /api/recommendations/lead/:lead_id
 * @desc    Get recommendation for a specific lead
 * @param   lead_id - Lead ID
 * @query   user_id - User/Partner ID (optional)
 * @access  Private
 */
router.get('/lead/:lead_id', recommendationController.getLeadRecommendation);

/**
 * @route   POST /api/recommendations/invalidate
 * @desc    Invalidate recommendations cache
 * @body    user_id - User ID to invalidate (optional)
 * @body    lead_id - Lead ID to invalidate (optional)
 * @access  Private
 */
router.post('/invalidate', recommendationController.invalidateCache);

/**
 * @route   POST /api/recommendations/:id/feedback
 * @desc    Submit feedback on a recommendation
 * @param   id - Recommendation ID
 * @body    helpful - Boolean indicating if recommendation was helpful
 * @body    feedback_text - Optional feedback text
 * @access  Private
 */
router.post('/:id/feedback', recommendationController.submitFeedback);

/**
 * @route   GET /api/recommendations/lead/:lead_id/script
 * @desc    Get or generate call script for a lead
 * @param   lead_id - Lead ID
 * @query   user_id - User/Partner ID (optional)
 * @query   regenerate - Force regenerate script (default: false)
 * @access  Private
 */
router.get('/lead/:lead_id/script', recommendationController.getLeadScript);

/**
 * @route   GET /api/recommendations/lead/:lead_id/scripts
 * @desc    Get script history for a lead
 * @param   lead_id - Lead ID
 * @query   limit - Number of scripts to return (default: 10)
 * @access  Private
 */
router.get('/lead/:lead_id/scripts', recommendationController.getLeadScriptHistory);

/**
 * @route   POST /api/recommendations/scripts/:id/used
 * @desc    Mark script as used
 * @param   id - Script ID
 * @body    effectiveness - Rating 0-10 (optional)
 * @access  Private
 */
router.post('/scripts/:id/used', recommendationController.markScriptUsed);

/**
 * @route   POST /api/recommendations/scripts/:id/feedback
 * @desc    Submit feedback on a script
 * @param   id - Script ID
 * @body    feedback - Feedback text
 * @body    rating - Rating 0-10
 * @access  Private
 */
router.post('/scripts/:id/feedback', recommendationController.submitScriptFeedback);

module.exports = router;