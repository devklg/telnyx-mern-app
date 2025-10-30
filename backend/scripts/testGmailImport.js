#!/usr/bin/env node

/**
 * Gmail Import Test Script
 * Test Gmail API connection and import functionality
 *
 * @author James Taylor - Lead Management Developer
 * @usage node scripts/testGmailImport.js [--dry-run] [--import]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const gmailService = require('../src/services/gmailService');
const leadParser = require('../src/services/leadParser');
const leadImporter = require('../src/services/leadImporter');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const runImport = args.includes('--import');

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bmad_v4');
    console.log('[Gmail Test] Connected to MongoDB');
  } catch (error) {
    console.error('[Gmail Test] Database connection error:', error);
    process.exit(1);
  }
}

/**
 * Test Gmail API connection
 */
async function testConnection() {
  console.log('[Gmail Test] Testing Gmail API connection...');

  const result = await gmailService.testConnection();

  if (result.success) {
    console.log('[Gmail Test] ✓ Connection successful');
    console.log(`[Gmail Test]   Email: ${result.email}`);
    console.log(`[Gmail Test]   Total messages: ${result.messagesTotal}`);
    return true;
  } else {
    console.error('[Gmail Test] ✗ Connection failed:', result.message);
    return false;
  }
}

/**
 * Test email parsing
 */
function testEmailParsing() {
  console.log('\n[Gmail Test] Testing email parser...');

  const sampleEmail = `
LEAD Category:   FRESH TELEPHONE INTERVIEWED LEAD
FIRST NAME:      Rodney
LAST NAME:       Roberson
EMAIL:           rdnyroberson@gmail.com
PHONE:           3363502553
IP ADDRESS:      107.77.249.8
`;

  const result = leadParser.parseLeadEmail(sampleEmail, {
    emailId: 'test-123',
    from: 'leads@provider.com',
    subject: 'New Lead',
    date: new Date().toISOString()
  });

  if (result.success) {
    console.log('[Gmail Test] ✓ Parser working correctly');
    console.log('[Gmail Test] Parsed data:');
    console.log(`  Name: ${result.data.firstName} ${result.data.lastName}`);
    console.log(`  Email: ${result.data.email}`);
    console.log(`  Phone: ${result.data.phone}`);
    console.log(`  Category: ${result.data.customFields?.category}`);
    console.log(`  Priority: ${result.data.priority}`);
    return true;
  } else {
    console.error('[Gmail Test] ✗ Parser failed:', result.errors || result.error);
    return false;
  }
}

/**
 * Test fetching emails
 */
async function testFetchEmails() {
  console.log('\n[Gmail Test] Fetching unread lead emails...');

  try {
    const emails = await gmailService.getUnreadLeadEmails();

    console.log(`[Gmail Test] ✓ Found ${emails.length} unread emails`);

    if (emails.length > 0) {
      console.log('[Gmail Test] Sample email:');
      const sample = emails[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  From: ${sample.from}`);
      console.log(`  Subject: ${sample.subject}`);
      console.log(`  Date: ${sample.date}`);
      console.log(`  Body preview: ${sample.body.substring(0, 100)}...`);
    }

    return emails;

  } catch (error) {
    console.error('[Gmail Test] ✗ Error fetching emails:', error.message);
    return [];
  }
}

/**
 * Test full import process
 */
async function testImportProcess(emails) {
  console.log('\n[Gmail Test] Testing import process...');

  if (emails.length === 0) {
    console.log('[Gmail Test] No emails to import');
    return;
  }

  console.log(`[Gmail Test] Processing ${emails.length} email(s)...`);

  const results = await leadImporter.importFromEmails(emails);

  console.log('[Gmail Test] Import results:');
  console.log(`  Total: ${results.total}`);
  console.log(`  Imported: ${results.imported} ✓`);
  console.log(`  Duplicates: ${results.duplicates}`);
  console.log(`  Errors: ${results.errors}`);

  if (results.errors > 0) {
    console.log('[Gmail Test] Error details:');
    results.errorDetails.forEach((err, idx) => {
      console.log(`  ${idx + 1}. Email ${err.emailId}: ${err.error}`);
    });
  }

  if (results.imported > 0) {
    console.log('[Gmail Test] Imported leads:');
    results.importedLeads.forEach((lead, idx) => {
      console.log(`  ${idx + 1}. ${lead.name} (${lead.phone})`);
    });
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('========================================');
  console.log('BMAD V4 Gmail Import Test Suite');
  console.log('========================================');
  console.log(`Dry Run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`Import: ${runImport ? 'Yes' : 'No'}`);
  console.log('========================================\n');

  // Test 1: Connection
  const connectionOK = await testConnection();
  if (!connectionOK) {
    console.error('\n[Gmail Test] Cannot proceed without Gmail connection');
    process.exit(1);
  }

  // Test 2: Parser
  const parserOK = testEmailParsing();
  if (!parserOK) {
    console.error('\n[Gmail Test] Parser test failed');
    process.exit(1);
  }

  // Test 3: Fetch emails
  const emails = await testFetchEmails();

  // Test 4: Import (if requested)
  if (runImport && emails.length > 0) {
    if (dryRun) {
      console.log('\n[Gmail Test] DRY RUN: Would import emails but not actually saving to database');
    } else {
      await connectDatabase();
      await testImportProcess(emails);

      // Mark emails as read after successful import
      console.log('\n[Gmail Test] Marking emails as read...');
      await gmailService.markEmailsAsRead(emails.map(e => e.id));
      console.log('[Gmail Test] ✓ Emails marked as read');

      await mongoose.connection.close();
    }
  } else if (runImport && emails.length === 0) {
    console.log('\n[Gmail Test] No emails to import');
  }

  console.log('\n========================================');
  console.log('Test Suite Complete');
  console.log('========================================');
}

// Run tests
runTests()
  .then(() => {
    console.log('\n[Gmail Test] All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[Gmail Test] CRITICAL ERROR:', error);
    process.exit(1);
  });
