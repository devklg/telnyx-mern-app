/**
 * BMAD V4 - Analytics Data Endpoints
 * 
 * @description Routes for analytics and reporting data
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const analyticsController = require('../controllers/analytics.controller');

router.use(authenticate);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get analytics overview
 * @access  Private
 */
router.get('/overview',
  analyticsController.getOverview
);

/**
 * @route   GET /api/analytics/conversion
 * @desc    Get conversion metrics
 * @access  Private
 */
router.get('/conversion',
  analyticsController.getConversionMetrics
);

/**
 * @route   GET /api/analytics/performance
 * @desc    Get performance metrics
 * @access  Private
 */
router.get('/performance',
  analyticsController.getPerformanceMetrics
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get trend data
 * @access  Private
 */
router.get('/trends',
  analyticsController.getTrends
);

module.exports = router;
