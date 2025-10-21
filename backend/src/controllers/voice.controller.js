/**
 * BMAD V4 - Voice Agent Logic
 * 
 * @description Controller for voice agent operations
 * @owner David Rodriguez (Backend Lead) & Jennifer Kim (Telnyx)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Initiate voice agent call
 */
exports.dialLead = catchAsync(async (req, res) => {
  const { leadId, phoneNumber } = req.body;

  if (!leadId || !phoneNumber) {
    throw new AppError('Lead ID and phone number are required', 400);
  }

  // Call voice agent service
  const response = await axios.post(`${config.VOICE_AGENT_URL}/api/dial`, {
    leadId,
    phoneNumber,
    userId: req.userId
  });

  logger.info(`Voice agent dialing: ${phoneNumber}`);

  // Emit socket event
  req.app.get('io').emit('voice:dialing', response.data);

  res.json({
    success: true,
    data: response.data,
    message: 'Voice agent initiated'
  });
});

/**
 * Get voice call status
 */
exports.getCallStatus = catchAsync(async (req, res) => {
  const { callId } = req.params;

  const response = await axios.get(`${config.VOICE_AGENT_URL}/api/call/${callId}/status`);

  res.json({
    success: true,
    data: response.data
  });
});

/**
 * Transfer call to human agent
 */
exports.transferCall = catchAsync(async (req, res) => {
  const { callId, agentPhone } = req.body;

  if (!callId || !agentPhone) {
    throw new AppError('Call ID and agent phone are required', 400);
  }

  const response = await axios.post(`${config.VOICE_AGENT_URL}/api/transfer`, {
    callId,
    agentPhone
  });

  logger.info(`Call transferred: ${callId} to ${agentPhone}`);

  // Emit socket event
  req.app.get('io').emit('voice:transferred', response.data);

  res.json({
    success: true,
    data: response.data,
    message: 'Call transferred successfully'
  });
});

/**
 * End voice call
 */
exports.hangupCall = catchAsync(async (req, res) => {
  const { callId } = req.body;

  if (!callId) {
    throw new AppError('Call ID is required', 400);
  }

  const response = await axios.post(`${config.VOICE_AGENT_URL}/api/hangup`, {
    callId
  });

  logger.info(`Call ended: ${callId}`);

  // Emit socket event
  req.app.get('io').emit('voice:hangup', response.data);

  res.json({
    success: true,
    data: response.data,
    message: 'Call ended successfully'
  });
});
