const Lead = require('../database/mongodb/schemas/lead.schema');
const CallLog = require('../database/mongodb/schemas/calllog.schema');

/**
 * Lead Controller with Advanced Filtering and Pagination
 * Implements comprehensive lead management with real-time Socket.io updates
 *
 * @author David Rodriguez - Backend Development Lead
 */

/**
 * Get all leads with advanced filtering and pagination
 */
exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      source,
      qualificationScore,
      createdAfter,
      createdBefore,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { isActive: true };

    // Build filter object
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (qualificationScore) {
      filter.qualificationScore = { $gte: parseInt(qualificationScore) };
    }
    if (createdAfter || createdBefore) {
      filter.createdAt = {};
      if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
      if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      select: '-__v'
    };

    const leads = await Lead.find(filter)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .lean();

    const total = await Lead.countDocuments(filter);

    res.json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: options.page,
        pages: Math.ceil(total / options.limit),
        limit: options.limit,
        hasNext: options.page < Math.ceil(total / options.limit),
        hasPrev: options.page > 1
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    next(error);
  }
};

/**
 * Get single lead by ID
 */
exports.getById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Get lead error:', error);
    next(error);
  }
};

/**
 * Create new lead with validation
 */
exports.create = async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user?.userId,
      status: 'new',
      qualificationScore: 0
    };

    const lead = new Lead(leadData);
    await lead.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('lead:created', {
        leadId: lead._id,
        name: `${lead.firstName} ${lead.lastName}`,
        source: lead.source,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });

  } catch (error) {
    console.error('Create lead error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Lead with this email or phone already exists'
      });
    }
    next(error);
  }
};

/**
 * Update lead with tracking
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user?.userId,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData._id;

    const lead = await Lead.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('lead:updated', {
        leadId: lead._id,
        changes: updateData,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    console.error('Update lead error:', error);
    next(error);
  }
};

/**
 * Soft delete lead
 */
exports.delete = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        archivedAt: new Date(),
        archivedReason: 'Deleted by user'
      },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    next(error);
  }
};

/**
 * Get call history for a lead
 */
exports.getCallHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const calls = await CallLog.find({ leadId: id })
      .sort({ initiatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await CallLog.countDocuments({ leadId: id });

    res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get call history error:', error);
    next(error);
  }
};

/**
 * Add note to lead
 */
exports.addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, type = 'general' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Note text is required'
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    lead.notes.push({
      text,
      type,
      createdBy: req.user?.userId,
      createdAt: new Date()
    });

    await lead.save();

    res.json({
      success: true,
      data: lead,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Add note error:', error);
    next(error);
  }
};

// ============================================
// JAMES TAYLOR - LEAD QUEUE MANAGEMENT
// ============================================

const leadQueueService = require('../services/leadQueueService');
const leadLifecycleService = require('../services/leadLifecycleService');
const gmailService = require('../services/gmailService');
const leadImporter = require('../services/leadImporter');
const gmailImportCron = require('../cron/gmailLeadImport');

/**
 * Get next lead from queue for calling
 */
exports.getNextLead = async (req, res, next) => {
  try {
    const lead = await leadQueueService.getNextLead();

    if (!lead) {
      return res.json({
        success: true,
        data: null,
        message: 'No leads available in queue'
      });
    }

    // Reserve lead for calling
    await leadQueueService.reserveLead(lead._id);

    res.json({
      success: true,
      data: lead,
      message: 'Next lead retrieved successfully'
    });

  } catch (error) {
    console.error('Get next lead error:', error);
    next(error);
  }
};

/**
 * Get queue status
 */
exports.getQueueStatus = async (req, res, next) => {
  try {
    const status = await leadQueueService.getQueueStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    next(error);
  }
};

/**
 * Get queue health metrics
 */
exports.getQueueHealth = async (req, res, next) => {
  try {
    const health = await leadQueueService.getQueueHealth();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('Get queue health error:', error);
    next(error);
  }
};

/**
 * Release lead reservation
 */
exports.releaseLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    await leadQueueService.releaseLead(id);

    res.json({
      success: true,
      message: 'Lead released successfully'
    });

  } catch (error) {
    console.error('Release lead error:', error);
    next(error);
  }
};

/**
 * Update lead status (lifecycle)
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, qualificationScore, nextFollowUpDate, reason, conversionValue } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const lead = await leadLifecycleService.updateLeadStatus(id, status, {
      note,
      qualificationScore,
      nextFollowUpDate,
      reason,
      conversionValue
    });

    res.json({
      success: true,
      data: lead,
      message: 'Lead status updated successfully'
    });

  } catch (error) {
    console.error('Update lead status error:', error);
    next(error);
  }
};

/**
 * Schedule follow-up for lead
 */
exports.scheduleFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { followUpDate, note } = req.body;

    if (!followUpDate) {
      return res.status(400).json({
        success: false,
        error: 'Follow-up date is required'
      });
    }

    const lead = await leadLifecycleService.scheduleFollowUp(id, followUpDate, note);

    res.json({
      success: true,
      data: lead,
      message: 'Follow-up scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule follow-up error:', error);
    next(error);
  }
};

/**
 * Add lead to do-not-call list
 */
exports.addToDoNotCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const lead = await leadLifecycleService.addToDoNotCall(id, reason);

    res.json({
      success: true,
      data: lead,
      message: 'Lead added to Do Not Call list'
    });

  } catch (error) {
    console.error('Add to DNC error:', error);
    next(error);
  }
};

/**
 * Get today's follow-ups
 */
exports.getTodayFollowUps = async (req, res, next) => {
  try {
    const followUps = await leadLifecycleService.getTodayFollowUps();

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });

  } catch (error) {
    console.error('Get today follow-ups error:', error);
    next(error);
  }
};

/**
 * Get overdue follow-ups
 */
exports.getOverdueFollowUps = async (req, res, next) => {
  try {
    const followUps = await leadLifecycleService.getOverdueFollowUps();

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });

  } catch (error) {
    console.error('Get overdue follow-ups error:', error);
    next(error);
  }
};

/**
 * Get lifecycle statistics
 */
exports.getLifecycleStats = async (req, res, next) => {
  try {
    const stats = await leadLifecycleService.getLifecycleStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get lifecycle stats error:', error);
    next(error);
  }
};

// ============================================
// GMAIL IMPORT MANAGEMENT
// ============================================

/**
 * Trigger manual Gmail import
 */
exports.triggerGmailImport = async (req, res, next) => {
  try {
    const result = await gmailImportCron.runManualImport();

    res.json({
      success: true,
      data: result,
      message: 'Gmail import completed'
    });

  } catch (error) {
    console.error('Gmail import error:', error);
    next(error);
  }
};

/**
 * Get Gmail import statistics
 */
exports.getGmailImportStats = async (req, res, next) => {
  try {
    const stats = gmailImportCron.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get Gmail stats error:', error);
    next(error);
  }
};

/**
 * Test Gmail connection
 */
exports.testGmailConnection = async (req, res, next) => {
  try {
    const result = await gmailService.testConnection();

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Test Gmail connection error:', error);
    next(error);
  }
};
