import { describe, it, expect } from 'vitest';
import { formatFileSize, formatNumber, formatDuration, formatPercentage } from './format-utils';

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('formats fractional sizes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('formatNumber', () => {
  it('formats small numbers with locale', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats thousands', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('formats millions', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('formats exactly 1000', () => {
    expect(formatNumber(1000)).toBe('1.0K');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(3500)).toBe('3.5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('formats exactly 1 second', () => {
    expect(formatDuration(1000)).toBe('1.0s');
  });
});

describe('formatPercentage', () => {
  it('formats normal percentage', () => {
    expect(formatPercentage(50, 100)).toBe('50%');
  });

  it('handles zero total', () => {
    expect(formatPercentage(5, 0)).toBe('0%');
  });

  it('rounds to nearest integer', () => {
    expect(formatPercentage(1, 3)).toBe('33%');
  });

  it('formats 100%', () => {
    expect(formatPercentage(100, 100)).toBe('100%');
  });
});
