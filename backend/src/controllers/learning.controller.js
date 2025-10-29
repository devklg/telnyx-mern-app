const CallLog = require('../database/mongodb/schemas/calllog.schema');
const engagementService = require('../services/engagement.service');

/**
 * Learning Controller for AI Insights
 * Handles learning insights, patterns, and recommendations
 *
 * @author David Rodriguez - Backend Development Lead
 */

/**
 * Get learning insights
 */
exports.getInsights = async (req, res, next) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;

    const filter = {
      status: 'completed',
      'aiAnalysis.qualification.score': { $exists: true }
    };

    if (startDate || endDate) {
      filter.initiatedAt = {};
      if (startDate) filter.initiatedAt.$gte = new Date(startDate);
      if (endDate) filter.initiatedAt.$lte = new Date(endDate);
    }

    const calls = await CallLog.find(filter)
      .sort({ initiatedAt: -1 })
      .limit(parseInt(limit))
      .select('aiAnalysis outcome duration transfer initiatedAt')
      .lean();

    const insights = {
      totalAnalyzed: calls.length,
      averageEngagementScore: 0,
      topBuyingSignals: {},
      successPatterns: [],
      transferCorrelation: {
        highEngagementTransfers: 0,
        transferSuccessRate: 0
      }
    };

    if (calls.length > 0) {
      insights.averageEngagementScore = calls.reduce((sum, c) =>
        sum + (c.aiAnalysis?.qualification?.score || 0), 0) / calls.length;

      // Analyze buying signals
      calls.forEach(call => {
        const signals = call.aiAnalysis?.qualification?.signals || [];
        signals.forEach(signal => {
          insights.topBuyingSignals[signal] = (insights.topBuyingSignals[signal] || 0) + 1;
        });
      });

      // Transfer correlation
      const transfers = calls.filter(c => c.transfer?.wasTransferred);
      insights.transferCorrelation.highEngagementTransfers = transfers.filter(c =>
        c.aiAnalysis?.qualification?.score >= 85).length;
      insights.transferCorrelation.transferSuccessRate = transfers.length > 0
        ? (transfers.filter(c => c.transfer?.transferSuccessful).length / transfers.length) * 100
        : 0;
    }

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Get insights error:', error);
    next(error);
  }
};

/**
 * Get conversation patterns
 */
exports.getPatterns = async (req, res, next) => {
  try {
    const successfulCalls = await CallLog.find({
      'outcome.result': { $in: ['qualified', 'scheduled-callback', 'appointmentSet'] },
      'aiAnalysis.qualification.score': { $gte: 70 }
    })
    .limit(50)
    .select('aiAnalysis duration outcome')
    .lean();

    const patterns = {
      commonSignals: {},
      averageDuration: 0,
      keywordFrequency: {}
    };

    if (successfulCalls.length > 0) {
      patterns.averageDuration = successfulCalls.reduce((sum, c) =>
        sum + (c.duration?.talking || 0), 0) / successfulCalls.length;

      successfulCalls.forEach(call => {
        const signals = call.aiAnalysis?.qualification?.signals || [];
        signals.forEach(signal => {
          patterns.commonSignals[signal] = (patterns.commonSignals[signal] || 0) + 1;
        });
      });
    }

    res.json({
      success: true,
      data: patterns,
      sampleSize: successfulCalls.length
    });

  } catch (error) {
    console.error('Get patterns error:', error);
    next(error);
  }
};

module.exports = exports;
