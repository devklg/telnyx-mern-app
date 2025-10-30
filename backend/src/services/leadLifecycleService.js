const Lead = require('../database/mongodb/schemas/lead.schema');
const logger = require('../utils/logger');

/**
 * Lead Lifecycle Management Service
 * Manages lead status transitions, follow-ups, archival, and do-not-call lists
 *
 * @author James Taylor - Lead Management Developer
 * @purpose Handle lead progression through qualification pipeline
 */

class LeadLifecycleService {
  /**
   * Update lead status after call
   * @param {String} leadId - Lead ID
   * @param {String} newStatus - New status
   * @param {Object} data - Additional data (notes, score, etc.)
   * @returns {Object} Updated lead
   */
  async updateLeadStatus(leadId, newStatus, data = {}) {
    try {
      const lead = await Lead.findById(leadId);

      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      const updateData = {
        status: newStatus,
        lastContactedAt: new Date(),
        lastContactMethod: 'phone'
      };

      // Status-specific updates
      switch (newStatus) {
        case 'contacted':
          updateData.contactAttempts = (lead.contactAttempts || 0) + 1;
          if (data.nextFollowUpDate) {
            updateData.nextFollowUpAt = new Date(data.nextFollowUpDate);
          }
          break;

        case 'qualified':
          updateData.qualifiedAt = new Date();
          if (data.qualificationScore) {
            updateData.qualificationScore = data.qualificationScore;
          }
          break;

        case 'nurturing':
          if (data.nextFollowUpDate) {
            updateData.nextFollowUpAt = new Date(data.nextFollowUpDate);
          } else {
            // Default: follow up in 3 days
            updateData.nextFollowUpAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          }
          break;

        case 'disqualified':
          if (data.reason) {
            updateData.disqualificationReason = data.reason;
          }
          break;

        case 'converted':
          updateData.convertedAt = new Date();
          if (data.conversionValue) {
            updateData.conversionValue = data.conversionValue;
          }
          break;
      }

      // Add note if provided
      if (data.note) {
        lead.notes.push({
          text: data.note,
          type: 'call',
          createdAt: new Date()
        });
      }

      // Update lead
      Object.assign(lead, updateData);
      await lead.save();

      logger.info(`[Lead Lifecycle] Updated lead ${leadId} status: ${lead.status} → ${newStatus}`);

      return lead;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error updating lead status:', error);
      throw error;
    }
  }

  /**
   * Schedule follow-up for lead
   * @param {String} leadId - Lead ID
   * @param {Date} followUpDate - Follow-up date
   * @param {String} note - Follow-up note
   */
  async scheduleFollowUp(leadId, followUpDate, note) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          nextFollowUpAt: new Date(followUpDate),
          $push: {
            notes: {
              text: note || `Follow-up scheduled for ${followUpDate}`,
              type: 'task',
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );

      logger.info(`[Lead Lifecycle] Scheduled follow-up for lead ${leadId} on ${followUpDate}`);
      return lead;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error scheduling follow-up:', error);
      throw error;
    }
  }

  /**
   * Mark lead as do-not-call
   * @param {String} leadId - Lead ID
   * @param {String} reason - Reason for DNC
   */
  async addToDoNotCall(leadId, reason) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          'consent.canCall': false,
          'consent.canEmail': false,
          'consent.canSMS': false,
          status: 'disqualified',
          disqualificationReason: reason || 'Do Not Call requested',
          $push: {
            notes: {
              text: `Added to Do Not Call list: ${reason}`,
              type: 'general',
              createdAt: new Date()
            }
          },
          $addToSet: {
            tags: 'do-not-call'
          }
        },
        { new: true }
      );

      logger.warn(`[Lead Lifecycle] Added lead ${leadId} to Do Not Call list: ${reason}`);
      return lead;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error adding to DNC:', error);
      throw error;
    }
  }

  /**
   * Archive old leads
   * @param {Number} daysInactive - Days of inactivity before archival
   */
  async archiveInactiveLeads(daysInactive = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

      const result = await Lead.updateMany(
        {
          isActive: true,
          status: { $in: ['disqualified', 'lost'] },
          $or: [
            { lastContactedAt: { $lte: cutoffDate } },
            { createdAt: { $lte: cutoffDate }, lastContactedAt: null }
          ]
        },
        {
          isActive: false,
          archivedAt: new Date(),
          archivedReason: `Inactive for ${daysInactive} days`
        }
      );

      logger.info(`[Lead Lifecycle] Archived ${result.modifiedCount} inactive leads`);
      return result.modifiedCount;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error archiving leads:', error);
      throw error;
    }
  }

  /**
   * Get leads requiring follow-up today
   */
  async getTodayFollowUps() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await Lead.find({
      nextFollowUpAt: {
        $gte: today,
        $lt: tomorrow
      },
      isActive: true,
      status: { $in: ['contacted', 'qualified', 'nurturing'] }
    })
      .sort({ nextFollowUpAt: 1 })
      .lean();
  }

  /**
   * Get overdue follow-ups
   */
  async getOverdueFollowUps() {
    return await Lead.find({
      nextFollowUpAt: { $lt: new Date() },
      isActive: true,
      status: { $in: ['contacted', 'qualified', 'nurturing'] }
    })
      .sort({ nextFollowUpAt: 1 })
      .lean();
  }

  /**
   * Mark lead as lost
   * @param {String} leadId - Lead ID
   * @param {String} reason - Reason for loss
   */
  async markAsLost(leadId, reason) {
    return await this.updateLeadStatus(leadId, 'lost', {
      note: `Lead marked as lost: ${reason}`,
      reason
    });
  }

  /**
   * Convert lead to customer
   * @param {String} leadId - Lead ID
   * @param {Number} value - Conversion value
   */
  async convertLead(leadId, value) {
    return await this.updateLeadStatus(leadId, 'converted', {
      conversionValue: value,
      note: `Lead converted! Value: $${value}`
    });
  }

  /**
   * Re-activate archived lead
   * @param {String} leadId - Lead ID
   */
  async reactivateLead(leadId) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          isActive: true,
          $unset: { archivedAt: '', archivedReason: '' },
          $push: {
            notes: {
              text: 'Lead re-activated',
              type: 'general',
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );

      logger.info(`[Lead Lifecycle] Re-activated lead ${leadId}`);
      return lead;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error re-activating lead:', error);
      throw error;
    }
  }

  /**
   * Get lead aging report
   * @returns {Array} Leads grouped by age
   */
  async getLeadAgingReport() {
    try {
      const now = new Date();

      const pipeline = [
        {
          $match: { isActive: true }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            status: 1,
            createdAt: 1,
            lastContactedAt: 1,
            ageInDays: {
              $divide: [
                { $subtract: [now, '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            daysSinceContact: {
              $cond: {
                if: { $eq: ['$lastContactedAt', null] },
                then: null,
                else: {
                  $divide: [
                    { $subtract: [now, '$lastContactedAt'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lte: ['$ageInDays', 1] }, then: '0-1 days' },
                  { case: { $lte: ['$ageInDays', 7] }, then: '1-7 days' },
                  { case: { $lte: ['$ageInDays', 30] }, then: '7-30 days' },
                  { case: { $lte: ['$ageInDays', 60] }, then: '30-60 days' },
                  { case: { $lte: ['$ageInDays', 90] }, then: '60-90 days' }
                ],
                default: '90+ days'
              }
            },
            count: { $sum: 1 },
            avgAgeInDays: { $avg: '$ageInDays' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const report = await Lead.aggregate(pipeline);
      return report;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error generating aging report:', error);
      throw error;
    }
  }

  /**
   * Get lifecycle statistics
   */
  async getLifecycleStats() {
    try {
      const stats = await Lead.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgQualificationScore: { $avg: '$qualificationScore' },
            avgContactAttempts: { $avg: '$contactAttempts' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return stats;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error getting lifecycle stats:', error);
      throw error;
    }
  }

  /**
   * Bulk update lead priorities based on engagement
   */
  async recalculatePriorities() {
    try {
      const leads = await Lead.find({
        isActive: true,
        status: { $in: ['new', 'contacted', 'nurturing'] }
      });

      let updated = 0;

      for (const lead of leads) {
        const engagement = lead.calculateEngagement();
        const newPriority = this.determinePriority(lead, engagement);

        if (lead.priority !== newPriority) {
          lead.priority = newPriority;
          await lead.save();
          updated++;
        }
      }

      logger.info(`[Lead Lifecycle] Recalculated priorities: ${updated} leads updated`);
      return updated;

    } catch (error) {
      logger.error('[Lead Lifecycle] Error recalculating priorities:', error);
      throw error;
    }
  }

  /**
   * Determine priority based on lead data and engagement
   */
  determinePriority(lead, engagement) {
    if (lead.qualificationScore >= 70) return 'urgent';
    if (engagement >= 50) return 'high';
    if (lead.contactAttempts === 0) return 'high';
    if (lead.contactAttempts >= 3) return 'low';
    return 'medium';
  }
}

module.exports = new LeadLifecycleService();
