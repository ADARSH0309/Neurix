/**
 * PII Masking Utility (Phase 4.4)
 *
 * Masks sensitive information in logs to comply with data privacy regulations.
 * Masks: email addresses, bearer tokens, API keys, OAuth tokens, refresh tokens
 */

export interface MaskingOptions {
  maskEmail?: boolean;
  maskTokens?: boolean;
  maskApiKeys?: boolean;
  preserveDomain?: boolean;
}

const DEFAULT_OPTIONS: MaskingOptions = {
  maskEmail: true,
  maskTokens: true,
  maskApiKeys: true,
  preserveDomain: false,
};

/**
 * Masks an email address
 * user@example.com -> u***@example.com (preserveDomain: true)
 * user@example.com -> u***@***.com (preserveDomain: false)
 */
export function maskEmail(email: string, preserveDomain: boolean = false): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [localPart, domain] = parts;
  const maskedLocal = localPart.charAt(0) + '***';

  if (preserveDomain) {
    return `${maskedLocal}@${domain}`;
  }

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? '***.' + domainParts[domainParts.length - 1]
    : '***';

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masks bearer tokens
 * Bearer ey123456789... -> Bearer ey1***
 */
export function maskBearerToken(token: string): string {
  if (token.length <= 6) return '***';
  return token.substring(0, 3) + '***';
}

/**
 * Masks API keys and secrets
 * AIzaSy123456789... -> AIz***
 */
export function maskApiKey(key: string): string {
  if (key.length <= 6) return '***';
  return key.substring(0, 3) + '***';
}

/**
 * Masks sensitive data in an object recursively
 */
export function maskSensitiveData(
  data: any,
  options: MaskingOptions = DEFAULT_OPTIONS
): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    let masked = data;

    // Mask emails
    if (options.maskEmail) {
      masked = masked.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        (match) => maskEmail(match, options.preserveDomain)
      );
    }

    // Mask bearer tokens
    if (options.maskTokens) {
      masked = masked.replace(
        /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
        (match, token) => `Bearer ${maskBearerToken(token)}`
      );
    }

    // Mask authorization headers
    if (options.maskTokens) {
      masked = masked.replace(
        /authorization:\s*Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
        (match, token) => `authorization: Bearer ${maskBearerToken(token)}`
      );
    }

    // Mask API keys (common patterns)
    if (options.maskApiKeys) {
      masked = masked.replace(
        /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
        (match) => maskApiKey(match)
      );
      masked = masked.replace(
        /\b(sk_live_[0-9A-Za-z]{24,})\b/g,
        (match) => maskApiKey(match)
      );
      masked = masked.replace(
        /\b(access_token|refresh_token|client_secret)["']?\s*[:=]\s*["']?([A-Za-z0-9\-._~+/=]{10,})["']?/gi,
        (match, key, token) => `${key}: ${maskApiKey(token)}`
      );
    }

    return masked;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, options));
  }

  if (typeof data === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Mask specific fields by key name
      if (
        options.maskTokens &&
        /^(token|access_token|refresh_token|authorization|bearer|api_key|client_secret|password|secret)$/i.test(
          key
        )
      ) {
        masked[key] = typeof value === 'string' ? maskApiKey(value) : '***';
      } else if (options.maskEmail && /^(email|user_email|from|to|cc|bcc)$/i.test(key)) {
        masked[key] =
          typeof value === 'string'
            ? maskEmail(value, options.preserveDomain)
            : maskSensitiveData(value, options);
      } else {
        masked[key] = maskSensitiveData(value, options);
      }
    }
    return masked;
  }

  return data;
}

/**
 * Masks sensitive data in JSON strings
 */
export function maskJsonString(jsonString: string, options?: MaskingOptions): string {
  try {
    const parsed = JSON.parse(jsonString);
    const masked = maskSensitiveData(parsed, options);
    return JSON.stringify(masked);
  } catch {
    // If not valid JSON, mask as plain string
    return maskSensitiveData(jsonString, options);
  }
}
