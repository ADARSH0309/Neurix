/**
 * Google Calendar server types
 */

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  attendees?: EventAttendee[];
  recurrence?: string[];
  recurringEventId?: string;
  colorId?: string;
  reminders?: { useDefault?: boolean; overrides?: ReminderOverride[] };
  visibility?: string;
  transparency?: string;
  conferenceData?: any;
  hangoutLink?: string;
  attachments?: EventAttachment[];
}

export interface EventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
  optional?: boolean;
  comment?: string;
}

export interface ReminderOverride {
  method: 'email' | 'popup';
  minutes: number;
}

export interface EventAttachment {
  fileUrl?: string;
  title?: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
}

export interface CalendarListEntry {
  id: string;
  summary?: string;
  description?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface AclRule {
  id?: string;
  scope: { type: 'default' | 'user' | 'group' | 'domain'; value?: string };
  role: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

export interface FreeBusyResponse {
  calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
}

export interface CalendarColors {
  calendar: Record<string, { background: string; foreground: string }>;
  event: Record<string, { background: string; foreground: string }>;
}

// Parameter interfaces
export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  q?: string;
  orderBy?: string;
  singleEvents?: boolean;
  pageToken?: string;
  timeZone?: string;
  showDeleted?: boolean;
}

export interface CreateEventParams {
  calendarId?: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  startDate?: string;
  endDateTime?: string;
  endDate?: string;
  timeZone?: string;
  attendees?: string[];
  recurrence?: string[];
  reminders?: ReminderOverride[];
  colorId?: string;
  visibility?: string;
  conferenceData?: boolean;
  sendUpdates?: string;
}

export interface UpdateEventParams {
  calendarId?: string;
  eventId: string;
  summary?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  startDate?: string;
  endDateTime?: string;
  endDate?: string;
  timeZone?: string;
  attendees?: string[];
  recurrence?: string[];
  reminders?: ReminderOverride[];
  colorId?: string;
  visibility?: string;
  sendUpdates?: string;
}

export interface CreateCalendarParams {
  summary: string;
  description?: string;
  timeZone?: string;
}

export interface UpdateCalendarParams {
  calendarId: string;
  summary?: string;
  description?: string;
  timeZone?: string;
}

export interface FreeBusyParams {
  timeMin: string;
  timeMax: string;
  calendarIds?: string[];
  timeZone?: string;
}

export interface AclRuleParams {
  calendarId: string;
  role: string;
  scopeType: string;
  scopeValue?: string;
  sendNotifications?: boolean;
}
