/**
 * BMAD V4 - Call Management Routes
 * 
 * @description Routes for managing voice calls
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');
const callController = require('../controllers/call.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/calls
 * @desc    Get all calls with pagination
 * @access  Private
 */
router.get('/',
  validate(schemas.pagination),
  callController.getAllCalls
);

/**
 * @route   GET /api/calls/:id
 * @desc    Get call by ID
 * @access  Private
 */
router.get('/:id',
  validate(schemas.id),
  callController.getCallById
);

/**
 * @route   POST /api/calls/initiate
 * @desc    Initiate outbound call to lead
 * @access  Private
 */
router.post('/initiate',
  callController.initiateCall
);

/**
 * @route   POST /api/calls/:id/end
 * @desc    End active call
 * @access  Private
 */
router.post('/:id/end',
  validate(schemas.id),
  callController.endCall
);

/**
 * @route   GET /api/calls/:id/transcript
 * @desc    Get call transcript
 * @access  Private
 */
router.get('/:id/transcript',
  validate(schemas.id),
  callController.getCallTranscript
);

/**
 * @route   GET /api/calls/:id/recording
 * @desc    Get call recording URL
 * @access  Private
 */
router.get('/:id/recording',
  validate(schemas.id),
  callController.getCallRecording
);

module.exports = router;
