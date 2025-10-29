/**
 * Do Not Call (DNC) List Management
 */

const db = require('../../database/postgresql/client');

class DNCManager {
  async addToDNC(phone, reason = 'user_request') {
    const query = `
      INSERT INTO dnc_list (phone, reason, added_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (phone) DO NOTHING
    `;
    await db.query(query, [phone, reason]);
  }

  async isOnDNC(phone) {
    const query = 'SELECT * FROM dnc_list WHERE phone = $1';
    const result = await db.query(query, [phone]);
    return result.rows.length > 0;
  }

  async removeFromDNC(phone) {
    const query = 'DELETE FROM dnc_list WHERE phone = $1';
    await db.query(query, [phone]);
  }
}

module.exports = new DNCManager();
