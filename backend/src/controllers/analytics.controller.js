const analyticsService = require('../services/analytics.service');

exports.getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverview(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getConversionMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getConversionMetrics(req.query);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getPerformanceMetrics(req.query);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};
