/**
 * BMAD V4 - Scoring Calculations
 * 
 * @description Controller for lead scoring
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const scoringService = require('../services/scoring.service');
const logger = require('../utils/logger');

/**
 * Calculate lead score
 */
exports.calculateScore = catchAsync(async (req, res) => {
  const { leadId } = req.body;

  if (!leadId) {
    throw new AppError('Lead ID is required', 400);
  }

  const score = await scoringService.calculateScore(leadId);

  logger.info(`Lead score calculated: ${leadId}, Score: ${score.totalScore}`);

  // Emit socket event
  req.app.get('io').emit('score:calculated', score);

  res.json({
    success: true,
    data: score,
    message: 'Score calculated successfully'
  });
});

/**
 * Get lead score history
 */
exports.getLeadScore = catchAsync(async (req, res) => {
  const { leadId } = req.params;

  const scoreHistory = await scoringService.getLeadScoreHistory(leadId);

  if (!scoreHistory) {
    throw new AppError('Score history not found', 404);
  }

  res.json({
    success: true,
    data: scoreHistory
  });
});

/**
 * Get top scored leads (leaderboard)
 */
exports.getLeaderboard = catchAsync(async (req, res) => {
  const { limit = 10, timeframe = '30d' } = req.query;

  const leaderboard = await scoringService.getLeaderboard({
    limit: parseInt(limit),
    timeframe
  });

  res.json({
    success: true,
    data: leaderboard
  });
});
