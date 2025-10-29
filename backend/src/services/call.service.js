const Call = require('../database/mongodb/schemas/call.schema');

class CallService {
  async findAll(filters = {}) {
    return await Call.find(filters).populate('leadId');
  }

  async findById(id) {
    return await Call.findById(id).populate('leadId');
  }

  async create(data) {
    return await Call.create(data);
  }

  async findByLeadId(leadId) {
    return await Call.find({ leadId });
  }
}

module.exports = new CallService();
