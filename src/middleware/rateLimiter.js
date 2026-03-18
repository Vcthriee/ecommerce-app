
// Import Redis for distributed rate limiting
// Works across multiple ECS tasks (shared state)
const redis = require('../config/cache');

// Rate limiter factory: creates middleware with custom limits
// options: { windowMs, maxRequests, keyPrefix }
const createRateLimiter = (options = {}) => {
  // Time window in milliseconds (default 15 minutes)
  const windowMs = options.windowMs || 15 * 60 * 1000;
  // Max requests per window (default 100)
  const maxRequests = options.maxRequests || 100;
  // Key prefix for Redis (allows different limits per endpoint)
  const keyPrefix = options.keyPrefix || 'ratelimit';

  // Return Express middleware function
  return async (req, res, next) => {
    try {
      // Use user ID if authenticated, otherwise IP address
      // Prevents limiting all users behind same NAT
      const identifier = req.user?.id || req.ip;
      const key = `${keyPrefix}:${identifier}`;

      // Get current count from Redis
      const current = await redis.get(key);
      const count = parseInt(current) || 0;

      if (count >= maxRequests) {
        // Limit exceeded: send 429 Too Many Requests
        const ttl = await redis.ttl(key);
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          retryAfter: ttl
        });
      }

      // Increment count
      if (count === 0) {
        // First request: set with expiration
        await redis.set(key, 1, 'PX', windowMs);
      } else {
        // Subsequent requests: just increment
        await redis.incr(key);
      }

      // Add rate limit headers (helpful for clients)
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1));

      next();
    } catch (error) {
      // If Redis fails, allow request (fail open)
      // Better than blocking all traffic
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

// Pre-configured limiters for common use cases
module.exports = {
  // General API limit: 100 requests per 15 minutes
  standard: createRateLimiter({ keyPrefix: 'api:standard' }),
  
  // Strict limit for auth endpoints: 5 attempts per minute
  // Prevents brute force password guessing
  strict: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 5,
    keyPrefix: 'api:strict'
  }),
  
  // Order creation limit: 10 orders per minute
  // Prevents accidental double-clicking or abuse
  order: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'api:order'
  }),
  
  // Factory for custom limits
  create: createRateLimiter
};