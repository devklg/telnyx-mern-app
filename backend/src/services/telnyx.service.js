const Telnyx = require('telnyx');

/**
 * Telnyx Service for Voice Call Management
 * Handles all Telnyx API interactions for call initiation, control, transfer, and recording
 *
 * @author David Rodriguez - Backend Development Lead
 * @integration Telnyx Voice API
 */

class TelnyxService {

  constructor() {
    if (!process.env.TELNYX_API_KEY) {
      console.warn('⚠️  TELNYX_API_KEY not configured. Telnyx features will be limited.');
      this.client = null;
    } else {
      this.client = Telnyx(process.env.TELNYX_API_KEY);
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

      const callData = {
        connection_id: process.env.TELNYX_CONNECTION_ID,
        to: phoneNumber,
        from: process.env.TELNYX_PHONE_NUMBER,
        webhook_url: `${process.env.API_BASE_URL}/api/webhooks/telnyx`,
        webhook_url_method: 'POST',
        custom_headers: [{
          name: 'X-Call-ID',
          value: callId.toString()
        }],
        ...metadata
      };

      const response = await this.client.calls.create(callData);

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
   * Create conference call for hot transfer
   */
  async createConferenceCall(callControlId, kevinPhoneNumber, conferenceName) {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      // Create conference and add original caller
      await this.client.calls.transfer(callControlId, {
        to: `conference:${conferenceName}`
      });

      // Dial Kevin and add to conference
      const kevinCall = await this.client.calls.create({
        connection_id: process.env.TELNYX_CONNECTION_ID,
        to: kevinPhoneNumber || process.env.KEVIN_PHONE_NUMBER,
        from: process.env.TELNYX_PHONE_NUMBER,
        webhook_url: `${process.env.API_BASE_URL}/api/webhooks/telnyx`,
        webhook_url_method: 'POST'
      });

      // Join Kevin to conference
      await this.client.calls.transfer(kevinCall.data.call_control_id, {
        to: `conference:${conferenceName}`
      });

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
  async startRecording(callControlId, format = 'mp3', channels = 'dual') {
    try {
      if (!this.client) {
        throw new Error('Telnyx client not initialized');
      }

      const response = await this.client.calls.record_start(callControlId, {
        format,
        channels
      });

      return {
        success: true,
        recordingId: response.data.recording_id,
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
}

// Export singleton instance
module.exports = new TelnyxService();
