const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const auth = require('../middleware/auth.middleware');

router.get('/overview', auth, analyticsController.getOverview);
router.get('/conversion', auth, analyticsController.getConversionMetrics);
router.get('/performance', auth, analyticsController.getPerformanceMetrics);

module.exports = router;
