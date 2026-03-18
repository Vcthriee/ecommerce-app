# Use official Node.js 18 Alpine Linux image (small, secure)
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory inside container
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package*.json ./

# Install production dependencies only (smaller image, faster build)
RUN npm ci --only=production

# Copy rest of application code
COPY . .

# Expose port 80 for HTTP traffic
EXPOSE 80

# Health check: verify app responds
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Start application
CMD ["node", "server.js"]