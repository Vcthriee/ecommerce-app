
// Main Express application setup
const express = require('express');
// CORS: allow cross-origin requests (frontend on different domain)
const cors = require('cors');
// Helmet: security headers (XSS protection, clickjacking prevention)
const helmet = require('helmet');
// Morgan: HTTP request logging
const morgan = require('morgan');
// Compression: gzip responses (smaller, faster)
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Import route handlers
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const categoryRoutes = require('./routes/categories');
// Import error handler middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express application instance
const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description: 'REST API for e-commerce application',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Local server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security middleware
app.use(helmet());
// CORS: allow all origins in development, restrict in production
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logging: 'combined' format includes IP, method, URL, status, response time
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// Compress responses > 1KB
app.use(compression());

// Body parsing: JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes at specific paths
// Health check at /health for ALB
app.use('/health', healthRoutes);
// API routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler: route not found
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.',
    path: req.path,
    method: req.method
  });
});

// Global error handler: catches all errors from routes
app.use(errorHandler);

module.exports = app;