/**
 * BMAD V4 - Call Recording MongoDB Schema
 * 
 * @description Mongoose schema for call recordings
 * @owner Sarah Chen (Database Architect)
 * @created 2025-10-21
 */

const mongoose = require('mongoose');

const CallRecordingSchema = new mongoose.Schema({
  // TODO: Define call recording schema
  callId: { type: String, required: true, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  recordingUrl: { type: String },
  duration: { type: Number },
  // TODO: Add more fields
}, {
  timestamps: true
});

module.exports = mongoose.model('CallRecording', CallRecordingSchema);
