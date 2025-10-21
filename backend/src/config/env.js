/**
 * BMAD V4 - Environment Variable Loader
 * 
 * @description Validates and loads environment variables with defaults
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

require('dotenv').config();

/**
 * Validates required environment variables
 */
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'MONGODB_URI',
    'NEO4J_URI',
    'NEO4J_USER',
    'NEO4J_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Environment configuration object
 */
const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database URLs
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,

  // ChromaDB
  CHROMA_HOST: process.env.CHROMA_HOST || 'localhost',
  CHROMA_PORT: parseInt(process.env.CHROMA_PORT || '8000', 10),

  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL,

  // Telnyx
  TELNYX_API_KEY: process.env.TELNYX_API_KEY,
  TELNYX_PUBLIC_KEY: process.env.TELNYX_PUBLIC_KEY,
  TELNYX_PHONE_NUMBER: process.env.TELNYX_PHONE_NUMBER,

  // Voice Agent
  VOICE_AGENT_URL: process.env.VOICE_AGENT_URL || 'http://localhost:4000',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'bmad-v4-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Feature Flags
  ENABLE_CORS: process.env.ENABLE_CORS !== 'false',
  ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION !== 'false',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
};

// Validate on load
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

module.exports = config;
