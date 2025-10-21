/**
 * BMAD V4 - Voice Agent API Routes
 * 
 * @description Routes for voice agent integration
 * @owner David Rodriguez (Backend Lead) & Jennifer Kim (Telnyx)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const voiceController = require('../controllers/voice.controller');

/**
 * @route   POST /api/voice/dial
 * @desc    Initiate voice agent call
 * @access  Private
 */
router.post('/dial',
  authenticate,
  voiceController.dialLead
);

/**
 * @route   GET /api/voice/status/:callId
 * @desc    Get voice call status
 * @access  Private
 */
router.get('/status/:callId',
  authenticate,
  voiceController.getCallStatus
);

/**
 * @route   POST /api/voice/transfer
 * @desc    Transfer call to human agent
 * @access  Private
 */
router.post('/transfer',
  authenticate,
  voiceController.transferCall
);

/**
 * @route   POST /api/voice/hangup
 * @desc    End voice call
 * @access  Private
 */
router.post('/hangup',
  authenticate,
  voiceController.hangupCall
);

module.exports = router;
