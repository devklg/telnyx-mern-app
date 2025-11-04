/**
 * Graph RAG Batch Learning Cron Job
 * Periodically learns from recent calls to update the knowledge graph
 */

const cron = require('node-cron');
const { periodicBatchLearning } = require('../middleware/auto-learning.middleware');
const logger = require('../utils/logger');

// Run every 6 hours: at 00:00, 06:00, 12:00, and 18:00
const CRON_SCHEDULE = '0 */6 * * *';

let cronJob = null;

/**
 * Start the cron job
 */
exports.start = () => {
  if (cronJob) {
    logger.warn('Graph RAG batch learning cron job is already running');
    return;
  }

  cronJob = cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('Running scheduled Graph RAG batch learning...');
    try {
      await periodicBatchLearning();
      logger.info('Scheduled Graph RAG batch learning completed successfully');
    } catch (error) {
      logger.error('Error in scheduled Graph RAG batch learning:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York'
  });

  logger.info(`Graph RAG batch learning cron job scheduled: ${CRON_SCHEDULE}`);
};

/**
 * Stop the cron job
 */
exports.stop = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Graph RAG batch learning cron job stopped');
  }
};

/**
 * Get cron job status
 */
exports.getStatus = () => {
  return {
    running: cronJob !== null,
    schedule: CRON_SCHEDULE,
    timezone: process.env.TZ || 'America/New_York'
  };
};
