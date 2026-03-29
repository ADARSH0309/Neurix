import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidUrl, isNonEmpty, sanitizeInput } from './validation';

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts http url', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts https url', () => {
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('isNonEmpty', () => {
  it('returns false for null', () => {
    expect(isNonEmpty(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNonEmpty(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isNonEmpty('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isNonEmpty('   ')).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(isNonEmpty('hello')).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(isNonEmpty([])).toBe(false);
  });

  it('returns true for non-empty array', () => {
    expect(isNonEmpty([1])).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(isNonEmpty({})).toBe(false);
  });

  it('returns true for non-empty object', () => {
    expect(isNonEmpty({ a: 1 })).toBe(true);
  });

  it('returns true for numbers', () => {
    expect(isNonEmpty(0)).toBe(true);
    expect(isNonEmpty(42)).toBe(true);
  });
});

describe('sanitizeInput', () => {
  it('escapes HTML angle brackets', () => {
    expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes quotes', () => {
    expect(sanitizeInput('"hello" & \'world\'')).toBe('&quot;hello&quot; & &#x27;world&#x27;');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('handles clean input unchanged', () => {
    expect(sanitizeInput('hello world')).toBe('hello world');
  });
});
