const webhookValidator = require('../security/validation/webhook-validator');
const telnyxService = require('../services/telnyx.service');
const voiceAgentService = require('../services/voice-agent.service');

exports.handleTelnyxWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['telnyx-signature'];
    const timestamp = req.headers['telnyx-timestamp'];

    // Validate webhook signature using Telnyx service
    if (signature && timestamp) {
      const isValid = telnyxService.validateWebhookSignature(req.body, signature, timestamp);
      if (!isValid) {
        console.warn('[Webhook] Invalid Telnyx signature received');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Webhook] Missing signature or timestamp in Telnyx webhook');
    }

    // Process webhook event
    const event = req.body;
    const eventType = event.data?.event_type || 'unknown';
    const payload = event.data?.payload || {};

    console.log('[Webhook] Telnyx event received:', eventType);

    // Emit event via Socket.io if available
    const io = req.app.get('io');
    if (io && eventType) {
      io.to('call-monitoring').emit('telnyx:event', {
        type: eventType,
        data: event.data,
        timestamp: new Date()
      });
    }

    // Forward relevant events to voice agent service
    const callRelatedEvents = [
      'call.initiated',
      'call.answered',
      'call.bridged',
      'call.hangup',
      'call.dtmf.received',
      'call.speak.started',
      'call.speak.ended',
      'recording.started',
      'recording.stopped'
    ];

    if (callRelatedEvents.includes(eventType) && voiceAgentService.isConfigured()) {
      // Extract call information
      let callId = null;
      try {
        if (payload.client_state) {
          const clientState = JSON.parse(
            Buffer.from(payload.client_state, 'base64').toString('utf8')
          );
          callId = clientState.callId;
        }
      } catch (error) {
        console.warn('[Webhook] Could not parse client_state:', error.message);
      }

      // Forward to voice agent
      voiceAgentService.sendCallEvent({
        type: eventType,
        callId: callId,
        callControlId: payload.call_control_id,
        data: payload
      }).catch(error => {
        console.error('[Webhook] Error forwarding to voice agent:', error);
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error processing Telnyx webhook:', error);
    next(error);
  }
};

exports.handleVoiceEvent = async (req, res, next) => {
  try {
    const event = req.body;
    console.log('Voice event:', event);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.handleMessagingEvent = async (req, res, next) => {
  try {
    const event = req.body;
    console.log('Messaging event:', event);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
