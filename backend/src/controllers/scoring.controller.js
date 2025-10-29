const scoringService = require('../services/scoring.service');

exports.calculateScore = async (req, res, next) => {
  try {
    const score = await scoringService.calculate(req.params.leadId);
    res.json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
};

exports.getScore = async (req, res, next) => {
  try {
    const score = await scoringService.getByLeadId(req.params.leadId);
    res.json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
};

exports.updateScore = async (req, res, next) => {
  try {
    const result = await scoringService.update(req.params.leadId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
