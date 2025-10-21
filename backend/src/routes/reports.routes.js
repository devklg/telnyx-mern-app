const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const reportController = require('../controllers/report.controller');

router.use(authMiddleware);

// Report generation
router.post('/generate', reportController.generateReport);
router.get('/:id', reportController.getReport);
router.get('/', reportController.getAllReports);
router.delete('/:id', reportController.deleteReport);

// Export reports
router.get('/:id/export/pdf', reportController.exportPDF);
router.get('/:id/export/csv', reportController.exportCSV);
router.get('/:id/export/excel', reportController.exportExcel);

module.exports = router;