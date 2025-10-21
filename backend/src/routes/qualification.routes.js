/**
 * BMAD V4 - Lead Qualification Endpoints
 * 
 * @description Routes for lead qualification processing
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const qualificationController = require('../controllers/qualification.controller');

router.use(authenticate);

/**
 * @route   POST /api/qualification/process
 * @desc    Process lead qualification based on conversation
 * @access  Private
 */
router.post('/process',
  qualificationController.processQualification
);

/**
 * @route   GET /api/qualification/:leadId
 * @desc    Get qualification results for a lead
 * @access  Private
 */
router.get('/:leadId',
  qualificationController.getQualificationResults
);

/**
 * @route   PUT /api/qualification/:leadId
 * @desc    Update qualification manually
 * @access  Private
 */
router.put('/:leadId',
  qualificationController.updateQualification
);

module.exports = router;
