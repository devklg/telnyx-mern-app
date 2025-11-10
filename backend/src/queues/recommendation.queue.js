/**
 * Recommendation Queue
 *
 * Bull queue for async recommendation generation and processing
 * Handles batch recommendation generation to avoid blocking API responses
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const Bull = require('bull');
const { generateUserRecommendations } = require('../services/aiRecommendationService');
const { cache } = require('../config/redis');

// Create recommendation queue
const recommendationQueue = new Bull('recommendations', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * Process recommendation generation jobs
 */
recommendationQueue.process('generate-user-recommendations', async (job) => {
  const { userId, options } = job.data;

  try {
    console.log(`Processing recommendation generation for user ${userId}`);

    // Generate recommendations
    const recommendations = await generateUserRecommendations(userId, options);

    // Cache results
    const cacheKey = `lead_recommendations:${userId}:${options.status || 'all'}:${options.limit || 10}`;
    await cache.set(cacheKey, JSON.stringify(recommendations), 3600);

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);

    // Update job progress
    await job.progress(100);

    return {
      success: true,
      userId,
      count: recommendations.length,
      recommendations
    };

  } catch (error) {
    console.error('Error processing recommendation job:', error);
    throw error;
  }
});

/**
 * Process cache invalidation jobs
 */
recommendationQueue.process('invalidate-cache', async (job) => {
  const { userId, leadId } = job.data;

  try {
    if (userId) {
      // Invalidate all user recommendations
      const statuses = ['all', 'new', 'contacted', 'qualified', 'callback'];
      for (const status of statuses) {
        await cache.del(`lead_recommendations:${userId}:${status}:10`);
        await cache.del(`lead_recommendations:${userId}:${status}:20`);
      }
    }

    if (leadId) {
      await cache.del(`lead_recommendation:${leadId}`);
    }

    return { success: true, userId, leadId };

  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw error;
  }
});

/**
 * Job event handlers
 */
recommendationQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

recommendationQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

recommendationQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`);
});

/**
 * Add job to generate recommendations for a user
 * @param {String} userId - User ID
 * @param {Object} options - Generation options
 * @returns {Promise<Job>} Bull job
 */
async function queueRecommendationGeneration(userId, options = {}) {
  return await recommendationQueue.add('generate-user-recommendations', {
    userId,
    options
  }, {
    priority: options.priority || 5,
    delay: options.delay || 0
  });
}

/**
 * Add job to invalidate cache
 * @param {Object} data - { userId, leadId }
 * @returns {Promise<Job>} Bull job
 */
async function queueCacheInvalidation(data) {
  return await recommendationQueue.add('invalidate-cache', data, {
    priority: 10 // High priority
  });
}

/**
 * Schedule periodic recommendation regeneration
 * @param {String} userId - User ID
 * @param {String} cronPattern - Cron pattern (e.g., '0 * * * *' for hourly)
 */
async function schedulePeriodicRegeneration(userId, cronPattern = '0 * * * *') {
  return await recommendationQueue.add('generate-user-recommendations', {
    userId,
    options: { limit: 10 }
  }, {
    repeat: {
      cron: cronPattern
    }
  });
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    recommendationQueue.getWaitingCount(),
    recommendationQueue.getActiveCount(),
    recommendationQueue.getCompletedCount(),
    recommendationQueue.getFailedCount(),
    recommendationQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}

/**
 * Clean old jobs
 */
async function cleanQueue() {
  await recommendationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
  await recommendationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
}

module.exports = {
  recommendationQueue,
  queueRecommendationGeneration,
  queueCacheInvalidation,
  schedulePeriodicRegeneration,
  getQueueStats,
  cleanQueue
};
