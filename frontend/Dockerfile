FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/client/package.json ./frontend/client/
COPY frontend/server/package.json ./frontend/server/
RUN pnpm install --frozen-lockfile

COPY frontend/client/ ./frontend/client/
COPY frontend/server/ ./frontend/server/
RUN pnpm --filter client build && pnpm --filter @neurix/mcp-chat-interface build

FROM node:20-alpine
RUN npm install -g pnpm@9.15.0 && addgroup -g 1001 -S neurix && adduser -S neurix -u 1001
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/client/package.json ./frontend/client/
COPY frontend/server/package.json ./frontend/server/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/frontend/client/dist ./frontend/client/dist
COPY --from=builder /app/frontend/server/dist ./frontend/server/dist

RUN chown -R neurix:neurix /app
USER neurix
ENV NODE_ENV=production
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health',(r)=>{process.exit(r.statusCode===200?0:1)})"
WORKDIR /app/frontend/server
CMD ["node", "dist/server.js"]
