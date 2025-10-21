/**
 * BMAD V4 - Main Express Server Entry Point
 * 
 * @description Main server file that initializes the Express app, 
 *              connects to databases, and starts the HTTP server
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

require('dotenv').config();
const app = require('./app');
const { connectDatabases } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Connect to all databases (MongoDB, PostgreSQL, Neo4j, ChromaDB)
    await connectDatabases();
    logger.info('✅ All databases connected successfully');

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 BMAD V4 Backend Server running on http://${HOST}:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔧 Process ID: ${process.pid}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connections
        // TODO: Implement database disconnect logic
        
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
