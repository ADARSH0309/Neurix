/**
 * Service color constants for programmatic access
 */

export const SERVICE_COLORS = {
  gdrive: { primary: '#4285F4', accent: 'blue' },
  gforms: { primary: '#673AB7', accent: 'purple' },
  gmail: { primary: '#EA4335', accent: 'red' },
  gcalendar: { primary: '#0D9488', accent: 'teal' },
  gtask: { primary: '#D97706', accent: 'amber' },
  gsheets: { primary: '#0F9D58', accent: 'green' },
} as const;

export const BRAND_COLORS = {
  orange: '#F97316',
  purple: '#8B5CF6',
  darkBase: '#0F051D',
} as const;

export type ServiceId = keyof typeof SERVICE_COLORS;
