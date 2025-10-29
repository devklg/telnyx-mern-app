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
