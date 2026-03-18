
// Application entry point
// Loads environment and starts HTTP server

// Load .env file if exists (development only)
// ECS production uses task definition env vars
require('dotenv').config();

// Import configured Express app
const app = require('./src/app');

// Server port: 80 for ECS, or fallback for local development
const PORT = 80;

// Start HTTP server
// 0.0.0.0 binds to all network interfaces (required for Docker/ECS)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.ENVIRONMENT || 'development'}`);
  console.log(`Database: ${process.env.DB_PROXY_ENDPOINT ? 'configured' : 'not configured'}`);
  console.log(`Cache: ${process.env.REDIS_ENDPOINT ? 'configured' : 'not configured'}`);
});

// Graceful shutdown: handle SIGTERM (ECS stop, deploy)
// Finishes existing requests before exiting
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors to prevent crash
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Exit to let container restart (ECS will start new task)
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});