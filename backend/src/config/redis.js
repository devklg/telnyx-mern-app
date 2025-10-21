/**
 * BMAD V4 - Redis Cache Configuration
 * 
 * @description Redis client setup for caching and session management
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis client
 */
async function initRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️  Redis URL not configured, caching disabled');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return retries * 100;
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    return null;
  }
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
  return redisClient;
}

/**
 * Cache helper functions
 */
const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    if (!redisClient) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key, value, ttl = 3600) {
    if (!redisClient) return false;
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!redisClient) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Clear all cache
   */
  async clear() {
    if (!redisClient) return false;
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  cache
};
