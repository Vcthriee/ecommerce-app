
// Import database connection pool for SQL queries
const { query, pool } = require('../config/database');
// Import Redis cache for temporary data storage
const redis = require('../config/cache');

// Order model: handles purchase transactions and order history
const Order = {
  // Create new order with items (database transaction)
  // data: { user_id, items: [{product_id, quantity}], shipping_address }
  // Returns: created order with items array
  create: async (data) => {
    // Get client from pool for transaction (ensures atomicity)
    // All operations succeed or all fail (no partial orders)
    const client = await pool.connect();
    
    try {
      // Begin transaction block
      await client.query('BEGIN');
      
      // Calculate total by fetching current product prices
      let totalAmount = 0;
      const orderItems = [];
      
      // Loop through each item in cart
      for (const item of data.items) {
        // Lock product row to prevent concurrent stock changes
        // FOR UPDATE locks row until transaction completes
        const productSql = `
          SELECT id, price, stock_quantity, name 
          FROM products 
          WHERE id = $1 
          FOR UPDATE
        `;
        const productResult = await client.query(productSql, [item.product_id]);
        const product = productResult.rows[0];
        
        // Validate product exists and has sufficient stock
        if (!product) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}: ${product.stock_quantity} available, ${item.quantity} requested`);
        }
        
        // Add to running total (price * quantity)
        totalAmount += parseFloat(product.price) * item.quantity;
        
        // Store for later insertion
        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_time: product.price
        });
        
        // Decrease product stock (locked, so safe from race conditions)
        const updateStockSql = `
          UPDATE products 
          SET stock_quantity = stock_quantity - $1 
          WHERE id = $2
        `;
        await client.query(updateStockSql, [item.quantity, item.product_id]);
      }
      
      // Insert order record with calculated total
      const orderSql = `
        INSERT INTO orders (user_id, total_amount, shipping_address, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
      `;
      const orderResult = await client.query(orderSql, [
        data.user_id,
        totalAmount,
        JSON.stringify(data.shipping_address)
      ]);
      const order = orderResult.rows[0];
      
      // Insert each order item linked to order
      const itemSql = `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      // Execute all item inserts
      const savedItems = [];
      for (const item of orderItems) {
        const itemResult = await client.query(itemSql, [
          order.id,
          item.product_id,
          item.quantity,
          item.price_at_time
        ]);
        savedItems.push(itemResult.rows[0]);
      }
      
      // Commit transaction: all changes permanent
      await client.query('COMMIT');
      
      // Attach items to order object for return
      order.items = savedItems;
      
      // Invalidate user's order cache
      await redis.del(`user:${data.user_id}:orders`);
      
      return order;
      
    } catch (error) {
      // Rollback on any error: undo all changes
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client back to pool (always runs)
      client.release();
    }
  },

  // Find order by ID with all items
  // id: order ID
  // userId: optional filter by user (security check)
  findById: async (id, userId = null) => {
    // Fetch order with user info
    let orderSql = `
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const orderValues = [id];
    
    // If userId provided, restrict to that user's orders
    if (userId) {
      orderSql += ' AND o.user_id = $2';
      orderValues.push(userId);
    }
    
    const orderResult = await query(orderSql, orderValues);
    const order = orderResult.rows[0];
    
    if (!order) return null;
    
    // Fetch associated order items with product details
    const itemsSql = `
      SELECT oi.*, p.name as product_name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await query(itemsSql, [id]);
    order.items = itemsResult.rows;
    
    return order;
  },

  // Get all orders for specific user with pagination
  // userId: user's orders to fetch
  // options: { limit, offset }
  findByUser: async (userId, options = {}) => {
    const cacheKey = `user:${userId}:orders`;
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached && offset === 0) {
      return JSON.parse(cached);
    }
    
    // Fetch orders sorted by date (newest first)
    const ordersSql = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const ordersResult = await query(ordersSql, [userId, limit, offset]);
    const orders = ordersResult.rows;
    
    // Cache first page for 5 minutes
    if (offset === 0) {
      await redis.set(cacheKey, JSON.stringify(orders), 'EX', 300);
    }
    
    return orders;
  },

  // Update order status (admin only)
  // id: order to update
  // status: new status value
  // Returns: updated order
  updateStatus: async (id, status) => {
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    // Validate status value
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const sql = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [status, id]);
    const order = result.rows[0];
    
    // Invalidate cache
    if (order) {
      await redis.del(`user:${order.user_id}:orders`);
    }
    
    return order;
  },

  // Get all orders with filters (admin dashboard)
  // filters: { status, startDate, endDate }
  // options: { limit, offset, sortBy }
  findAll: async (filters = {}, options = {}) => {
    const whereConditions = ['1=1']; // Always true, simplifies query building
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      whereConditions.push(`o.status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters.startDate) {
      whereConditions.push(`o.created_at >= $${paramCount++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      whereConditions.push(`o.created_at <= $${paramCount++}`);
      values.push(filters.endDate);
    }
    if (filters.userId) {
      whereConditions.push(`o.user_id = $${paramCount++}`);
      values.push(filters.userId);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const sortBy = options.sortBy || 'created_at';
    const order = options.order === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT o.*, u.email as user_email, u.name as user_name,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.${sortBy} ${order}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    
    values.push(limit, offset);
    
    const result = await query(sql, values);
    return result.rows;
  }
};

module.exports = Order;