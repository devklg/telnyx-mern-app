const Lead = require('../database/mongodb/schemas/lead.schema');

class LeadService {
  async findAll(filters = {}) {
    return await Lead.find(filters);
  }

  async findById(id) {
    return await Lead.findById(id);
  }

  async create(data) {
    return await Lead.create(data);
  }

  async update(id, data) {
    return await Lead.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await Lead.findByIdAndDelete(id);
  }
}

module.exports = new LeadService();
