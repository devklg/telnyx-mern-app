const router = require('express').Router();
const qualificationController = require('../controllers/qualification.controller');
const auth = require('../middleware/auth.middleware');

router.post('/qualify/:leadId', auth, qualificationController.qualifyLead);
router.get('/lead/:leadId', auth, qualificationController.getQualificationByLead);
router.put('/:id', auth, qualificationController.updateQualification);

module.exports = router;
