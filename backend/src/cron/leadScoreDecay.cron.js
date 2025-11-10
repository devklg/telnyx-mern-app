/**
 * Lead Score Decay Cron Job
 *
 * Daily cron job to apply time-based score decay:
 * - Engagement points decay 20% per month
 * - Intent points decay 50% per month
 * - Runs daily at 2 AM (configurable)
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const cron = require('node-cron');
const Lead = require('../database/mongodb/schemas/lead.schema');
const { queueBatchDecay } = require('../queues/leadScoring.queue');

// Statistics tracking
const stats = {
  lastRun: null,
  lastDuration: null,
  lastProcessed: 0,
  lastFailed: 0,
  totalRuns: 0,
  totalProcessed: 0,
  totalFailed: 0
};

/**
 * Main decay application function
 */
async function applyDailyDecay() {
  const startTime = Date.now();
  console.log('[Lead Score Decay Cron] Starting daily score decay application...');

  try {
    // Get all active leads that need decay
    // Criteria: Last contact > 30 days ago OR last score calculation > 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const leads = await Lead.find({
      doNotCall: { $ne: true },
      status: { $nin: ['completed', 'not_interested', 'transferred'] },
      $or: [
        { lastContactedAt: { $lt: thirtyDaysAgo } },
        { updatedAt: { $lt: thirtyDaysAgo } },
        { lastContactedAt: null }
      ]
    })
    .select('_id')
    .lean();

    if (leads.length === 0) {
      console.log('[Lead Score Decay Cron] No leads require decay application');
      stats.lastRun = new Date();
      stats.lastDuration = Date.now() - startTime;
      stats.lastProcessed = 0;
      stats.lastFailed = 0;
      stats.totalRuns++;
      return {
        success: true,
        processed: 0,
        message: 'No leads require decay'
      };
    }

    console.log(`[Lead Score Decay Cron] Found ${leads.length} leads requiring decay application`);

    // Process in batches of 100
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize).map(lead => lead._id.toString());
      batches.push(batch);
    }

    console.log(`[Lead Score Decay Cron] Processing ${batches.length} batches...`);

    // Queue batches for processing
    const jobs = [];
    for (const batch of batches) {
      const job = await queueBatchDecay(batch);
      jobs.push(job);
    }

    // Wait for all jobs to complete (with timeout)
    const results = await Promise.allSettled(
      jobs.map(job => job.finished())
    );

    // Aggregate results
    let totalProcessed = 0;
    let totalFailed = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalProcessed += result.value.processed || 0;
        totalFailed += result.value.failed || 0;
      } else {
        console.error(`[Lead Score Decay Cron] Batch ${index + 1} failed:`, result.reason);
        totalFailed += batches[index].length;
      }
    });

    // Update statistics
    const duration = Date.now() - startTime;
    stats.lastRun = new Date();
    stats.lastDuration = duration;
    stats.lastProcessed = totalProcessed;
    stats.lastFailed = totalFailed;
    stats.totalRuns++;
    stats.totalProcessed += totalProcessed;
    stats.totalFailed += totalFailed;

    console.log(`[Lead Score Decay Cron] Completed in ${duration}ms`);
    console.log(`[Lead Score Decay Cron] Processed: ${totalProcessed}, Failed: ${totalFailed}`);

    return {
      success: true,
      processed: totalProcessed,
      failed: totalFailed,
      duration,
      batches: batches.length
    };

  } catch (error) {
    console.error('[Lead Score Decay Cron] Error in decay application:', error);

    // Update error stats
    stats.lastRun = new Date();
    stats.lastDuration = Date.now() - startTime;
    stats.totalRuns++;

    throw error;
  }
}

/**
 * Schedule the cron job
 * Default: Daily at 2 AM
 * Cron pattern: '0 2 * * *'
 */
function scheduleDecayCron() {
  const cronPattern = process.env.LEAD_DECAY_CRON || '0 2 * * *';

  const task = cron.schedule(cronPattern, async () => {
    try {
      await applyDailyDecay();
    } catch (error) {
      console.error('[Lead Score Decay Cron] Scheduled task error:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York'
  });

  console.log(`[Lead Score Decay Cron] Scheduled with pattern: ${cronPattern}`);

  return task;
}

/**
 * Run decay manually (for testing or admin trigger)
 */
async function runManualDecay() {
  console.log('[Lead Score Decay Cron] Manual decay triggered');
  return await applyDailyDecay();
}

/**
 * Get cron statistics
 */
function getStats() {
  return {
    ...stats,
    lastRunFormatted: stats.lastRun ? stats.lastRun.toISOString() : null,
    lastDurationSeconds: stats.lastDuration ? (stats.lastDuration / 1000).toFixed(2) : null,
    successRate: stats.totalRuns > 0
      ? ((stats.totalProcessed / (stats.totalProcessed + stats.totalFailed)) * 100).toFixed(2)
      : null
  };
}

/**
 * Reset statistics
 */
function resetStats() {
  stats.lastRun = null;
  stats.lastDuration = null;
  stats.lastProcessed = 0;
  stats.lastFailed = 0;
  stats.totalRuns = 0;
  stats.totalProcessed = 0;
  stats.totalFailed = 0;
  console.log('[Lead Score Decay Cron] Statistics reset');
}

/**
 * Get next scheduled run time
 * @param {Object} cronTask - Cron task instance
 * @returns {Date} Next run time
 */
function getNextRunTime(cronTask) {
  if (!cronTask) return null;

  // node-cron doesn't expose next run time directly
  // This is an approximation based on pattern
  const pattern = process.env.LEAD_DECAY_CRON || '0 2 * * *';

  if (pattern === '0 2 * * *') {
    // Daily at 2 AM
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);

    if (next <= now) {
      // If 2 AM today has passed, set to tomorrow
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  return null;
}

/**
 * Health check for cron job
 */
function healthCheck() {
  const lastRun = stats.lastRun;
  const now = Date.now();

  // If last run was more than 25 hours ago, something is wrong
  const isHealthy = !lastRun || (now - lastRun.getTime()) < 25 * 60 * 60 * 1000;

  return {
    healthy: isHealthy,
    lastRun: stats.lastRun,
    lastRunFormatted: stats.lastRun ? stats.lastRun.toISOString() : 'Never',
    hoursSinceLastRun: lastRun ? ((now - lastRun.getTime()) / (1000 * 60 * 60)).toFixed(2) : null,
    message: isHealthy ? 'Cron job is healthy' : 'Cron job may be stuck or failed'
  };
}

module.exports = {
  scheduleDecayCron,
  runManualDecay,
  getStats,
  resetStats,
  getNextRunTime,
  healthCheck,
  applyDailyDecay
};