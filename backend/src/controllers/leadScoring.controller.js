/**
 * Lead Scoring Controller
 *
 * REST API endpoints for lead scoring operations:
 * - Calculate/recalculate lead scores
 * - View score history and trends
 * - Get top-scored leads
 * - Manage scoring configuration
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const {
  calculateLeadScore,
  applyScoreDecay,
  getScoreHistory,
  getTopScoredLeads,
  recalculateAllScores,
  getScoringWeights,
  updateScoringWeights
} = require('../services/leadScoringService');
const { queueScoreCalculation } = require('../queues/leadScoring.queue');
const { cache } = require('../config/redis');

/**
 * Calculate or recalculate score for a specific lead
 * POST /api/leads/:lead_id/calculate-score
 */
exports.calculateScore = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { async = false } = req.query;

    if (async === 'true') {
      // Queue for async processing
      await queueScoreCalculation(lead_id);

      return res.json({
        success: true,
        message: 'Score calculation queued',
        leadId: lead_id
      });
    }

    // Synchronous calculation
    const score = await calculateLeadScore(lead_id);

    res.json({
      success: true,
      data: score,
      message: 'Lead score calculated successfully'
    });

  } catch (error) {
    console.error('Calculate score error:', error);
    next(error);
  }
};

/**
 * Get score history for a lead
 * GET /api/leads/:lead_id/score-history
 */
exports.getScoreHistory = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { limit = 10 } = req.query;

    const history = await getScoreHistory(lead_id, parseInt(limit));

    // Calculate trend
    let trend = 'stable';
    if (history.length >= 2) {
      const latest = history[0].score;
      const previous = history[1].score;
      const change = latest - previous;

      if (change > 10) {
        trend = 'increasing';
      } else if (change < -10) {
        trend = 'decreasing';
      }
    }

    res.json({
      success: true,
      data: {
        history,
        trend,
        count: history.length
      }
    });

  } catch (error) {
    console.error('Get score history error:', error);
    next(error);
  }
};

/**
 * Get top-scored leads (hot leads list)
 * GET /api/leads/top-scored
 */
exports.getTopScored = async (req, res, next) => {
  try {
    const { limit = 50, minScore = 80 } = req.query;

    // Check cache first
    const cacheKey = `leads:top_scored:${minScore}:${limit}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    // Fetch from database
    const leads = await getTopScoredLeads(parseInt(limit), parseInt(minScore));

    // Cache for 30 minutes
    await cache.set(cacheKey, JSON.stringify(leads), 1800);

    res.json({
      success: true,
      data: leads,
      count: leads.length
    });

  } catch (error) {
    console.error('Get top scored error:', error);
    next(error);
  }
};

/**
 * Apply score decay to a lead
 * POST /api/leads/:lead_id/apply-decay
 */
exports.applyDecay = async (req, res, next) => {
  try {
    const { lead_id } = req.params;

    const score = await applyScoreDecay(lead_id);

    res.json({
      success: true,
      data: score,
      message: 'Score decay applied successfully'
    });

  } catch (error) {
    console.error('Apply decay error:', error);
    next(error);
  }
};

/**
 * Batch recalculate all lead scores
 * POST /api/admin/lead-scoring/recalculate-all
 * Requires admin permissions
 */
exports.recalculateAll = async (req, res, next) => {
  try {
    const { batchSize = 100, async = true } = req.body;

    if (async) {
      // Queue for async processing
      const { queueBatchRecalculation } = require('../queues/leadScoring.queue');
      await queueBatchRecalculation({ batchSize });

      return res.json({
        success: true,
        message: 'Batch recalculation queued',
        batchSize
      });
    }

    // Synchronous recalculation (may take a while)
    const result = await recalculateAllScores(batchSize);

    res.json({
      success: true,
      data: result,
      message: 'Batch recalculation completed'
    });

  } catch (error) {
    console.error('Recalculate all error:', error);
    next(error);
  }
};

/**
 * Get current scoring configuration
 * GET /api/admin/lead-scoring/config
 */
exports.getConfig = async (req, res, next) => {
  try {
    const weights = await getScoringWeights();

    res.json({
      success: true,
      data: {
        weights,
        maxScores: {
          qualification: 40,
          engagement: 30,
          intent: 20,
          demographic: 10,
          total: 100
        },
        decayRates: {
          engagement: '20% per month',
          intent: '50% per month'
        },
        classifications: {
          hot: '80-100 points',
          warm: '60-79 points',
          cool: '40-59 points',
          cold: '< 40 points'
        }
      }
    });

  } catch (error) {
    console.error('Get config error:', error);
    next(error);
  }
};

/**
 * Update scoring configuration weights
 * PATCH /api/admin/lead-scoring/config
 * Requires master admin permissions
 */
exports.updateConfig = async (req, res, next) => {
  try {
    const { weights } = req.body;

    if (!weights) {
      return res.status(400).json({
        success: false,
        error: 'Weights object is required'
      });
    }

    // Validate weights
    const requiredFields = ['qualification', 'engagement', 'intent', 'demographic'];
    for (const field of requiredFields) {
      if (typeof weights[field] !== 'number' || weights[field] < 0 || weights[field] > 1) {
        return res.status(400).json({
          success: false,
          error: `Invalid weight for ${field}. Must be a number between 0 and 1.`
        });
      }
    }

    // Weights should sum to 1.0 (with some tolerance)
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Weights must sum to 1.0 (current sum: ${sum})`
      });
    }

    await updateScoringWeights(weights);

    res.json({
      success: true,
      data: weights,
      message: 'Scoring weights updated successfully'
    });

  } catch (error) {
    console.error('Update config error:', error);
    next(error);
  }
};

