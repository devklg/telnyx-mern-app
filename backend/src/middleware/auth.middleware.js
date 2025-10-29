const User = require('../database/mongodb/schemas/user.schema');
const { verifyToken, extractTokenFromHeader, validateTokenType } = require('../utils/jwt.util');

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token'
      });
    }

    // Validate it's an access token
    if (!validateTokenType(decoded, 'access')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Access token required.'
      });
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token may be invalid.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...String} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. This action requires higher privileges.'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);

    if (validateTokenType(decoded, 'access')) {
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');

      if (user && user.isActive && !user.isLocked()) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Don't fail on error, just continue without user
    next();
  }
};

/**
 * Refresh token authentication middleware
 * Used specifically for token refresh endpoints
 */
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization) || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired refresh token'
      });
    }

    // Validate it's a refresh token
    if (!validateTokenType(decoded, 'refresh')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Refresh token required.'
      });
    }

    // Fetch user and check if refresh token exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if refresh token is in user's stored tokens
    const tokenExists = user.refreshTokens.some(rt => rt.token === token);

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    req.user = user;
    req.refreshToken = token;

    next();
  } catch (error) {
    console.error('Refresh token authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Refresh token authentication failed'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  authenticateRefreshToken
};
