const router = require('express').Router();
const kevinController = require('../controllers/kevin.controller');
const auth = require('../middleware/auth.middleware');

router.get('/availability', auth, kevinController.getAvailability);
router.put('/availability', auth, kevinController.updateAvailability);
router.get('/schedule', auth, kevinController.getSchedule);
router.put('/schedule', auth, kevinController.updateSchedule);
router.get('/transfers', auth, kevinController.getTransferHistory);
router.get('/transfers/stats', auth, kevinController.getTransferStats);

module.exports = router;
