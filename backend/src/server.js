require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDatabases } = require('./config/database');
const SocketHandler = require('./sockets/socket.handler');

const PORT = process.env.PORT || 3550;

async function startServer() {
  try {
    // Connect to databases
    await connectDatabases();
    console.log('✅ All databases connected');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3500',
          'http://localhost:3000'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Make io accessible to routes
    app.set('io', io);

    // Initialize Socket.io handlers
    const socketHandler = new SocketHandler(io);
    console.log('✅ Socket.io initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 HTTP: http://localhost:${PORT}`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}`);
      console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
