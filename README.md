<div align="center">

# 🚀 Neurix

### **AI-Powered MCP Workstation**

*A unified, intelligent workspace to control your entire Google ecosystem using natural language.*

---

Neurix is a next-generation AI chat interface built on **Model Context Protocol (MCP)** that seamlessly integrates with Google services like Drive, Gmail, Calendar, Forms, Tasks, and Sheets — enabling you to manage everything through simple conversational commands.

---

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-Protocol-FF5500)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## ✨ Key Highlights

- 💬 **Conversational AI Interface** — Control all services using natural language  
- 🔌 **Multi-Service Integration** — One interface for all Google tools  
- 🧠 **Smart Command Routing** — Automatically detects and routes requests  
- 🔐 **Secure OAuth 2.0 (PKCE)** — Safe authentication with token refresh  
- ⚡ **Real-Time Interaction** — Powered by SSE & persistent sessions  
- 🧩 **Modular MCP Architecture** — Easily extendable microservices  
- 📊 **Observability Built-in** — Metrics, logging, and fault tolerance  

---

## 🔥 Features

### 📁 Google Drive
- Search, upload, organize, and share files  
- Manage folders with ease  

### 📧 Gmail
- Send, reply, search emails  
- Manage drafts and labels  

### 📅 Google Calendar
- Create and manage events  
- Check availability in real-time  

### 📝 Google Forms
- Build surveys dynamically  
- Analyze responses instantly  

### ✅ Google Tasks
- Create and manage task lists  
- Mark, update, or delete tasks  

### 📊 Google Sheets
- Read/write spreadsheet data  
- Automate cell operations  

---

## 🧱 Tech Stack

| Layer | Technology |
|------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, ShadCN UI, Framer Motion |
| **Backend** | Node.js, Express, TypeScript, JSON-RPC 2.0 |
| **Protocol** | Model Context Protocol (MCP) |
| **Sessions** | Redis (Encrypted Token Storage) |
| **Authentication** | Google OAuth 2.0 (PKCE Flow) |
| **Observability** | Prometheus, Logging, Circuit Breakers |
| **Deployment** | Docker, Docker Compose |
| **Architecture** | pnpm Monorepo |

---

## 🗂️ Project Structure

```bash
Neurix/
├── backend/
│   ├── gdrive-server/
│   ├── gforms-server/
│   ├── gmail-server/
│   ├── gcalendar-server/
│   ├── gtask-server/
│   ├── gsheets-server/
│   └── shared/mcp-sdk/
│
├── frontend/
│   ├── client/
│   └── server/
│
└── pnpm-workspace.yaml
⚙️ Installation & Setup
✅ Prerequisites
Node.js 20+
pnpm
Google Cloud Project (OAuth Credentials)
🚀 Setup Steps
# Clone repository
git clone https://github.com/your-username/neurix.git
cd neurix

# Install dependencies
pnpm install
🔐 Configure Environment
Copy .env.example inside each backend service
Add your Google OAuth credentials
▶️ Run Backend Services
pnpm dev:gdrive       # localhost:8080
pnpm dev:gforms       # localhost:8081
pnpm dev:gmail        # localhost:8082
pnpm dev:gcalendar    # localhost:8083
pnpm dev:gtask        # localhost:8084
pnpm dev:gsheets      # localhost:8085
🌐 Run Frontend
cd frontend/client
pnpm dev
# App → http://localhost:9000
⚡ How It Works
🔗 Connect to MCP servers (Drive, Gmail, etc.)
🔐 Authenticate using Google OAuth
💬 Enter commands in natural language
🧠 Neurix routes request automatically
📊 Results displayed in real-time chat UI
🧪 Example Commands
Service	Example
📁 Drive	Show my recent files
📧 Gmail	Send email to john@example.com
📅 Calendar	Create meeting at 5 PM tomorrow
📝 Forms	Create feedback form
✅ Tasks	Add task Buy groceries
📊 Sheets	Read A1:D10 from Budget sheet
🧩 Architecture Overview
Each Google service runs as an independent MCP server
Communication via JSON-RPC 2.0
Uses Server-Sent Events (SSE) for real-time responses
Central chat UI orchestrates all services
Redis manages session and tokens securely
📈 Future Enhancements
🤖 AI Auto-Suggestions & Smart Replies
🔄 Workflow Automation (multi-step tasks)
🌍 Third-party integrations (Slack, Notion, etc.)
📱 Mobile-first UI optimization
🧠 Personalized AI assistant layer
🤝 Contributing

Contributions are welcome!

# Fork the repo
# Create a new branch
git checkout -b feature/your-feature

# Commit changes
git commit -m "Add your feature"

# Push and create PR
git push origin feature/your-feature
📄 License

This project is licensed under the MIT License

<div align="center">
⭐ If you like this project, give it a star!

Built with ❤️ using React, Node.js & MCP

</div> ```