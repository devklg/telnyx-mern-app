/**
 * Telnyx Configuration Module
 * Centralized configuration for all Telnyx API integrations
 *
 * @author Jennifer Kim - Telnyx Integration Specialist
 * @integration Telnyx Voice API, WebSocket, Webhooks
 */

const crypto = require('crypto');

class TelnyxConfig {
  constructor() {
    this.validateEnvironmentVariables();
    this.loadConfiguration();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironmentVariables() {
    const required = [
      'TELNYX_API_KEY',
      'TELNYX_PUBLIC_KEY',
      'TELNYX_PHONE_NUMBER'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`⚠️  Missing Telnyx environment variables: ${missing.join(', ')}`);
      console.warn('⚠️  Telnyx features will be limited until configured.');
    }

    // Warn about optional but recommended variables
    const recommended = [
      'TELNYX_CONNECTION_ID',
      'KEVIN_PHONE_NUMBER',
      'API_BASE_URL',
      'WEBHOOK_SECRET'
    ];

    const missingRecommended = recommended.filter(key => !process.env[key]);

    if (missingRecommended.length > 0) {
      console.warn(`⚠️  Recommended Telnyx variables not set: ${missingRecommended.join(', ')}`);
    }
  }

  /**
   * Load Telnyx configuration from environment
   */
  loadConfiguration() {
    this.config = {
      // API Configuration
      apiKey: process.env.TELNYX_API_KEY,
      publicKey: process.env.TELNYX_PUBLIC_KEY,
      connectionId: process.env.TELNYX_CONNECTION_ID,

      // Phone Numbers
      phoneNumber: this.normalizePhoneNumber(process.env.TELNYX_PHONE_NUMBER),
      kevinPhoneNumber: this.normalizePhoneNumber(process.env.KEVIN_PHONE_NUMBER),

      // Webhook Configuration
      webhookBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3550}`,
      webhookSecret: process.env.WEBHOOK_SECRET || this.generateWebhookSecret(),
      webhookPath: '/api/webhooks/telnyx',

      // Call Configuration
      callTimeout: parseInt(process.env.CALL_TIMEOUT_MINUTES) * 60 * 1000 || 900000, // 15 minutes default
      maxConcurrentCalls: parseInt(process.env.MAX_CONCURRENT_CALLS) || 50,

      // Recording Configuration
      enableRecording: process.env.ENABLE_RECORDING === 'true',
      recordingFormat: 'mp3',
      recordingChannels: 'dual',

      // Feature Flags
      enableTranscription: process.env.ENABLE_TRANSCRIPTION === 'true',
      enableSentimentAnalysis: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
      enableAutoTransfer: process.env.ENABLE_AUTO_TRANSFER === 'true',

      // Development & Testing
      mockMode: process.env.MOCK_TELNYX === 'true',
      debug: process.env.DEBUG === 'true',

      // WebSocket Configuration
      websocket: {
        enabled: true,
        reconnectAttempts: 5,
        reconnectInterval: 3000, // 3 seconds
        pingInterval: 30000, // 30 seconds
        pongTimeout: 5000 // 5 seconds
      }
    };
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    // Remove all non-numeric characters except leading +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Generate a secure webhook secret if not provided
   */
  generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get full webhook URL
   */
  getWebhookUrl() {
    return `${this.config.webhookBaseUrl}${this.config.webhookPath}`;
  }

  /**
   * Validate webhook signature from Telnyx
   */
  validateWebhookSignature(payload, signature, timestamp) {
    try {
      // Telnyx uses HMAC SHA256 for webhook signatures
      const signedPayload = `${timestamp}|${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.publicKey)
        .update(signedPayload)
        .digest('base64');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('[Telnyx Config] Signature validation error:', error);
      return false;
    }
  }

  /**
   * Check if Telnyx is properly configured
   */
  isConfigured() {
    return !!(
      this.config.apiKey &&
      this.config.publicKey &&
      this.config.phoneNumber
    );
  }

  /**
   * Check if advanced features are available
   */
  hasAdvancedFeatures() {
    return !!(
      this.config.connectionId &&
      this.config.kevinPhoneNumber
    );
  }

  /**
   * Get configuration for call initiation
   */
  getCallConfig(phoneNumber, callId, metadata = {}) {
    const config = {
      to: this.normalizePhoneNumber(phoneNumber),
      from: this.config.phoneNumber,
      webhook_url: this.getWebhookUrl(),
      webhook_url_method: 'POST',
      client_state: Buffer.from(JSON.stringify({
        callId,
        timestamp: new Date().toISOString(),
        ...metadata
      })).toString('base64'),
      ...metadata
    };

    // Add connection ID if available
    if (this.config.connectionId) {
      config.connection_id = this.config.connectionId;
    }

    return config;
  }

  /**
   * Get configuration for recording
   */
  getRecordingConfig() {
    return {
      format: this.config.recordingFormat,
      channels: this.config.recordingChannels
    };
  }

  /**
   * Get all configuration (for debugging)
   */
  getConfig() {
    return {
      ...this.config,
      // Mask sensitive data
      apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : null,
      publicKey: this.config.publicKey ? `${this.config.publicKey.substring(0, 10)}...` : null,
      webhookSecret: this.config.webhookSecret ? '***masked***' : null
    };
  }

  /**
   * Test Telnyx API connectivity
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Telnyx not configured',
          message: 'Missing required environment variables'
        };
      }

      // Import Telnyx SDK
      const Telnyx = require('telnyx');
      const client = Telnyx(this.config.apiKey);

      // Test API by retrieving available phone numbers or account info
      // This is a simple check without making an actual call
      await client.phoneNumbers.list({ page: { size: 1 } });

      return {
        success: true,
        message: 'Telnyx API connection successful',
        config: this.getConfig()
      };

    } catch (error) {
      console.error('[Telnyx Config] Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }
}

// Export singleton instance
module.exports = new TelnyxConfig();
