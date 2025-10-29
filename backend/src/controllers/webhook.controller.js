const webhookValidator = require('../security/validation/webhook-validator');

exports.handleTelnyxWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['telnyx-signature'];
    const timestamp = req.headers['telnyx-timestamp'];
    
    if (!webhookValidator.validateSignature(req.body, signature, timestamp)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process webhook
    console.log('Webhook received:', req.body);
    res.json({ success: true });
  } catch (error) {
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
