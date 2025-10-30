const cron = require('node-cron');
const gmailService = require('../services/gmailService');
const leadImporter = require('../services/leadImporter');
const logger = require('../utils/logger');

/**
 * Gmail Lead Import Cron Job
 * Runs hourly to automatically import leads from Gmail
 *
 * @author James Taylor - Lead Management Developer
 * @schedule Every hour at :00 minutes (configurable via GMAIL_IMPORT_CRON)
 */

class GmailLeadImportCron {
  constructor() {
    this.cronSchedule = process.env.GMAIL_IMPORT_CRON || '0 * * * *'; // Default: every hour
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      totalImported: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      lastRunDate: null,
      lastRunResult: null
    };
  }

  /**
   * Start the cron job
   */
  start() {
    logger.info(`[Gmail Import Cron] Starting with schedule: ${this.cronSchedule}`);

    this.job = cron.schedule(this.cronSchedule, async () => {
      await this.runImport();
    });

    logger.info('[Gmail Import Cron] Successfully started');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('[Gmail Import Cron] Stopped');
    }
  }

  /**
   * Run manual import (triggered by API endpoint)
   */
  async runManualImport() {
    logger.info('[Gmail Import Cron] Manual import triggered');
    return await this.runImport();
  }

  /**
   * Execute the import process
   */
  async runImport() {
    if (this.isRunning) {
      logger.warn('[Gmail Import Cron] Import already running, skipping this cycle');
      return { skipped: true, reason: 'Previous import still running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[Gmail Import Cron] ========== STARTING GMAIL LEAD IMPORT ==========');

      // Step 1: Fetch unread lead emails from Gmail
      logger.info('[Gmail Import Cron] Step 1: Fetching unread emails from Gmail...');
      const emails = await gmailService.getUnreadLeadEmails();

      if (emails.length === 0) {
        logger.info('[Gmail Import Cron] No new emails found');
        this.updateStats({
          imported: 0,
          duplicates: 0,
          errors: 0,
          emailsFound: 0
        });
        return {
          success: true,
          message: 'No new emails found',
          stats: { emailsFound: 0 }
        };
      }

      logger.info(`[Gmail Import Cron] Step 2: Processing ${emails.length} emails...`);

      // Step 2: Import leads from emails
      const importResults = await leadImporter.importFromEmails(emails);

      // Step 3: Mark processed emails as read
      logger.info('[Gmail Import Cron] Step 3: Marking emails as read...');
      const emailIds = emails.map(e => e.id);
      await gmailService.markEmailsAsRead(emailIds);

      // Step 4: Apply processed label
      if (importResults.imported > 0) {
        logger.info('[Gmail Import Cron] Step 4: Applying "Processed" label...');
        await gmailService.applyLabel(emailIds, 'BMAD_Processed');
      }

      // Update statistics
      this.updateStats({
        imported: importResults.imported,
        duplicates: importResults.duplicates,
        errors: importResults.errors,
        emailsFound: emails.length
      });

      const duration = Date.now() - startTime;
      logger.info(`[Gmail Import Cron] ========== IMPORT COMPLETE (${duration}ms) ==========`);
      logger.info(`[Gmail Import Cron] Results: ${importResults.imported} imported, ${importResults.duplicates} duplicates, ${importResults.errors} errors`);

      // Send notification if errors occurred
      if (importResults.errors > 0) {
        await this.notifyErrors(importResults.errorDetails);
      }

      return {
        success: true,
        stats: importResults,
        duration
      };

    } catch (error) {
      logger.error('[Gmail Import Cron] CRITICAL ERROR:', error);
      this.stats.totalErrors++;

      // Send critical error notification
      await this.notifyCriticalError(error);

      return {
        success: false,
        error: error.message
      };

    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }
  }

  /**
   * Update internal statistics
   */
  updateStats(runStats) {
    this.stats.totalRuns++;
    this.stats.totalImported += runStats.imported;
    this.stats.totalDuplicates += runStats.duplicates;
    this.stats.totalErrors += runStats.errors;
    this.stats.lastRunDate = new Date();
    this.stats.lastRunResult = runStats;
  }

  /**
   * Notify about errors (to be implemented with email/Slack)
   */
  async notifyErrors(errorDetails) {
    logger.warn(`[Gmail Import Cron] ${errorDetails.length} errors occurred during import`);

    // TODO: Implement email notification to Kevin
    // TODO: Implement Slack webhook notification

    // For now, just log the errors
    errorDetails.forEach((err, idx) => {
      logger.error(`[Gmail Import Cron] Error ${idx + 1}:`, err);
    });
  }

  /**
   * Notify about critical errors
   */
  async notifyCriticalError(error) {
    logger.error('[Gmail Import Cron] CRITICAL ERROR - Gmail import failed completely');
    logger.error('[Gmail Import Cron] Error:', error.message);

    // TODO: Implement urgent notification to Kevin
    // TODO: Implement PagerDuty/incident management integration
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      cronSchedule: this.cronSchedule
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    const now = Date.now();
    const lastRunTime = this.lastRun ? this.lastRun.getTime() : 0;
    const hoursSinceLastRun = (now - lastRunTime) / (1000 * 60 * 60);

    return {
      status: hoursSinceLastRun < 2 ? 'healthy' : 'warning',
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      hoursSinceLastRun: hoursSinceLastRun.toFixed(2),
      stats: this.stats
    };
  }
}

// Export singleton instance
module.exports = new GmailLeadImportCron();
