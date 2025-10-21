/**
 * BMAD V4 - Lead Management Logic
 * 
 * @description Controller for lead CRUD operations
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const leadService = require('../services/lead.service');
const logger = require('../utils/logger');

/**
 * Get all leads with pagination and filtering
 */
exports.getAllLeads = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, source, sort = 'createdAt', order = 'desc' } = req.query;

  const leads = await leadService.getAllLeads({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    source,
    sort,
    order
  });

  res.json({
    success: true,
    data: leads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: leads.total
    }
  });
});

/**
 * Get single lead by ID
 */
exports.getLeadById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const lead = await leadService.getLeadById(id);

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  res.json({
    success: true,
    data: lead
  });
});

/**
 * Create new lead
 */
exports.createLead = catchAsync(async (req, res) => {
  const leadData = req.body;

  const lead = await leadService.createLead(leadData);

  logger.info(`Lead created: ${lead.id}`);

  // Emit socket event
  req.app.get('io').emit('lead:created', lead);

  res.status(201).json({
    success: true,
    data: lead,
    message: 'Lead created successfully'
  });
});

/**
 * Update lead
 */
exports.updateLead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const lead = await leadService.updateLead(id, updateData);

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  logger.info(`Lead updated: ${id}`);

  // Emit socket event
  req.app.get('io').emit('lead:updated', lead);

  res.json({
    success: true,
    data: lead,
    message: 'Lead updated successfully'
  });
});

/**
 * Delete lead
 */
exports.deleteLead = catchAsync(async (req, res) => {
  const { id } = req.params;

  await leadService.deleteLead(id);

  logger.info(`Lead deleted: ${id}`);

  // Emit socket event
  req.app.get('io').emit('lead:deleted', { id });

  res.json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

/**
 * Bulk import leads
 */
exports.bulkImportLeads = catchAsync(async (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    throw new AppError('Invalid leads data', 400);
  }

  const result = await leadService.bulkImportLeads(leads);

  logger.info(`Bulk import: ${result.successful} leads imported`);

  res.json({
    success: true,
    data: result,
    message: `${result.successful} leads imported successfully`
  });
});

/**
 * Get lead interaction history
 */
exports.getLeadHistory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const history = await leadService.getLeadHistory(id);

  res.json({
    success: true,
    data: history
  });
});
