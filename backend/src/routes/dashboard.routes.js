const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const analyticsController = require('../controllers/analytics.controller');

router.use(authMiddleware);

// Dashboard metrics
router.get('/metrics', analyticsController.getDashboardMetrics);
router.get('/recent-calls', analyticsController.getRecentCalls);
router.get('/recent-leads', analyticsController.getRecentLeads);
router.get('/active-campaigns', analyticsController.getActiveCampaigns);

module.exports = router;