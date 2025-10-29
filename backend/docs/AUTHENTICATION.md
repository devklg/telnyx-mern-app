# JWT Authentication System - BMAD V4

## Overview

The BMAD V4 authentication system provides secure JWT-based authentication with refresh token support, role-based access control, and comprehensive security features.

**Implemented by:** Marcus Thompson (DELTA-1) - Security Specialist

## Features

- JWT-based authentication with access and refresh tokens
- Secure password hashing with bcrypt
- Role-based authorization (user, admin, manager, agent)
- Account locking after failed login attempts
- Password strength validation
- Password reset functionality
- Token refresh mechanism
- Audit logging for security events

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"  // Optional: user, admin, manager, agent (defaults to "user")
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "24h"
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}
```

**Response:** Same as register

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecureP@ssw0rd123"
}
```

### Protected Endpoints (Authentication Required)

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

#### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "newemail@example.com"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldP@ssw0rd123",
  "newPassword": "NewSecureP@ssw0rd123"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "optional-refresh-token-to-invalidate"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token",
      "expiresIn": "24h"
    }
  }
}
```

## Using Authentication in Your Code

### Protecting Routes with Authentication

```javascript
const { authenticate, authorize } = require('../middleware/auth.middleware');
const router = require('express').Router();

// Require authentication only
router.get('/protected', authenticate, (req, res) => {
  // req.user contains the authenticated user
  res.json({ user: req.user });
});

// Require authentication + specific role
router.post('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Multiple roles allowed
router.get('/staff', authenticate, authorize('admin', 'manager'), (req, res) => {
  res.json({ message: 'Staff access granted' });
});
```

### Available Middleware

1. **authenticate** - Verifies access token and attaches user to `req.user`
   - Returns 401 if no token or invalid token
   - Returns 403 if account is locked or inactive

2. **authorize(...roles)** - Checks if user has required role
   - Must be used after `authenticate`
   - Returns 403 if user doesn't have required role

3. **optionalAuth** - Attaches user if token is present, but doesn't fail if not
   - Useful for endpoints that work for both authenticated and anonymous users

4. **authenticateRefreshToken** - Specifically for refresh token endpoints
   - Verifies refresh token validity
   - Checks if token exists in user's stored tokens

### Accessing User Data in Controllers

```javascript
const someController = async (req, res) => {
  // After authenticate middleware
  const userId = req.user._id;
  const userEmail = req.user.email;
  const userRole = req.user.role;
  const fullName = req.user.fullName; // Virtual field

  // User data is sanitized (no password, refresh tokens, etc.)
  console.log(req.user);
};
```

## Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- Maximum 128 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character
- Must not be a common password (password123, etc.)

## Security Features

### Account Locking
- After 5 failed login attempts, account is locked for 2 hours
- Lock automatically expires after the time period
- Successful login resets failed attempt counter

### Token Management
- Access tokens expire after 24 hours (configurable via `JWT_SECRET` env var)
- Refresh tokens expire after 7 days
- Refresh tokens are stored in database and can be invalidated
- Changing password invalidates all refresh tokens (forces re-login)

### Audit Logging
All authentication events are logged:
- User registration
- Login (successful and failed)
- Token refresh
- Logout
- Password changes
- Password reset requests

## Environment Variables Required

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## User Roles

- **user** - Default role, basic access
- **agent** - Customer service agent role
- **manager** - Manager role with elevated permissions
- **admin** - Full administrative access

## Integration for Team Members

### For David Rodriguez (BRAVO-1) - API Development

When creating new API endpoints, protect them using:

```javascript
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Example: Lead creation endpoint
router.post('/leads',
  authenticate,  // Require authentication
  authorize('admin', 'manager', 'agent'),  // Only these roles
  leadController.createLead
);

// Example: Analytics endpoint
router.get('/analytics',
  authenticate,  // All authenticated users
  analyticsController.getAnalytics
);
```

### Testing with Postman or cURL

1. Register or login to get tokens:
```bash
curl -X POST http://localhost:3550/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestP@ssw0rd123"
  }'
```

2. Use the access token in subsequent requests:
```bash
curl -X GET http://localhost:3550/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

3. When access token expires, use refresh token:
```bash
curl -X POST http://localhost:3550/api/auth/refresh \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN_HERE"
```

## Error Codes

- **400** - Bad request (validation errors)
- **401** - Unauthorized (no token, invalid token, expired token)
- **403** - Forbidden (account locked, inactive, or insufficient permissions)
- **409** - Conflict (email already exists)
- **500** - Server error

## Files Overview

```
backend/src/
├── controllers/
│   └── auth.controller.js          # Authentication endpoints logic
├── database/mongodb/schemas/
│   └── user.schema.js              # User model with password hashing
├── middleware/
│   └── auth.middleware.js          # Authentication & authorization middleware
├── routes/
│   └── auth.routes.js              # Authentication route definitions
└── utils/
    ├── jwt.util.js                 # JWT token generation & validation
    └── password.util.js            # Password hashing & validation
```

## Support

For issues or questions about the authentication system:
- Contact: Marcus Thompson (DELTA-1) - Security Specialist
- File: backend/docs/AUTHENTICATION.md
- Security concerns: Coordinate with ALPHA-1 for environment configuration
