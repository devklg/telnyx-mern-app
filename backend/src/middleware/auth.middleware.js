/**
 * BMAD V4 - Authentication Middleware
 * 
 * @description JWT token verification and user authentication
 * @owner David Rodriguez (Backend Lead) & Marcus Thompson (Security)
 * @created 2025-10-21
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // TODO: Optionally fetch user from database and attach to request
    req.user = decoded;
    req.userId = decoded.id || decoded.userId;

    logger.debug(`User authenticated: ${req.userId}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.id || decoded.userId;
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
