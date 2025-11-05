const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');
const gmailImportCron = require('../cron/gmailImportCron');
const Lead = require('../models/Lead');

/**
 * @route   POST /api/gmail/test-connection
 * @desc    Test Gmail API connection
 * @access  Private (add auth middleware as needed)
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await gmailService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Gmail connection successful',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Gmail connection failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Gmail connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Gmail connection',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gmail/import
 * @desc    Manually trigger lead import from Gmail
 * @access  Private (add auth middleware as needed)
 */
router.post('/import', async (req, res) => {
  try {
    const { maxResults } = req.body;
    
    const results = await gmailService.importLeads({
      maxResults: maxResults || 100
    });

    res.json({
      success: true,
      message: 'Gmail import completed',
      data: results
    });
  } catch (error) {
    console.error('Gmail import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import leads from Gmail',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gmail/cron-status
 * @desc    Get Gmail import cron job status
 * @access  Private (add auth middleware as needed)
 */
router.get('/cron-status', async (req, res) => {
  try {
    const status = gmailImportCron.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Cron status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cron job status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gmail/oauth2callback
 * @desc    OAuth2 callback endpoint for Gmail authorization
 * @access  Public
 */
router.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  res.send(`
    <html>
      <head><title>Gmail Authorization</title></head>
      <body>
        <h1>Gmail Authorization</h1>
        <p>Authorization code received:</p>
        <pre>${code}</pre>
        <p>Use this code to exchange for tokens via the API.</p>
        <p>You can close this window now.</p>
      </body>
    </html>
  `);
});

module.exports = router;
