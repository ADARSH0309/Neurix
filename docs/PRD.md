# Neurix - Product Requirements Document (PRD)

**Version:** 2.0
**Date:** February 12, 2026
**Status:** Draft

---

## 1. Executive Summary

**Neurix** is an enterprise-grade AI-powered chat platform that unifies productivity tools through a single conversational interface. Users interact with a chat UI powered by AI (via OpenAI/MCP protocol) to perform actions across integrated services — Google Drive, Gmail, Google Forms, GitHub, Slack, Notion, and more — using natural language prompts.

The platform eliminates context-switching by bringing all tools into one chat window. Instead of opening 10 tabs, users type what they need and Neurix handles the rest.

---

## 2. Problem Statement

| Pain Point | Impact |
|---|---|
| **Context switching** across 10+ apps daily | ~25% productivity loss per task switch |
| **Repetitive workflows** (file creation, email drafting, form setup) | Hours wasted weekly on manual steps |
| **Fragmented data** across services | Difficulty cross-referencing info |
| **Steep learning curves** for new tools | Teams underutilize paid software |
| **No unified search** across services | Information is siloed |

**Neurix solves this** by providing one chat interface that connects to all services via the Model Context Protocol (MCP), letting users accomplish tasks through natural language.

---

## 3. Target Users

| Persona | Description | Primary Use Cases |
|---|---|---|
| **Knowledge Worker** | Uses 5+ SaaS tools daily | Cross-service workflows, quick actions |
| **Team Lead / Manager** | Coordinates across tools | Status updates, report generation, team comms |
| **Developer** | Lives in terminal/IDE | GitHub operations, CI/CD, documentation |
| **Startup Founder** | Wears many hats | Everything — email, docs, forms, project mgmt |
| **Operations / Admin** | Manages processes | Data collection, file organization, communication |

---

## 4. Product Vision & Goals

### 4.1 Vision
> "One chat to rule them all" — A universal AI assistant that connects every tool in your stack through conversation.

### 4.2 Goals (v2.0)

| # | Goal | Success Metric |
|---|---|---|
| G1 | Support **15+ app integrations** | Number of MCP servers live |
| G2 | Sub-2s response time for tool execution | P95 latency < 2000ms |
| G3 | 90%+ tool-match accuracy from natural language | Correct tool invoked on first try |
| G4 | Zero-friction onboarding (< 2 min to first action) | Time-to-first-value |
| G5 | Cross-service workflows in a single prompt | Multi-tool chain execution |

---

## 5. App Integrations (MCP Servers)

### 5.1 Currently Implemented (v1.0)

| # | Integration | Port | Status | Tools |
|---|---|---|---|---|
| 1 | **Google Drive** | 8080 | Live | list_files, search_files, get_file, create_folder, upload_file |
| 2 | **Google Forms** | 8081 | Live | list_forms, create_form, get_form, add_question, list_responses |
| 3 | **Gmail** | 8082 | Live | list_messages, search_messages, send_message, get_profile, list_labels |

### 5.2 Planned Integrations (v2.0)

| # | Integration | Category | Key Tools | Priority |
|---|---|---|---|---|
| 4 | **GitHub** | Dev Tools | create_issue, list_prs, merge_pr, create_repo, search_code | P0 |
| 5 | **Slack** | Communication | send_message, list_channels, create_channel, search_messages | P0 |
| 6 | **Notion** | Productivity | create_page, search, update_database, query_database | P0 |
| 7 | **Google Calendar** | Scheduling | create_event, list_events, update_event, find_free_slots | P0 |
| 8 | **Google Sheets** | Data | read_range, write_range, create_sheet, add_chart | P1 |
| 9 | **Jira** | Project Mgmt | create_issue, update_status, list_sprints, search_issues | P1 |
| 10 | **Linear** | Project Mgmt | create_issue, list_issues, update_status, list_cycles | P1 |
| 11 | **Trello** | Project Mgmt | create_card, move_card, list_boards, add_checklist | P1 |
| 12 | **Confluence** | Documentation | create_page, search, update_page, list_spaces | P1 |
| 13 | **Figma** | Design | list_files, get_comments, export_assets, get_components | P2 |
| 14 | **Airtable** | Database | list_records, create_record, update_record, search | P2 |
| 15 | **Dropbox** | Storage | list_files, upload, download, share_link, search | P2 |
| 16 | **Microsoft 365** | Productivity | outlook_send, word_create, excel_read, teams_message | P2 |
| 17 | **Zoom** | Meetings | create_meeting, list_recordings, get_transcript | P2 |
| 18 | **Stripe** | Payments | list_invoices, create_payment_link, get_balance, list_customers | P2 |
| 19 | **Twilio** | Communication | send_sms, make_call, list_messages | P3 |
| 20 | **AWS S3** | Cloud Storage | list_buckets, upload_object, get_object, generate_presigned_url | P3 |
| 21 | **Firebase** | Backend | read_document, write_document, query_collection, list_users | P3 |
| 22 | **Vercel** | Deployment | list_deployments, trigger_deploy, get_logs, list_domains | P3 |
| 23 | **Supabase** | Database | query, insert, update, delete, list_tables | P3 |
| 24 | **HubSpot** | CRM | create_contact, list_deals, update_pipeline, search | P3 |
| 25 | **Zapier Webhooks** | Automation | trigger_zap, list_zaps — catch-all for 5000+ apps | P3 |

