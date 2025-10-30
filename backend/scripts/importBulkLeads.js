#!/usr/bin/env node

/**
 * Bulk Lead Import Script
 * Import initial 600 fresh + 5000 aged leads from CSV/JSON/Text files
 *
 * @author James Taylor - Lead Management Developer
 * @usage node scripts/importBulkLeads.js <file-path> [--format=text|csv|json] [--category=fresh|aged]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const leadParser = require('../src/services/leadParser');
const leadImporter = require('../src/services/leadImporter');

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args[0];
const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'text';
const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1] || 'unknown';

if (!filePath) {
  console.error('Usage: node scripts/importBulkLeads.js <file-path> [--format=text|csv|json] [--category=fresh|aged]');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/importBulkLeads.js leads-fresh.txt --format=text --category=fresh');
  console.error('  node scripts/importBulkLeads.js leads-aged.json --format=json --category=aged');
  process.exit(1);
}

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bmad_v4');
    console.log('[Bulk Import] Connected to MongoDB');
  } catch (error) {
    console.error('[Bulk Import] Database connection error:', error);
    process.exit(1);
  }
}

/**
 * Parse text format file
 * Each lead separated by blank line
 */
function parseTextFile(content) {
  const results = leadParser.parseBulkLeads(content, 'text');
  return results
    .filter(r => r.success)
    .map(r => r.data);
}

/**
 * Parse CSV format file
 */
function parseCSVFile(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

  const leads = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const rawData = {};

    headers.forEach((header, idx) => {
      if (header.includes('first')) rawData.firstName = values[idx]?.trim();
      if (header.includes('last')) rawData.lastName = values[idx]?.trim();
      if (header.includes('email')) rawData.email = values[idx]?.trim();
      if (header.includes('phone')) rawData.phone = values[idx]?.trim();
      if (header.includes('ip')) rawData.ipAddress = values[idx]?.trim();
      if (header.includes('category')) rawData.category = values[idx]?.trim();
    });

    // Map to lead schema
    const leadData = leadParser.mapToLeadSchema(rawData, {});

    // Override category if provided
    if (category !== 'unknown') {
      leadData.customFields.category = category;
      leadData.priority = leadParser.determinePriority(category);
      leadData.tags = leadParser.buildTags({ category });
    }

    leads.push(leadData);
  }

  return leads;
}

/**
 * Parse JSON format file
 */
function parseJSONFile(content) {
  try {
    const data = JSON.parse(content);
    const leads = Array.isArray(data) ? data : [data];

    return leads.map(rawData => {
      const leadData = leadParser.mapToLeadSchema(rawData, {});

      // Override category if provided
      if (category !== 'unknown') {
        leadData.customFields.category = category;
        leadData.priority = leadParser.determinePriority(category);
        leadData.tags = leadParser.buildTags({ category });
      }

      return leadData;
    });

  } catch (error) {
    console.error('[Bulk Import] JSON parse error:', error);
    return [];
  }
}

/**
 * Main import function
 */
async function importLeads() {
  console.log('[Bulk Import] ========================================');
  console.log('[Bulk Import] BMAD V4 Bulk Lead Import');
  console.log('[Bulk Import] ========================================');
  console.log('[Bulk Import] File:', filePath);
  console.log('[Bulk Import] Format:', format);
  console.log('[Bulk Import] Category:', category);
  console.log('[Bulk Import] ========================================');

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`[Bulk Import] ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  // Read file
  console.log('[Bulk Import] Reading file...');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse based on format
  console.log('[Bulk Import] Parsing leads...');
  let leads = [];

  switch (format) {
    case 'text':
      leads = parseTextFile(content);
      break;
    case 'csv':
      leads = parseCSVFile(content);
      break;
    case 'json':
      leads = parseJSONFile(content);
      break;
    default:
      console.error(`[Bulk Import] ERROR: Unknown format: ${format}`);
      process.exit(1);
  }

  console.log(`[Bulk Import] Parsed ${leads.length} leads`);

  if (leads.length === 0) {
    console.error('[Bulk Import] ERROR: No valid leads found in file');
    process.exit(1);
  }

  // Connect to database
  await connectDatabase();

  // Import leads
  console.log('[Bulk Import] Starting import...');
  const startTime = Date.now();

  const results = await leadImporter.importBulk(leads, `bulk_import_${category}`);

  const duration = Date.now() - startTime;

  // Display results
  console.log('[Bulk Import] ========================================');
  console.log('[Bulk Import] IMPORT COMPLETE');
  console.log('[Bulk Import] ========================================');
  console.log(`[Bulk Import] Total:      ${results.total}`);
  console.log(`[Bulk Import] Imported:   ${results.imported} ✓`);
  console.log(`[Bulk Import] Duplicates: ${results.duplicates}`);
  console.log(`[Bulk Import] Errors:     ${results.errors}`);
  console.log(`[Bulk Import] Duration:   ${(duration / 1000).toFixed(2)}s`);
  console.log('[Bulk Import] ========================================');

  if (results.errors > 0) {
    console.log('[Bulk Import] Error details:');
    results.errorDetails.slice(0, 10).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.error}`);
    });
    if (results.errorDetails.length > 10) {
      console.log(`  ... and ${results.errorDetails.length - 10} more errors`);
    }
  }

  // Close database connection
  await mongoose.connection.close();
  console.log('[Bulk Import] Database connection closed');
}

// Run import
importLeads()
  .then(() => {
    console.log('[Bulk Import] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Bulk Import] CRITICAL ERROR:', error);
    process.exit(1);
  });
