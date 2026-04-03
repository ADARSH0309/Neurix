FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

COPY frontend/ ./frontend/
RUN pnpm --filter @neurix/frontend build

FROM node:20-alpine
RUN addgroup -g 1001 -S neurix && adduser -S neurix -u 1001
WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/frontend/dist ./dist

RUN chown -R neurix:neurix /app
USER neurix
ENV NODE_ENV=production
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000',(r)=>{process.exit(r.statusCode===200?0:1)})"
CMD ["serve", "-s", "dist", "-l", "9000"]
