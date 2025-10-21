const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const qualificationController = require('../controllers/qualification.controller');

router.use(authMiddleware);

// Lead qualification
router.post('/qualify/:leadId', qualificationController.qualifyLead);
router.get('/:leadId/status', qualificationController.getQualificationStatus);
router.post('/:leadId/manual', qualificationController.manualQualification);

// Qualification criteria
router.get('/criteria', qualificationController.getQualificationCriteria);
router.put('/criteria', qualificationController.updateQualificationCriteria);

module.exports = router;