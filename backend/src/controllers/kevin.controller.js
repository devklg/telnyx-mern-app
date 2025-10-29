const kevinService = require('../services/kevin.service');

/**
 * Kevin Controller for Availability Management
 * Handles Kevin's availability, schedule, and transfer management
 *
 * @author David Rodriguez - Backend Development Lead
 */

/**
 * Get Kevin's availability
 */
exports.getAvailability = async (req, res, next) => {
  try {
    const result = await kevinService.getAvailability();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get availability error:', error);
    next(error);
  }
};

/**
 * Update Kevin's availability
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { available, reason, until } = req.body;

    const result = await kevinService.updateAvailability({
      available,
      reason,
      until,
      updatedBy: req.user?.userId || 'unknown'
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Broadcast availability change via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('kevin-availability-changed', {
        available,
        reason,
        until,
        timestamp: new Date()
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Update availability error:', error);
    next(error);
  }
};

/**
 * Get Kevin's schedule
 */
exports.getSchedule = async (req, res, next) => {
  try {
    const result = await kevinService.getSchedule();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get schedule error:', error);
    next(error);
  }
};

/**
 * Update Kevin's schedule
 */
exports.updateSchedule = async (req, res, next) => {
  try {
    const result = await kevinService.updateSchedule(req.body);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Update schedule error:', error);
    next(error);
  }
};

/**
 * Get transfer history
 */
exports.getTransferHistory = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const result = await kevinService.getTransferHistory(
      limit ? parseInt(limit) : undefined
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get transfer history error:', error);
    next(error);
  }
};

/**
 * Get transfer statistics
 */
exports.getTransferStats = async (req, res, next) => {
  try {
    const result = await kevinService.getTransferStats();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get transfer stats error:', error);
    next(error);
  }
};

module.exports = exports;
