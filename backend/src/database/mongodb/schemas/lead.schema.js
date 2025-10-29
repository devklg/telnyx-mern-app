const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, required: true, unique: true },
  source: String,
  status: { type: String, default: 'new' },
  qualificationScore: { type: Number, default: 0 },
  assignedTo: String,
  lastContactedAt: Date,
  notes: [{ text: String, createdAt: Date, createdBy: String }],
  metadata: mongoose.Schema.Types.Mixed,
  conversationHistory: [{
    callId: String,
    timestamp: Date,
    transcript: String,
    sentiment: String
  }]
}, {
  timestamps: true
});

leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ qualificationScore: -1 });

module.exports = mongoose.model('Lead', leadSchema);
