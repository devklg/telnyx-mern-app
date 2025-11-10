/**
 * Lead Scoring Queue
 *
 * Bull queue for async lead scoring operations:
 * - Single lead score calculation
 * - Batch score recalculation
 * - Score decay application
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const Bull = require('bull');
const {
  calculateLeadScore,
  applyScoreDecay,
  recalculateAllScores
} = require('../services/leadScoringService');
const { cache } = require('../config/redis');

// Create lead scoring queue
const leadScoringQueue = new Bull('lead-scoring', {
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
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: false     // Keep failed jobs for debugging
  }
});

/**
 * Process single lead score calculation
 */
leadScoringQueue.process('calculate-score', async (job) => {
  const { leadId } = job.data;

  try {
    console.log(`[Lead Scoring Queue] Calculating score for lead: ${leadId}`);

    const score = await calculateLeadScore(leadId);

    // Update progress
    await job.progress(100);

    return {
      success: true,
      leadId,
      score: score.total,
      classification: score.classification
    };

  } catch (error) {
    console.error(`[Lead Scoring Queue] Error calculating score for lead ${leadId}:`, error);
    throw error;
  }
});

/**
 * Process batch score recalculation
 */
leadScoringQueue.process('batch-recalculation', async (job) => {
  const { batchSize = 100 } = job.data;

  try {
    console.log(`[Lead Scoring Queue] Starting batch recalculation (batch size: ${batchSize})`);

    const result = await recalculateAllScores(batchSize);

    // Update progress
    await job.progress(100);

    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('[Lead Scoring Queue] Error in batch recalculation:', error);
    throw error;
  }
});

/**
 * Process score decay application
 */
leadScoringQueue.process('apply-decay', async (job) => {
  const { leadId } = job.data;

  try {
    console.log(`[Lead Scoring Queue] Applying score decay for lead: ${leadId}`);

    const score = await applyScoreDecay(leadId);

    // Update progress
    await job.progress(100);

    return {
      success: true,
      leadId,
      score: score.total,
      decayApplied: score.decayApplied
    };

  } catch (error) {
    console.error(`[Lead Scoring Queue] Error applying decay for lead ${leadId}:`, error);
    throw error;
  }
});

/**
 * Process batch decay application (for daily cron)
 */
leadScoringQueue.process('batch-decay', async (job) => {
  const { leadIds } = job.data;

  try {
    console.log(`[Lead Scoring Queue] Applying decay to ${leadIds.length} leads`);

    const results = {
      total: leadIds.length,
      processed: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < leadIds.length; i++) {
      try {
        await applyScoreDecay(leadIds[i]);
        results.processed++;

        // Update progress
        const progress = Math.round(((i + 1) / leadIds.length) * 100);
        await job.progress(progress);

      } catch (error) {
        results.failed++;
        results.errors.push({
          leadId: leadIds[i],
          error: error.message
        });
      }
    }

    return {
      success: true,
      ...results
    };

  } catch (error) {
    console.error('[Lead Scoring Queue] Error in batch decay:', error);
    throw error;
  }
});

/**
 * Process cache invalidation
 */
leadScoringQueue.process('invalidate-cache', async (job) => {
  const { leadId, pattern } = job.data;

  try {
    if (leadId) {
      // Invalidate specific lead cache
      await cache.del(`lead:score:${leadId}`);
    }

    if (pattern) {
      // Invalidate pattern-based cache (e.g., top-scored lists)
      // Note: Redis client needs to support pattern deletion
      await cache.del(pattern);
    }

    return {
      success: true,
      leadId,
      pattern
    };

  } catch (error) {
    console.error('[Lead Scoring Queue] Error invalidating cache:', error);
    throw error;
  }
});

/**
 * Job event handlers
 */
leadScoringQueue.on('completed', (job, result) => {
  console.log(`[Lead Scoring Queue] Job ${job.id} (${job.name}) completed:`, result);
});

leadScoringQueue.on('failed', (job, err) => {
  console.error(`[Lead Scoring Queue] Job ${job.id} (${job.name}) failed:`, err.message);
});

leadScoringQueue.on('stalled', (job) => {
  console.warn(`[Lead Scoring Queue] Job ${job.id} (${job.name}) stalled`);
});

leadScoringQueue.on('error', (error) => {
  console.error('[Lead Scoring Queue] Queue error:', error);
});

/**
 * Add job to calculate score for a lead
 * @param {String} leadId - Lead ID
 * @param {Object} options - Job options
 * @returns {Promise<Job>} Bull job
 */
async function queueScoreCalculation(leadId, options = {}) {
  return await leadScoringQueue.add('calculate-score', {
    leadId
  }, {
    priority: options.priority || 5,
    delay: options.delay || 0
  });
}

/**
 * Add job for batch recalculation
 * @param {Object} data - { batchSize }
 * @returns {Promise<Job>} Bull job
 */
async function queueBatchRecalculation(data = {}) {
  return await leadScoringQueue.add('batch-recalculation', data, {
    priority: 3, // Lower priority for batch jobs
    timeout: 3600000 // 1 hour timeout
  });
}

/**
 * Add job to apply score decay
 * @param {String} leadId - Lead ID
 * @returns {Promise<Job>} Bull job
 */
async function queueScoreDecay(leadId) {
  return await leadScoringQueue.add('apply-decay', {
    leadId
  }, {
    priority: 4
  });
}

/**
 * Add job for batch decay application
 * @param {Array} leadIds - Array of lead IDs
 * @returns {Promise<Job>} Bull job
 */
async function queueBatchDecay(leadIds) {
  return await leadScoringQueue.add('batch-decay', {
    leadIds
  }, {
    priority: 3,
    timeout: 3600000 // 1 hour timeout
  });
}

/**
 * Add job to invalidate cache
 * @param {Object} data - { leadId, pattern }
 * @returns {Promise<Job>} Bull job
 */
async function queueCacheInvalidation(data) {
  return await leadScoringQueue.add('invalidate-cache', data, {
    priority: 10 // High priority
  });
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    leadScoringQueue.getWaitingCount(),
    leadScoringQueue.getActiveCount(),
    leadScoringQueue.getCompletedCount(),
    leadScoringQueue.getFailedCount(),
    leadScoringQueue.getDelayedCount()
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
 * Clean old jobs from queue
 */
async function cleanQueue() {
  await leadScoringQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
  await leadScoringQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');  // Remove failed jobs older than 7 days
  console.log('[Lead Scoring Queue] Queue cleaned');
}

/**
 * Pause the queue
 */
async function pauseQueue() {
  await leadScoringQueue.pause();
  console.log('[Lead Scoring Queue] Queue paused');
}

/**
 * Resume the queue
 */
async function resumeQueue() {
  await leadScoringQueue.resume();
  console.log('[Lead Scoring Queue] Queue resumed');
}

/**
 * Get job by ID
 * @param {String} jobId - Job ID
 * @returns {Promise<Job>} Bull job
 */
async function getJob(jobId) {
  return await leadScoringQueue.getJob(jobId);
}

/**
 * Remove job by ID
 * @param {String} jobId - Job ID
 */
async function removeJob(jobId) {
  const job = await leadScoringQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

module.exports = {
  leadScoringQueue,
  queueScoreCalculation,
  queueBatchRecalculation,
  queueScoreDecay,
  queueBatchDecay,
  queueCacheInvalidation,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getJob,
  removeJob
};