# Messenger Client Dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY f1-messenger-app/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY f1-messenger-app/src ./src
COPY f1-messenger-app/server ./server
COPY f1-messenger-app/tsconfig*.json ./
COPY f1-messenger-app/vite.config.ts ./
COPY f1-messenger-app/index.html ./
COPY f1-messenger-app/public ./public

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S messenger -u 1001

# Copy package files
COPY f1-messenger-app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application and server
COPY --from=builder --chown=messenger:nodejs /app/dist ./dist
COPY --from=builder --chown=messenger:nodejs /app/server ./server

# Copy configuration files
COPY --from=builder --chown=messenger:nodejs /app/package*.json ./

USER messenger

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "run", "start:agent"]
