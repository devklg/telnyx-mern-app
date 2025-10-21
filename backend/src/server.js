const app = require('./app');
const config = require('./config/env');
const { connectDatabases } = require('./config/database');
const logger = require('./utils/logger');

// Connect to all databases
connectDatabases()
  .then(() => {
    const PORT = config.port || 5000;
    
    app.listen(PORT, () => {
      logger.info(`🚀 BMAD V4 Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${config.env}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});