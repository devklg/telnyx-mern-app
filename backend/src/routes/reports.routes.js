const router = require('express').Router();
const reportController = require('../controllers/report.controller');
const auth = require('../middleware/auth.middleware');

router.get('/daily', auth, reportController.getDailyReport);
router.get('/weekly', auth, reportController.getWeeklyReport);
router.get('/monthly', auth, reportController.getMonthlyReport);
router.post('/custom', auth, reportController.getCustomReport);

module.exports = router;
