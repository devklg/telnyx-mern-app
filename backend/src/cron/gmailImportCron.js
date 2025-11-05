const cron = require('node-cron');
const gmailService = require('../services/gmailService');

class GmailImportCron {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Initialize and start the cron job
   */
  start() {
    const cronSchedule = process.env.GMAIL_IMPORT_CRON || '0 * * * *'; // Default: every hour
    
    console.log(`📅 Initializing Gmail import cron job with schedule: ${cronSchedule}`);

    this.task = cron.schedule(cronSchedule, async () => {
      if (this.isRunning) {
        console.log('⏭️  Skipping Gmail import: Previous job still running');
        return;
      }

      this.isRunning = true;
      console.log(`\n🚀 [${new Date().toISOString()}] Starting scheduled Gmail lead import`);

      try {
        const results = await gmailService.importLeads();
        
        console.log('✅ Scheduled Gmail import completed:', {
          timestamp: new Date().toISOString(),
          ...results
        });

        // Log to database or monitoring system if needed
        // await this.logImportResults(results);

      } catch (error) {
        console.error('❌ Scheduled Gmail import failed:', error.message);
        
        // Send alert notification if needed
        // await this.sendFailureAlert(error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    });

    console.log('✅ Gmail import cron job started successfully');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('⏹️  Gmail import cron job stopped');
    }
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isActive: this.task ? true : false,
      isRunning: this.isRunning,
      schedule: process.env.GMAIL_IMPORT_CRON || '0 * * * *',
      timezone: process.env.TZ || 'America/New_York'
    };
  }

  /**
   * Manually trigger import (outside of schedule)
   */
  async triggerManual() {
    if (this.isRunning) {
      throw new Error('Import already in progress');
    }

    this.isRunning = true;
    console.log('🔧 Manual Gmail import triggered');

    try {
      const results = await gmailService.importLeads();
      console.log('✅ Manual Gmail import completed:', results);
      return results;
    } finally {
      this.isRunning = false;
    }
  }
}

// Export singleton instance
module.exports = new GmailImportCron();
