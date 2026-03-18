// Import database connection
const { query } = require('../config/database');
// Import Redis cache client
const redis = require('../config/cache');

// Cache key prefix for products (namespace to avoid collisions)
const CACHE_PREFIX = 'product:';

// Product model: inventory management
const Product = {
  // Create new product (admin only)
  // data: { name, description, price, stock_quantity, category_id, image_url }
  create: async (data) => {
    const sql = `
      INSERT INTO products (name, description, price, stock_quantity, category_id, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(sql, [
      data.name,
      data.description,
      data.price,
      data.stock_quantity || 0,
      data.category_id,
      data.image_url
    ]);
    // Invalidate category cache since new product added
    await redis.del(`category:${data.category_id}:products`);
    return result.rows[0];
  },

  // Find product by ID with caching
  // id: product ID
  // useCache: boolean (default true)
  findById: async (id, useCache = true) => {
    const cacheKey = `${CACHE_PREFIX}${id}`;
    
    // Try cache first if enabled
    if (useCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Parse JSON string back to object
        return JSON.parse(cached);
      }
    }
    
    // Cache miss: query database
    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    const result = await query(sql, [id]);
    const product = result.rows[0];
    
    // Store in cache for 5 minutes (300 seconds) if found
    if (product && useCache) {
      await redis.set(cacheKey, JSON.stringify(product), 'EX', 300);
    }
    
    return product;
  },

  // Find all products with filtering, sorting, pagination
  // filters: { category_id, min_price, max_price, search }
  // options: { sort_by, order, limit, offset }
  findAll: async (filters = {}, options = {}) => {
    // Build WHERE clause dynamically
    const whereConditions = ['p.is_active = true'];
    const values = [];
    let paramCount = 1;

    if (filters.category_id) {
      whereConditions.push(`p.category_id = $${paramCount++}`);
      values.push(filters.category_id);
    }
    if (filters.min_price) {
      whereConditions.push(`p.price >= $${paramCount++}`);
      values.push(filters.min_price);
    }
    if (filters.max_price) {
      whereConditions.push(`p.price <= $${paramCount++}`);
      values.push(filters.max_price);
    }
    if (filters.search) {
      // ILIKE = case-insensitive pattern match
      whereConditions.push(`(p.name ILIKE $${paramCount++} OR p.description ILIKE $${paramCount++})`);
      // % wildcard for partial match
      values.push(`%${filters.search}%`);
      values.push(`%${filters.search}%`);
    }

    // Sorting: default to created_at DESC (newest first)
    const sortBy = options.sort_by || 'created_at';
    // ORDER: ASC (ascending) or DESC (descending)
    const order = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.${sortBy} ${order}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    
    values.push(limit, offset);
    
    const result = await query(sql, values);
    return result.rows;
  },

  // Update product (admin only)
  // id: product to update
  // data: fields to change
  update: async (id, data) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update based on provided fields
    if (data.name) fields.push(`name = $${paramCount++}`), values.push(data.name);
    if (data.description) fields.push(`description = $${paramCount++}`), values.push(data.description);
    if (data.price !== undefined) fields.push(`price = $${paramCount++}`), values.push(data.price);
    if (data.stock_quantity !== undefined) fields.push(`stock_quantity = $${paramCount++}`), values.push(data.stock_quantity);
    if (data.category_id) fields.push(`category_id = $${paramCount++}`), values.push(data.category_id);
    if (data.image_url) fields.push(`image_url = $${paramCount++}`), values.push(data.image_url);
    if (data.is_active !== undefined) fields.push(`is_active = $${paramCount++}`), values.push(data.is_active);

    values.push(id);

    const sql = `
      UPDATE products
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(sql, values);
    const product = result.rows[0];
    
    // Invalidate cache since product changed
    if (product) {
      await redis.del(`${CACHE_PREFIX}${id}`);
      await redis.del(`category:${product.category_id}:products`);
    }
    
    return product;
  },

  // Decrease stock when order placed (prevents overselling)
  // id: product ID
  // quantity: amount to reduce
  // Returns: updated product or null if insufficient stock
  decreaseStock: async (id, quantity) => {
    // Atomic operation: check and update in single query
    // Prevents race condition where two orders buy last item
    const sql = `
      UPDATE products
      SET stock_quantity = stock_quantity - $1
      WHERE id = $2 AND stock_quantity >= $1
      RETURNING *
    `;
    const result = await query(sql, [quantity, id]);
    return result.rows[0];
  },

  // Delete product (soft delete - set is_active = false)
  // Hard delete would break order history references
  delete: async (id) => {
    const sql = `
      UPDATE products
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    const product = result.rows[0];
    
    // Invalidate caches
    if (product) {
      await redis.del(`${CACHE_PREFIX}${id}`);
      await redis.del(`category:${product.category_id}:products`);
    }
    
    return product;
  }
};

module.exports = Product;