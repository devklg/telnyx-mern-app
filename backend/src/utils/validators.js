/**
 * BMAD V4 - Validation Utilities
 * 
 * @description Helper functions for data validation
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

/**
 * Validate phone number format
 */
exports.isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate email format
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize string input
 */
exports.sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/<[^>]*>/g, '');
};

/**
 * Validate UUID format
 */
exports.isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date range
 */
exports.isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};
