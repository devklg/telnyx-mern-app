const WebSocket = require('ws');
const telnyxConfig = require('../config/telnyx.config');

/**
 * Telnyx WebSocket Service
 * Handles real-time event streaming from Telnyx API
 *
 * @author Jennifer Kim - Telnyx Integration Specialist
 * @integration Telnyx WebSocket API, Socket.io
 */

class TelnyxWebSocketService {
  constructor() {
    this.ws = null;
    this.io = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = telnyxConfig.config.websocket.reconnectAttempts;
    this.reconnectInterval = telnyxConfig.config.websocket.reconnectInterval;
    this.pingInterval = null;
    this.connectionId = null;

    // Event handlers
    this.eventHandlers = new Map();
    this.setupDefaultEventHandlers();
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(socketIoInstance) {
    try {
      if (!telnyxConfig.isConfigured()) {
        console.warn('[Telnyx WS] Telnyx not configured. WebSocket connection skipped.');
        return false;
      }

      this.io = socketIoInstance;

      // Telnyx WebSocket endpoint
      const wsUrl = `wss://rtc.telnyx.com/v2/websocket`;
      const apiKey = telnyxConfig.config.apiKey;

      console.log('[Telnyx WS] Connecting to Telnyx WebSocket...');

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      this.setupWebSocketHandlers();

      return true;

    } catch (error) {
      console.error('[Telnyx WS] Connection error:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.ws.on('open', () => {
      console.log('✅ [Telnyx WS] Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Start ping/pong heartbeat
      this.startHeartbeat();

      // Emit connection status to frontend
      if (this.io) {
        this.io.emit('telnyx:connection', {
          status: 'connected',
          timestamp: new Date()
        });
      }
    });

    this.ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.handleTelnyxEvent(event);
      } catch (error) {
        console.error('[Telnyx WS] Error parsing message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('[Telnyx WS] WebSocket error:', error);

      if (this.io) {
        this.io.emit('telnyx:error', {
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Telnyx WS] Connection closed: ${code} - ${reason}`);
      this.isConnected = false;
      this.stopHeartbeat();

      // Emit disconnection status to frontend
      if (this.io) {
        this.io.emit('telnyx:connection', {
          status: 'disconnected',
          code,
          reason: reason.toString(),
          timestamp: new Date()
        });
      }

      // Attempt to reconnect
      this.scheduleReconnect();
    });

    this.ws.on('pong', () => {
      // Connection is alive
      this.lastPong = Date.now();
    });
  }

  /**
   * Handle incoming Telnyx events
   */
  handleTelnyxEvent(event) {
    const eventType = event.event_type || event.type;

    console.log(`[Telnyx WS] Event received: ${eventType}`);

    // Call registered event handlers
    if (this.eventHandlers.has(eventType)) {
      const handler = this.eventHandlers.get(eventType);
      handler(event);
    } else {
      // Default handler - broadcast to Socket.io
      this.broadcastEvent(eventType, event);
    }

    // Always broadcast to call-monitoring room
    if (this.io) {
      this.io.to('call-monitoring').emit('telnyx:event', {
        type: eventType,
        data: event,
        timestamp: new Date()
      });
    }
  }

  /**
   * Setup default event handlers for common Telnyx events
   */
  setupDefaultEventHandlers() {
    // Call initiated
    this.on('call.initiated', (event) => {
      console.log('[Telnyx WS] Call initiated:', event.payload?.call_control_id);
      this.broadcastEvent('call:initiated', event);
    });

    // Call answered
    this.on('call.answered', (event) => {
      console.log('[Telnyx WS] Call answered:', event.payload?.call_control_id);
      this.broadcastEvent('call:answered', event);
    });

    // Call bridged
    this.on('call.bridged', (event) => {
      console.log('[Telnyx WS] Call bridged:', event.payload?.call_control_id);
      this.broadcastEvent('call:bridged', event);
    });

    // Call hangup
    this.on('call.hangup', (event) => {
      console.log('[Telnyx WS] Call hangup:', event.payload?.call_control_id);
      this.broadcastEvent('call:hangup', event);
    });

    // Recording started
    this.on('recording.started', (event) => {
      console.log('[Telnyx WS] Recording started:', event.payload?.recording_id);
      this.broadcastEvent('recording:started', event);
    });

    // Recording stopped
    this.on('recording.stopped', (event) => {
      console.log('[Telnyx WS] Recording stopped:', event.payload?.recording_id);
      this.broadcastEvent('recording:stopped', event);
    });

    // DTMF received
    this.on('call.dtmf.received', (event) => {
      console.log('[Telnyx WS] DTMF received:', event.payload?.digit);
      this.broadcastEvent('call:dtmf', event);
    });

    // Speak started
    this.on('call.speak.started', (event) => {
      console.log('[Telnyx WS] Speak started:', event.payload?.call_control_id);
      this.broadcastEvent('call:speak-started', event);
    });

    // Speak ended
    this.on('call.speak.ended', (event) => {
      console.log('[Telnyx WS] Speak ended:', event.payload?.call_control_id);
      this.broadcastEvent('call:speak-ended', event);
    });

    // Conference created
    this.on('conference.created', (event) => {
      console.log('[Telnyx WS] Conference created:', event.payload?.conference_id);
      this.broadcastEvent('conference:created', event);
    });

    // Conference ended
    this.on('conference.ended', (event) => {
      console.log('[Telnyx WS] Conference ended:', event.payload?.conference_id);
      this.broadcastEvent('conference:ended', event);
    });

    // Participant joined
    this.on('conference.participant.joined', (event) => {
      console.log('[Telnyx WS] Participant joined conference');
      this.broadcastEvent('conference:participant-joined', event);
    });

    // Participant left
    this.on('conference.participant.left', (event) => {
      console.log('[Telnyx WS] Participant left conference');
      this.broadcastEvent('conference:participant-left', event);
    });
  }

  /**
   * Register custom event handler
   */
  on(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Broadcast event to Socket.io clients
   */
  broadcastEvent(eventName, data) {
    if (this.io) {
      this.io.to('call-monitoring').emit(eventName, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Start heartbeat (ping/pong)
   */
  startHeartbeat() {
    const pingInterval = telnyxConfig.config.websocket.pingInterval;

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, pingInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Telnyx WS] Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff: 3s, 6s, 12s, 24s, 48s
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[Telnyx WS] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (!this.isConnected) {
        console.log(`[Telnyx WS] Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect(this.io);
      }
    }, delay);
  }

  /**
   * Manually disconnect
   */
  disconnect() {
    console.log('[Telnyx WS] Manually disconnecting...');

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionId: this.connectionId
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnectedToTelnyx() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
module.exports = new TelnyxWebSocketService();
