const { validationResult } = require('express-validator');

/**
 * Validation middleware to handle express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

module.exports = {
  validate
};

// Also export as default for backward compatibility
module.exports.default = validate;
