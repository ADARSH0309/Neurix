/**
 * HTML Sanitization Utility
 *
 * Provides server-side HTML sanitization using DOMPurify to prevent XSS attacks.
 * Uses isomorphic-dompurify which automatically handles both browser and Node.js environments.
 *
 * Phase 5.2 - CRITICAL Security Item #2: XSS Protection with DOMPurify
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * This function removes all potentially dangerous HTML/JavaScript:
 * - <script> tags
 * - Event handlers (onclick, onerror, etc.)
 * - javascript: URLs
 * - Data URIs in certain contexts
 * - Any other XSS vectors
 *
 * @param dirty - The potentially unsafe HTML string
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  // Default safe configuration
  const defaultConfig: DOMPurify.Config = {
    // Allow only safe HTML tags
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'code', 'pre', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    // Allow only safe attributes
    ALLOWED_ATTR: ['href', 'title', 'class', 'id'],
    // Allow only http(s) links
    ALLOWED_URI_REGEXP: /^https?:/,
    // Keep content of removed tags
    KEEP_CONTENT: true,
    // Return a string
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };

  const config = { ...defaultConfig, ...options };

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Escape HTML entities for safe display in HTML context
 *
 * This is a simpler alternative to full sanitization when you just need
 * to display text content safely without allowing any HTML.
 *
 * @param text - The text to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * Sanitize and render a safe HTML error page
 *
 * Creates a complete HTML document with sanitized content.
 * Use this for OAuth callbacks and other user-facing error pages.
 *
 * @param title - Page title (will be escaped)
 * @param heading - Main heading (will be escaped)
 * @param message - Message to display (will be escaped)
 * @param additionalInfo - Optional additional HTML content (will be sanitized)
 * @returns Complete HTML document string
 */
export function renderSafeErrorPage(
  title: string,
  heading: string,
  message: string,
  additionalInfo?: string
): string {
  // Escape all user-provided text
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);

  // Sanitize any additional HTML (if provided)
  const safeAdditionalInfo = additionalInfo
    ? sanitizeHtml(additionalInfo)
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${safeTitle}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #dc2626;
            margin-bottom: 20px;
          }
          p {
            color: #6b7280;
            line-height: 1.6;
          }
          .info {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: left;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
          }
          a:hover {
            background: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${safeHeading}</h1>
          <p>${safeMessage}</p>
          ${safeAdditionalInfo ? `<div class="info">${safeAdditionalInfo}</div>` : ''}
          <a href="/auth/login">Try Again</a>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sanitize and render a safe HTML success page
 *
 * Creates a complete HTML document with sanitized content.
 * Use this for OAuth success pages.
 *
 * @param title - Page title (will be escaped)
 * @param heading - Main heading (will be escaped)
 * @param message - Message to display (will be escaped)
 * @param details - Optional details object with key-value pairs (all will be escaped)
 * @returns Complete HTML document string
 */
export function renderSafeSuccessPage(
  title: string,
  heading: string,
  message: string,
  details?: Record<string, string>
): string {
  // Escape all user-provided text
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);

  // Build details HTML with escaped values
  let detailsHtml = '';
  if (details) {
    const detailsItems = Object.entries(details)
      .map(([key, value]) => {
        const safeKey = escapeHtml(key);
        const safeValue = escapeHtml(value);
        return `
          <dt>${safeKey}:</dt>
          <dd>${safeValue}</dd>
        `;
      })
      .join('');

    detailsHtml = `
      <div class="info">
        <dl>
          ${detailsItems}
        </dl>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${safeTitle}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .success {
            color: #22c55e;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #059669;
            margin-bottom: 20px;
          }
          p {
            color: #6b7280;
            line-height: 1.6;
          }
          .info {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
          }
          dl {
            margin: 0;
          }
          dt {
            font-weight: 600;
            margin-top: 10px;
            color: #374151;
          }
          dd {
            margin-left: 0;
            color: #6b7280;
            font-family: 'Courier New', monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>${safeHeading}</h1>
          <p>${safeMessage}</p>
          ${detailsHtml}
        </div>
      </body>
    </html>
  `;
}
