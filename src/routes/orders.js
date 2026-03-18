
// Order routes: create, view, manage
const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Product = require('../models/product');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { order: orderRateLimit } = require('../middleware/rateLimiter');

// GET /api/orders - Get user's order history
// Authenticated: only sees own orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const orders = await Order.findByUser(req.user.id, options);
    
    res.json({
      orders,
      user: {
        id: req.user.id,
        email: req.user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get specific order details
// User can only view their own orders (enforced in model)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }

    // Pass user ID to ensure they can only see their own orders
    const order = await Order.findById(id, req.user.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Admin can see any order, users only their own
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders - Create new order (purchase)
// Rate limited: prevents accidental double-submit
router.post('/', authenticate, orderRateLimit, async (req, res, next) => {
  try {
    const { items, shipping_address } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    // Validate each item has product_id and quantity
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ 
          error: 'Each item must have product_id and quantity >= 1.' 
        });
      }
    }

    // Validate shipping address
    if (!shipping_address || !shipping_address.street || !shipping_address.city) {
      return res.status(400).json({ 
        error: 'Shipping address with street and city is required.' 
      });
    }

    // Create order with transaction (locks stock, creates records)
    const order = await Order.create({
      user_id: req.user.id,
      items,
      shipping_address
    });

    res.status(201).json({
      message: 'Order created successfully.',
      order
    });
  } catch (error) {
    // Specific error for insufficient stock
    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// PUT /api/orders/:id/status - Update order status (admin only)
// Used for: pending -> paid -> processing -> shipped -> delivered
router.put('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const order = await Order.updateStatus(id, status);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      message: `Order status updated to ${status}.`,
      order
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/admin/all - Get all orders with filters (admin)
router.get('/admin/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      userId: req.query.user_id ? parseInt(req.query.user_id) : null
    };

    const options = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sort_by || 'created_at',
      order: req.query.order || 'desc'
    };

    const orders = await Order.findAll(filters, options);
    
    res.json({
      orders,
      filters,
      pagination: {
        limit: options.limit,
        offset: options.offset
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;