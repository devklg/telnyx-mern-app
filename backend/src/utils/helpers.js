/**
 * BMAD V4 - Helper Utilities
 * 
 * @description Common helper functions
 * @owner David Rodriguez (Backend Lead)
 * @created 2025-10-21
 */

/**
 * Format phone number to E.164 format
 */
exports.formatPhoneE164 = (phone) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add + prefix if not present
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
};

/**
 * Generate random ID
 */
exports.generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Calculate percentage
 */
exports.calculatePercentage = (part, whole) => {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100 * 10) / 10;
};

/**
 * Sleep/delay function
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Chunk array into smaller arrays
 */
exports.chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Format duration in seconds to human readable
 */
exports.formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Retry async function with exponential backoff
 */
exports.retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await exports.sleep(delay);
    }
  }
};
