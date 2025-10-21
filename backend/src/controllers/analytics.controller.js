/**
 * BMAD V4 - Analytics Generation
 * 
 * @description Controller for analytics and metrics
 * @owner David Rodriguez (Backend Lead) & Angela White (Analytics)
 * @created 2025-10-21
 */

const { catchAsync } = require('../middleware/error.middleware');
const analyticsService = require('../services/analytics.service');

/**
 * Get analytics overview
 */
exports.getOverview = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const overview = await analyticsService.getOverview({
    startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: endDate || new Date()
  });

  res.json({
    success: true,
    data: overview
  });
});

/**
 * Get conversion metrics
 */
exports.getConversionMetrics = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const metrics = await analyticsService.getConversionMetrics({
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * Get performance metrics
 */
exports.getPerformanceMetrics = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const metrics = await analyticsService.getPerformanceMetrics({
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * Get trend data
 */
exports.getTrends = catchAsync(async (req, res) => {
  const { metric = 'calls', period = '7d' } = req.query;

  const trends = await analyticsService.getTrends({
    metric,
    period
  });

  res.json({
    success: true,
    data: trends
  });
});

/**
 * Get dashboard metrics
 */
exports.getDashboardMetrics = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getDashboardMetrics();

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * Get recent activity feed
 */
exports.getRecentActivity = catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;

  const activity = await analyticsService.getRecentActivity(parseInt(limit));

  res.json({
    success: true,
    data: activity
  });
});

/**
 * Get quick stats
 */
exports.getQuickStats = catchAsync(async (req, res) => {
  const stats = await analyticsService.getQuickStats();

  res.json({
    success: true,
    data: stats
  });
});