/**
 * Get scoring statistics and insights
 * GET /api/admin/lead-scoring/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const Lead = require('../database/mongodb/schemas/lead.schema');

    // Get score distribution
    const distribution = await Lead.aggregate([
      {
        $match: {
          doNotCall: { $ne: true },
          status: { $nin: ['completed', 'not_interested'] }
        }
      },
      {
        $bucket: {
          groupBy: '$qualificationScore',
          boundaries: [0, 40, 60, 80, 101],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$qualificationScore' }
          }
        }
      }
    ]);

    // Map boundaries to classifications
    const classificationMap = {
      0: 'cold',
      40: 'cool',
      60: 'warm',
      80: 'hot'
    };

    const stats = {
      distribution: distribution.map(bucket => ({
        classification: classificationMap[bucket._id] || bucket._id,
        range: bucket._id === 80 ? '80-100' : `${bucket._id}-${bucket._id + 19}`,
        count: bucket.count,
        avgScore: Math.round(bucket.avgScore)
      })),
      totalLeads: distribution.reduce((sum, b) => sum + b.count, 0)
    };

    // Calculate percentages
    stats.distribution = stats.distribution.map(item => ({
      ...item,
      percentage: ((item.count / stats.totalLeads) * 100).toFixed(1)
    }));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    next(error);
  }
};

/**
 * Get score breakdown for a specific lead
 * GET /api/leads/:lead_id/score-breakdown
 */
exports.getScoreBreakdown = async (req, res, next) => {
  try {
    const { lead_id } = req.params;

    // Check cache first
    const cacheKey = `lead:score:${lead_id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    // Calculate fresh score
    const score = await calculateLeadScore(lead_id);

    res.json({
      success: true,
      data: score
    });

  } catch (error) {
    console.error('Get score breakdown error:', error);
    next(error);
  }
};

/**
 * Compare lead scores across time periods
 * GET /api/leads/:lead_id/score-comparison
 */
exports.getScoreComparison = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { periods = 3 } = req.query; // Default to last 3 periods

    const history = await getScoreHistory(lead_id, parseInt(periods));

    if (history.length < 2) {
      return res.json({
        success: true,
        data: {
          message: 'Not enough history for comparison',
          history
        }
      });
    }

    // Calculate changes between periods
    const comparisons = [];
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];
      const previous = history[i + 1];

      const currentFactors = typeof current.factors === 'string'
        ? JSON.parse(current.factors)
        : current.factors;

      const previousFactors = typeof previous.factors === 'string'
        ? JSON.parse(previous.factors)
        : previous.factors;

      comparisons.push({
        period: {
          from: previous.calculated_at,
          to: current.calculated_at
        },
        changes: {
          total: current.score - previous.score,
          qualification: currentFactors.qualification - previousFactors.qualification,
          engagement: currentFactors.engagement - previousFactors.engagement,
          intent: currentFactors.intent - previousFactors.intent,
          demographic: currentFactors.demographic - previousFactors.demographic
        },
        classification: {
          from: previousFactors.classification,
          to: currentFactors.classification
        }
      });
    }

    res.json({
      success: true,
      data: {
        history,
        comparisons,
        summary: {
          totalChange: history[0].score - history[history.length - 1].score,
          trend: comparisons[0].changes.total > 0 ? 'improving' : 'declining'
        }
      }
    });

  } catch (error) {
    console.error('Get score comparison error:', error);
    next(error);
  }
};

module.exports = exports;