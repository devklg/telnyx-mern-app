const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

/**
 * @route   GET /api/leads
 * @desc    Get all leads with filtering and pagination
 * @access  Private (add auth middleware as needed)
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const leads = await Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'firstName lastName email');

    // Get total count for pagination
    const total = await Lead.countDocuments(filter);

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: await Lead.countDocuments(),
      new: await Lead.countDocuments({ status: 'new' }),
      contacted: await Lead.countDocuments({ status: 'contacted' }),
      qualified: await Lead.countDocuments({ status: 'qualified' }),
      disqualified: await Lead.countDocuments({ status: 'disqualified' }),
      importedToday: await Lead.countDocuments({
        importedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      importedThisWeek: await Lead.countDocuments({
        importedAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/leads/:id
 * @desc    Get single lead by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('notes.createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/leads
 * @desc    Create new lead manually
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const leadData = req.body;
    
    // Check for duplicates
    const existingLead = await Lead.findDuplicate(
      leadData.email,
      leadData.phone
    );
    
    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: 'Lead already exists',
        data: existingLead
      });
    }

    const lead = new Lead({
      ...leadData,
      importSource: 'manual'
    });
    
    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates.gmailMessageId;
    delete updates.gmailThreadId;
    delete updates.importedAt;
    delete updates.importSource;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/leads/:id/notes
 * @desc    Add note to lead
 * @access  Private
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { content, createdBy } = req.body;

    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    lead.notes.push({
      content,
      createdBy,
      createdAt: new Date()
    });

    await lead.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Private (Admin only - add auth middleware)
 */
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

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
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      error: error.message
    });
  }
});

module.exports = router;
