const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  status: { type: String, default: 'active' },
  startDate: Date,
  endDate: Date,
  totalLeads: { type: Number, default: 0 },
  qualifiedLeads: { type: Number, default: 0 },
  metrics: {
    callsMade: { type: Number, default: 0 },
    callsAnswered: { type: Number, default: 0 },
    qualificationRate: { type: Number, default: 0 },
    avgCallDuration: { type: Number, default: 0 }
  },
  createdBy: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);
