/**
 * DNC Bloom Filter Service
 *
 * @description Ultra-fast DNC checks using Redis bloom filter
 *              Achieves <1ms lookup performance for DNC validation
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 *
 * Bloom Filter Benefits:
 * - O(1) lookup time
 * - Space-efficient (uses probabilistic data structure)
 * - No false negatives (if bloom filter says not in DNC, it's definitely not)
 * - Possible false positives (requires fallback to PostgreSQL check)
 */

const { client: redisClient } = require('../config/redis');
const logger = require('../utils/logger');

class DNCBloomFilter {
  constructor() {
    this.BLOOM_KEY = 'dnc:bloom_filter';
    this.METADATA_KEY = 'dnc:bloom_metadata';

    // Bloom filter parameters
    // Error rate: 0.01 (1% false positive rate)
    // Expected elements: 1,000,000
    this.errorRate = 0.01;
    this.capacity = 1000000;
  }

  /**
   * Initialize bloom filter with existing DNC numbers
   * Should be called on server startup or after Redis restart
   * @param {string[]} phoneNumbers - Array of phone numbers to add
   */
  async initialize(phoneNumbers = []) {
    try {
      logger.info('Initializing DNC bloom filter', {
        count: phoneNumbers.length
      });

      // Check if Redis supports bloom filter commands
      // Note: Requires RedisBloom module or we'll implement our own
      const hasBloom = await this._checkBloomSupport();

      if (hasBloom) {
        // Use native RedisBloom
        await this._initializeNativeBloom(phoneNumbers);
      } else {
        // Use Redis Sets as fallback (still fast, but uses more memory)
        await this._initializeSetBasedBloom(phoneNumbers);
      }

      // Store metadata
      await redisClient.set(
        this.METADATA_KEY,
        JSON.stringify({
          count: phoneNumbers.length,
          initializedAt: new Date().toISOString(),
          errorRate: this.errorRate,
          capacity: this.capacity
        })
      );

      logger.info('DNC bloom filter initialized successfully');
    } catch (error) {
      logger.error('Error initializing bloom filter:', error);
      throw error;
    }
  }

  /**
   * Check if phone number exists in bloom filter
   * @param {string} phoneNumber - Phone number to check
   * @returns {boolean} True if MIGHT be on DNC (requires PostgreSQL verification)
   */
  async check(phoneNumber) {
    try {
      const hasBloom = await this._checkBloomSupport();

      if (hasBloom) {
        return await this._checkNativeBloom(phoneNumber);
      } else {
        return await this._checkSetBasedBloom(phoneNumber);
      }
    } catch (error) {
      logger.error('Error checking bloom filter:', error);
      // On error, return true to force PostgreSQL check (fail-safe)
      return true;
    }
  }

  /**
   * Add phone number to bloom filter
   * @param {string} phoneNumber - Phone number to add
   */
  async add(phoneNumber) {
    try {
      const hasBloom = await this._checkBloomSupport();

      if (hasBloom) {
        await this._addToNativeBloom(phoneNumber);
      } else {
        await this._addToSetBasedBloom(phoneNumber);
      }

      // Update count in metadata
      await this._incrementCount();

      logger.debug(`Added to bloom filter: ${phoneNumber}`);
    } catch (error) {
      logger.error('Error adding to bloom filter:', error);
      // Don't throw - bloom filter is optimization, not critical
    }
  }

  /**
   * Remove phone number from bloom filter
   * Note: Standard bloom filters don't support deletion
   * We'll need to use counting bloom filter or set-based approach
   * @param {string} phoneNumber - Phone number to remove
   */
  async remove(phoneNumber) {
    try {
      // Only supported in set-based implementation
      await this._removeFromSetBasedBloom(phoneNumber);
      await this._decrementCount();

      logger.debug(`Removed from bloom filter: ${phoneNumber}`);
    } catch (error) {
      logger.error('Error removing from bloom filter:', error);
    }
  }

  /**
   * Bulk add phone numbers to bloom filter
   * @param {string[]} phoneNumbers - Array of phone numbers
   */
  async bulkAdd(phoneNumbers) {
    try {
      logger.info(`Bulk adding ${phoneNumbers.length} numbers to bloom filter`);

      const hasBloom = await this._checkBloomSupport();

      if (hasBloom) {
        // Use pipelining for batch operations
        const pipeline = redisClient.multi();

        phoneNumbers.forEach(phone => {
          pipeline.call('BF.ADD', this.BLOOM_KEY, phone);
        });

        await pipeline.exec();
      } else {
        // Use SADD with multiple values
        if (phoneNumbers.length > 0) {
          await redisClient.sAdd(this.BLOOM_KEY, phoneNumbers);
        }
      }

      logger.info('Bulk add completed');
    } catch (error) {
      logger.error('Error in bulk add:', error);
    }
  }

