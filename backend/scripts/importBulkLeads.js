/**
 * Bulk Lead Import Script from CSV
 * Purpose: Import 5000+ aged leads from CSV file
 * Author: Sarah Chen (SIGMA-1) - Database Architect
 * Usage: node scripts/importBulkLeads.js <path-to-csv-file>
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
require('dotenv').config();

// MongoDB Model
const Lead = require('../src/database/mongodb/schemas/lead.schema');

/**
 * Import Configuration
 */
const IMPORT_CONFIG = {
  batchSize: parseInt(process.env.IMPORT_BATCH_SIZE || '100', 10),
  skipDuplicates: process.env.IMPORT_SKIP_DUPLICATES !== 'false',
  defaultSource: process.env.IMPORT_DEFAULT_SOURCE || 'bulk-csv-import',
  defaultStatus: process.env.IMPORT_DEFAULT_STATUS || 'new',
  dryRun: process.env.IMPORT_DRY_RUN === 'true'
};

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 1 and has 11 digits, it's already in US format
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // If it has 10 digits, assume US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return null; // Invalid phone number
}

/**
 * Normalize email
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Parse CSV row to Lead object
 * Supports various CSV column formats
 */
function parseCSVRow(row) {
  // Map common CSV column names to our schema
  const mapping = {
    firstName: ['first_name', 'firstname', 'first name', 'fname', 'FIRST NAME'],
    lastName: ['last_name', 'lastname', 'last name', 'lname', 'LAST NAME'],
    email: ['email', 'e-mail', 'email_address', 'EMAIL'],
    phone: ['phone', 'phone_number', 'phonenumber', 'phone number', 'PHONE'],
    company: ['company', 'company_name', 'companyname', 'company name', 'COMPANY'],
    title: ['title', 'job_title', 'jobtitle', 'job title', 'position', 'TITLE'],
    industry: ['industry', 'company_industry', 'INDUSTRY'],
    city: ['city', 'CITY'],
    state: ['state', 'STATE'],
    country: ['country', 'COUNTRY'],
    source: ['source', 'lead_source', 'SOURCE'],
    notes: ['notes', 'note', 'description', 'NOTES']
  };

  // Helper to find value by possible column names
  const findValue = (possibleNames) => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
    }
    return null;
  };

  const lead = {
    firstName: findValue(mapping.firstName),
    lastName: findValue(mapping.lastName),
    email: normalizeEmail(findValue(mapping.email)),
    phone: normalizePhone(findValue(mapping.phone)),
    company: {
      name: findValue(mapping.company),
      title: findValue(mapping.title),
      industry: findValue(mapping.industry)
    },
    address: {
      city: findValue(mapping.city),
      state: findValue(mapping.state),
      country: findValue(mapping.country) || 'US'
    },
    source: findValue(mapping.source) || IMPORT_CONFIG.defaultSource,
    status: IMPORT_CONFIG.defaultStatus,
    isActive: true,
    metadata: {
      importedAt: new Date(),
      importSource: 'bulk-csv',
      originalData: row
    }
  };

  return lead;
}

/**
 * Validate lead data
 */
function validateLead(lead, lineNumber) {
  const errors = [];

  if (!lead.firstName || lead.firstName.trim() === '') {
    errors.push(`Line ${lineNumber}: Missing first name`);
  }

  if (!lead.lastName || lead.lastName.trim() === '') {
    errors.push(`Line ${lineNumber}: Missing last name`);
  }

  if (!lead.phone) {
    errors.push(`Line ${lineNumber}: Missing or invalid phone number`);
  }

  return errors;
}

/**
 * Import leads from CSV file
 */
