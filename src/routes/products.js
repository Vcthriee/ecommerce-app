
// Product routes: browse, search, CRUD (admin)
const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { standard: rateLimit } = require('../middleware/rateLimiter');

// GET /api/products - List all products with filters
// Public endpoint with rate limiting
router.get('/', rateLimit, async (req, res, next) => {
  try {
    // Extract query parameters for filtering
    const filters = {
      category_id: req.query.category ? parseInt(req.query.category) : null,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : null,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : null,
      search: req.query.search || null
    };

    // Pagination options
    const options = {
      sort_by: req.query.sort_by || 'created_at',
      order: req.query.order || 'desc',
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const products = await Product.findAll(filters, options);
    
    res.json({
      products,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        hasMore: products.length === options.limit
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get single product details
// Uses Redis cache for performance
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create product (admin only)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock_quantity, category_id, image_url } = req.body;

    // Validate required fields
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative.' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      stock_quantity: stock_quantity || 0,
      category_id,
      image_url
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }

    const updates = req.body;
    
    // Prevent updating ID directly
    delete updates.id;

    const product = await Product.update(id, updates);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Soft delete (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }

    const product = await Product.delete(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ message: 'Product deleted successfully.', product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;