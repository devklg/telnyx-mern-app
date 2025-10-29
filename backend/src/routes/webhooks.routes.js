const router = require('express').Router();
const webhookController = require('../controllers/webhook.controller');
const webhookValidator = require('../security/validation/webhook-validator');

router.post('/telnyx', webhookController.handleTelnyxWebhook);
router.post('/telnyx/voice', webhookController.handleVoiceEvent);
router.post('/telnyx/messaging', webhookController.handleMessagingEvent);

module.exports = router;
