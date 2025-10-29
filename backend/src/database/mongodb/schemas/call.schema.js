const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  telnyxCallId: { type: String, unique: true },
  direction: String,
  fromNumber: String,
  toNumber: String,
  status: String,
  duration: Number,
  recordingUrl: String,
  transcript: String,
  aiAnalysis: {
    sentiment: String,
    keywords: [String],
    qualificationScore: Number,
    summary: String
  },
  startedAt: Date,
  endedAt: Date
}, {
  timestamps: true
});

callSchema.index({ leadId: 1 });
callSchema.index({ telnyxCallId: 1 });

module.exports = mongoose.model('Call', callSchema);
