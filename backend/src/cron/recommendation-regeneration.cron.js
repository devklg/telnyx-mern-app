/**
 * Recommendation Regeneration Cron Job
 *
 * Periodically regenerates recommendations for active users
 * to ensure they always have fresh, up-to-date action items
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const cron = require('node-cron');
const { queueRecommendationGeneration } = require('../queues/recommendation.queue');
const Lead = require('../database/mongodb/schemas/lead.schema');

let cronJob = null;

/**
 * Get active users (those with leads in active statuses)
 */
async function getActiveUsers() {
  try {
    const activeLeads = await Lead.aggregate([
      {
        $match: {
          status: { $in: ['new', 'contacted', 'qualified', 'callback'] },
          doNotCall: { $ne: true },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          leadCount: { $sum: 1 }
        }
      },
      {
        $match: {
          leadCount: { $gte: 1 }
        }
      }
    ]);

    return activeLeads.map(item => ({
      userId: item._id,
      leadCount: item.leadCount
    }));

  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
}

/**
 * Regenerate recommendations for all active users
 */
async function regenerateAllRecommendations() {
  try {
    console.log('[Recommendation Cron] Starting recommendation regeneration...');

    const activeUsers = await getActiveUsers();
    console.log(`[Recommendation Cron] Found ${activeUsers.length} active users`);

    let queued = 0;
    for (const user of activeUsers) {
      try {
        await queueRecommendationGeneration(user.userId, {
          limit: 10,
          priority: 3 // Lower priority for cron jobs
        });
        queued++;
      } catch (error) {
        console.error(`Error queuing recommendations for user ${user.userId}:`, error);
      }
    }

    console.log(`[Recommendation Cron] Queued ${queued} recommendation generation jobs`);

    return {
      success: true,
      usersProcessed: activeUsers.length,
      jobsQueued: queued,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Recommendation Cron] Error regenerating recommendations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start the cron job
 * Runs every hour at minute 0
 */
function start() {
  if (cronJob) {
    console.log('[Recommendation Cron] Already running');
    return;
  }

  // Run every hour at minute 0
  cronJob = cron.schedule('0 * * * *', async () => {
    console.log('[Recommendation Cron] Starting scheduled regeneration');
    await regenerateAllRecommendations();
  });

  console.log('✅ Recommendation regeneration cron job started (hourly)');
}

/**
 * Stop the cron job
 */
function stop() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Recommendation Cron] Stopped');
  }
}

/**
 * Manual trigger (for testing or admin panel)
 */
async function runManual() {
  console.log('[Recommendation Cron] Manual run triggered');
  return await regenerateAllRecommendations();
}

/**
 * Get cron job status
 */
function getStatus() {
  return {
    running: cronJob !== null,
    schedule: '0 * * * * (every hour)',
    description: 'Regenerates recommendations for active users'
  };
}

module.exports = {
  start,
  stop,
  runManual,
  getStatus,
  regenerateAllRecommendations
};
