
// Import ioredis library for Redis connection
// ioredis supports clustering, sentinel, better performance than node-redis
const Redis = require('ioredis');

// Create Redis client connection to ElastiCache
const redis = new Redis({
  // Redis endpoint from environment variable
  // Passed from ECS task definition (REDIS_ENDPOINT)
  host: process.env.REDIS_ENDPOINT,
  
  // Redis default port
  port: 6379,
  
  // Connection timeout in milliseconds
  // 5000 = 5 seconds before giving up
  connectTimeout: 5000,
  
  // Maximum retries before failing
  maxRetriesPerRequest: 3,
  
  // Enable automatic reconnection on failure
  retryStrategy: (times) => {
    // Exponential backoff: wait longer between each retry
    // Math.min ensures max 2 second delay
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Lazy connect: don't connect until first command
  // Faster startup, but first query may be slower
  lazyConnect: true
});

// Event: successful connection established
redis.on('connect', () => {
  console.log('Redis cache connected');
});

// Event: connection error (network issue, Redis down)
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Don't exit - app can work without cache (slower)
});

// Export redis client for caching operations
// set(key, value, 'EX', seconds) - set with expiration
// get(key) - retrieve value
// del(key) - delete value
module.exports = redis;