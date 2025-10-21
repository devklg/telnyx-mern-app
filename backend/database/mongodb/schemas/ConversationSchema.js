/**
 * BMAD V4 - Conversation MongoDB Schema
 * 
 * @description Mongoose schema for conversations
 * @owner Sarah Chen (Database Architect)
 * @created 2025-10-21
 */

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  // TODO: Define conversation schema
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  callId: { type: String },
  transcript: [{
    speaker: String,
    text: String,
    timestamp: Date
  }],
  // TODO: Add more fields
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', ConversationSchema);
