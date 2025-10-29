const Lead = require('../database/mongodb/schemas/lead.schema');

class ScoringService {
  async calculate(leadId) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    let score = 0;
    
    // Email validation
    if (lead.email && this.isValidEmail(lead.email)) score += 20;
    
    // Phone validation
    if (lead.phone) score += 20;
    
    // Interaction history
    if (lead.conversationHistory && lead.conversationHistory.length > 0) {
      score += 30;
    }
    
    // Status
    if (lead.status === 'qualified') score += 30;

    lead.qualificationScore = score;
    await lead.save();

    return { leadId, score };
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async getByLeadId(leadId) {
    const lead = await Lead.findById(leadId);
    return { leadId, score: lead.qualificationScore };
  }

  async update(leadId, scoreData) {
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { qualificationScore: scoreData.score },
      { new: true }
    );
    return lead;
  }
}

module.exports = new ScoringService();
