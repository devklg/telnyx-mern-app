/**
 * Caller ID Validation
 */

class CallerIDValidator {
  validateFormat(phoneNumber) {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  async isValidNumber(phoneNumber) {
    if (!this.validateFormat(phoneNumber)) {
      return { valid: false, reason: 'Invalid format' };
    }

    // Check against known invalid patterns
    const invalidPatterns = [
      /^\+1(000|111|555)/, // Reserved numbers
      /^\+10{10}/, // All zeros
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(phoneNumber)) {
        return { valid: false, reason: 'Reserved or invalid number' };
      }
    }

    return { valid: true };
  }

  sanitizeNumber(phoneNumber) {
    // Remove non-digit characters except +
    return phoneNumber.replace(/[^\d+]/g, '');
  }
}

module.exports = new CallerIDValidator();
