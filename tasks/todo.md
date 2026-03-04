# Neurix — Task Tracker

## Current
_No active tasks._

## Completed
- [x] Integrate OpenAI into frontend (GPT-4o-mini function calling with MCP tool routing)
  - Added `openai` package to client
  - Created `frontend/client/src/lib/ai-service.ts` — OpenAI service with tool conversion, chat, and summary
  - Rewired `ChatContext.tsx` — AI path when key is set, keyword fallback otherwise
  - **Pending user action:** Create `frontend/client/.env` with `VITE_OPENAI_API_KEY`
