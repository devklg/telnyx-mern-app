/**
 * BMAD V4 - Report Generation Endpoints
 * 
 * @description Routes for generating reports
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const reportController = require('../controllers/report.controller');

router.use(authenticate);

/**
 * @route   GET /api/reports/daily
 * @desc    Generate daily report
 * @access  Private
 */
router.get('/daily',
  reportController.generateDailyReport
);

/**
 * @route   GET /api/reports/weekly
 * @desc    Generate weekly report
 * @access  Private
 */
router.get('/weekly',
  reportController.generateWeeklyReport
);

/**
 * @route   GET /api/reports/monthly
 * @desc    Generate monthly report
 * @access  Private
 */
router.get('/monthly',
  reportController.generateMonthlyReport
);

/**
 * @route   POST /api/reports/custom
 * @desc    Generate custom report
 * @access  Private (Admin)
 */
router.post('/custom',
  authorize('admin', 'manager'),
  reportController.generateCustomReport
);

module.exports = router;
