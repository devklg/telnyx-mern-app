/**
 * BMAD V4 - Request Validation Middleware
 * 
 * @description Validates request body, params, and query using Joi schemas
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

const Joi = require('joi');
const { AppError } = require('./error.middleware');

/**
 * Validate request against Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown keys
      stripUnknown: true // Remove unknown keys
    };

    // Validate body, params, and query
    const toValidate = {};
    if (schema.body) toValidate.body = req.body;
    if (schema.params) toValidate.params = req.params;
    if (schema.query) toValidate.query = req.query;

    const { error, value } = Joi.object(schema).validate(toValidate, validationOptions);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Validation failed', 400, {
        errors
      }));
    }

    // Replace request with validated value
    if (value.body) req.body = value.body;
    if (value.params) req.params = value.params;
    if (value.query) req.query = value.query;

    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // ID param validation
  id: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),

  // Pagination query validation
  pagination: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string(),
      order: Joi.string().valid('asc', 'desc').default('desc')
    })
  }),

  // Lead creation validation
  createLead: Joi.object({
    body: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
      email: Joi.string().email().optional(),
      company: Joi.string().optional(),
      source: Joi.string().required(),
      status: Joi.string().valid('new', 'contacted', 'qualified', 'disqualified').default('new')
    })
  })
};

module.exports = {
  validate,
  schemas
};
