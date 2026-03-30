FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/shared/mcp-sdk/package.json ./backend/shared/mcp-sdk/
COPY backend/gcalendar-server/package.json ./backend/gcalendar-server/
RUN pnpm install --frozen-lockfile

COPY backend/shared/mcp-sdk/ ./backend/shared/mcp-sdk/
COPY backend/gcalendar-server/ ./backend/gcalendar-server/
RUN pnpm --filter @neurix/mcp-sdk build && pnpm --filter @neurix/gcalendar-server build

FROM node:20-alpine
RUN npm install -g pnpm@9.15.0 && addgroup -g 1001 -S neurix && adduser -S neurix -u 1001
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/shared/mcp-sdk/package.json ./backend/shared/mcp-sdk/
COPY backend/gcalendar-server/package.json ./backend/gcalendar-server/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/backend/shared/mcp-sdk/dist ./backend/shared/mcp-sdk/dist
COPY --from=builder /app/backend/gcalendar-server/dist ./backend/gcalendar-server/dist
COPY backend/gcalendar-server/src/http/public ./backend/gcalendar-server/dist/http/public 2>/dev/null || true

RUN chown -R neurix:neurix /app
USER neurix
ENV NODE_ENV=production
EXPOSE 8083
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health',(r)=>{process.exit(r.statusCode===200?0:1)})"
WORKDIR /app/backend/gcalendar-server
CMD ["node", "dist/http/index.js"]
