/**
 * BMAD V4 - Logger Utility
 * 
 * @description Winston-based logger for application logging
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const winston = require('winston');
const config = require('../config/env');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    format: config.NODE_ENV === 'development' ? consoleFormat : logFormat,
    level: config.LOG_LEVEL || 'info'
  })
];

// Add file transports in production
if (config.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  format: logFormat,
  transports,
  exitOnError: false
});

// Create a stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
