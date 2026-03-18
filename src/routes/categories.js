
// Category routes: browse all, view with products
const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/categories - List all categories
// Heavily cached (rarely changes)
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/:id - Get category with products
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }

    // Include products in response (true = fetch products)
    const category = await Category.findById(id, true);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// POST /api/categories - Create category (admin)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id - Update category (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }

    const category = await Category.update(id, req.body);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

module.exports = router;