/**
 * Kevin Availability Service
 * Manages Kevin's availability status for hot transfers
 * Handles schedule management and transfer tracking
 *
 * @author David Rodriguez - Backend Development Lead
 */

class KevinService {

  constructor() {
    // In-memory storage for Kevin's availability (can be moved to Redis/MongoDB for persistence)
    this.availability = {
      available: true,
      reason: null,
      until: null,
      updatedAt: new Date(),
      updatedBy: null
    };

    this.schedule = {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: null, end: null, available: false },
      sunday: { start: null, end: null, available: false }
    };

    this.transferHistory = [];
  }

  /**
   * Check if Kevin is currently available
   */
  async isAvailable() {
    try {
      // Check if temporary unavailability period has expired
      if (this.availability.until && new Date() > new Date(this.availability.until)) {
        this.availability.available = true;
        this.availability.reason = null;
        this.availability.until = null;
      }

      // Check if within scheduled hours
      if (this.availability.available) {
        const isInSchedule = this.isWithinSchedule();
        return isInSchedule;
      }

      return this.availability.available;
    } catch (error) {
      console.error('[Kevin Service] Check availability error:', error);
      return false;
    }
  }

  /**
   * Update Kevin's availability status
   */
  async updateAvailability({ available, reason, until, updatedBy }) {
    try {
      this.availability = {
        available,
        reason: reason || null,
        until: until || null,
        updatedAt: new Date(),
        updatedBy: updatedBy || 'system'
      };

      console.log(`[Kevin Service] Availability updated: ${available}`);

      return {
        success: true,
        availability: this.availability
      };
    } catch (error) {
      console.error('[Kevin Service] Update availability error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current availability status
   */
  async getAvailability() {
    try {
      await this.isAvailable(); // Update availability if needed

      return {
        success: true,
        availability: {
          ...this.availability,
          isWithinSchedule: this.isWithinSchedule(),
          nextAvailable: this.getNextAvailableTime()
        }
      };
    } catch (error) {
      console.error('[Kevin Service] Get availability error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update Kevin's schedule
   */
  async updateSchedule(scheduleData) {
    try {
      this.schedule = {
        ...this.schedule,
        ...scheduleData
      };

      console.log('[Kevin Service] Schedule updated');

      return {
        success: true,
        schedule: this.schedule
      };
    } catch (error) {
      console.error('[Kevin Service] Update schedule error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Kevin's schedule
   */
  async getSchedule() {
    try {
      return {
        success: true,
        schedule: this.schedule
      };
    } catch (error) {
      console.error('[Kevin Service] Get schedule error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record transfer attempt
   */
  async recordTransfer({ callId, leadId, engagementScore, success, timestamp, notes }) {
    try {
      const transfer = {
        id: `transfer_${Date.now()}`,
        callId,
        leadId,
        engagementScore,
        success,
        timestamp: timestamp || new Date(),
        notes: notes || null
      };

      this.transferHistory.push(transfer);

      // Keep only last 1000 transfers in memory
      if (this.transferHistory.length > 1000) {
        this.transferHistory = this.transferHistory.slice(-1000);
      }

      console.log(`[Kevin Service] Transfer recorded: ${success ? 'Success' : 'Failed'}`);

      return {
        success: true,
        transfer
      };
    } catch (error) {
      console.error('[Kevin Service] Record transfer error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transfer history
   */
  async getTransferHistory(limit = 50) {
    try {
      const history = this.transferHistory
        .slice(-limit)
        .reverse();

      return {
        success: true,
        transfers: history,
        count: history.length,
        total: this.transferHistory.length
      };
    } catch (error) {
      console.error('[Kevin Service] Get transfer history error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transfer statistics
   */
  async getTransferStats() {
    try {
      const total = this.transferHistory.length;
      const successful = this.transferHistory.filter(t => t.success).length;
      const failed = total - successful;
      const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) : 0;

      // Get stats for last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24h = this.transferHistory.filter(t => new Date(t.timestamp) > oneDayAgo);

      // Average engagement score of transferred calls
      const avgEngagement = this.transferHistory.length > 0
        ? (this.transferHistory.reduce((sum, t) => sum + (t.engagementScore || 0), 0) / this.transferHistory.length).toFixed(2)
        : 0;

      return {
        success: true,
        stats: {
          total,
          successful,
          failed,
          successRate: parseFloat(successRate),
          last24Hours: {
            total: last24h.length,
            successful: last24h.filter(t => t.success).length
          },
          averageEngagementScore: parseFloat(avgEngagement)
        }
      };
    } catch (error) {
      console.error('[Kevin Service] Get transfer stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if current time is within Kevin's scheduled hours
   */
  isWithinSchedule() {
    try {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = this.schedule[dayName];

      if (!daySchedule || !daySchedule.available) {
        return false;
      }

      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const { start, end } = daySchedule;

      if (!start || !end) {
        return false;
      }

      return currentTime >= start && currentTime <= end;
    } catch (error) {
      console.error('[Kevin Service] Check schedule error:', error);
      return false;
    }
  }

  /**
   * Get next available time for Kevin
   */
  getNextAvailableTime() {
    try {
      // If currently available, return now
      if (this.availability.available && this.isWithinSchedule()) {
        return new Date();
      }

      // If unavailable until a specific time
      if (this.availability.until) {
        return new Date(this.availability.until);
      }

      // Find next scheduled time
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayIndex = daysOfWeek.indexOf(dayName);

      // Check next 7 days
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7;
        const nextDay = daysOfWeek[nextDayIndex];
        const schedule = this.schedule[nextDay];

        if (schedule && schedule.available && schedule.start) {
          const nextDate = new Date(now);
          nextDate.setDate(nextDate.getDate() + i);
          const [hours, minutes] = schedule.start.split(':');
          nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return nextDate;
        }
      }

      return null;
    } catch (error) {
      console.error('[Kevin Service] Get next available time error:', error);
      return null;
    }
  }

  /**
   * Set Kevin as busy for a duration (in minutes)
   */
  async setBusy(durationMinutes, reason = 'In a call') {
    try {
      const until = new Date(Date.now() + durationMinutes * 60 * 1000);

      await this.updateAvailability({
        available: false,
        reason,
        until,
        updatedBy: 'system'
      });

      return {
        success: true,
        message: `Kevin set as busy for ${durationMinutes} minutes`,
        until
      };
    } catch (error) {
      console.error('[Kevin Service] Set busy error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set Kevin as available
   */
  async setAvailable() {
    try {
      await this.updateAvailability({
        available: true,
        reason: null,
        until: null,
        updatedBy: 'system'
      });

      return {
        success: true,
        message: 'Kevin is now available'
      };
    } catch (error) {
      console.error('[Kevin Service] Set available error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new KevinService();
