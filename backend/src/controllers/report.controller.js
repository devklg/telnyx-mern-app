/**
 * BMAD V4 - Report Creation
 * 
 * @description Controller for generating reports
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const { catchAsync } = require('../middleware/error.middleware');
const analyticsService = require('../services/analytics.service');

/**
 * Generate daily report
 */
exports.generateDailyReport = catchAsync(async (req, res) => {
  const { date } = req.query;
  const reportDate = date ? new Date(date) : new Date();

  const report = await analyticsService.generateDailyReport(reportDate);

  res.json({
    success: true,
    data: report,
    reportType: 'daily',
    generatedAt: new Date()
  });
});

/**
 * Generate weekly report
 */
exports.generateWeeklyReport = catchAsync(async (req, res) => {
  const { weekStart } = req.query;
  const startDate = weekStart ? new Date(weekStart) : new Date();

  const report = await analyticsService.generateWeeklyReport(startDate);

  res.json({
    success: true,
    data: report,
    reportType: 'weekly',
    generatedAt: new Date()
  });
});

/**
 * Generate monthly report
 */
exports.generateMonthlyReport = catchAsync(async (req, res) => {
  const { year, month } = req.query;
  const currentDate = new Date();
  
  const reportYear = year ? parseInt(year) : currentDate.getFullYear();
  const reportMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

  const report = await analyticsService.generateMonthlyReport({
    year: reportYear,
    month: reportMonth
  });

  res.json({
    success: true,
    data: report,
    reportType: 'monthly',
    generatedAt: new Date()
  });
});

/**
 * Generate custom report
 */
exports.generateCustomReport = catchAsync(async (req, res) => {
  const { startDate, endDate, metrics, filters } = req.body;

  const report = await analyticsService.generateCustomReport({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    metrics,
    filters
  });

  res.json({
    success: true,
    data: report,
    reportType: 'custom',
    generatedAt: new Date()
  });
});
