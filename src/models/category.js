
// Import database connection
const { query } = require('../config/database');
// Import Redis cache
const redis = require('../config/cache');

// Cache key for all categories (rarely changes)
const CACHE_KEY = 'categories:all';

// Category model: product organization
const Category = {
  // Create new category (admin only)
  // data: { name, description }
  create: async (data) => {
    const sql = `
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(sql, [data.name, data.description]);
    
    // Invalidate cache since data changed
    await redis.del(CACHE_KEY);
    
    return result.rows[0];
  },

  // Get all categories (heavily cached)
  findAll: async (useCache = true) => {
    // Try cache first (categories rarely change)
    if (useCache) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }
    
    const sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = true) as product_count
      FROM categories c
      ORDER BY c.name ASC
    `;
    const result = await query(sql);
    const categories = result.rows;
    
    // Cache for 1 hour (3600 seconds) - categories are static
    if (useCache) {
      await redis.set(CACHE_KEY, JSON.stringify(categories), 'EX', 3600);
    }
    
    return categories;
  },

  // Find category by ID with products
  // includeProducts: boolean (default false)
  findById: async (id, includeProducts = false) => {
    const cacheKey = `category:${id}`;
    
    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached && !includeProducts) {
      return JSON.parse(cached);
    }
    
    // Fetch category
    const catSql = 'SELECT * FROM categories WHERE id = $1';
    const catResult = await query(catSql, [id]);
    const category = catResult.rows[0];
    
    if (!category) return null;
    
    // Optionally fetch products in this category
    if (includeProducts) {
      const productsSql = `
        SELECT id, name, price, stock_quantity, image_url, created_at
        FROM products
        WHERE category_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;
      const productsResult = await query(productsSql, [id]);
      category.products = productsResult.rows;
      
      // Cache with products for 10 minutes
      await redis.set(`${cacheKey}:products`, JSON.stringify(category), 'EX', 600);
    } else {
      // Cache basic info for 1 hour
      await redis.set(cacheKey, JSON.stringify(category), 'EX', 3600);
    }
    
    return category;
  },

  // Update category (admin only)
  update: async (id, data) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name) fields.push(`name = $${paramCount++}`), values.push(data.name);
    if (data.description) fields.push(`description = $${paramCount++}`), values.push(data.description);

    values.push(id);

    const sql = `
      UPDATE categories
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(sql, values);
    const category = result.rows[0];
    
    // Invalidate caches
    if (category) {
      await redis.del(CACHE_KEY);
      await redis.del(`category:${id}`);
      await redis.del(`category:${id}:products`);
    }
    
    return category;
  },

  // Delete category (admin only)
  // Products must be moved or deleted first (foreign key constraint)
  delete: async (id) => {
    const sql = 'DELETE FROM categories WHERE id = $1 RETURNING id';
    const result = await query(sql, [id]);
    
    if (result.rowCount > 0) {
      await redis.del(CACHE_KEY);
      await redis.del(`category:${id}`);
    }
    
    return result.rowCount > 0;
  }
};

module.exports = Category;