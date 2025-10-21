/**
 * BMAD V4 - Webhook Processing
 * 
 * @description Controller for handling Telnyx webhooks
 * @owner David Rodriguez (Backend Lead) & Jennifer Kim (Telnyx)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Verify Telnyx webhook signature
 */
function verifyTelnyxSignature(req) {
  const signature = req.headers['telnyx-signature-ed25519'];
  const timestamp = req.headers['telnyx-timestamp'];
  
  if (!signature || !timestamp) {
    return false;
  }

  // TODO: Implement proper signature verification
  // const signedPayload = timestamp + ':' + JSON.stringify(req.body);
  // const expectedSignature = crypto.createHmac('sha256', process.env.TELNYX_PUBLIC_KEY)
  //   .update(signedPayload)
  //   .digest('hex');
  
  return true; // Placeholder
}

/**
 * Handle Telnyx webhook events
 */
exports.handleTelnyxWebhook = catchAsync(async (req, res) => {
  // Verify webhook signature
  if (!verifyTelnyxSignature(req)) {
    throw new AppError('Invalid webhook signature', 401);
  }

  const { data } = req.body;
  const eventType = data?.event_type;

  logger.info(`Telnyx webhook received: ${eventType}`);

  // Handle different event types
  switch (eventType) {
    case 'call.initiated':
      await handleCallInitiated(data, req);
      break;
    
    case 'call.answered':
      await handleCallAnswered(data, req);
      break;
    
    case 'call.hangup':
      await handleCallHangup(data, req);
      break;
    
    case 'call.recording.saved':
      await handleRecordingSaved(data, req);
      break;
    
    default:
      logger.warn(`Unhandled webhook event: ${eventType}`);
  }

  // Always respond with 200
  res.json({ received: true });
});

/**
 * Handle voice agent events (internal)
 */
exports.handleVoiceEvents = catchAsync(async (req, res) => {
  const { event, data } = req.body;

  logger.info(`Voice event received: ${event}`);

  // Emit to connected clients via Socket.io
  req.app.get('io').emit(`voice:${event}`, data);

  res.json({ received: true });
});

// Event handlers
async function handleCallInitiated(data, req) {
  logger.info(`Call initiated: ${data.call_control_id}`);
  req.app.get('io').emit('call:initiated', data);
  // TODO: Update call status in database
}

async function handleCallAnswered(data, req) {
  logger.info(`Call answered: ${data.call_control_id}`);
  req.app.get('io').emit('call:answered', data);
  // TODO: Update call status in database
}

async function handleCallHangup(data, req) {
  logger.info(`Call ended: ${data.call_control_id}`);
  req.app.get('io').emit('call:hangup', data);
  // TODO: Update call status and save call data
}

async function handleRecordingSaved(data, req) {
  logger.info(`Recording saved: ${data.recording_id}`);
  req.app.get('io').emit('recording:saved', data);
  // TODO: Save recording URL to database
}
