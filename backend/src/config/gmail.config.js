const { google } = require('googleapis');

/**
 * Gmail API Configuration for Lead Import Automation
 *
 * @author James Taylor - Lead Management Developer
 * @purpose Automated lead email fetching and processing
 */

class GmailConfig {
  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID;
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET;
    this.redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3550/api/gmail/oauth2callback';
    this.refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    // Validate required credentials
    if (!this.clientId || !this.clientSecret) {
      console.warn('[Gmail Config] Missing Gmail API credentials. Lead import will be disabled.');
    }
  }

  /**
   * Create OAuth2 client for Gmail API
   * @returns {Object} Authenticated OAuth2 client
   */
  getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    if (this.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: this.refreshToken
      });
    }

    return oauth2Client;
  }

  /**
   * Get Gmail API instance
   * @returns {Object} Gmail API instance
   */
  getGmailAPI() {
    const auth = this.getOAuth2Client();
    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Generate OAuth2 authorization URL for initial setup
   * @returns {String} Authorization URL
   */
  generateAuthUrl() {
    const oauth2Client = this.getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {String} code - Authorization code from OAuth callback
   * @returns {Object} Token response
   */
  async getTokensFromCode(code) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Check if Gmail API is configured
   * @returns {Boolean}
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.refreshToken);
  }
}

module.exports = new GmailConfig();
