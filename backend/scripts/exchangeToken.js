#!/usr/bin/env node

/**
 * Quick script to exchange authorization code for refresh token
 */

require('dotenv').config();
const { google } = require('googleapis');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

const code = process.argv[2];

if (!code) {
  console.error('Usage: node exchangeToken.js <authorization-code>');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getTokens() {
  try {
    console.log('🔄 Exchanging authorization code for tokens...\n');

    const { tokens } = await oauth2Client.getToken(code);

    console.log('✅ SUCCESS! Tokens obtained\n');
    console.log('========================================');
    console.log('Your REFRESH TOKEN:');
    console.log('========================================');
    console.log(tokens.refresh_token);
    console.log('========================================\n');

    console.log('📋 Add this to your .env file:');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getTokens();
