const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Webhook endpoints (no auth - validated via signature)
router.post('/telnyx', webhookController.handleTelnyxWebhook);
router.post('/telnyx/call-initiated', webhookController.handleCallInitiated);
router.post('/telnyx/call-answered', webhookController.handleCallAnswered);
router.post('/telnyx/call-ended', webhookController.handleCallEnded);
router.post('/telnyx/recording-saved', webhookController.handleRecordingSaved);

module.exports = router;