/**
 * Security Audit Logger
 */

const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../../logs/audit');
  }

  async log(event, data, userId = 'system') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      userId,
      data,
      ip: data.ip || 'unknown'
    };

    const logFile = path.join(this.logDir, `${timestamp.split('T')[0]}.log`);
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async logAccess(resource, action, userId) {
    await this.log('access', { resource, action }, userId);
  }

  async logSecurityEvent(type, details) {
    await this.log('security', { type, details });
  }
}

module.exports = new AuditLogger();
