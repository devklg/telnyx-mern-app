/**
 * Consent Tracking System
 */

const db = require('../../database/postgresql/client');

class ConsentTracker {
  async recordConsent(leadId, phone, consentType = 'voice') {
    const query = `
      INSERT INTO consents (lead_id, phone, consent_type, granted_at)
      VALUES ($1, $2, $3, NOW())
    `;
    await db.query(query, [leadId, phone, consentType]);
  }

  async hasConsent(phone, consentType = 'voice') {
    const query = `
      SELECT * FROM consents
      WHERE phone = $1 AND consent_type = $2
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const result = await db.query(query, [phone, consentType]);
    return result.rows.length > 0;
  }

  async revokeConsent(phone) {
    const query = 'UPDATE consents SET revoked_at = NOW() WHERE phone = $1';
    await db.query(query, [phone]);
  }
}

module.exports = new ConsentTracker();
