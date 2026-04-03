import { describe, it, expect } from 'vitest';
import { truncate, capitalize, pluralize, slugify, stripMarkdown } from './string-utils';

describe('truncate', () => {
  it('returns string as-is when shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns string as-is when equal to max', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis when longer', () => {
    expect(truncate('hello world', 6)).toBe('hello\u2026');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles single character', () => {
    expect(capitalize('h')).toBe('H');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('leaves already capitalized string', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('pluralize', () => {
  it('returns singular for count 1', () => {
    expect(pluralize(1, 'file')).toBe('file');
  });

  it('adds s for count > 1', () => {
    expect(pluralize(5, 'file')).toBe('files');
  });

  it('adds s for count 0', () => {
    expect(pluralize(0, 'file')).toBe('files');
  });

  it('uses custom plural form', () => {
    expect(pluralize(3, 'person', 'people')).toBe('people');
  });
});

describe('slugify', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('stripMarkdown', () => {
  it('removes markdown formatting', () => {
    expect(stripMarkdown('**bold** and *italic*')).toBe('bold and italic');
  });

  it('collapses multiple newlines', () => {
    expect(stripMarkdown('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims whitespace', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
  });
});
