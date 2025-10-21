/**
 * BMAD V4 - Lead MongoDB Schema
 * 
 * @description Mongoose schema for leads in MongoDB
 * @owner Sarah Chen (Database Architect)
 * @created 2025-10-21
 */

const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // TODO: Define complete schema
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  company: { type: String },
  source: { type: String, enum: ['fresh', 'aged', 'referral', 'web'], required: true },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'disqualified', 'converted'], default: 'new' },
  // TODO: Add more fields
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', LeadSchema);
