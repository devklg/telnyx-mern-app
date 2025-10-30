const Telnyx = require('telnyx');
const telnyxConfig = require('../config/telnyx.config');

/**
 * Telnyx Service for Voice Call Management
 * Handles all Telnyx API interactions for call initiation, control, transfer, and recording
 *
 * @author David Rodriguez - Backend Development Lead
 * @author Jennifer Kim - Telnyx Integration Specialist
 * @integration Telnyx Voice API
 */

class TelnyxService {

  constructor() {
    this.config = telnyxConfig;

    if (!this.config.isConfigured()) {
      console.warn('⚠️  Telnyx not properly configured. Features will be limited.');
      this.client = null;
    } else {
      this.client = Telnyx(this.config.config.apiKey);
      console.log('✅ Telnyx service initialized');
    }
  }

  /**
   * Initiate outbound call
   */
  async initiateCall(phoneNumber, callId, metadata = {}) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      // Get call configuration from config module
      const callData = this.config.getCallConfig(phoneNumber, callId, metadata);

      // Add custom headers for call tracking
      callData.custom_headers = [{
        name: 'X-Call-ID',
        value: callId.toString()
      }];

      const response = await this.client.calls.create(callData);

      console.log(`[Telnyx] Call initiated: ${response.data.id} to ${phoneNumber}`);

      return {
        success: true,
        telnyxCallId: response.data.id,
        callControlId: response.data.call_control_id,
        status: response.data.status,
        data: response.data
      };

    } catch (error) {
      console.error('[Telnyx] Initiate call error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Answer incoming call
   */
  async answerCall(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.answer(callControlId);

      return {
        success: true,
        message: 'Call answered successfully'
      };

    } catch (error) {
      console.error('[Telnyx] Answer call error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Hangup call
   */
  async hangupCall(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.hangup(callControlId);

      return {
        success: true,
        message: 'Call hung up successfully'
      };

    } catch (error) {
      console.error('[Telnyx] Hangup call error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create conference call for hot transfer to Kevin
   */
  async createConferenceCall(callControlId, kevinPhoneNumber, conferenceName) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      // Use Kevin's phone number from config if not provided
      const kevinNumber = kevinPhoneNumber || this.config.config.kevinPhoneNumber;

      if (!kevinNumber) {
        throw new Error('Kevin phone number not configured');
      }

      // Create conference and add original caller
      await this.client.calls.transfer(callControlId, {
        to: `conference:${conferenceName}`
      });

      console.log(`[Telnyx] Caller transferred to conference: ${conferenceName}`);

      // Dial Kevin and add to conference
      const kevinCallData = this.config.getCallConfig(
        kevinNumber,
        `kevin-transfer-${Date.now()}`,
        { transferType: 'hot', conferenceName }
      );

      const kevinCall = await this.client.calls.create(kevinCallData);

      console.log(`[Telnyx] Calling Kevin at ${kevinNumber}: ${kevinCall.data.id}`);

      // Join Kevin to conference
      await this.client.calls.transfer(kevinCall.data.call_control_id, {
        to: `conference:${conferenceName}`
      });

      console.log(`[Telnyx] Conference created: ${conferenceName} with Kevin`);

      return {
        success: true,
        conferenceName,
        kevinCallId: kevinCall.data.id,
        kevinCallControlId: kevinCall.data.call_control_id,
        message: 'Conference call created successfully'
      };

    } catch (error) {
      console.error('[Telnyx] Conference call error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Start call recording
   */
  async startRecording(callControlId, format = null, channels = null) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      // Check if recording is enabled
      if (!this.config.config.enableRecording) {
        console.log('[Telnyx] Recording disabled by configuration');
        return {
          success: false,
          error: 'Recording is disabled in configuration'
        };
      }

      // Use config defaults if not provided
      const recordingConfig = this.config.getRecordingConfig();
      const recordingOptions = {
        format: format || recordingConfig.format,
        channels: channels || recordingConfig.channels
      };

      const response = await this.client.calls.record_start(callControlId, recordingOptions);

      console.log(`[Telnyx] Recording started: ${response.data.recording_id}`);

      return {
        success: true,
        recordingId: response.data.recording_id,
        format: recordingOptions.format,
        channels: recordingOptions.channels,
        message: 'Recording started successfully'
      };

    } catch (error) {
      console.error('[Telnyx] Start recording error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop call recording
   */
  async stopRecording(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.record_stop(callControlId);

      return {
        success: true,
        message: 'Recording stopped successfully'
      };

    } catch (error) {
      console.error('[Telnyx] Stop recording error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Play audio to caller
   */
  async playAudio(callControlId, audioUrl) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.playback_start(callControlId, {
        audio_url: audioUrl
      });

      return {
        success: true,
        message: 'Audio playback started'
      };

    } catch (error) {
      console.error('[Telnyx] Play audio error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop audio playback
   */
  async stopAudio(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.playback_stop(callControlId);

      return {
        success: true,
        message: 'Audio playback stopped'
      };

    } catch (error) {
      console.error('[Telnyx] Stop audio error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gather DTMF input
   */
  async gatherDTMF(callControlId, options = {}) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      const gatherOptions = {
        minimum_digits: options.minDigits || 1,
        maximum_digits: options.maxDigits || 10,
        timeout_millis: options.timeout || 5000,
        terminating_digit: options.terminatingDigit || '#',
        ...options
      };

      await this.client.calls.gather(callControlId, gatherOptions);

      return {
        success: true,
        message: 'DTMF gathering started'
      };

    } catch (error) {
      console.error('[Telnyx] Gather DTMF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Speak text using TTS
   */
  async speak(callControlId, text, options = {}) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      const speakOptions = {
        payload: text,
        voice: options.voice || 'female',
        language: options.language || 'en-US',
        ...options
      };

      await this.client.calls.speak(callControlId, speakOptions);

      return {
        success: true,
        message: 'TTS playback started'
      };

    } catch (error) {
      console.error('[Telnyx] Speak error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mute call
   */
  async muteCall(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.mute(callControlId);

      return {
        success: true,
        message: 'Call muted'
      };

    } catch (error) {
      console.error('[Telnyx] Mute call error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unmute call
   */
  async unmuteCall(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.unmute(callControlId);

      return {
        success: true,
        message: 'Call unmuted'
      };

    } catch (error) {
      console.error('[Telnyx] Unmute call error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call information
   */
  async getCallInfo(callControlId) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      const response = await this.client.calls.retrieve(callControlId);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('[Telnyx] Get call info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Blind transfer call
   */
  async blindTransfer(callControlId, toNumber) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      await this.client.calls.transfer(callControlId, {
        to: toNumber
      });

      return {
        success: true,
        message: 'Blind transfer initiated'
      };

    } catch (error) {
      console.error('[Telnyx] Blind transfer error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test Telnyx API connectivity
   */
  async testConnection() {
    return await this.config.testConnection();
  }

  /**
   * Get service configuration (masked for security)
   */
  getConfiguration() {
    return this.config.getConfig();
  }

  /**
   * Check if service is properly configured
   */
  isConfigured() {
    return this.config.isConfigured();
  }

  /**
   * Check if advanced features are available
   */
  hasAdvancedFeatures() {
    return this.config.hasAdvancedFeatures();
  }

  /**
   * Get webhook URL
   */
  getWebhookUrl() {
    return this.config.getWebhookUrl();
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload, signature, timestamp) {
    return this.config.validateWebhookSignature(payload, signature, timestamp);
  }
}

// Export singleton instance
module.exports = new TelnyxService();
