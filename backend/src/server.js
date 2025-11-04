require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDatabases } = require('./config/database');
const SocketHandler = require('./sockets/socket.handler');
const telnyxWebSocket = require('./websocket/telnyx-websocket.service');

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

    // Initialize Telnyx WebSocket connection
    const telnyxConnected = await telnyxWebSocket.connect(io);
    if (telnyxConnected) {
      console.log('✅ Telnyx WebSocket initialized');
    } else {
      console.log('⚠️  Telnyx WebSocket not initialized (check configuration)');
    }

    // Initialize Graph RAG system
    const { initializeGraphRAG } = require('./middleware/auto-learning.middleware');
    await initializeGraphRAG();
    console.log('✅ Graph RAG system initialized');

    // Initialize Graph RAG batch learning cron job
    const graphRAGBatchLearning = require('./cron/graphRAGBatchLearning');
    graphRAGBatchLearning.start();
    console.log('✅ Graph RAG batch learning cron job started');

    // Initialize Gmail Lead Import Cron Job (James Taylor)
    const gmailConfig = require('./config/gmail.config');
    if (gmailConfig.isConfigured()) {
      const gmailImportCron = require('./cron/gmailLeadImport');
      gmailImportCron.start();
      console.log('✅ Gmail Lead Import cron job started');
    } else {
      console.log('⚠️  Gmail Lead Import not configured (set GMAIL_* env variables)');
    }

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

      // Stop Graph RAG cron job
      graphRAGBatchLearning.stop();
      console.log('Graph RAG cron job stopped');

      // Stop Gmail cron job
      if (gmailConfig.isConfigured()) {
        const gmailImportCron = require('./cron/gmailLeadImport');
        gmailImportCron.stop();
        console.log('Gmail cron job stopped');
      }

      // Disconnect Telnyx WebSocket
      telnyxWebSocket.disconnect();

      server.close(() => {
        console.log('HTTP server closed');
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT signal received: closing HTTP server');

      // Stop Graph RAG cron job
      graphRAGBatchLearning.stop();
      console.log('Graph RAG cron job stopped');

      // Stop Gmail cron job
      if (gmailConfig.isConfigured()) {
        const gmailImportCron = require('./cron/gmailLeadImport');
        gmailImportCron.stop();
        console.log('Gmail cron job stopped');
      }

      // Disconnect Telnyx WebSocket
      telnyxWebSocket.disconnect();

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
