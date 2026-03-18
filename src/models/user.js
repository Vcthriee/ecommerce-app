
// Import database connection pool from config
// query() function runs SQL against RDS PostgreSQL
const { query } = require('../config/database');

// User model: handles all database operations for users table
const User = {
  // Create new user account
  // data: { email, password_hash, name, role }
  // Returns: created user object with id
  create: async (data) => {
    // SQL INSERT with parameterized values ($1, $2, etc.)
    // Parameters prevent SQL injection attacks
    const sql = `
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at
    `;
    // Execute query with data array as parameters
    const result = await query(sql, [
      data.email,
      data.password_hash,
      data.name,
      data.role || 'customer'
    ]);
    // Return first row (the created user)
    return result.rows[0];
  },

  // Find user by email address (used for login)
  // email: string to search for
  // Returns: user object or undefined if not found
  findByEmail: async (email) => {
    const sql = `
      SELECT id, email, password_hash, name, role, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `;
    const result = await query(sql, [email]);
    // Return first match or undefined
    return result.rows[0];
  },

  // Find user by ID (used for authentication checks)
  // id: user ID from JWT token
  // Returns: user object without password_hash (security)
  findById: async (id) => {
    const sql = `
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Get all users with pagination (admin feature)
  // limit: max results per page (default 20)
  // offset: skip first N results (for page 2, 3, etc.)
  // Returns: array of users
  findAll: async (limit = 20, offset = 0) => {
    const sql = `
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  },

  // Update user profile
  // id: user to update
  // data: fields to change (name, email, etc.)
  // Returns: updated user object
  update: async (id, data) => {
    // Build dynamic SQL based on provided fields
    // Only updates fields that are passed in
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.role) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }

    // Add ID as last parameter
    values.push(id);

    const sql = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, created_at, updated_at
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Delete user account
  // id: user to delete
  // Returns: boolean (true if deleted)
  delete: async (id) => {
    const sql = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await query(sql, [id]);
    // Return true if row was deleted
    return result.rowCount > 0;
  }
};

// Export User model for use in routes
module.exports = User;