### 5.3 Integration Architecture

Each integration follows the same MCP server pattern:
```
backend/<service>-server/
├── src/
│   ├── http/              # Express + OAuth + Routes
│   ├── <service>-client.ts  # API SDK wrapper
│   └── exchange-token.ts    # Token exchange
└── package.json
```

All servers extend `NeurixBaseServer` from `backend/shared/mcp-sdk/`.

---

## 6. Core Features

### 6.1 Chat Interface (Primary)

#### F1: Natural Language Command Execution
- User types a prompt in natural language
- AI identifies the intent, selects the right tool, extracts parameters
- Tool executes via MCP protocol
- Response formatted as rich markdown in chat

**Examples:**
```
User: "Find all PDFs in my Drive from last week"
→ Tool: gdrive.search_files({ query: "mimeType='application/pdf' and modifiedTime > '2026-02-05'" })

User: "Send an email to john@acme.com about the Q1 report"
→ Tool: gmail.send_message({ to: "john@acme.com", subject: "Q1 Report", body: "..." })

User: "Create a feedback form with 5 rating questions"
→ Tool: gforms.create_form({ title: "Feedback", questions: [...] })
```

#### F2: Multi-Tool Chaining
- Single prompt triggers multiple tools sequentially
- Context flows between tool calls
- Example: "Find the latest sales report in Drive and email it to the marketing team"
  1. `gdrive.search_files` → finds file
  2. `gmail.send_message` → sends with attachment link

#### F3: Smart Context Awareness
- Remembers previous messages in session
- Resolves pronouns ("send *it* to John" → refers to last mentioned file)
- Suggests follow-up actions based on results

#### F4: Rich Response Rendering
- Markdown with syntax highlighting
- File lists with icons and direct links
- Email previews with metadata
- Form links with QR codes
- Tables for structured data
- Code blocks with copy button
- Image/chart previews

### 6.2 Session Management

| Feature | Description |
|---|---|
| **F5: Chat Sessions** | Create, rename, delete, switch between sessions |
| **F6: Session Persistence** | All sessions saved to localStorage (future: cloud sync) |
| **F7: Session Search** | Search across all session messages |
| **F8: Pin/Star Sessions** | Mark important sessions for quick access |
| **F9: Export Session** | Export chat as PDF/Markdown/JSON |

### 6.3 Integration Management

| Feature | Description |
|---|---|
| **F10: Server Dashboard** | Visual cards showing connected/disconnected servers |
| **F11: OAuth Flow** | One-click connect via OAuth 2.0 PKCE |
| **F12: Tool Discovery** | Browse available tools per server |
| **F13: Token Management** | Auto-refresh tokens, manual disconnect |
| **F14: Server Health** | Real-time status indicators |

### 6.4 User Experience

| Feature | Description |
|---|---|
| **F15: Onboarding Flow** | Guided setup: connect first service → first command |
| **F16: Quick Actions** | Pre-built prompt shortcuts for common tasks |
| **F17: Command Palette** | `/` commands for power users |
| **F18: Keyboard Shortcuts** | Navigate, send, switch sessions via keyboard |
| **F19: Dark/Light/System Theme** | Three theme modes with smooth transitions |
| **F20: Responsive Design** | Desktop, tablet, mobile layouts |

