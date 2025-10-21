/**
 * BMAD V4 - Qualification Processing
 * 
 * @description Controller for lead qualification
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const { catchAsync, AppError } = require('../middleware/error.middleware');
const qualificationService = require('../services/qualification.service');
const logger = require('../utils/logger');

/**
 * Process lead qualification based on conversation
 */
exports.processQualification = catchAsync(async (req, res) => {
  const { leadId, conversationData } = req.body;

  if (!leadId || !conversationData) {
    throw new AppError('Lead ID and conversation data are required', 400);
  }

  const qualification = await qualificationService.processQualification({
    leadId,
    conversationData
  });

  logger.info(`Lead qualified: ${leadId}, Score: ${qualification.score}`);

  // Emit socket event
  req.app.get('io').emit('qualification:processed', qualification);

  res.json({
    success: true,
    data: qualification,
    message: 'Qualification processed successfully'
  });
});

/**
 * Get qualification results for a lead
 */
exports.getQualificationResults = catchAsync(async (req, res) => {
  const { leadId } = req.params;

  const qualification = await qualificationService.getQualificationResults(leadId);

  if (!qualification) {
    throw new AppError('Qualification results not found', 404);
  }

  res.json({
    success: true,
    data: qualification
  });
});

/**
 * Update qualification manually
 */
exports.updateQualification = catchAsync(async (req, res) => {
  const { leadId } = req.params;
  const updateData = req.body;

  const qualification = await qualificationService.updateQualification(leadId, updateData);

  if (!qualification) {
    throw new AppError('Qualification not found', 404);
  }

  logger.info(`Qualification updated: ${leadId}`);

  // Emit socket event
  req.app.get('io').emit('qualification:updated', qualification);

  res.json({
    success: true,
    data: qualification,
    message: 'Qualification updated successfully'
  });
});
