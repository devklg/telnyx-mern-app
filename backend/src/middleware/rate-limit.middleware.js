/**
 * BMAD V4 - Rate Limiting Middleware
 * 
 * @description Prevents API abuse by limiting request rates
 * @owner David Rodriguez (Backend Lead) & Marcus Thompson (Security)
 * @created 2025-10-21
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const config = require('../config/env');

/**
 * Create rate limiter with optional Redis store
 */
function createRateLimiter(options = {}) {
  const redisClient = getRedisClient();

  const limiterConfig = {
    windowMs: options.windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: options.max || config.RATE_LIMIT_MAX_REQUESTS,
    message: options.message || {
      error: 'Too many requests',
      message: 'You have exceeded the request limit. Please try again later.',
      retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(limiterConfig.message);
    },
    skip: (req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    }
  };

  // Use Redis store if available
  if (redisClient) {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'bmad:ratelimit:'
    });
  }

  return rateLimit(limiterConfig);
}

// Default rate limiter
const defaultLimiter = createRateLimiter();

// Strict rate limiter for sensitive endpoints
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Lenient rate limiter for public endpoints
const lenientLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200
});

module.exports = defaultLimiter;
module.exports.createRateLimiter = createRateLimiter;
module.exports.strictLimiter = strictLimiter;
module.exports.lenientLimiter = lenientLimiter;
