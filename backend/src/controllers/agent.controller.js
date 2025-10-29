const CallLog = require('../database/mongodb/schemas/calllog.schema');
const engagementService = require('../services/engagement.service');

/**
 * Agent Controller for Voice Agent Operations
 * Handles voice agent specific functionality and performance metrics
 *
 * @author David Rodriguez - Backend Development Lead
 */

/**
 * Record phase transition
 */
exports.recordPhaseTransition = async (req, res, next) => {
  try {
    const { callId, fromPhase, toPhase, timestamp } = req.body;

    if (!callId || !toPhase) {
      return res.status(400).json({
        success: false,
        error: 'callId and toPhase are required'
      });
    }

    const call = await CallLog.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Add event to call log
    call.events.push({
      eventType: 'other',
      timestamp: timestamp || new Date(),
      description: `Phase transition: ${fromPhase} → ${toPhase}`,
      data: { fromPhase, toPhase }
    });

    await call.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('call-monitoring').emit('call:phase-transition', {
        callId,
        fromPhase,
        toPhase,
        timestamp: timestamp || new Date()
      });
    }

    res.json({
      success: true,
      message: 'Phase transition recorded'
    });

  } catch (error) {
    console.error('Record phase transition error:', error);
    next(error);
  }
};

/**
 * Get agent performance metrics
 */
exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      isActive: true,
      status: 'completed'
    };

    if (startDate || endDate) {
      filter.initiatedAt = {};
      if (startDate) filter.initiatedAt.$gte = new Date(startDate);
      if (endDate) filter.initiatedAt.$lte = new Date(endDate);
    }

    const calls = await CallLog.find(filter).lean();

    const metrics = {
      totalCalls: calls.length,
      answeredCalls: calls.filter(c => c.answerState === 'human').length,
      averageDuration: calls.reduce((sum, c) => sum + (c.duration?.talking || 0), 0) / (calls.length || 1),
      averageEngagementScore: calls.reduce((sum, c) => sum + (c.aiAnalysis?.qualification?.score || 0), 0) / (calls.length || 1),
      transfersAttempted: calls.filter(c => c.transfer?.wasTransferred).length,
      transfersSuccessful: calls.filter(c => c.transfer?.transferSuccessful).length,
      callsByOutcome: {}
    };

    // Group by outcome
    calls.forEach(call => {
      const outcome = call.outcome?.result || 'unknown';
      metrics.callsByOutcome[outcome] = (metrics.callsByOutcome[outcome] || 0) + 1;
    });

    res.json({
      success: true,
      data: metrics,
      period: {
        startDate: startDate || 'all-time',
        endDate: endDate || 'now'
      }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    next(error);
  }
};

module.exports = exports;
