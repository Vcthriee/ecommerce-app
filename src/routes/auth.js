
// Authentication routes: register, login
const express = require('express');
const router = express.Router();
// bcrypt for password hashing (never store plain text)
const bcrypt = require('bcrypt');
// User model for database operations
const User = require('../models/user');
// JWT generation and rate limiting middleware
const { generateToken } = require('../middleware/auth');
const { strict: strictRateLimit } = require('../middleware/rateLimiter');
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration and login
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */

// POST /api/auth/register - Create new account
// No authentication required (public endpoint)
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required.' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters.' 
      });
    }

    // Hash password with bcrypt (10 rounds = good balance of security/speed)
    // Hash is one-way: cannot be reversed to original password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name.trim(),
      role: 'customer' // Default role
    });

    // Generate JWT for immediate login
    const token = generateToken(user);

    // Return user info and token (never return password_hash)
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Authenticate and get token
// Rate limited: 5 attempts per minute (prevents brute force)
router.post('/login', strictRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required.' 
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase().trim());
    
    // Generic error message: don't reveal if email exists (security)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Compare provided password with stored hash
    // bcrypt handles timing-safe comparison internally
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT for authenticated requests
    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;