const CallLog = require('../database/mongodb/schemas/calllog.schema');
const Lead = require('../database/mongodb/schemas/lead.schema');
const telnyxService = require('../services/telnyx.service');
const kevinService = require('../services/kevin.service');
const engagementService = require('../services/engagement.service');

/**
 * Comprehensive Call Controller with Telnyx Integration
 * Handles call initiation, management, hot transfers, and real-time engagement scoring
 *
 * @author David Rodriguez - Backend Development Lead
 */

/**
 * Get all calls with filtering
 */
exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      direction,
      leadId,
      startDate,
      endDate
    } = req.query;

    const filter = { isActive: true };

    if (status) filter.status = status;
    if (direction) filter.direction = direction;
    if (leadId) filter.leadId = leadId;
    if (startDate || endDate) {
      filter.initiatedAt = {};
      if (startDate) filter.initiatedAt.$gte = new Date(startDate);
      if (endDate) filter.initiatedAt.$lte = new Date(endDate);
    }

    const calls = await CallLog.find(filter)
      .populate('leadId', 'firstName lastName phone email')
      .sort({ initiatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await CallLog.countDocuments(filter);

    res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get calls error:', error);
    next(error);
  }
};

/**
 * Get call by ID
 */
exports.getById = async (req, res, next) => {
  try {
    const call = await CallLog.findById(req.params.id)
      .populate('leadId', 'firstName lastName phone email company');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({ success: true, data: call });
  } catch (error) {
    console.error('Get call error:', error);
    next(error);
  }
};

/**
 * Start new voice agent call
 */
