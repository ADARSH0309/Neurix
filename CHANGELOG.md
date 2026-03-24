# Changelog

## [Unreleased]

### Added
- Google Sheets MCP server with 27 tools (port 8085)
- Frontend integration for Google Sheets service
- Sheet data formatters (tables, tabs, permissions)
- Architecture documentation
- Contributing guidelines
- Security policy

### Fixed
- Fixed `g-calender` typo in gcalendar-server callback URI
- Fixed unsafe `any` types in ServerContext error handling

### Changed
- Updated package keywords for all integrated services
- Added engine constraints for Node.js 20+ and pnpm 9+

## [1.0.0] - 2026-03-24

### Added
- Initial release with 6 MCP servers
- Google Drive, Forms, Gmail, Calendar, Tasks, Sheets
- React + Vite frontend with Tailwind CSS
- Groq LLM integration (llama-3.3-70b-versatile)
- OAuth 2.1 with PKCE authentication
- Redis session management
- SSE and Streamable HTTP transport
- Prometheus metrics and health checks
- GDPR compliance endpoints
