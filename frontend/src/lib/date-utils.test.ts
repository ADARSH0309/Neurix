import { describe, it, expect } from 'vitest';
import { isToday, isYesterday, formatRelativeDate, formatSmartDate } from './date-utils';

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday.toISOString())).toBe(false);
  });
});

describe('isYesterday', () => {
  it('returns true for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isYesterday(yesterday.toISOString())).toBe(true);
  });

  it('returns false for today', () => {
    expect(isYesterday(new Date().toISOString())).toBe(false);
  });
});

describe('formatRelativeDate', () => {
  it('returns "Just now" for recent timestamps', () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe('Just now');
  });

  it('returns minutes ago for recent past', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeDate(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeDate(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago for less than a week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeDate(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for older than a week', () => {
    const oldDate = new Date('2024-01-15T12:00:00Z').toISOString();
    const result = formatRelativeDate(oldDate);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatSmartDate', () => {
  it('starts with "Today" for today', () => {
    expect(formatSmartDate(new Date().toISOString())).toMatch(/^Today at/);
  });

  it('starts with "Yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatSmartDate(yesterday.toISOString())).toMatch(/^Yesterday at/);
  });
});
