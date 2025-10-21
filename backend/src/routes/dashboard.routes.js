/**
 * BMAD V4 - Dashboard Metrics Endpoints
 * 
 * @description Routes for dashboard data
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const analyticsController = require('../controllers/analytics.controller');

router.use(authenticate);

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get dashboard metrics
 * @access  Private
 */
router.get('/metrics',
  analyticsController.getDashboardMetrics
);

/**
 * @route   GET /api/dashboard/recent-activity
 * @desc    Get recent activity feed
 * @access  Private
 */
router.get('/recent-activity',
  analyticsController.getRecentActivity
);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get quick stats
 * @access  Private
 */
router.get('/stats',
  analyticsController.getQuickStats
);

module.exports = router;
