
// Centralized error handling middleware
// Catches all errors from routes and formats response
// Prevents leaking stack traces to clients in production

const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  // Includes stack trace for development
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id || 'anonymous'
  });

  // Database unique constraint violation (duplicate email, etc.)
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists.',
      detail: err.detail
    });
  }

  // Database foreign key violation (missing reference)
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced resource not found.'
    });
  }

  // Database not null violation (missing required field)
  if (err.code === '23502') {
    return res.status(400).json({
      error: 'Missing required field.',
      field: err.column
    });
  }

  // Custom application errors with status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Insufficient stock error (from Order.create)
  if (err.message && err.message.includes('Insufficient stock')) {
    return res.status(400).json({
      error: err.message
    });
  }

  // Default: internal server error
  // In production, don't expose actual error message
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error.',
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorHandler;