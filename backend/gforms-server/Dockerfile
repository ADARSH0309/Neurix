# Production Runtime Image
# NOTE: This Dockerfile expects the project to be built locally first.
# Run: pnpm build (from monorepo root) before building this image.
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Create non-root user for security
RUN addgroup -g 1001 -S neurix && \
    adduser -S neurix -u 1001

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy package.json files
COPY Backend/shared/mcp-sdk/package.json ./Backend/shared/mcp-sdk/
COPY Backend/gforms-server/package.json ./Backend/gforms-server/

# Install ONLY production dependencies
# --ignore-scripts prevents husky (git hooks) from running
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts (built locally before Docker build)
COPY Backend/shared/mcp-sdk/dist ./Backend/shared/mcp-sdk/dist
COPY Backend/shared/mcp-sdk/package.json ./Backend/shared/mcp-sdk/
COPY Backend/gforms-server/dist ./Backend/gforms-server/dist
COPY Backend/gforms-server/src/http/public ./Backend/gforms-server/dist/http/public
COPY Backend/gforms-server/package.json ./Backend/gforms-server/

# Copy any necessary runtime files
COPY Backend/gforms-server/docker-compose.yml ./Backend/gforms-server/

# Copy TLS certificates for Redis connection
COPY Backend/gforms-server/certs ./Backend/gforms-server/certs

# Change ownership to non-root user
RUN chown -R neurix:neurix /app

# Switch to non-root user
USER neurix

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the HTTP server
WORKDIR /app/Backend/gforms-server
CMD ["node", "dist/http/index.js"]
