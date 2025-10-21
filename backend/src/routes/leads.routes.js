const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const leadController = require('../controllers/lead.controller');

// All routes require authentication
router.use(authMiddleware);

// Lead CRUD operations
router.get('/', leadController.getAllLeads);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Lead status updates
router.patch('/:id/status', leadController.updateLeadStatus);

// Lead search and filtering
router.post('/search', leadController.searchLeads);
router.get('/filter/qualified', leadController.getQualifiedLeads);
router.get('/filter/unqualified', leadController.getUnqualifiedLeads);

module.exports = router;