const Lead = require('../database/mongodb/schemas/lead.schema');
const logger = require('../utils/logger');

/**
 * Lead Queue Management Service
 * Manages call queue, lead prioritization, and next-lead selection
 *
 * @author James Taylor - Lead Management Developer
 * @purpose Provide leads to Jennifer Kim's Telnyx Integration for calling
 */

class LeadQueueService {
  constructor() {
    this.queueCache = null;
    this.cacheTimeout = 60000; // 1 minute cache
    this.lastCacheUpdate = null;
  }

  /**
   * Get next lead to call
   * Priority order:
   * 1. Scheduled follow-ups (overdue)
   * 2. Fresh leads (never contacted, high priority)
   * 3. Fresh leads (never contacted, medium priority)
   * 4. Aged leads needing retry
   * 5. Nurturing leads ready for follow-up
   *
   * @returns {Object} Next lead to call
   */
  async getNextLead() {
    try {
      logger.info('[Lead Queue] Finding next lead to call...');

      // Priority 1: Overdue follow-ups
      let lead = await this.getOverdueFollowUps();
      if (lead) {
        logger.info(`[Lead Queue] Selected overdue follow-up: ${lead._id}`);
        return lead;
      }

      // Priority 2: Fresh high-priority leads
      lead = await this.getFreshLeads('high');
      if (lead) {
        logger.info(`[Lead Queue] Selected fresh high-priority lead: ${lead._id}`);
        return lead;
      }

      // Priority 3: Fresh medium-priority leads
      lead = await this.getFreshLeads('medium');
      if (lead) {
        logger.info(`[Lead Queue] Selected fresh medium-priority lead: ${lead._id}`);
        return lead;
      }

      // Priority 4: Aged leads (recycled)
      lead = await this.getAgedLeads();
      if (lead) {
        logger.info(`[Lead Queue] Selected aged lead: ${lead._id}`);
        return lead;
      }

      // Priority 5: Nurturing leads
      lead = await this.getNurturingLeads();
      if (lead) {
        logger.info(`[Lead Queue] Selected nurturing lead: ${lead._id}`);
        return lead;
      }

      logger.warn('[Lead Queue] No leads available in queue');
      return null;

    } catch (error) {
      logger.error('[Lead Queue] Error getting next lead:', error);
      throw error;
    }
  }

  /**
   * Get overdue follow-up leads
   */
  async getOverdueFollowUps() {
    return await Lead.findOne({
      nextFollowUpAt: { $lte: new Date() },
      status: { $in: ['contacted', 'qualified', 'nurturing'] },
      isActive: true,
      'consent.canCall': true
    })
      .sort({ priority: -1, nextFollowUpAt: 1 })
      .lean();
  }

  /**
   * Get fresh leads (never contacted)
   */
  async getFreshLeads(priority = 'high') {
    return await Lead.findOne({
      status: 'new',
      contactAttempts: 0,
      priority: priority,
      isActive: true,
      'consent.canCall': true,
      tags: 'gmail_import'
    })
      .sort({ createdAt: -1 }) // Most recent first
      .lean();
  }

