# Neurix - Frontend & Chat Interface Design Document

**Version:** 2.0
**Date:** February 12, 2026
**Status:** Draft

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Information Architecture](#2-information-architecture)
3. [Page-by-Page Design Specs](#3-page-by-page-design-specs)
4. [Chat Interface Deep Dive](#4-chat-interface-deep-dive)
5. [Component Library](#5-component-library)
6. [Design System & Tokens](#6-design-system--tokens)
7. [Layout System](#7-layout-system)
8. [Animation & Motion](#8-animation--motion)
9. [Responsive Design](#9-responsive-design)
10. [Accessibility](#10-accessibility)
11. [State Architecture](#11-state-architecture)
12. [Technical Implementation](#12-technical-implementation)

---

## 1. Design Philosophy

### 1.1 Core Principles

| Principle | Description |
|---|---|
| **Chat-First** | Every interaction starts and ends in the chat. The chat IS the product. |
| **Progressive Disclosure** | Show complexity only when needed. Simple by default, powerful on demand. |
| **Zero Learning Curve** | If you can type, you can use Neurix. No manuals needed. |
| **Dark-Native** | Designed for dark mode first (knowledge workers prefer it), with full light mode support. |
| **Ambient Intelligence** | The UI should feel alive — subtle animations, real-time status, smart suggestions. |

### 1.2 Design DNA

```
Neurix = Terminal Efficiency + Chat Simplicity + Dashboard Intelligence
```

- **From terminals:** Keyboard-first, fast, no unnecessary clicks
- **From chat apps:** Familiar message bubbles, session threads, real-time feel
- **From dashboards:** Status indicators, tool panels, at-a-glance system health

### 1.3 Visual Identity

| Element | Specification |
|---|---|
| **Primary Brand Color** | Electric Purple `#a855f7` (purple-500) |
| **Secondary** | Mint Green `#34d399` (for success/connected states) |
| **Background (Dark)** | Obsidian `#0a0a0f` with subtle grid texture |
| **Background (Light)** | `#fafafa` with soft shadows |
| **Typography** | Inter (UI) + JetBrains Mono (code/monospace) |
| **Border Radius** | 12px (cards), 8px (inputs), 999px (pills) |
| **Elevation** | Glass-morphism with `backdrop-blur` + subtle borders |

---

## 2. Information Architecture

### 2.1 Sitemap

```
Neurix
│
├── Landing Page (/)
│   ├── Hero Section
│   ├── Integration Showcase
│   ├── Feature Highlights
│   ├── How It Works
│   └── CTA → Enter App
│
├── App Shell (/app)
│   ├── Navigation Dock (Left Rail)
│   │   ├── Home / New Chat
│   │   ├── Integrations
│   │   ├── Workflows
│   │   ├── Settings
│   │   └── Profile
│   │
│   ├── Sidebar (Collapsible Left Panel)
│   │   ├── Search Sessions
│   │   ├── Pinned Sessions
│   │   ├── Recent Sessions
│   │   ├── Session Groups (by date)
│   │   └── New Session Button
│   │
│   ├── Main Content (Center)
│   │   ├── Empty State (no session) → Quick Actions
│   │   ├── Chat Stage (active session)
│   │   │   ├── Message Thread
│   │   │   ├── Typing Indicator
│   │   │   ├── Rich Responses
│   │   │   └── Scroll-to-bottom FAB
│   │   └── Command Input (bottom-pinned)
│   │       ├── Text Area (auto-expand)
│   │       ├── Attachment Button
│   │       ├── Voice Input Button
│   │       └── Send Button
│   │
│   └── Tools HUD (Right Panel, Collapsible)
│       ├── Connected Servers
│       ├── Available Tools List
│       ├── Server Health Indicators
│       └── Quick Connect Buttons
│
├── Settings Dialog (Modal)
│   ├── General (Theme, Language)
│   ├── Integrations (Connected Apps)
│   ├── Notifications
│   ├── Data & Privacy
│   └── About
│
└── Profile Dialog (Modal)
    ├── Avatar & Name
    ├── Usage Stats
    └── Sign Out
```

### 2.2 Navigation Model

```
┌────┬──────────────────────────────────────────────────┬────────┐
│    │                                                   │        │
│ N  │              Sidebar              Main Chat        │ Tools  │
│ A  │                                                   │  HUD   │
│ V  │  ┌─────────┐  ┌──────────────────────────────┐   │        │
│    │  │ Search   │  │                              │   │ Server │
│ D  │  ├─────────┤  │     Chat Messages             │   │ Cards  │
│ O  │  │ Pinned  │  │                              │   │        │
│ C  │  ├─────────┤  │     ┌─────────────────┐      │   │ Tools  │
│ K  │  │ Recent  │  │     │ User Message    │      │   │ List   │
│    │  │ Session │  │     └─────────────────┘      │   │        │
│    │  │ Session │  │     ┌─────────────────┐      │   │ Health │
│ 48 │  │ Session │  │     │ AI Response     │      │   │ Status │
│ px │  │         │  │     │ (Rich Markdown) │      │   │        │
│    │  │ 260px   │  │     └─────────────────┘      │   │ 300px  │
│    │  │         │  │                              │   │        │
│    │  │         │  ├──────────────────────────────┤   │        │
│    │  │         │  │ [📎] [  Type a message... ] [➤]│   │        │
│    │  └─────────┘  └──────────────────────────────┘   │        │
│    │                                                   │        │
└────┴──────────────────────────────────────────────────┴────────┘
```

---

## 3. Page-by-Page Design Specs

### 3.1 Landing Page

**Purpose:** First impression. Communicate what Neurix does and drive users into the app.

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  [Logo] Neurix                    Features  Pricing  Login │  ← Sticky Nav
├────────────────────────────────────────────────────────────┤
│                                                            │
│              One Chat. Every Tool.                         │  ← Hero
│     The AI-powered workspace that connects all             │
│           your apps through conversation.                  │
│                                                            │
│        [ Get Started Free ]  [ Watch Demo ]                │
│                                                            │
│     ┌──────────────────────────────────────┐               │
│     │      Animated Chat Interface          │               │  ← Live Preview
│     │      showing real tool execution      │               │
│     └──────────────────────────────────────┘               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              Integrations Grid                             │  ← Integration Logos
│   [GDrive] [Gmail] [Forms] [GitHub] [Slack] [Notion]      │
│   [Calendar] [Sheets] [Jira] [Linear] [Figma] [+15]      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│   │  Connect   │  │   Chat     │  │   Done     │          │  ← How It Works
│   │  Your Apps │→ │   with AI  │→ │   in Secs  │          │
│   └────────────┘  └────────────┘  └────────────┘          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   Feature Cards (Bento Grid Layout):                       │
│   ┌──────────────────┬───────────┐                         │
│   │ Multi-Tool       │ Smart     │                         │  ← Features
│   │ Chaining         │ Context   │                         │
│   ├──────────┬───────┴───────────┤                         │
│   │ Rich     │ 25+ Integrations  │                         │
│   │ Responses│                   │                         │
│   └──────────┴───────────────────┘                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│          Ready to 10x your productivity?                   │  ← Final CTA
│              [ Start Free → ]                              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Neurix  │  Product │ Company │ Legal │ Social            │  ← Footer
└────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Hero text uses `AuroraText` animated gradient
- Integration logos animate in with staggered `AnimatedList`
- Chat preview shows auto-typing demo with real responses
- Scroll-triggered animations using `framer-motion` `whileInView`
- Background uses grid SVG + subtle animated gradient orbs

### 3.2 App Shell (Main Application)

**Purpose:** The workspace. Everything happens here.

**Spec:**
```
┌──────────────────────────────────────────────────────────────┐
│  Header: [≡] Neurix  │ Session Title │ [🔍] [⚙] [👤]       │  48px
├────┬───────────┬──────────────────────────────┬──────────────┤
│    │           │                              │              │
│ 48 │  260px    │        Fluid Center          │    300px     │
│ px │  Sidebar  │        Chat Stage            │  Tools HUD   │
│    │           │                              │              │
│ N  │ Collaps-  │                              │  Collaps-    │
│ A  │ ible      │                              │  ible        │
│ V  │           │                              │              │
│    │           │                              │              │
│ D  │           │                              │              │
│ O  │           │                              │              │
│ C  │           ├──────────────────────────────┤              │
│ K  │           │  Command Input Bar           │              │
│    │           │  [📎] [🎤] [ input... ] [➤]  │              │
├────┴───────────┴──────────────────────────────┴──────────────┤
│                      Status Bar (optional)                    │  24px
└──────────────────────────────────────────────────────────────┘
```

**Panel Behavior:**
| Panel | Default | Toggle | Mobile |
|---|---|---|---|
| Nav Dock | Visible (icon-only) | Expand on hover | Bottom tab bar |
| Sidebar | Visible (260px) | Click `≡` to collapse | Full-screen overlay |
| Tools HUD | Visible (300px) | Click toggle or auto-hide | Full-screen overlay |

### 3.3 Empty State / Welcome Screen

**When:** No active session, or first visit after connecting a server.

```
┌──────────────────────────────────────────────┐
│                                              │
│          ✦ Welcome to Neurix                 │
│                                              │
│    What would you like to do today?          │
│                                              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ 📁 Browse     │  │ 📧 Send an   │          │
│  │    my files   │  │    email     │          │
│  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ 📝 Create a   │  │ 🔍 Search    │          │
│  │    form       │  │    across    │          │
│  └──────────────┘  └──────────────┘          │
│                                              │
│  ┌──────────────────────────────────┐        │
│  │  Try: "List my recent Drive files"│        │
│  └──────────────────────────────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

Quick action cards are contextual — they show tools from **connected** servers only.

### 3.4 Settings Dialog

**Layout:** Modal overlay with left tab navigation.

```
┌──────────────────────────────────────────┐
│  Settings                           [✕]  │
├──────────┬───────────────────────────────┤
│          │                               │
│ General  │  Theme                        │
│ ─────────│  ○ Light  ● Dark  ○ System    │
│ Integra- │                               │
│  tions   │  Language                     │
│ ─────────│  [English           ▼]        │
│ Privacy  │                               │
│ ─────────│  Chat Font Size               │
│ About    │  [──●──────────] 14px         │
│          │                               │
│          │  Message Density              │
│          │  ○ Compact  ● Default  ○ Cozy │
│          │                               │
│          │  [ Reset All Data ]           │
│          │                               │
└──────────┴───────────────────────────────┘
```

### 3.5 Integrations Page (within Settings or standalone)

```
┌──────────────────────────────────────────────────────┐
│  Integrations                                        │
│                                                      │
│  Connected (3)                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ 🟢 Google    │ │ 🟢 Google    │ │ 🟢 Gmail     │ │
│  │    Drive     │ │    Forms     │ │              │ │
│  │ 12 tools     │ │ 5 tools      │ │ 6 tools      │ │
│  │ [Disconnect] │ │ [Disconnect] │ │ [Disconnect] │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                      │
│  Available (22)                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ ⚪ GitHub    │ │ ⚪ Slack     │ │ ⚪ Notion    │ │
│  │              │ │              │ │              │ │
│  │ [Connect]    │ │ [Connect]    │ │ [Connect]    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ ⚪ Calendar  │ │ ⚪ Sheets   │ │ ⚪ Jira      │ │
│  │              │ │              │ │              │ │
│  │ [Connect]    │ │ [Connect]    │ │ [Connect]    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 4. Chat Interface Deep Dive

### 4.1 Message Types & Rendering

The chat supports multiple message types, each with distinct visual treatment:

#### 4.1.1 User Message

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                          ┌─────────────────────┐ │
│                          │ Find all my PDFs in  │ │
│                          │ Drive from last week │ │
│                          └─────────────────────┘ │
│                                       12:34 PM   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Aligned right
- Background: `purple-500/20` (dark) / `purple-100` (light)
- Border-radius: `12px 12px 2px 12px`
- Max-width: 70% of chat area
- Font: 14px Inter, line-height 1.6
- Timestamp: muted text below message

#### 4.1.2 AI Text Response

```
┌──────────────────────────────────────────────────┐
│                                                  │
│ ┌─────────────────────────────────────────┐      │
│ │ ✦ Neurix                                │      │
│ │                                         │      │
│ │ I found 3 PDF files from last week:     │      │
│ │                                         │      │
│ │  📄 Q1-Report.pdf         Modified 2/8  │      │
│ │  📄 Invoice-Feb.pdf       Modified 2/7  │      │
│ │  📄 Meeting-Notes.pdf     Modified 2/6  │      │
│ │                                         │      │
│ │ Would you like me to open any of these? │      │
│ └─────────────────────────────────────────┘      │
│  12:34 PM  │  📋 Copy  │  🔄 Retry              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Aligned left
- Background: `white/5` (dark) / `white` (light)
- Border: `1px solid white/10`
- Neurix branding icon + name at top
- Markdown rendered with `react-markdown`
- Action buttons below: Copy, Retry, Bookmark

#### 4.1.3 Tool Execution Response

```
┌──────────────────────────────────────────────────┐
│                                                  │
│ ┌─────────────────────────────────────────┐      │
│ │ ✦ Neurix                                │      │
│ │                                         │      │
│ │ ┌─────────────────────────────────────┐ │      │
│ │ │ 🔧 Executing: gdrive.search_files   │ │      │
│ │ │ ────────────────────────────────     │ │      │
│ │ │ Query: mimeType='application/pdf'   │ │      │
│ │ │ Status: ✅ Success (340ms)           │ │      │
│ │ └─────────────────────────────────────┘ │      │
│ │                                         │      │
│ │ Found 3 files:                          │      │
│ │                                         │      │
│ │  📄 Q1-Report.pdf    [Open ↗]          │      │
│ │  📄 Invoice-Feb.pdf  [Open ↗]          │      │
│ │  📄 Meeting-Notes.pdf [Open ↗]         │      │
│ └─────────────────────────────────────────┘      │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Tool execution card: collapsible, shows tool name + params + status
- Muted background for the execution card (`black/20`)
- Green checkmark for success, red for failure
- Execution time badge
- Results rendered as rich content below

#### 4.1.4 Error Response

```
┌──────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐      │
│ │ ⚠️ Could not execute tool                │      │
│ │                                         │      │
│ │ Google Drive is not connected.          │      │
│ │                                         │      │
│ │ [ Connect Google Drive ]  [ Dismiss ]   │      │
│ └─────────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Red/amber accent border-left
- Actionable: includes fix button (connect, retry, etc.)
- Dismissible

#### 4.1.5 System Message

```
┌──────────────────────────────────────────────────┐
│              ─── Session Started ───              │
│           February 12, 2026 • 2:30 PM            │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Centered, muted text
- Used for: session start, server connect/disconnect, date separators

#### 4.1.6 Multi-Tool Chain Response

```
┌──────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐      │
│ │ ✦ Neurix — Workflow (2 steps)           │      │
│ │                                         │      │
│ │ Step 1/2 ━━━━━━━━━━━━━━━━━━━━━ ✅      │      │
│ │ 🔧 gdrive.search_files                  │      │
│ │ → Found: Q1-Report.pdf                  │      │
│ │                                         │      │
│ │ Step 2/2 ━━━━━━━━━━━━━━━━━━━━━ ✅      │      │
│ │ 📧 gmail.send_message                   │      │
│ │ → Sent to marketing@acme.com            │      │
│ │                                         │      │
│ │ ✅ Workflow complete! Found the Q1       │      │
│ │ report and emailed it to the marketing  │      │
│ │ team.                                   │      │
│ └─────────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

### 4.2 Command Input Bar

The input is the most critical interactive element.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [📎] [🎤]  ┌─────────────────────────────────────┐  [➤]    │
│             │ Ask Neurix anything...               │         │
│             │                                      │         │
│             └─────────────────────────────────────┘         │
│                                                              │
│  GDrive ● Gmail ● Forms ●                    ⌘+Enter to send│
└──────────────────────────────────────────────────────────────┘
```

**Specs:**

| Property | Value |
|---|---|
| Min height | 48px (single line) |
| Max height | 200px (auto-expand) |
| Font | 14px Inter |
| Placeholder | "Ask Neurix anything..." |
| Send shortcut | `Enter` (single line), `Cmd/Ctrl+Enter` (multiline) |
| Background | `white/5` (dark), `gray-50` (light) |
| Border | `1px solid white/10`, focus: `purple-500` |
| Attachment | Opens file picker (future: drag-drop) |
| Voice | Speech-to-text (future feature) |
| Status dots | Show connected servers as colored dots |

**Input States:**
1. **Empty** — Placeholder visible, send button disabled (muted)
2. **Typing** — Send button active (purple glow)
3. **Loading** — Input disabled, pulsing border animation
4. **Error** — Red border flash, then return to normal

**Slash Commands:**
```
/help          — Show available commands
/connect       — Open integration picker
/clear         — Clear current session
/export        — Export session as markdown
/settings      — Open settings
/new           — Start new session
```

When user types `/`, show a command palette dropdown above input.

### 4.3 Typing Indicator

```
┌──────────────────────────────────┐
│ ✦ Neurix is thinking...          │
│    ● ● ●                         │
└──────────────────────────────────┘
```

- Three dots with staggered bounce animation
- Appears after user sends message
- Replaced by actual response when ready
- For tool execution, shows: "Executing gdrive.search_files..."

### 4.4 Chat Stage Behavior

| Behavior | Implementation |
|---|---|
| **Auto-scroll** | Scroll to bottom on new message; pause if user scrolled up |
| **Scroll-to-bottom FAB** | Floating button appears when scrolled up, badge shows unread count |
| **Message grouping** | Consecutive messages from same sender grouped (no repeated avatar) |
| **Date separators** | "Today", "Yesterday", "Feb 10, 2026" between day boundaries |
| **Loading skeleton** | Animated placeholder while AI responds |
| **Infinite scroll** | Load older messages on scroll-up (from localStorage) |
| **Selection** | Click message to select; bulk actions (copy, delete, bookmark) |
| **Hover actions** | Copy, Reply, Bookmark icons appear on message hover |

### 4.5 Suggestion Chips

After certain responses, show contextual follow-up suggestions:

```
┌──────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐      │
│ │ Found 3 PDF files in your Drive.        │      │
│ └─────────────────────────────────────────┘      │
│                                                  │
│  [ Open first file ]  [ Email these ]  [ More ]  │  ← Suggestion Chips
│                                                  │
└──────────────────────────────────────────────────┘
```

- Max 3 chips per response
- Scroll horizontally on mobile
- Clicking a chip sends it as a new user message

---

## 5. Component Library

### 5.1 Existing Components (from codebase)

#### Shadcn/UI (already installed)
- `Button` — with variants: default, ghost, outline, destructive
- `Card` — CardHeader, CardContent, CardFooter
- `Dialog` — modal with overlay
- `Input` — form input
- `ScrollArea` — custom scrollbar
- `Separator` — horizontal divider
- `Sheet` — slide-in panel
- `Tabs` — tab navigation
- `Textarea` — multiline input
- `Tooltip` — hover tooltip

#### MagicUI (custom animated components)
- `AuroraText` — animated gradient text
- `AnimatedList` — staggered list animation
- `AnimatedBeam` — connecting line animation
- `BorderBeam` — animated border glow
- `BentoGrid` — masonry layout
- `GlowButton` / `GlowCard` — glow effects
- `Marquee` — scrolling text
- `Meteors` — particle effects
- `NumberTicker` — counting animation
- `PulsatingButton` — pulse CTA
- `RainbowButton` — rainbow gradient button

#### ReactBits (additional UI)
- `SplashCursor` — cursor trail effect

### 5.2 New Components Needed

| Component | Purpose | Priority |
|---|---|---|
| `ChatMessage` | Unified message renderer (user/ai/system/error) | P0 |
| `ToolExecutionCard` | Shows tool name, params, status, timing | P0 |
| `CommandPalette` | Slash-command dropdown | P0 |
| `SuggestionChips` | Follow-up action chips | P0 |
| `IntegrationCard` | Server card with connect/disconnect | P0 |
| `SessionListItem` | Sidebar session entry with actions | P0 |
| `WorkflowStepper` | Multi-tool chain progress UI | P1 |
| `FilePreview` | Rich file preview (Drive files) | P1 |
| `EmailPreview` | Email card with sender/subject/snippet | P1 |
| `FormPreview` | Form card with title/question count/link | P1 |
| `StatusBadge` | Server status indicator (green/yellow/red) | P1 |
| `KeyboardShortcutHint` | Shows shortcut in tooltips | P2 |
| `OnboardingTour` | Step-by-step overlay guide | P2 |
| `NotificationToast` | Enhanced toast with actions | P2 |

---

## 6. Design System & Tokens

### 6.1 Color Palette

```css
/* Brand */
--brand-primary:    #a855f7;   /* Electric Purple */
--brand-secondary:  #34d399;   /* Mint Green */
--brand-accent:     #60a5fa;   /* Sky Blue */

/* Backgrounds (Dark Theme) */
--bg-base:          #0a0a0f;   /* Obsidian */
--bg-surface:       #111118;   /* Elevated surface */
--bg-raised:        #1a1a24;   /* Cards, panels */
--bg-overlay:       #252530;   /* Dropdowns, tooltips */
--bg-hover:         rgba(255, 255, 255, 0.05);
--bg-active:        rgba(255, 255, 255, 0.10);

/* Backgrounds (Light Theme) */
--bg-base-light:    #fafafa;
--bg-surface-light: #ffffff;
--bg-raised-light:  #f4f4f5;
--bg-overlay-light: #e4e4e7;

/* Text (Dark) */
--text-primary:     #f4f4f5;   /* White-ish */
--text-secondary:   #a1a1aa;   /* Muted */
--text-tertiary:    #52525b;   /* Very muted */
--text-accent:      #a855f7;   /* Purple links/highlights */

/* Status */
--status-success:   #34d399;
--status-warning:   #fbbf24;
--status-error:     #f87171;
--status-info:      #60a5fa;

/* Chat */
--chat-user-bg:     rgba(168, 85, 247, 0.15);
--chat-ai-bg:       rgba(255, 255, 255, 0.03);
--chat-system-bg:   transparent;
--chat-error-bg:    rgba(248, 113, 113, 0.10);
```

### 6.2 Typography Scale

| Token | Size | Weight | Use |
|---|---|---|---|
| `heading-xl` | 36px | 700 | Landing hero |
| `heading-lg` | 28px | 700 | Section titles |
| `heading-md` | 22px | 600 | Dialog titles |
| `heading-sm` | 18px | 600 | Card titles |
| `body-lg` | 16px | 400 | Important body text |
| `body-md` | 14px | 400 | Default body, chat messages |
| `body-sm` | 13px | 400 | Secondary info, timestamps |
| `caption` | 12px | 400 | Labels, badges |
| `code` | 13px | 400 | Code blocks (JetBrains Mono) |

### 6.3 Spacing Scale

```
4px  → xs    (tight gaps)
8px  → sm    (inline spacing)
12px → md    (standard gap)
16px → lg    (section padding)
24px → xl    (card padding)
32px → 2xl   (section gaps)
48px → 3xl   (major sections)
64px → 4xl   (page sections)
```

### 6.4 Shadow System

```css
/* Dark Mode - Use borders + glow instead of shadows */
--shadow-sm:    0 0 0 1px rgba(255,255,255,0.06);
--shadow-md:    0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4);
--shadow-lg:    0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6);
--shadow-glow:  0 0 20px rgba(168, 85, 247, 0.3);

/* Light Mode */
--shadow-sm-l:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md-l:  0 4px 12px rgba(0,0,0,0.08);
--shadow-lg-l:  0 8px 24px rgba(0,0,0,0.12);
```

### 6.5 Border Radius

```
--radius-sm:  6px    (buttons, badges)
--radius-md:  8px    (inputs, small cards)
--radius-lg:  12px   (cards, panels)
--radius-xl:  16px   (modals, large cards)
--radius-full: 999px (pills, avatars)
```

---

## 7. Layout System

### 7.1 Grid Specification

```
Desktop (>1280px):
[Nav 48px] [Sidebar 260px] [Chat fluid] [Tools 300px]

Large tablet (1024-1280px):
[Nav 48px] [Sidebar 220px] [Chat fluid] [Tools collapsed]

Tablet (768-1024px):
[Nav 48px] [Chat fluid] — Sidebar & Tools as overlays

Mobile (<768px):
[Chat fluid] — Nav as bottom tab bar, Sidebar & Tools as full overlays
```

### 7.2 Z-Index Hierarchy

```
1     Background grid/pattern
10    Main content (chat messages)
20    Sidebar panel
30    Tools HUD panel
40    Command input bar
50    Navigation dock
60    Dropdown menus, tooltips
70    Modals / Dialogs
80    Toast notifications
90    Splash cursor / overlays
100   Loading overlay
```

---

## 8. Animation & Motion

### 8.1 Principles

1. **Purposeful** — Every animation communicates state change
2. **Fast** — Never exceed 300ms for micro-interactions
3. **Consistent** — Same easing curve everywhere
4. **Reducible** — Respect `prefers-reduced-motion`

### 8.2 Motion Tokens

```css
/* Duration */
--duration-instant:  100ms   (hover, active states)
--duration-fast:     150ms   (toggles, badges)
--duration-normal:   200ms   (panels, cards)
--duration-slow:     300ms   (modals, page transitions)
--duration-glacial:  500ms   (complex animations, hero)

/* Easing */
--ease-default:   cubic-bezier(0.4, 0, 0.2, 1)    (standard)
--ease-in:        cubic-bezier(0.4, 0, 1, 1)       (exit)
--ease-out:       cubic-bezier(0, 0, 0.2, 1)       (enter)
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1) (bouncy)
```

### 8.3 Specific Animations

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Chat message enter | Fade up + slide from bottom 12px | 200ms | ease-out |
| User message enter | Fade + slide from right 12px | 200ms | ease-out |
| Typing indicator dots | Staggered bounce (0, 100ms, 200ms delay) | 600ms loop | ease-spring |
| Sidebar toggle | Width 260px ↔ 0px | 200ms | ease-default |
| Tools HUD toggle | Width 300px ↔ 0px | 200ms | ease-default |
| Modal enter | Fade + scale 0.95→1 | 200ms | ease-out |
| Modal exit | Fade + scale 1→0.95 | 150ms | ease-in |
| Toast enter | Slide from right | 300ms | ease-spring |
| Button hover | Scale 1→1.02, shadow grow | 100ms | ease-default |
| Server card connect | Border glow pulse (green) | 1000ms | ease-default |
| Tool execution | Progress bar sweep | variable | linear |
| Suggestion chips | Staggered fade-in (50ms delay each) | 200ms | ease-out |

---

## 9. Responsive Design

### 9.1 Breakpoints

| Name | Width | Layout Changes |
|---|---|---|
| `xs` | < 480px | Single column, stacked inputs |
| `sm` | 480-640px | Wider message bubbles |
| `md` | 640-768px | Tablet portrait |
| `lg` | 768-1024px | Tablet landscape, sidebar overlay |
| `xl` | 1024-1280px | Desktop, all panels visible |
| `2xl` | > 1280px | Wide desktop, generous spacing |

### 9.2 Mobile Adaptations

```
Mobile Layout (<768px):
┌──────────────────────────┐
│  Neurix     [☰]  [⚡]    │  ← Compact header
├──────────────────────────┤
│                          │
│   Chat Messages          │  ← Full width messages
│   (max-width: 90%)       │
│                          │
│                          │
│                          │
├──────────────────────────┤
│  [📎] [ Message... ] [➤] │  ← Sticky input
├──────────────────────────┤
│  [💬] [🔗] [⚙️] [👤]     │  ← Bottom tab bar
└──────────────────────────┘
```

- Messages use 90% max-width (vs 70% on desktop)
- Sidebar opens as full-screen slide-over from left
- Tools HUD opens as bottom sheet
- Quick actions become a horizontal scroll
- Long-press message for actions (vs hover on desktop)

---

## 10. Accessibility

### 10.1 Requirements (WCAG 2.1 AA)

| Area | Requirement |
|---|---|
| **Color Contrast** | Minimum 4.5:1 for body text, 3:1 for large text |
| **Focus Indicators** | Visible 2px purple outline on all focusable elements |
| **Keyboard Navigation** | Full app usable via keyboard only |
| **Screen Reader** | All interactive elements have ARIA labels |
| **Reduced Motion** | Disable animations when `prefers-reduced-motion: reduce` |
| **Font Scaling** | Support up to 200% browser zoom |

### 10.2 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus command input |
| `Escape` | Close modals/panels, unfocus input |
| `Ctrl+K` | Open command palette |
| `Ctrl+N` | New session |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+.` | Toggle tools HUD |
| `Ctrl+,` | Open settings |
| `Up/Down` | Navigate session list (when sidebar focused) |
| `Enter` | Send message (single line) |
| `Shift+Enter` | New line in input |
| `Ctrl+Enter` | Send message (always) |

### 10.3 ARIA Landmarks

```html
<nav aria-label="Main navigation">         <!-- Nav Dock -->
<aside aria-label="Chat sessions">          <!-- Sidebar -->
<main aria-label="Chat conversation">       <!-- Chat Stage -->
<aside aria-label="Connected tools">        <!-- Tools HUD -->
<form aria-label="Message input">           <!-- Command Input -->
<div role="log" aria-live="polite">         <!-- Message Thread -->
```

---

## 11. State Architecture

### 11.1 Context Provider Hierarchy

```
<UIProvider>              ← Theme, layout, dialogs, user profile
  <ServerProvider>        ← MCP servers, tools, OAuth tokens
    <ChatProvider>        ← Sessions, messages, send logic
      <App />
    </ChatProvider>
  </ServerProvider>
</UIProvider>
```

### 11.2 State Shape

```typescript
// UIContext
interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  toolsHudOpen: boolean;
  mobileMenuOpen: boolean;
  activeDialog: 'profile' | 'settings' | null;
  userProfile: { name: string; email: string; avatar: string };
  settings: { fontSize: number; density: string; notifications: boolean };
  activities: Activity[];
}

// ServerContext
interface ServerState {
  servers: Record<ServerId, {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    tools: Tool[];
    token: string | null;
    lastHealthCheck: Date;
  }>;
}

// ChatContext
interface ChatState {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
  server: ServerId | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  toolExecution?: {
    tool: string;
    server: string;
    params: Record<string, any>;
    status: 'pending' | 'success' | 'error';
    duration: number;
    result: any;
  };
  suggestions?: string[];
}
```

### 11.3 Data Flow

```
User Input
    │
    ▼
CommandInput.onSubmit()
    │
    ▼
ChatContext.sendMessage(text)
    │
    ├─► Add user message to session (optimistic)
    ├─► Set isLoading = true
    │
    ▼
ServerContext.executeTool() or OpenAI API
    │
    ├─► Match intent → select tool
    ├─► Extract params from natural language
    ├─► Execute via MCP JSON-RPC
    │
    ▼
Format Response
    │
    ├─► mcp-api.ts formatResponse()
    ├─► Markdown + rich embeds
    │
    ▼
ChatContext.addMessage(response)
    │
    ├─► Add AI message to session
    ├─► Set isLoading = false
    ├─► Persist to localStorage
    │
    ▼
ChatStage re-renders with new message
```

---

## 12. Technical Implementation

### 12.1 Tech Stack (Current)

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 3 |
| Components | Shadcn/UI + Radix |
| Animation | Framer Motion 12 |
| Markdown | react-markdown 10 |
| Icons | Lucide React |
| Toasts | Sonner |
| HTTP | Axios |
| Language | TypeScript 5 |

### 12.2 File Structure (Target)

```
frontend/client/src/
├── components/
│   ├── chat/
│   │   ├── ChatStage.tsx           # Main chat area
│   │   ├── ChatMessage.tsx         # Unified message component
│   │   ├── CommandInput.tsx        # Input bar
│   │   ├── TypingIndicator.tsx     # Dot animation
│   │   ├── SuggestionChips.tsx     # Follow-up suggestions
│   │   ├── ToolExecutionCard.tsx   # Tool call status card
│   │   ├── CommandPalette.tsx      # Slash command dropdown
│   │   ├── ScrollToBottom.tsx      # FAB button
│   │   ├── DateSeparator.tsx       # Day boundary marker
│   │   └── EmptyState.tsx          # No messages state
│   │
│   ├── layout/
│   │   ├── MainLayout.tsx          # Grid layout orchestrator
│   │   ├── BackgroundLayer.tsx     # Grid/gradient background
│   │   └── StatusBar.tsx           # Bottom status bar
│   │
│   ├── navigation/
│   │   ├── NavigationDock.tsx      # Left icon rail
│   │   ├── MobileTabBar.tsx        # Bottom tabs (mobile)
│   │   └── Header.tsx              # Top header bar
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx             # Session list panel
│   │   ├── SessionListItem.tsx     # Individual session row
│   │   ├── SessionSearch.tsx       # Search sessions
│   │   └── SessionActions.tsx      # Rename, delete, pin
│   │
│   ├── tools/
│   │   ├── ToolsHUD.tsx            # Right panel
│   │   ├── ServerCard.tsx          # Server status card
│   │   ├── ToolList.tsx            # Available tools list
│   │   └── ToolDetail.tsx          # Tool info popover
│   │
│   ├── integrations/
│   │   ├── IntegrationGrid.tsx     # All integrations view
│   │   ├── IntegrationCard.tsx     # Single integration card
│   │   ├── OAuthConnectButton.tsx  # Connect flow trigger
│   │   └── IntegrationDetail.tsx   # Tools & status detail
│   │
│   ├── settings/
│   │   ├── SettingsDialog.tsx      # Settings modal
│   │   ├── GeneralSettings.tsx     # Theme, font, density
│   │   ├── IntegrationSettings.tsx # Manage connections
│   │   └── PrivacySettings.tsx     # Data & privacy
│   │
│   ├── landing/
│   │   ├── LandingPage.tsx         # Marketing/onboarding page
│   │   ├── HeroSection.tsx         # Hero with CTA
│   │   ├── IntegrationShowcase.tsx # Logo grid
│   │   ├── FeatureGrid.tsx         # Bento feature cards
│   │   └── HowItWorks.tsx         # Step-by-step
│   │
│   ├── ui/                         # Shadcn components (existing)
│   ├── magicui/                    # Animated components (existing)
│   └── common/
│       ├── StatusBadge.tsx         # Colored status dot
│       ├── CopyButton.tsx         # Click-to-copy
│       └── EmptyPlaceholder.tsx   # Generic empty state
│
├── context/
│   ├── ChatContext.tsx
│   ├── ServerContext.tsx
│   └── UIContext.tsx
│
├── lib/
│   ├── mcp-api.ts                 # MCP communication
│   ├── server-utils.ts            # Server helpers
│   ├── utils.ts                   # General utilities
│   └── constants.ts               # App-wide constants
│
├── hooks/
│   ├── useKeyboardShortcuts.ts    # Global shortcuts
│   ├── useAutoScroll.ts           # Chat scroll behavior
│   ├── useMediaQuery.ts           # Responsive hooks
│   └── useLocalStorage.ts         # Typed localStorage
│
├── types/
│   └── index.ts                   # All TypeScript interfaces
│
├── App.tsx
└── main.tsx
```

### 12.3 Performance Targets

| Metric | Target | Strategy |
|---|---|---|
| First Contentful Paint | < 1.2s | Code splitting, lazy routes |
| Largest Contentful Paint | < 2.0s | Preload fonts, compress images |
| Time to Interactive | < 2.5s | Defer non-critical JS |
| Chat message render | < 16ms | Virtual list for 100+ messages |
| Bundle size (initial) | < 200KB gzip | Tree shaking, dynamic imports |

### 12.4 Key Implementation Notes

1. **Message Virtualization**: Use `react-window` or similar for sessions with 100+ messages to maintain scroll performance.

2. **Optimistic Updates**: User messages appear instantly; AI responses stream in when ready.

3. **Error Boundaries**: Each panel (sidebar, chat, tools) wrapped in error boundary to prevent full-app crashes.

4. **Service Worker** (future): Cache static assets + allow offline session viewing.

5. **Code Splitting**:
   ```typescript
   const LandingPage = lazy(() => import('./components/landing/LandingPage'));
   const SettingsDialog = lazy(() => import('./components/settings/SettingsDialog'));
   ```

6. **Theme Implementation**: CSS custom properties toggled via class on `<html>` element, managed by UIContext.

---

## Appendix A: Chat Message Component Spec

```typescript
interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isGrouped: boolean;    // same sender as previous
  onCopy: () => void;
  onRetry: () => void;
  onBookmark: () => void;
}

// Renders differently based on message.role:
// - 'user'      → right-aligned purple bubble
// - 'assistant' → left-aligned with Neurix branding
// - 'system'    → centered muted text
// - 'error'     → left-aligned with red accent
//
// If message.toolExecution exists, render ToolExecutionCard
// If message.suggestions exists, render SuggestionChips
```

## Appendix B: Integration Card Spec

```typescript
interface IntegrationCardProps {
  server: {
    id: string;
    name: string;
    icon: string;
    description: string;
    toolCount: number;
    status: 'connected' | 'disconnected' | 'error' | 'coming_soon';
    category: 'productivity' | 'communication' | 'dev_tools' | 'storage' | 'other';
  };
  onConnect: () => void;
  onDisconnect: () => void;
}
```

## Appendix C: Server List (Full)

| # | Name | ID | Icon | Category | Tools | Status |
|---|---|---|---|---|---|---|
| 1 | Google Drive | gdrive | google-drive | Storage | 5 | Live |
| 2 | Google Forms | gforms | google-forms | Productivity | 5 | Live |
| 3 | Gmail | gmail | gmail | Communication | 6 | Live |
| 4 | GitHub | github | github | Dev Tools | 8 | Planned |
| 5 | Slack | slack | slack | Communication | 6 | Planned |
| 6 | Notion | notion | notion | Productivity | 5 | Planned |
| 7 | Google Calendar | gcalendar | google-calendar | Scheduling | 5 | Planned |
| 8 | Google Sheets | gsheets | google-sheets | Data | 5 | Planned |
| 9 | Jira | jira | jira | Project Mgmt | 6 | Planned |
| 10 | Linear | linear | linear | Project Mgmt | 5 | Planned |
| 11 | Trello | trello | trello | Project Mgmt | 5 | Planned |
| 12 | Confluence | confluence | confluence | Documentation | 4 | Planned |
| 13 | Figma | figma | figma | Design | 4 | Planned |
| 14 | Airtable | airtable | airtable | Database | 4 | Planned |
| 15 | Dropbox | dropbox | dropbox | Storage | 5 | Planned |
| 16 | Microsoft 365 | ms365 | microsoft | Productivity | 5 | Planned |
| 17 | Zoom | zoom | zoom | Meetings | 3 | Planned |
| 18 | Stripe | stripe | stripe | Payments | 4 | Planned |
| 19 | Twilio | twilio | twilio | Communication | 3 | Planned |
| 20 | AWS S3 | aws-s3 | aws | Cloud Storage | 4 | Planned |
| 21 | Firebase | firebase | firebase | Backend | 4 | Planned |
| 22 | Vercel | vercel | vercel | Deployment | 4 | Planned |
| 23 | Supabase | supabase | supabase | Database | 5 | Planned |
| 24 | HubSpot | hubspot | hubspot | CRM | 4 | Planned |
| 25 | Zapier | zapier | zapier | Automation | 2 | Planned |

---

*End of Design Document*
