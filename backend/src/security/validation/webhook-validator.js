/**
 * Telnyx Webhook Validation
 */

const crypto = require('crypto');

class WebhookValidator {
  validateSignature(payload, signature, timestamp) {
    const publicKey = process.env.TELNYX_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('TELNYX_PUBLIC_KEY not configured');
    }

    const signedPayload = `${timestamp}|${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  isTimestampValid(timestamp, toleranceSeconds = 300) {
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - timestamp) <= toleranceSeconds;
  }
}

module.exports = new WebhookValidator();
