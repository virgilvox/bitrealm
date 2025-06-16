# Build stage
FROM node:20.13.1-bookworm-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for the build)
RUN npm ci && npm cache clean --force

# Copy source
COPY . .

# Build client assets
RUN npm run build

# Production stage
FROM node:20.13.1-bookworm-slim AS production

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs bitrealm

WORKDIR /app

# Copy built application
COPY --from=builder --chown=bitrealm:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bitrealm:nodejs /app/server ./server
COPY --from=builder --chown=bitrealm:nodejs /app/dist ./dist
COPY --from=builder --chown=bitrealm:nodejs /app/public ./public
COPY --from=builder --chown=bitrealm:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads logs && chown -R bitrealm:nodejs uploads logs

# Switch to non-root user
USER bitrealm

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]