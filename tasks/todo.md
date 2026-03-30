# Neurix — Task Tracker

## Phase 1: Environment Setup (DONE)
- [x] Create `.env.example` for frontend client
- [x] Update `.env.example` for frontend server with all MCP URLs
- [x] Replace incomplete `env.example` with comprehensive `.env.example` for all 6 backend servers
- [x] Verify no secrets in tracked files

## Phase 2: Testing Infrastructure (DONE)
- [x] Set up Vitest with jsdom in frontend client
- [x] Add string-utils unit tests (truncate, capitalize, pluralize, slugify, stripMarkdown)
- [x] Add validation unit tests (isValidEmail, isValidUrl, isNonEmpty, sanitizeInput)
- [x] Add format-utils unit tests (formatFileSize, formatNumber, formatDuration, formatPercentage)
- [x] Add date-utils unit tests (isToday, isYesterday, formatRelativeDate, formatSmartDate)
- [x] Add ai-service unit tests (mcpToolsToOpenAI)
- [x] Add mcp-api unit tests (matchUserInputToTool, parseUserIntent, generateToolsHelpMessage)
- [x] All 94 tests passing

## Phase 3: Frontend Error Handling & Retry (DONE)
- [x] Add retry logic for failed MCP calls in frontend
- [x] Add user-facing rate limit feedback
- [x] Add error boundaries with fallback UI
- [x] Add loading skeletons for slow connections
- [x] Implement session cleanup TODO in gforms-server (already implemented)

## Phase 4: Docker Compose Deployment (DONE)
- [x] Create working docker-compose for full stack (all 6 MCP + frontend)
- [x] Document deployment steps

## Phase 5: Central Memory Search (DONE)
- [x] Wire up header search bar to search chat history

## Phase 6: CI/CD (DONE)
- [x] GitHub Actions: lint, type-check, test, build on push

## Completed
- [x] Integrate OpenAI into frontend (GPT-4o-mini function calling with MCP tool routing)
- [x] Created `ai-service.ts` — OpenAI service with tool conversion, chat, and summary
- [x] Rewired `ChatContext.tsx` — AI path when key is set, keyword fallback otherwise
