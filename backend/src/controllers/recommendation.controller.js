/**
 * Recommendation Controller
 *
 * API endpoints for AI-powered follow-up recommendations
 *
 * Endpoints:
 * - GET /api/leads/recommendations?user_id={id} - Get top 10 recommendations
 * - GET /api/leads/:lead_id/recommendation - Get recommendation for specific lead
 * - POST /api/recommendations/:id/feedback - Submit feedback on recommendation
 * - GET /api/leads/:lead_id/script - Get or generate call script
 * - POST /api/scripts/:id/used - Mark script as used
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const {
  generateRecommendation,
  generateUserRecommendations
} = require('../services/aiRecommendationService');
const {
  getOrGenerateScript,
  markScriptAsUsed,
  getScriptHistory,
  provideScriptFeedback
} = require('../services/scriptGenerationService');
const { cache } = require('../config/redis');

/**
 * Get top recommendations for a user
 * GET /api/leads/recommendations?user_id={id}&limit=10&status=contacted
 */
exports.getUserRecommendations = async (req, res, next) => {
  try {
    const { user_id, limit = 10, status, force_refresh } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Check Redis cache first (unless force_refresh)
    const cacheKey = `lead_recommendations:${user_id}:${status || 'all'}:${limit}`;

    if (!force_refresh) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
          message: 'Recommendations retrieved from cache'
        });
      }
    }

    // Generate fresh recommendations
    const recommendations = await generateUserRecommendations(user_id, {
      limit: parseInt(limit),
      status
    });

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, JSON.stringify(recommendations), 3600);

    res.json({
      success: true,
      data: recommendations,
      cached: false,
      count: recommendations.length,
      message: 'Recommendations generated successfully'
    });

  } catch (error) {
    console.error('Error getting user recommendations:', error);
    next(error);
  }
};

/**
 * Get recommendation for a specific lead
 * GET /api/leads/:lead_id/recommendation
 */
exports.getLeadRecommendation = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { user_id } = req.query;

    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: 'lead_id is required'
      });
    }

    // Check cache
    const cacheKey = `lead_recommendation:${lead_id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    // Generate recommendation
    const recommendation = await generateRecommendation(lead_id, user_id);

    // Cache for 1 hour
    await cache.set(cacheKey, JSON.stringify(recommendation), 3600);

    res.json({
      success: true,
      data: recommendation,
      cached: false
    });

  } catch (error) {
    console.error('Error getting lead recommendation:', error);
    next(error);
  }
};

/**
 * Invalidate recommendations cache for a user
 * POST /api/recommendations/invalidate
 */
exports.invalidateCache = async (req, res, next) => {
  try {
    const { user_id, lead_id } = req.body;

    if (user_id) {
      // Invalidate all user recommendations
      // Note: This is a simple implementation. For production, use Redis pattern matching
      const statuses = ['all', 'new', 'contacted', 'qualified', 'callback'];
      for (const status of statuses) {
        await cache.del(`lead_recommendations:${user_id}:${status}:10`);
        await cache.del(`lead_recommendations:${user_id}:${status}:20`);
      }
    }

    if (lead_id) {
      // Invalidate specific lead recommendation
      await cache.del(`lead_recommendation:${lead_id}`);
    }

    res.json({
      success: true,
      message: 'Cache invalidated successfully'
    });

  } catch (error) {
    console.error('Error invalidating cache:', error);
    next(error);
  }
};

/**
 * Submit feedback on a recommendation
 * POST /api/recommendations/:id/feedback
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { helpful, feedback_text } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'helpful (boolean) is required'
      });
    }

    // Store feedback (you can create a separate collection for this)
    const mongoose = require('mongoose');

    // Define feedback schema inline for now
    const feedbackSchema = new mongoose.Schema({
      recommendationId: String,
      helpful: Boolean,
      feedbackText: String,
      submittedAt: { type: Date, default: Date.now }
    });

    const RecommendationFeedback = mongoose.models.RecommendationFeedback ||
      mongoose.model('RecommendationFeedback', feedbackSchema);

    const feedbackDoc = new RecommendationFeedback({
      recommendationId: id,
      helpful,
      feedbackText: feedback_text
    });

    await feedbackDoc.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedbackDoc
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    next(error);
  }
};

/**
 * Get or generate call script for a lead
 * GET /api/leads/:lead_id/script?user_id={id}&regenerate=false
 */
exports.getLeadScript = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { user_id, regenerate = false } = req.query;

    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: 'lead_id is required'
      });
    }

    const forceRegenerate = regenerate === 'true' || regenerate === true;

    const script = await getOrGenerateScript(lead_id, user_id, forceRegenerate);

    res.json({
      success: true,
      data: script
    });

  } catch (error) {
    console.error('Error getting lead script:', error);
    next(error);
  }
};

/**
 * Mark script as used
 * POST /api/scripts/:id/used
 */
exports.markScriptUsed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { effectiveness } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'script id is required'
      });
    }

    const script = await markScriptAsUsed(id, effectiveness);

    res.json({
      success: true,
      data: script,
      message: 'Script marked as used'
    });

  } catch (error) {
    console.error('Error marking script as used:', error);
    next(error);
  }
};

/**
 * Get script history for a lead
 * GET /api/leads/:lead_id/scripts
 */
exports.getLeadScriptHistory = async (req, res, next) => {
  try {
    const { lead_id } = req.params;
    const { limit = 10 } = req.query;

    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: 'lead_id is required'
      });
    }

    const scripts = await getScriptHistory(lead_id, parseInt(limit));

    res.json({
      success: true,
      data: scripts,
      count: scripts.length
    });

  } catch (error) {
    console.error('Error getting script history:', error);
    next(error);
  }
};

/**
 * Submit feedback on a script
 * POST /api/scripts/:id/feedback
 */
exports.submitScriptFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback, rating } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'script id is required'
      });
    }

    if (rating !== undefined && (rating < 0 || rating > 10)) {
      return res.status(400).json({
        success: false,
        error: 'rating must be between 0 and 10'
      });
    }

    const script = await provideScriptFeedback(id, feedback, rating);

    res.json({
      success: true,
      data: script,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting script feedback:', error);
    next(error);
  }
};

/**
 * Get recommendation statistics
 * GET /api/recommendations/stats?user_id={id}
 */
exports.getRecommendationStats = async (req, res, next) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Get feedback statistics
    const mongoose = require('mongoose');
    const RecommendationFeedback = mongoose.models.RecommendationFeedback;

    if (!RecommendationFeedback) {
      return res.json({
        success: true,
        data: {
          totalFeedback: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          helpfulPercentage: 0
        }
      });
    }

    const feedbackStats = await RecommendationFeedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          helpful: { $sum: { $cond: ['$helpful', 1, 0] } },
          notHelpful: { $sum: { $cond: ['$helpful', 0, 1] } }
        }
      }
    ]);

    const stats = feedbackStats.length > 0 ? feedbackStats[0] : {
      total: 0,
      helpful: 0,
      notHelpful: 0
    };

    res.json({
      success: true,
      data: {
        totalFeedback: stats.total,
        helpfulCount: stats.helpful,
        notHelpfulCount: stats.notHelpful,
        helpfulPercentage: stats.total > 0
          ? ((stats.helpful / stats.total) * 100).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('Error getting recommendation stats:', error);
    next(error);
  }
};

module.exports = exports;