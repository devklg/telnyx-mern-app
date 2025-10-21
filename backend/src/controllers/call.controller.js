/**
 * BMAD V4 - Call State Management
 * 
 * @description Controller for managing voice calls
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const callService = require('../services/call.service');
const logger = require('../utils/logger');

/**
 * Get all calls with pagination
 */
exports.getAllCalls = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, leadId } = req.query;

  const calls = await callService.getAllCalls({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    leadId
  });

  res.json({
    success: true,
    data: calls
  });
});

/**
 * Get call by ID
 */
exports.getCallById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const call = await callService.getCallById(id);

  if (!call) {
    throw new AppError('Call not found', 404);
  }

  res.json({
    success: true,
    data: call
  });
});

/**
 * Initiate outbound call to lead
 */
exports.initiateCall = catchAsync(async (req, res) => {
  const { leadId, phoneNumber } = req.body;

  if (!leadId || !phoneNumber) {
    throw new AppError('Lead ID and phone number are required', 400);
  }

  const call = await callService.initiateCall({ leadId, phoneNumber });

  logger.info(`Call initiated: ${call.id} to ${phoneNumber}`);

  // Emit socket event
  req.app.get('io').emit('call:initiated', call);

  res.status(201).json({
    success: true,
    data: call,
    message: 'Call initiated successfully'
  });
});

/**
 * End active call
 */
exports.endCall = catchAsync(async (req, res) => {
  const { id } = req.params;

  const call = await callService.endCall(id);

  if (!call) {
    throw new AppError('Call not found', 404);
  }

  logger.info(`Call ended: ${id}`);

  // Emit socket event
  req.app.get('io').emit('call:ended', call);

  res.json({
    success: true,
    data: call,
    message: 'Call ended successfully'
  });
});

/**
 * Get call transcript
 */
exports.getCallTranscript = catchAsync(async (req, res) => {
  const { id } = req.params;

  const transcript = await callService.getCallTranscript(id);

  if (!transcript) {
    throw new AppError('Transcript not found', 404);
  }

  res.json({
    success: true,
    data: transcript
  });
});

/**
 * Get call recording URL
 */
exports.getCallRecording = catchAsync(async (req, res) => {
  const { id } = req.params;

  const recording = await callService.getCallRecording(id);

  if (!recording) {
    throw new AppError('Recording not found', 404);
  }

  res.json({
    success: true,
    data: recording
  });
});
