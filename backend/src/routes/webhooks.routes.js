/**
 * BMAD V4 - Telnyx Webhook Endpoints
 * 
 * @description Routes for handling Telnyx webhooks
 * @owner David Rodriguez (Backend Lead) & Jennifer Kim (Telnyx)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

/**
 * @route   POST /api/webhooks/telnyx
 * @desc    Handle Telnyx webhook events
 * @access  Public (verified by Telnyx signature)
 */
router.post('/telnyx',
  webhookController.handleTelnyxWebhook
);

/**
 * @route   POST /api/webhooks/voice-events
 * @desc    Handle voice agent events
 * @access  Private (internal)
 */
router.post('/voice-events',
  webhookController.handleVoiceEvents
);

module.exports = router;
