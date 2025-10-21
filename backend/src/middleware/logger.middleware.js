/**
 * BMAD V4 - Request Logger Middleware
 * 
 * @description Logs HTTP requests and responses
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const logger = require('../utils/logger');

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });
  });

  next();
};

module.exports = requestLogger;
