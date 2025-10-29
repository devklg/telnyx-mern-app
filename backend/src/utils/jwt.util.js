const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

/**
 * Generate access token
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
  const { _id, email, role } = payload;

  return jwt.sign(
    {
      userId: _id,
      email,
      role,
      type: 'access'
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn || '24h',
      issuer: 'bmad-v4',
      audience: 'bmad-v4-client'
    }
  );
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  const { _id, email } = payload;

  return jwt.sign(
    {
      userId: _id,
      email,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID
    },
    config.jwt.secret,
    {
      expiresIn: '7d', // Refresh tokens last 7 days
      issuer: 'bmad-v4',
      audience: 'bmad-v4-client'
    }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing both tokens
 */
const generateTokenPair = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn || '24h'
  };
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'bmad-v4',
      audience: 'bmad-v4-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Decode JWT token without verification (for inspection)
 * @param {String} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Check if token is expired
 * @param {String} token - JWT token to check
 * @returns {Boolean} True if expired, false otherwise
 */
const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.payload.exp) return true;

    const expirationTime = decoded.payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param {String} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.payload.exp) return null;

    return new Date(decoded.payload.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Validate token type (access vs refresh)
 * @param {Object} decoded - Decoded token payload
 * @param {String} expectedType - Expected token type
 * @returns {Boolean} True if type matches
 */
const validateTokenType = (decoded, expectedType) => {
  return decoded.type === expectedType;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  validateTokenType
};
