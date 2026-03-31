# Use official Node.js 18 Alpine Linux image (small, secure)
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package*.json ./

# Install production dependencies only (smaller image, faster build)
RUN npm ci --omit=dev

# Copy rest of application code
COPY . .

# Expose port 80 for HTTP traffic
EXPOSE 80

# Health check: verify app responds using Node.js (no curl needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
CMD ["node", "server.js"]