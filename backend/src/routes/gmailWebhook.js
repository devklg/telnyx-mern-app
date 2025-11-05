const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');

/**
 * @route   POST /api/gmail/webhook
 * @desc    Gmail Push Notification webhook endpoint
 * @access  Public (but validated by Google)
 */
router.post('/webhook', async (req, res) => {
  try {
    // Acknowledge receipt immediately (Gmail requires 200 response within seconds)
    res.status(200).send('OK');

    // Decode the Pub/Sub message
    const message = req.body.message;
    
    if (!message || !message.data) {
      console.log('⚠️  Invalid webhook payload received');
      return;
    }

    // Decode base64 data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    console.log('📨 Gmail notification received:', notification);

    // Extract email address and history ID
    const { emailAddress, historyId } = notification;

    // Process the new message asynchronously (don't block webhook response)
    setImmediate(async () => {
      try {
        console.log(`🔄 Processing notification for ${emailAddress} (historyId: ${historyId})`);
        
        // Import only the latest leads
        const results = await gmailService.importLeads({
          maxResults: 10 // Only check recent emails
        });

        console.log('✅ Webhook-triggered import completed:', results);
      } catch (error) {
        console.error('❌ Error processing webhook notification:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to avoid Gmail retrying
  }
});

/**
 * @route   GET /api/gmail/webhook
 * @desc    Webhook verification endpoint (for testing)
 * @access  Public
 */
router.get('/webhook', (req, res) => {
  res.send('Gmail webhook endpoint is active');
});

/**
 * @route   POST /api/gmail/watch
 * @desc    Setup Gmail watch (push notifications)
 * @access  Private
 */
router.post('/watch', async (req, res) => {
  try {
    await gmailService.ensureInitialized();

    const watchResponse = await gmailService.gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: [process.env.GMAIL_IMPORT_LABEL || 'Leads'],
        topicName: process.env.GMAIL_PUBSUB_TOPIC, // Set this in .env
        labelFilterAction: 'include'
      }
    });

    res.json({
      success: true,
      message: 'Gmail watch setup successfully',
      data: {
        historyId: watchResponse.data.historyId,
        expiration: watchResponse.data.expiration
      }
    });
  } catch (error) {
    console.error('Watch setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup Gmail watch',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gmail/stop-watch
 * @desc    Stop Gmail watch
 * @access  Private
 */
router.post('/stop-watch', async (req, res) => {
  try {
    await gmailService.ensureInitialized();

    await gmailService.gmail.users.stop({
      userId: 'me'
    });

    res.json({
      success: true,
      message: 'Gmail watch stopped successfully'
    });
  } catch (error) {
    console.error('Stop watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop Gmail watch',
      error: error.message
    });
  }
});

module.exports = router;
