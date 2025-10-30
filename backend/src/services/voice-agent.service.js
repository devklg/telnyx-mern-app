const http = require('http');
const https = require('https');

/**
 * Voice Agent Service Client
 * Handles communication between backend (3550) and voice agent service (3650)
 *
 * @author Jennifer Kim - Telnyx Integration Specialist
 * @integration Voice Agent Service, Telnyx
 */

class VoiceAgentService {
  constructor() {
    this.voiceAgentUrl = process.env.VOICE_AGENT_URL || 'http://localhost:3650';
    this.apiKey = process.env.VOICE_AGENT_API_KEY || null;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Make HTTP request to voice agent service
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.voiceAgentUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BMAD-Backend/1.0'
        },
        timeout: this.timeout
      };

      // Add API key if configured
      if (this.apiKey) {
        options.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                statusCode: res.statusCode,
                data: parsed
              });
            } else {
              resolve({
                success: false,
                statusCode: res.statusCode,
                error: parsed.error || parsed.message || 'Request failed',
                data: parsed
              });
            }
          } catch (error) {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: 'Invalid JSON response',
              rawData: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Voice Agent] Request error:', error);
        reject({
          success: false,
          error: error.message,
          code: error.code
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          success: false,
          error: 'Request timeout',
          timeout: this.timeout
        });
      });

      // Send request body if present
      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Test voice agent connectivity
   */
  async testConnection() {
    try {
      const result = await this.request('GET', '/health');
      return {
        success: result.success,
        message: result.success ? 'Voice agent is reachable' : 'Voice agent unreachable',
        url: this.voiceAgentUrl,
        statusCode: result.statusCode,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Voice agent connection failed',
        url: this.voiceAgentUrl,
        error: error.error || error.message
      };
    }
  }

  /**
   * Start voice call with agent
   */
  async startCall(callData) {
    try {
      const payload = {
        callId: callData.callId,
        callControlId: callData.callControlId,
        phoneNumber: callData.phoneNumber,
        leadId: callData.leadId,
        leadData: callData.leadData,
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/start', payload);

      if (result.success) {
        console.log(`[Voice Agent] Call started: ${callData.callId}`);
      } else {
        console.error(`[Voice Agent] Failed to start call: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('[Voice Agent] Start call error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Send call event to voice agent
   */
  async sendCallEvent(eventData) {
    try {
      const payload = {
        eventType: eventData.type,
        callId: eventData.callId,
        callControlId: eventData.callControlId,
        data: eventData.data,
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/event', payload);

      if (result.success) {
        console.log(`[Voice Agent] Event sent: ${eventData.type} for call ${eventData.callId}`);
      }

      return result;

    } catch (error) {
      console.error('[Voice Agent] Send event error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * End call with voice agent
   */
  async endCall(callId, reason = 'normal') {
    try {
      const payload = {
        callId,
        reason,
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/end', payload);

      if (result.success) {
        console.log(`[Voice Agent] Call ended: ${callId}`);
      }

      return result;

    } catch (error) {
      console.error('[Voice Agent] End call error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Request transfer to Kevin
   */
  async requestTransfer(callId, callControlId, qualificationScore, leadData) {
    try {
      const payload = {
        callId,
        callControlId,
        qualificationScore,
        leadData,
        transferType: 'hot',
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/transfer', payload);

      if (result.success) {
        console.log(`[Voice Agent] Transfer requested for call: ${callId} (score: ${qualificationScore})`);
      }

      return result;

    } catch (error) {
      console.error('[Voice Agent] Request transfer error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Get call status from voice agent
   */
  async getCallStatus(callId) {
    try {
      const result = await this.request('GET', `/api/calls/${callId}/status`);
      return result;
    } catch (error) {
      console.error('[Voice Agent] Get status error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Send DTMF input to voice agent
   */
  async sendDTMF(callId, digit) {
    try {
      const payload = {
        callId,
        digit,
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/dtmf', payload);
      return result;

    } catch (error) {
      console.error('[Voice Agent] Send DTMF error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Send transcription to voice agent
   */
  async sendTranscription(callId, transcription, isFinal = false) {
    try {
      const payload = {
        callId,
        transcription,
        isFinal,
        timestamp: new Date().toISOString()
      };

      const result = await this.request('POST', '/api/calls/transcription', payload);
      return result;

    } catch (error) {
      console.error('[Voice Agent] Send transcription error:', error);
      return {
        success: false,
        error: error.error || error.message
      };
    }
  }

  /**
   * Get voice agent configuration
   */
  getConfiguration() {
    return {
      url: this.voiceAgentUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout
    };
  }

  /**
   * Check if voice agent is configured
   */
  isConfigured() {
    return !!this.voiceAgentUrl;
  }
}

// Export singleton instance
module.exports = new VoiceAgentService();
