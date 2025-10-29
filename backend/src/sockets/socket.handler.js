const CallLog = require('../database/mongodb/schemas/calllog.schema');
const kevinService = require('../services/kevin.service');

/**
 * Socket.io Event Handlers for Real-time Communication
 * Handles WebSocket connections for live call monitoring, engagement updates, and system status
 *
 * @author David Rodriguez - Backend Development Lead
 * @integration Socket.io, MongoDB
 */

class SocketHandler {

  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      // Store client connection info
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
        rooms: []
      });

      // Join rooms based on user role
      socket.on('join-room', async (data) => {
        try {
          const { room, userId, role } = data;
          socket.join(room);
          socket.userId = userId;
          socket.role = role;

          // Update client info
          const clientInfo = this.connectedClients.get(socket.id);
          if (clientInfo) {
            clientInfo.userId = userId;
            clientInfo.role = role;
            clientInfo.rooms.push(room);
          }

          console.log(`[Socket.io] User ${userId} (${role}) joined room: ${room}`);

          // Send current system status
          await this.sendSystemStatus(socket);

          // Acknowledge join
          socket.emit('room-joined', {
            room,
            success: true,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('[Socket.io] Join room error:', error);
          socket.emit('error', {
            event: 'join-room',
            message: 'Failed to join room',
            error: error.message
          });
        }
      });

      // Handle call monitoring requests
      socket.on('monitor-calls', async () => {
        try {
          if (socket.role === 'admin' || socket.role === 'operator' || socket.role === 'agent') {
            socket.join('call-monitoring');
            await this.sendActiveCallsUpdate(socket);

            console.log(`[Socket.io] ${socket.userId} started monitoring calls`);
          } else {
            socket.emit('error', {
              event: 'monitor-calls',
              message: 'Unauthorized: Insufficient permissions'
            });
          }
        } catch (error) {
          console.error('[Socket.io] Monitor calls error:', error);
          socket.emit('error', {
            event: 'monitor-calls',
            message: 'Failed to start call monitoring',
            error: error.message
          });
        }
      });

      // Handle Kevin availability updates
      socket.on('kevin-availability-update', async (data) => {
        try {
          if (socket.role === 'kevin' || socket.role === 'admin') {
            const { available, reason, until } = data;

            // Update Kevin availability
            await kevinService.updateAvailability({
              available,
              reason,
              until,
              updatedBy: socket.userId,
              updatedAt: new Date()
            });

            // Broadcast to all clients
            this.io.emit('kevin-availability-changed', {
              available,
              reason,
              until,
              timestamp: new Date()
            });

            console.log(`[Socket.io] Kevin availability updated: ${available}`);
          } else {
            socket.emit('error', {
              event: 'kevin-availability-update',
              message: 'Unauthorized: Only Kevin or admin can update availability'
            });
          }
        } catch (error) {
          console.error('[Socket.io] Kevin availability update error:', error);
          socket.emit('error', {
            event: 'kevin-availability-update',
            message: 'Failed to update Kevin availability',
            error: error.message
          });
        }
      });

      // Handle real-time engagement scoring
      socket.on('engagement-update', async (data) => {
        try {
          const { callId, score, phase, indicators } = data;

          // Validate data
          if (!callId || typeof score !== 'number') {
            socket.emit('error', {
              event: 'engagement-update',
              message: 'Invalid engagement update data'
            });
            return;
          }

          // Broadcast to call monitoring room
          this.io.to('call-monitoring').emit('call:engagement-update', {
            callId,
            engagementScore: score,
            phase,
            indicators,
            timestamp: new Date()
          });

          // Check for transfer opportunity (score >= 85)
          if (score >= 85) {
            const kevinAvailable = await kevinService.isAvailable();

            if (kevinAvailable) {
              this.io.to('call-monitoring').emit('transfer-opportunity', {
                callId,
                engagementScore: score,
                suggestTransfer: true,
                kevinAvailable: true,
                timestamp: new Date()
              });

              console.log(`[Socket.io] Transfer opportunity detected for call: ${callId} (score: ${score})`);
            }
          }
        } catch (error) {
          console.error('[Socket.io] Engagement update error:', error);
          socket.emit('error', {
            event: 'engagement-update',
            message: 'Failed to process engagement update',
            error: error.message
          });
        }
      });

      // Handle phase transitions
      socket.on('phase-transition', (data) => {
        try {
          const { callId, fromPhase, toPhase, timestamp } = data;

          this.io.to('call-monitoring').emit('call:phase-transition', {
            callId,
            fromPhase,
            toPhase,
            timestamp: timestamp || new Date()
          });

          console.log(`[Socket.io] Phase transition: ${fromPhase} → ${toPhase} (Call: ${callId})`);
        } catch (error) {
          console.error('[Socket.io] Phase transition error:', error);
        }
      });

      // Handle call status updates
      socket.on('call-status-update', (data) => {
        try {
          const { callId, status, details } = data;

          this.io.to('call-monitoring').emit('call:status-update', {
            callId,
            status,
            details,
            timestamp: new Date()
          });

          console.log(`[Socket.io] Call status update: ${callId} → ${status}`);
        } catch (error) {
          console.error('[Socket.io] Call status update error:', error);
        }
      });

      // Handle manual refresh requests
      socket.on('refresh-dashboard', async () => {
        try {
          await this.sendSystemStatus(socket);
          await this.sendActiveCallsUpdate(socket);

          socket.emit('dashboard-refreshed', {
            success: true,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('[Socket.io] Dashboard refresh error:', error);
          socket.emit('error', {
            event: 'refresh-dashboard',
            message: 'Failed to refresh dashboard',
            error: error.message
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`[Socket.io] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Send system status to connected client
   */
  async sendSystemStatus(socket) {
    try {
      const status = {
        activeCalls: await this.getActiveCallsCount(),
        kevinAvailable: await kevinService.isAvailable(),
        systemLoad: await this.getSystemLoad(),
        timestamp: new Date()
      };

      socket.emit('system-status', status);
    } catch (error) {
      console.error('[Socket.io] Send system status error:', error);
    }
  }

  /**
   * Broadcast active calls update
   */
  async sendActiveCallsUpdate(socket) {
    try {
      const activeCalls = await CallLog.find({
        status: { $in: ['active', 'answered', 'bridged'] }
      })
      .populate('leadId', 'firstName lastName phone')
      .sort({ initiatedAt: -1 })
      .limit(50)
      .lean();

      socket.emit('active-calls-update', {
        calls: activeCalls,
        count: activeCalls.length,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Socket.io] Send active calls error:', error);
    }
  }

  /**
   * Get count of active calls
   */
  async getActiveCallsCount() {
    try {
      return await CallLog.countDocuments({
        status: { $in: ['active', 'answered', 'bridged'] }
      });
    } catch (error) {
      console.error('[Socket.io] Get active calls count error:', error);
      return 0;
    }
  }

  /**
   * Get system load metrics
   */
  async getSystemLoad() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      return {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        uptime: Math.round(uptime), // seconds
        connections: this.connectedClients.size
      };
    } catch (error) {
      console.error('[Socket.io] Get system load error:', error);
      return {
        memory: { used: 0, total: 0, percentage: 0 },
        uptime: 0,
        connections: 0
      };
    }
  }

  /**
   * Broadcast event to all clients
   */
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast event to specific room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get clients in a specific room
   */
  async getClientsInRoom(room) {
    try {
      const sockets = await this.io.in(room).fetchSockets();
      return sockets.map(socket => ({
        id: socket.id,
        userId: socket.userId,
        role: socket.role
      }));
    } catch (error) {
      console.error('[Socket.io] Get clients in room error:', error);
      return [];
    }
  }
}

module.exports = SocketHandler;