### 6.5 Advanced Features (v2.1+)

| Feature | Description |
|---|---|
| **F21: Workflows/Automations** | Save multi-step prompts as reusable workflows |
| **F22: Scheduled Tasks** | "Every Monday, email me a summary of new Drive files" |
| **F23: Team Workspaces** | Shared sessions with role-based access |
| **F24: Plugin Marketplace** | Community-built MCP server integrations |
| **F25: Voice Input** | Speech-to-text for hands-free operation |
| **F26: File Upload in Chat** | Drag-and-drop files to upload to connected services |
| **F27: Notification Center** | Alerts from connected services in real-time |
| **F28: Analytics Dashboard** | Usage stats, most-used tools, time saved |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Chat response < 500ms (UI), tool execution < 2s (P95) |
| **Scalability** | Support 10k concurrent users per instance |
| **Security** | OAuth 2.0 PKCE, encrypted tokens, no plaintext secrets |
| **Availability** | 99.9% uptime target |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Browser Support** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| **Mobile** | Responsive down to 320px width |
| **Offline** | Cached sessions viewable offline, queue commands |

---

## 8. Technical Architecture

```
                    ┌──────────────────────────┐
                    │     Neurix Frontend       │
                    │   React 19 + Vite + TW    │
                    │                            │
                    │  ┌─────────────────────┐   │
                    │  │   Chat Interface     │   │
                    │  │   (ChatContext)       │   │
                    │  └─────────┬───────────┘   │
                    │            │                │
                    │  ┌─────────▼───────────┐   │
                    │  │   MCP API Layer      │   │
                    │  │   (mcp-api.ts)       │   │
                    │  └─────────┬───────────┘   │
                    └────────────┼────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │    Frontend Server           │
                    │    Express + OpenAI Proxy    │
                    └────────────┬────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
   ┌──────────▼──┐   ┌──────────▼──┐   ┌───────────▼─┐
   │ GDrive MCP  │   │ GForms MCP  │   │  Gmail MCP  │
   │  :8080      │   │  :8081      │   │   :8082     │
   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
          │                  │                  │
   ┌──────▼──────────────────▼──────────────────▼──────┐
   │              Google APIs / External APIs           │
   └───────────────────────────────────────────────────┘
```

---

## 9. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Daily Active Users (DAU) | 1,000 in 3 months | Analytics |
| Avg. commands per session | > 8 | Session tracking |
| Tool execution success rate | > 95% | Server metrics |
| Onboarding completion rate | > 80% | Funnel analytics |
| Net Promoter Score (NPS) | > 50 | User surveys |
| Avg. session duration | > 10 min | Analytics |
| Integrations connected per user | > 3 | Server context |

---

## 10. Release Plan

| Phase | Timeline | Scope |
|---|---|---|
| **v1.0 (Current)** | Shipped | GDrive + GForms + Gmail + Chat UI |
| **v2.0** | +6 weeks | GitHub + Slack + Notion + Calendar + Multi-tool chaining |
| **v2.1** | +12 weeks | Sheets + Jira + Linear + Workflows + Scheduled Tasks |
| **v2.2** | +18 weeks | Figma + Airtable + MS365 + Team Workspaces |
| **v3.0** | +24 weeks | Plugin Marketplace + Voice + Analytics Dashboard |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OAuth token expiry during long sessions | Failed tool calls | Auto-refresh with retry logic |
| AI misidentifies user intent | Wrong tool executed | Confirmation step for destructive actions |
| Rate limiting by external APIs | Degraded experience | Circuit breaker + queue + user feedback |
| Data privacy concerns | User trust loss | Zero data storage on server, tokens in client |
| MCP server downtime | Feature unavailable | Health checks + graceful degradation + status UI |

---

## 12. Open Questions

1. Should we support custom/self-hosted MCP servers from users?
2. What is the monetization model — freemium, per-integration, or flat subscription?
3. Should sessions sync across devices via cloud storage?
4. Do we need an admin panel for team workspace management?
5. Should we support multiple AI providers (Anthropic Claude, Google Gemini) alongside OpenAI?

---

*End of PRD*
