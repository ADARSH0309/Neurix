# Contributing to Neurix

## Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build SDK first: `pnpm build:sdk`
4. Build backend: `pnpm build:backend`
5. Build frontend: `pnpm build:frontend`

## Adding a New MCP Server

1. Create `backend/<service>-server/` following the gcalendar-server pattern
2. Extend `NeurixBaseServer` from `@neurix/mcp-sdk`
3. Add to `pnpm-workspace.yaml`
4. Add build script to root `package.json`
5. Integrate with frontend (ServerContext, NavigationDock, ChatStage, mcp-api formatters)

## Commit Messages

- Use short, single-line commit messages
- Start with a verb: Add, Fix, Update, Remove, Refactor
- Reference the component: "Fix OAuth callback in gcalendar-server"

## Code Style

- TypeScript strict mode
- No `any` types in new code
- Use Zod for runtime validation
- Structured JSON logging in backend
