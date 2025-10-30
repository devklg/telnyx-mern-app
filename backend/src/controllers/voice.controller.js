const telnyxService = require('../services/telnyx.service');
const telnyxWebSocket = require('../websocket/telnyx-websocket.service');
const voiceAgentService = require('../services/voice-agent.service');

/**
 * Test Telnyx API connectivity
 */
exports.testConnection = async (req, res, next) => {
  try {
    const result = await telnyxService.testConnection();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Telnyx WebSocket status
 */
exports.getWebSocketStatus = async (req, res, next) => {
  try {
    const status = telnyxWebSocket.getStatus();
    res.json({
      success: true,
      websocket: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Telnyx configuration (masked)
 */
exports.getConfiguration = async (req, res, next) => {
  try {
    const config = telnyxService.getConfiguration();
    res.json({
      success: true,
      configured: telnyxService.isConfigured(),
      advancedFeatures: telnyxService.hasAdvancedFeatures(),
      webhookUrl: telnyxService.getWebhookUrl(),
      config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate outbound call
 */
exports.initiateCall = async (req, res, next) => {
  try {
    const { phoneNumber, callId, metadata } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await telnyxService.initiateCall(
      phoneNumber,
      callId || `call-${Date.now()}`,
      metadata
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer call
 */
exports.transferCall = async (req, res, next) => {
  try {
    const { callControlId, toNumber, type } = req.body;

    if (!callControlId || !toNumber) {
      return res.status(400).json({
        success: false,
        error: 'Call control ID and destination number are required'
      });
    }

    let result;
    if (type === 'blind') {
      result = await telnyxService.blindTransfer(callControlId, toNumber);
    } else {
      // Default to hot transfer (conference)
      const conferenceName = `transfer-${Date.now()}`;
      result = await telnyxService.createConferenceCall(callControlId, toNumber, conferenceName);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get call status
 */
exports.getCallStatus = async (req, res, next) => {
  try {
    const { callControlId } = req.params;
    const result = await telnyxService.getCallInfo(callControlId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Answer call
 */
exports.answerCall = async (req, res, next) => {
  try {
    const { callControlId } = req.body;
    const result = await telnyxService.answerCall(callControlId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Hangup call
 */
exports.hangupCall = async (req, res, next) => {
  try {
    const { callControlId } = req.body;
    const result = await telnyxService.hangupCall(callControlId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Start recording
 */
exports.startRecording = async (req, res, next) => {
  try {
    const { callControlId, format, channels } = req.body;
    const result = await telnyxService.startRecording(callControlId, format, channels);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Stop recording
 */
exports.stopRecording = async (req, res, next) => {
  try {
    const { callControlId } = req.body;
    const result = await telnyxService.stopRecording(callControlId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Test voice agent connectivity
 */
exports.testVoiceAgent = async (req, res, next) => {
  try {
    const result = await voiceAgentService.testConnection();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get voice agent configuration
 */
exports.getVoiceAgentConfig = async (req, res, next) => {
  try {
    const config = voiceAgentService.getConfiguration();
    res.json({
      success: true,
      configured: voiceAgentService.isConfigured(),
      config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start call with voice agent
 */
exports.startCallWithAgent = async (req, res, next) => {
  try {
    const { callId, callControlId, phoneNumber, leadId, leadData } = req.body;

    if (!callId || !callControlId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID and call control ID are required'
      });
    }

    const result = await voiceAgentService.startCall({
      callId,
      callControlId,
      phoneNumber,
      leadId,
      leadData
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Request transfer to Kevin
 */
exports.requestKevinTransfer = async (req, res, next) => {
  try {
    const { callId, callControlId, qualificationScore, leadData } = req.body;

    if (!callId || !callControlId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID and call control ID are required'
      });
    }

    const result = await voiceAgentService.requestTransfer(
      callId,
      callControlId,
      qualificationScore,
      leadData
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};
