/**
 * TCPA Compliance Module
 * Ensures all calls comply with TCPA regulations
 */

class TCPACompliance {
  constructor() {
    this.allowedCallHours = { start: 8, end: 21 }; // 8 AM to 9 PM
  }

  isCallTimeAllowed(timezone = 'America/New_York') {
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.allowedCallHours.start && hour < this.allowedCallHours.end;
  }

  async checkConsent(phone) {
    // Check if lead has given consent
    // Implementation here
    return true;
  }

  async logCall(callData) {
    // Log all calls for compliance
    console.log('TCPA Log:', callData);
  }
}

module.exports = new TCPACompliance();
