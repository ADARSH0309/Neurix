/**
 * HTML Sanitization Utility
 *
 * Provides server-side HTML sanitization using DOMPurify to prevent XSS attacks.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  const defaultConfig: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'code', 'pre', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class', 'id'],
    ALLOWED_URI_REGEXP: /^https?:/,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };

  const config = { ...defaultConfig, ...options };

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Escape HTML entities for safe display
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
 * Render a safe HTML error page
 */
export function renderSafeErrorPage(
  title: string,
  heading: string,
  message: string,
  additionalInfo?: string
): string {
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeAdditionalInfo = additionalInfo ? sanitizeHtml(additionalInfo) : '';

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
 * Render a safe HTML success page
 */
export function renderSafeSuccessPage(
  title: string,
  heading: string,
  message: string,
  details?: Record<string, string>
): string {
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);

  let detailsHtml = '';
  if (details) {
    const detailsItems = Object.entries(details)
      .map(([key, value]) => {
        const safeKey = escapeHtml(key);
        const safeValue = escapeHtml(value);
        return `<dt>${safeKey}:</dt><dd>${safeValue}</dd>`;
      })
      .join('');

    detailsHtml = `<div class="info"><dl>${detailsItems}</dl></div>`;
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
          dl { margin: 0; }
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
          <div class="success">&#x2705;</div>
          <h1>${safeHeading}</h1>
          <p>${safeMessage}</p>
          ${detailsHtml}
        </div>
      </body>
    </html>
  `;
}