exports.startCall = async (req, res, next) => {
  try {
    const { leadId, phoneNumber } = req.body;

    if (!leadId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'leadId and phoneNumber are required'
      });
    }

    // Get lead information
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Check Kevin availability
    const kevinAvailable = await kevinService.isAvailable();

    // Create call log record
    const callLogId = `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const callData = {
      callLogId,
      leadId: lead._id,
      direction: 'outbound',
      callType: 'qualification',
      from: {
        number: process.env.TELNYX_PHONE_NUMBER || '+1234567890',
        displayName: 'Voice Agent'
      },
      to: {
        number: phoneNumber,
        displayName: `${lead.firstName} ${lead.lastName}`
      },
      status: 'initiated',
      initiatedAt: new Date(),
      telnyx: {
        apiResponse: {}
      }
    };

    const callLog = new CallLog(callData);
    await callLog.save();

    // Initiate Telnyx call
    const telnyxResult = await telnyxService.initiateCall(
      phoneNumber,
      callLog._id,
      {
        client_state: JSON.stringify({
          callLogId: callLog.callLogId,
          leadId: lead._id,
          kevinAvailable
        })
      }
    );

    if (!telnyxResult.success) {
      callLog.status = 'failed';
      callLog.errors.push({
        errorType: 'telnyx_api',
        errorMessage: telnyxResult.error,
        timestamp: new Date(),
        severity: 'high'
      });
      await callLog.save();

      return res.status(500).json({
        success: false,
        error: 'Failed to initiate call via Telnyx',
        details: telnyxResult.error
      });
    }

    // Update call log with Telnyx information
    callLog.telnyx.callControlId = telnyxResult.callControlId;
    callLog.telnyx.callSessionId = telnyxResult.telnyxCallId;
    callLog.telnyx.apiResponse = telnyxResult.data;
    callLog.status = 'ringing';
    callLog.ringingAt = new Date();
    await callLog.save();

    // Emit socket event for real-time monitoring
    const io = req.app.get('io');
    if (io) {
      io.emit('call:started', {
        callId: callLog._id,
        callLogId: callLog.callLogId,
        leadId: lead._id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        phoneNumber,
        kevinAvailable,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      data: {
        callId: callLog._id,
        callLogId: callLog.callLogId,
        telnyxCallId: telnyxResult.telnyxCallId,
        status: 'initiated',
        kevinAvailable
      },
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('Start call error:', error);
    next(error);
  }
};

/**
 * Update real-time engagement score
 */
exports.updateEngagementScore = async (req, res, next) => {
  try {
    const { callId, indicators, conversationText, phase } = req.body;

    if (!callId || !indicators) {
      return res.status(400).json({
        success: false,
        error: 'callId and indicators are required'
      });
    }

    const call = await CallLog.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Calculate engagement score
    const engagementScore = engagementService.calculateScore(indicators);

    // Analyze buying signals if conversation text provided
    let buyingSignals = [];
    if (conversationText) {
      const signalAnalysis = engagementService.detectBuyingSignals(conversationText);
      buyingSignals = signalAnalysis.signals;
    }

    // Update call log AI analysis
    if (!call.aiAnalysis) {
      call.aiAnalysis = {};
    }

    if (!call.aiAnalysis.qualification) {
      call.aiAnalysis.qualification = {
        signals: [],
        score: 0
      };
    }

    call.aiAnalysis.qualification.score = engagementScore;
    call.aiAnalysis.qualification.signals.push(...buyingSignals);

    await call.save();

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('call-monitoring').emit('call:engagement-update', {
        callId: call._id,
        callLogId: call.callLogId,
        engagementScore,
        phase,
        indicators,
        buyingSignals,
        timestamp: new Date()
      });
    }

    // Check for hot transfer opportunity
    const kevinAvailable = await kevinService.isAvailable();
    const shouldTransfer = engagementService.shouldTransfer(engagementScore, kevinAvailable);

    if (shouldTransfer && !call.transfer?.wasTransferred) {
      if (io) {
        io.to('call-monitoring').emit('transfer-opportunity', {
          callId: call._id,
          callLogId: call.callLogId,
          engagementScore,
          suggestTransfer: true,
          kevinAvailable: true,
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      data: {
        callId: call._id,
        engagementScore,
        buyingSignals,
        suggestTransfer: shouldTransfer,
        kevinAvailable
      }
    });

  } catch (error) {
    console.error('Update engagement error:', error);
    next(error);
  }
};

/**
 * Initiate hot transfer to Kevin
 */
exports.initiateHotTransfer = async (req, res, next) => {
  try {
    const { id: callId } = req.params;

    const call = await CallLog.findById(callId).populate('leadId');
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Check Kevin availability again
    const kevinAvailable = await kevinService.isAvailable();
    if (!kevinAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Kevin is not available for transfer'
      });
    }

    // Check if already transferred
    if (call.transfer?.wasTransferred) {
      return res.status(400).json({
        success: false,
        error: 'Call has already been transferred'
      });
    }

    // Create conference call with Kevin
    const conferenceName = `transfer-${call.callLogId}`;
    const transferResult = await telnyxService.createConferenceCall(
      call.telnyx.callControlId,
      process.env.KEVIN_PHONE_NUMBER,
      conferenceName
    );

    // Update call record
    if (!call.transfer) {
      call.transfer = {};
    }

    call.transfer.wasTransferred = true;
    call.transfer.transferType = 'warm';
    call.transfer.transferredAt = new Date();
    call.transfer.transferSuccessful = transferResult.success;
    call.transfer.transferredTo = {
      number: process.env.KEVIN_PHONE_NUMBER,
      name: 'Kevin'
    };

    if (transferResult.success) {
      call.status = 'bridged';

      // Set Kevin as busy
      await kevinService.setBusy(30, 'In transferred call');

      // Record transfer in Kevin service
      await kevinService.recordTransfer({
        callId: call._id,
        leadId: call.leadId?._id,
        engagementScore: call.aiAnalysis?.qualification?.score || 0,
        success: true,
        timestamp: new Date()
      });
    } else {
      call.transfer.transferReason = 'Transfer failed - continuing with agent';
    }

    await call.save();

    // Emit transfer event
    const io = req.app.get('io');
    if (io) {
      io.emit('call:transfer', {
        callId: call._id,
        callLogId: call.callLogId,
        success: transferResult.success,
        kevinJoined: transferResult.success,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        callId: call._id,
        transferSuccess: transferResult.success,
        message: transferResult.success
          ? 'Transfer successful - Kevin joined the call'
          : 'Transfer failed - continuing with agent',
        conferenceName: transferResult.success ? conferenceName : null
      }
    });

  } catch (error) {
    console.error('Hot transfer error:', error);
    next(error);
  }
};

/**
 * End call
 */
exports.endCall = async (req, res, next) => {
  try {
    const { id: callId } = req.params;
    const { outcome, notes } = req.body;

    const call = await CallLog.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Hangup via Telnyx if still active
    if (call.telnyx?.callControlId && call.status !== 'completed') {
      await telnyxService.hangupCall(call.telnyx.callControlId);
    }

    // Update call record
    call.status = 'completed';
    call.endedAt = new Date();

    if (outcome) {
      call.outcome = {
        ...call.outcome,
        ...outcome
      };
    }

    if (notes) {
      call.notes.push({
        text: notes,
        createdAt: new Date(),
        createdBy: req.user?.userId,
        type: 'general'
      });
    }

    await call.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('call:ended', {
        callId: call._id,
        callLogId: call.callLogId,
        duration: call.duration?.total || 0,
        outcome: call.outcome,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: call,
      message: 'Call ended successfully'
    });

  } catch (error) {
    console.error('End call error:', error);
    next(error);
  }
};

/**
 * Get active calls
 */
exports.getActiveCalls = async (req, res, next) => {
  try {
    const activeCalls = await CallLog.find({
      status: { $in: ['active', 'answered', 'bridged', 'ringing'] },
      isActive: true
    })
    .populate('leadId', 'firstName lastName phone email')
    .sort({ initiatedAt: -1 })
    .lean();

    res.json({
      success: true,
      data: activeCalls,
      count: activeCalls.length
    });

  } catch (error) {
    console.error('Get active calls error:', error);
    next(error);
  }
};

/**
 * Get call recording
 */
exports.getRecording = async (req, res, next) => {
  try {
    const call = await CallLog.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (!call.recording?.recordingUrl) {
      return res.status(404).json({
        success: false,
        message: 'Recording not available'
      });
    }

    res.json({
      success: true,
      url: call.recording.recordingUrl,
      duration: call.recording.recordingDuration,
      format: call.recording.recordingFormat
    });

  } catch (error) {
    console.error('Get recording error:', error);
    next(error);
  }
};

module.exports = exports;
