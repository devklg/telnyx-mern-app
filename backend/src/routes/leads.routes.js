/**
 * BMAD V4 - Lead CRUD Operations Routes
 * 
 * @description Routes for managing leads
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');
const leadController = require('../controllers/lead.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/leads
 * @desc    Get all leads with pagination and filtering
 * @access  Private
 */
router.get('/', 
  validate(schemas.pagination),
  leadController.getAllLeads
);

/**
 * @route   GET /api/leads/:id
 * @desc    Get single lead by ID
 * @access  Private
 */
router.get('/:id',
  validate(schemas.id),
  leadController.getLeadById
);

/**
 * @route   POST /api/leads
 * @desc    Create new lead
 * @access  Private
 */
router.post('/',
  validate(schemas.createLead),
  leadController.createLead
);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  Private
 */
router.put('/:id',
  validate(schemas.id),
  leadController.updateLead
);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Private
 */
router.delete('/:id',
  validate(schemas.id),
  leadController.deleteLead
);

/**
 * @route   POST /api/leads/bulk
 * @desc    Bulk import leads
 * @access  Private
 */
router.post('/bulk',
  leadController.bulkImportLeads
);

/**
 * @route   GET /api/leads/:id/history
 * @desc    Get lead interaction history
 * @access  Private
 */
router.get('/:id/history',
  validate(schemas.id),
  leadController.getLeadHistory
);

module.exports = router;
