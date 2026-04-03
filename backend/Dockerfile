FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY backend/packages/mcp-sdk/package.json ./backend/packages/mcp-sdk/
COPY backend/packages/server-core/package.json ./backend/packages/server-core/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

COPY backend/ ./backend/
RUN pnpm --filter @neurix/mcp-sdk build
RUN pnpm --filter @neurix/server-core build
RUN pnpm --filter @neurix/gateway build

FROM node:20-alpine
RUN addgroup -g 1001 -S neurix && adduser -S neurix -u 1001
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY backend/packages/mcp-sdk/package.json ./backend/packages/mcp-sdk/
COPY backend/packages/server-core/package.json ./backend/packages/server-core/
RUN npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/packages/mcp-sdk/dist ./backend/packages/mcp-sdk/dist
COPY --from=builder /app/backend/packages/server-core/dist ./backend/packages/server-core/dist

RUN chown -R neurix:neurix /app
USER neurix
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health',(r)=>{process.exit(r.statusCode===200?0:1)})"
CMD ["node", "backend/dist/index.js"]
