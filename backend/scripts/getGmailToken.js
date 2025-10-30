#!/usr/bin/env node

/**
 * Gmail OAuth2 Token Generator
 * Run this script to get your Gmail refresh token for automated imports
 *
 * @author James Taylor - Lead Management Developer
 * @usage node scripts/getGmailToken.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

// Get credentials from environment or prompt
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3550/api/gmail/oauth2callback';

console.log('========================================');
console.log('Gmail OAuth2 Token Generator');
console.log('========================================\n');

if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.error('❌ Error: Gmail credentials not configured\n');
  console.log('Please either:');
  console.log('1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env');
  console.log('2. Or edit this script and replace the placeholder values\n');
  console.log('Get credentials from: https://console.cloud.google.com/apis/credentials\n');
  process.exit(1);
}

console.log('Client ID:', CLIENT_ID);
console.log('Redirect URI:', REDIRECT_URI);
console.log('\n========================================\n');

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('📋 STEP 1: Visit this URL to authorize the application:\n');
console.log(authUrl);
console.log('\n');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📋 STEP 2: After authorization, you will be redirected to a URL.');
console.log('           Copy the "code" parameter from that URL.\n');

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close();

  try {
    console.log('\n⏳ Exchanging code for tokens...\n');

    const { tokens } = await oauth2Client.getToken(code);

    console.log('========================================');
    console.log('✅ SUCCESS! Tokens obtained');
    console.log('========================================\n');

    console.log('Your REFRESH TOKEN (keep this secret!):\n');
    console.log(tokens.refresh_token);
    console.log('\n========================================\n');

    console.log('📋 STEP 3: Add this to your .env file:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('========================================\n');

    console.log('✅ Setup complete! You can now start the Gmail import service.\n');

  } catch (error) {
    console.error('\n❌ Error exchanging code for tokens:', error.message);
    console.error('\nPlease verify:');
    console.error('1. The authorization code is correct (no extra spaces)');
    console.error('2. The code has not expired (get a new one if needed)');
    console.error('3. Your OAuth client is properly configured\n');
    process.exit(1);
  }
});

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n❌ Cancelled by user\n');
  process.exit(0);
});
