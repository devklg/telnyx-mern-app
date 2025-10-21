const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const analyticsController = require('../controllers/analytics.controller');

router.use(authMiddleware);

// Analytics data
router.get('/overview', analyticsController.getOverview);
router.get('/calls', analyticsController.getCallAnalytics);
router.get('/leads', analyticsController.getLeadAnalytics);
router.get('/conversion', analyticsController.getConversionAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Time-based analytics
router.get('/daily', analyticsController.getDailyAnalytics);
router.get('/weekly', analyticsController.getWeeklyAnalytics);
router.get('/monthly', analyticsController.getMonthlyAnalytics);

module.exports = router;