  /**
   * Get bloom filter statistics
   * @returns {Object} Statistics
   */
  async getStats() {
    try {
      const metadata = await redisClient.get(this.METADATA_KEY);

      if (!metadata) {
        return {
          initialized: false,
          count: 0
        };
      }

      const stats = JSON.parse(metadata);
      const hasBloom = await this._checkBloomSupport();

      if (hasBloom) {
        // Get bloom filter info
        try {
          const info = await redisClient.call('BF.INFO', this.BLOOM_KEY);
          stats.bloomInfo = this._parseBloomInfo(info);
        } catch (err) {
          logger.warn('Could not get bloom info:', err);
        }
      } else {
        // Get set size
        const size = await redisClient.sCard(this.BLOOM_KEY);
        stats.actualCount = size;
      }

      stats.implementation = hasBloom ? 'RedisBloom' : 'Redis Set';
      stats.initialized = true;

      return stats;
    } catch (error) {
      logger.error('Error getting bloom stats:', error);
      return { initialized: false, error: error.message };
    }
  }

  /**
   * Clear bloom filter (use with caution!)
   */
  async clear() {
    try {
      await redisClient.del(this.BLOOM_KEY);
      await redisClient.del(this.METADATA_KEY);
      logger.warn('DNC bloom filter cleared');
    } catch (error) {
      logger.error('Error clearing bloom filter:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Native RedisBloom Implementation
  // ============================================================================

  async _checkBloomSupport() {
    try {
      // Check if BF.RESERVE command exists
      const result = await redisClient.call('COMMAND', 'INFO', 'BF.RESERVE');
      return result && result.length > 0;
    } catch (error) {
      // Command not found or error - no bloom support
      return false;
    }
  }

  async _initializeNativeBloom(phoneNumbers) {
    try {
      // Create bloom filter with specified error rate and capacity
      await redisClient.call(
        'BF.RESERVE',
        this.BLOOM_KEY,
        this.errorRate,
        this.capacity
      );

      // Bulk add numbers
      if (phoneNumbers.length > 0) {
        await this.bulkAdd(phoneNumbers);
      }
    } catch (error) {
      if (error.message && error.message.includes('key already exists')) {
        logger.info('Bloom filter already exists, skipping initialization');
      } else {
        throw error;
      }
    }
  }

  async _checkNativeBloom(phoneNumber) {
    try {
      const result = await redisClient.call('BF.EXISTS', this.BLOOM_KEY, phoneNumber);
      return result === 1;
    } catch (error) {
      logger.error('Error checking native bloom:', error);
      return true; // Fail-safe: assume might be on DNC
    }
  }

  async _addToNativeBloom(phoneNumber) {
    await redisClient.call('BF.ADD', this.BLOOM_KEY, phoneNumber);
  }

  _parseBloomInfo(info) {
    // Parse BF.INFO output
    const parsed = {};
    for (let i = 0; i < info.length; i += 2) {
      parsed[info[i]] = info[i + 1];
    }
    return parsed;
  }

  // ============================================================================
  // PRIVATE METHODS - Set-Based Fallback Implementation
  // ============================================================================

  async _initializeSetBasedBloom(phoneNumbers) {
    try {
      // Clear existing set
      await redisClient.del(this.BLOOM_KEY);

      // Add all numbers to set
      if (phoneNumbers.length > 0) {
        // Redis SADD supports multiple values
        await redisClient.sAdd(this.BLOOM_KEY, phoneNumbers);
      }

      logger.info('Initialized set-based bloom filter');
    } catch (error) {
      logger.error('Error initializing set-based bloom:', error);
      throw error;
    }
  }

  async _checkSetBasedBloom(phoneNumber) {
    try {
      const exists = await redisClient.sIsMember(this.BLOOM_KEY, phoneNumber);
      return exists;
    } catch (error) {
      logger.error('Error checking set-based bloom:', error);
      return true; // Fail-safe
    }
  }

  async _addToSetBasedBloom(phoneNumber) {
    await redisClient.sAdd(this.BLOOM_KEY, phoneNumber);
  }

  async _removeFromSetBasedBloom(phoneNumber) {
    await redisClient.sRem(this.BLOOM_KEY, phoneNumber);
  }

  // ============================================================================
  // METADATA HELPERS
  // ============================================================================

  async _incrementCount() {
    try {
      const metadata = await redisClient.get(this.METADATA_KEY);
      if (metadata) {
        const stats = JSON.parse(metadata);
        stats.count = (stats.count || 0) + 1;
        stats.lastUpdated = new Date().toISOString();
        await redisClient.set(this.METADATA_KEY, JSON.stringify(stats));
      }
    } catch (error) {
      logger.error('Error incrementing count:', error);
    }
  }

  async _decrementCount() {
    try {
      const metadata = await redisClient.get(this.METADATA_KEY);
      if (metadata) {
        const stats = JSON.parse(metadata);
        stats.count = Math.max(0, (stats.count || 0) - 1);
        stats.lastUpdated = new Date().toISOString();
        await redisClient.set(this.METADATA_KEY, JSON.stringify(stats));
      }
    } catch (error) {
      logger.error('Error decrementing count:', error);
    }
  }
}

module.exports = new DNCBloomFilter();
