
// Import jsonwebtoken for JWT verification
const jwt = require('jsonwebtoken');
// Import user model to fetch current user data
const User = require('../models/user');

// JWT secret from environment variable (must match secret used to sign tokens)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware: verify JWT token and attach user to request
// Used on protected routes (orders, profile, admin functions)
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    // Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    // Verify token signature and decode payload
    // Throws error if token expired or invalid
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch current user data from database
    // Ensures user still exists and hasn't been banned
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    // Attach user to request object for route handlers
    // req.user available in all subsequent middleware and route
    req.user = user;
    
    // Continue to next middleware or route handler
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Middleware: restrict to admin users only
// Must be used after authenticate middleware
const requireAdmin = (req, res, next) => {
  // Check if user role is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// Helper function: generate JWT token on login/register
// user: user object from database
// Returns: signed JWT string
const generateToken = (user) => {
  // Payload contains non-sensitive user info
  // DO NOT include password_hash in token
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  // Sign with secret, expires in 24 hours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Export middleware functions and token generator
module.exports = {
  authenticate,
  requireAdmin,
  generateToken
};