  /**
   * Get aged leads needing retry
   */
  async getAgedLeads() {
    // Leads that haven't been contacted in 7+ days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return await Lead.findOne({
      status: { $in: ['new', 'contacted'] },
      contactAttempts: { $lt: 5 }, // Max 5 attempts
      $or: [
        { lastContactedAt: { $lte: sevenDaysAgo } },
        { lastContactedAt: null }
      ],
      isActive: true,
      'consent.canCall': true
    })
      .sort({ lastContactedAt: 1 }) // Oldest first
      .lean();
  }

  /**
   * Get nurturing leads ready for follow-up
   */
  async getNurturingLeads() {
    return await Lead.findOne({
      status: 'nurturing',
      nextFollowUpAt: { $lte: new Date() },
      isActive: true,
      'consent.canCall': true
    })
      .sort({ qualificationScore: -1 }) // Highest score first
      .lean();
  }

  /**
   * Get queue status and statistics
   */
  async getQueueStatus() {
    try {
      const stats = await Promise.all([
        // Overdue follow-ups
        Lead.countDocuments({
          nextFollowUpAt: { $lte: new Date() },
          status: { $in: ['contacted', 'qualified', 'nurturing'] },
          isActive: true,
          'consent.canCall': true
        }),

        // Fresh high-priority leads
        Lead.countDocuments({
          status: 'new',
          contactAttempts: 0,
          priority: 'high',
          isActive: true,
          'consent.canCall': true
        }),

        // Fresh medium-priority leads
        Lead.countDocuments({
          status: 'new',
          contactAttempts: 0,
          priority: 'medium',
          isActive: true,
          'consent.canCall': true
        }),

        // Aged leads
        Lead.countDocuments({
          status: { $in: ['new', 'contacted'] },
          contactAttempts: { $lt: 5 },
          isActive: true,
          'consent.canCall': true
        }),

        // Nurturing leads
        Lead.countDocuments({
          status: 'nurturing',
          isActive: true,
          'consent.canCall': true
        }),

        // Total active leads
        Lead.countDocuments({ isActive: true }),

        // Qualified leads (ready for Kevin)
        Lead.countDocuments({
          status: 'qualified',
          qualificationScore: { $gte: 70 },
          isActive: true
        })
      ]);

      return {
        overdueFollowUps: stats[0],
        freshHighPriority: stats[1],
        freshMediumPriority: stats[2],
        agedLeads: stats[3],
        nurturingLeads: stats[4],
        totalActive: stats[5],
        qualifiedLeads: stats[6],
        totalInQueue: stats[0] + stats[1] + stats[2] + stats[3] + stats[4]
      };

    } catch (error) {
      logger.error('[Lead Queue] Error getting queue status:', error);
      throw error;
    }
  }

  /**
   * Get leads by priority
   */
  async getLeadsByPriority(priority, limit = 100) {
    return await Lead.find({
      priority,
      isActive: true,
      'consent.canCall': true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Reserve lead for calling (mark as in-progress)
   * Prevents multiple simultaneous calls to same lead
   */
  async reserveLead(leadId) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          $set: {
            'customFields.callInProgress': true,
            'customFields.callReservedAt': new Date()
          }
        },
        { new: true }
      );

      logger.info(`[Lead Queue] Reserved lead ${leadId} for calling`);
      return lead;

    } catch (error) {
      logger.error('[Lead Queue] Error reserving lead:', error);
      throw error;
    }
  }

  /**
   * Release lead reservation (call completed or failed)
   */
  async releaseLead(leadId) {
    try {
      await Lead.findByIdAndUpdate(leadId, {
        $unset: {
          'customFields.callInProgress': '',
          'customFields.callReservedAt': ''
        }
      });

      logger.info(`[Lead Queue] Released lead ${leadId}`);

    } catch (error) {
      logger.error('[Lead Queue] Error releasing lead:', error);
      throw error;
    }
  }

  /**
   * Get leads currently in call (for monitoring)
   */
  async getLeadsInCall() {
    return await Lead.find({
      'customFields.callInProgress': true,
      isActive: true
    })
      .select('firstName lastName phone customFields.callReservedAt')
      .lean();
  }

  /**
   * Clean up stale reservations (calls that didn't complete)
   */
  async cleanStaleReservations() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      const result = await Lead.updateMany(
        {
          'customFields.callInProgress': true,
          'customFields.callReservedAt': { $lte: thirtyMinutesAgo }
        },
        {
          $unset: {
            'customFields.callInProgress': '',
            'customFields.callReservedAt': ''
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`[Lead Queue] Cleaned ${result.modifiedCount} stale reservations`);
      }

      return result.modifiedCount;

    } catch (error) {
      logger.error('[Lead Queue] Error cleaning stale reservations:', error);
      throw error;
    }
  }

  /**
   * Get queue health metrics
   */
  async getQueueHealth() {
    try {
      const status = await this.getQueueStatus();
      const staleReservations = await this.cleanStaleReservations();
      const leadsInCall = await this.getLeadsInCall();

      return {
        healthy: status.totalInQueue > 0,
        queueDepth: status.totalInQueue,
        freshLeadsAvailable: status.freshHighPriority + status.freshMediumPriority,
        overdueFollowUps: status.overdueFollowUps,
        currentCalls: leadsInCall.length,
        staleReservationsCleared: staleReservations,
        status: status.totalInQueue > 100 ? 'excellent' : status.totalInQueue > 50 ? 'good' : 'low'
      };

    } catch (error) {
      logger.error('[Lead Queue] Error getting queue health:', error);
      throw error;
    }
  }
}

module.exports = new LeadQueueService();
