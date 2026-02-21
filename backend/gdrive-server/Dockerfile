# Production Runtime Image
# NOTE: This Dockerfile expects the project to be built locally first.
# Run: pnpm build (from monorepo root) before building this image.
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Create non-root user for security
RUN addgroup -g 1001 -S ubiq && \
    adduser -S ubiq -u 1001

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy package.json files
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/gdrive-server/package.json ./packages/gdrive-server/

# Install ONLY production dependencies
# --ignore-scripts prevents husky (git hooks) from running
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts (built locally before Docker build)
COPY packages/sdk/dist ./packages/sdk/dist
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/gdrive-server/dist ./packages/gdrive-server/dist
COPY packages/gdrive-server/src/http/public ./packages/gdrive-server/dist/http/public
COPY packages/gdrive-server/package.json ./packages/gdrive-server/

# Copy any necessary runtime files
COPY packages/gdrive-server/docker-compose.yml ./packages/gdrive-server/

# Copy TLS certificates for Redis connection (Phase 5.1 - Week 1, Task 1.1)
COPY packages/gdrive-server/certs ./packages/gdrive-server/certs

# Change ownership to non-root user
RUN chown -R ubiq:ubiq /app

# Switch to non-root user
USER ubiq

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the HTTP server
WORKDIR /app/packages/gdrive-server
CMD ["node", "dist/http/index.js"]