async function importLeadsFromCSV(csvFilePath) {
  console.log('📥 Bulk Lead Import Script');
  console.log(`   CSV File: ${csvFilePath}`);
  console.log(`   Batch Size: ${IMPORT_CONFIG.batchSize}`);
  console.log(`   Skip Duplicates: ${IMPORT_CONFIG.skipDuplicates}`);
  console.log(`   Dry Run: ${IMPORT_CONFIG.dryRun}`);
  console.log('');

  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const stats = {
    total: 0,
    imported: 0,
    duplicates: 0,
    errors: 0,
    errorDetails: []
  };

  let batch = [];
  let lineNumber = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        lineNumber++;
        stats.total++;

        try {
          // Parse CSV row
          const leadData = parseCSVRow(row);

          // Validate lead
          const validationErrors = validateLead(leadData, lineNumber);
          if (validationErrors.length > 0) {
            stats.errors++;
            stats.errorDetails.push(...validationErrors);
            return;
          }

          batch.push(leadData);

          // Process batch when it reaches batch size
          if (batch.length >= IMPORT_CONFIG.batchSize) {
            await processBatch(batch, stats);
            batch = [];
          }

        } catch (error) {
          stats.errors++;
          stats.errorDetails.push(`Line ${lineNumber}: ${error.message}`);
        }
      })
      .on('end', async () => {
        // Process remaining leads
        if (batch.length > 0) {
          await processBatch(batch, stats);
        }

        console.log('');
        console.log('✅ Import completed!');
        console.log(`   Total rows: ${stats.total}`);
        console.log(`   Imported: ${stats.imported}`);
        console.log(`   Duplicates skipped: ${stats.duplicates}`);
        console.log(`   Errors: ${stats.errors}`);

        if (stats.errorDetails.length > 0 && stats.errorDetails.length <= 20) {
          console.log('');
          console.log('❌ Error Details:');
          stats.errorDetails.forEach(err => console.log(`   ${err}`));
        } else if (stats.errorDetails.length > 20) {
          console.log('');
          console.log(`❌ ${stats.errorDetails.length} errors occurred (showing first 20):`);
          stats.errorDetails.slice(0, 20).forEach(err => console.log(`   ${err}`));
          console.log(`   ... and ${stats.errorDetails.length - 20} more errors`);
        }

        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');

        resolve(stats);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Process a batch of leads
 */
async function processBatch(batch, stats) {
  if (IMPORT_CONFIG.dryRun) {
    console.log(`   [DRY RUN] Would import batch of ${batch.length} leads`);
    stats.imported += batch.length;
    return;
  }

  for (const leadData of batch) {
    try {
      // Check for duplicate by phone
      if (IMPORT_CONFIG.skipDuplicates) {
        const existing = await Lead.findOne({ phone: leadData.phone });
        if (existing) {
          stats.duplicates++;
          continue;
        }
      }

      // Create lead
      const lead = new Lead(leadData);
      await lead.save();
      stats.imported++;

      if (stats.imported % 100 === 0) {
        console.log(`   Imported ${stats.imported} leads...`);
      }

    } catch (error) {
      stats.errors++;
      stats.errorDetails.push(`Phone ${leadData.phone}: ${error.message}`);
    }
  }
}

/**
 * Create sample CSV template
 */
function createSampleCSV(outputPath) {
  const sampleData = [
    ['first_name', 'last_name', 'email', 'phone', 'company', 'title', 'industry', 'city', 'state'],
    ['John', 'Doe', 'john.doe@example.com', '(555) 123-4567', 'Acme Corp', 'CEO', 'Technology', 'San Francisco', 'CA'],
    ['Jane', 'Smith', 'jane.smith@example.com', '+15551234568', 'Tech Solutions', 'CTO', 'Technology', 'New York', 'NY'],
    ['Bob', 'Johnson', 'bob.johnson@example.com', '555-123-4569', 'Consulting Inc', 'VP Sales', 'Consulting', 'Chicago', 'IL']
  ];

  const csvContent = sampleData.map(row => row.join(',')).join('\n');
  fs.writeFileSync(outputPath, csvContent);
  console.log(`✅ Sample CSV template created: ${outputPath}`);
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/importBulkLeads.js <csv-file-path>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/importBulkLeads.js data/leads.csv');
    console.log('  node scripts/importBulkLeads.js --template sample-leads.csv');
    console.log('');
    console.log('Environment Variables:');
    console.log('  IMPORT_BATCH_SIZE=100       - Number of leads to import at once');
    console.log('  IMPORT_SKIP_DUPLICATES=true - Skip leads with duplicate phone numbers');
    console.log('  IMPORT_DEFAULT_SOURCE=...   - Default source for imported leads');
    console.log('  IMPORT_DRY_RUN=true         - Test import without saving to database');
    process.exit(1);
  }

  // Handle --template flag
  if (args[0] === '--template') {
    const templatePath = args[1] || 'leads-template.csv';
    createSampleCSV(templatePath);
    process.exit(0);
  }

  // Import CSV
  const csvFilePath = path.resolve(args[0]);
  importLeadsFromCSV(csvFilePath)
    .then(stats => {
      console.log('');
      console.log('✅ Import process completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importLeadsFromCSV, createSampleCSV };
