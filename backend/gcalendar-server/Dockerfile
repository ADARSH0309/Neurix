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
COPY backend/shared/mcp-sdk/package.json ./backend/shared/mcp-sdk/
COPY backend/gcalendar-server/package.json ./backend/gcalendar-server/

# Install ONLY production dependencies
# --ignore-scripts prevents husky (git hooks) from running
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts (built locally before Docker build)
COPY backend/shared/mcp-sdk/dist ./backend/shared/mcp-sdk/dist
COPY backend/shared/mcp-sdk/package.json ./backend/shared/mcp-sdk/
COPY backend/gcalendar-server/dist ./backend/gcalendar-server/dist
COPY backend/gcalendar-server/src/http/public ./backend/gcalendar-server/dist/http/public
COPY backend/gcalendar-server/package.json ./backend/gcalendar-server/

# Copy any necessary runtime files
COPY backend/gcalendar-server/docker-compose.yml ./backend/gcalendar-server/

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
WORKDIR /app/backend/gcalendar-server
CMD ["node", "dist/http/index.js"]
