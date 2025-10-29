const { pgPool } = require('../config/database');

class QualificationService {
  async qualifyLead(leadId, qualificationData) {
    const query = `
      INSERT INTO qualifications (lead_id, is_qualified, qualification_data, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await pgPool.query(query, [
      leadId,
      qualificationData.isQualified,
      JSON.stringify(qualificationData)
    ]);
    return result.rows[0];
  }

  async getByLeadId(leadId) {
    const query = 'SELECT * FROM qualifications WHERE lead_id = $1 ORDER BY created_at DESC';
    const result = await pgPool.query(query, [leadId]);
    return result.rows;
  }

  async update(id, data) {
    const query = `
      UPDATE qualifications
      SET qualification_data = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pgPool.query(query, [JSON.stringify(data), id]);
    return result.rows[0];
  }
}

module.exports = new QualificationService();
