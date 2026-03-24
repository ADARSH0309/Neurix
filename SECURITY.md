# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Neurix, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns directly to the maintainers.

## Security Practices

- OAuth tokens are encrypted at rest (AES-256-GCM) in Redis
- Session fixation prevention via session regeneration
- CSRF protection on state-changing endpoints
- Rate limiting on all API endpoints
- Input validation via Zod schemas
- PII masking in logs
- Helmet.js security headers
- No secrets committed to version control
