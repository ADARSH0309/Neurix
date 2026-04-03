/**
 * Google Calendar API client wrapper
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';
import type {
  CalendarEvent,
  CalendarListEntry,
  AclRule,
  FreeBusyResponse,
  CalendarColors,
  ListEventsParams,
  CreateEventParams,
  UpdateEventParams,
  CreateCalendarParams,
  UpdateCalendarParams,
  FreeBusyParams,
  AclRuleParams,
} from './types.js';

type OAuth2Client = Auth.OAuth2Client;

export class GCalendarClient {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenPath: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  async initialize(): Promise<void> {
    try {
      const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);

      this.oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          try {
            const existingTokens = JSON.parse(await fs.readFile(this.tokenPath, 'utf-8'));
            const updatedTokens = { ...existingTokens, ...tokens };
            await fs.writeFile(this.tokenPath, JSON.stringify(updatedTokens, null, 2));
          } catch (error) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'error',
              message: 'Failed to persist refreshed OAuth tokens',
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        }
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    } catch (error) {
      throw new Error(
        `Failed to load Calendar credentials. Please run OAuth setup first. Error: ${error}`
      );
    }
  }

  setCredentials(tokens: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  }): void {
    this.oauth2Client.setCredentials(tokens);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // ─── Calendar List ───────────────────────────────────────────

  async listCalendars(): Promise<CalendarListEntry[]> {
    const response = await this.calendar.calendarList.list({
      minAccessRole: 'reader',
    });
    return response.data.items || [];
  }

  async getCalendar(calendarId: string): Promise<CalendarListEntry> {
    const response = await this.calendar.calendarList.get({ calendarId });
    return response.data;
  }

  async createCalendar(params: CreateCalendarParams): Promise<CalendarListEntry> {
    const response = await this.calendar.calendars.insert({
      requestBody: {
        summary: params.summary,
        description: params.description,
        timeZone: params.timeZone,
      },
    });
    return response.data;
  }

  async updateCalendar(params: UpdateCalendarParams): Promise<CalendarListEntry> {
    const requestBody: any = {};
    if (params.summary) requestBody.summary = params.summary;
    if (params.description !== undefined) requestBody.description = params.description;
    if (params.timeZone) requestBody.timeZone = params.timeZone;

    const response = await this.calendar.calendars.patch({
      calendarId: params.calendarId,
      requestBody,
    });
    return response.data;
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.calendar.calendars.delete({ calendarId });
  }

  async clearCalendar(calendarId: string): Promise<void> {
    await this.calendar.calendars.clear({ calendarId });
  }

  // ─── Events ──────────────────────────────────────────────────

  async listEvents(params: ListEventsParams = {}): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    const calendarId = params.calendarId || 'primary';
    const now = new Date().toISOString();

    // Default timeMax to 30 days from now to prevent recurring events (birthdays etc.)
    // from expanding infinitely into the future
    const defaultTimeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.calendar.events.list({
      calendarId,
      timeMin: params.timeMin || now,
      timeMax: params.timeMax || defaultTimeMax,
      maxResults: params.maxResults || 25,
      singleEvents: params.singleEvents !== false,
      orderBy: params.orderBy || 'startTime',
      q: params.q,
      pageToken: params.pageToken,
      timeZone: params.timeZone,
      showDeleted: params.showDeleted || false,
    });

    return {
      events: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const response = await this.calendar.events.get({
      calendarId: calendarId || 'primary',
      eventId,
    });
    return response.data;
  }

  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    const calendarId = params.calendarId || 'primary';

    const event: any = {
      summary: params.summary,
      description: params.description,
      location: params.location,
    };

    // Set start time
    if (params.startDateTime) {
      event.start = { dateTime: params.startDateTime, timeZone: params.timeZone };
    } else if (params.startDate) {
      event.start = { date: params.startDate };
    }

    // Set end time
    if (params.endDateTime) {
      event.end = { dateTime: params.endDateTime, timeZone: params.timeZone };
    } else if (params.endDate) {
      event.end = { date: params.endDate };
    }

    // Attendees
    if (params.attendees && params.attendees.length > 0) {
      event.attendees = params.attendees.map(email => ({ email }));
    }

    // Recurrence
    if (params.recurrence) {
      event.recurrence = params.recurrence;
    }

    // Reminders
    if (params.reminders && params.reminders.length > 0) {
      event.reminders = { useDefault: false, overrides: params.reminders };
    }

    // Color
    if (params.colorId) {
      event.colorId = params.colorId;
    }

    // Visibility
    if (params.visibility) {
      event.visibility = params.visibility;
    }

    // Conference (Google Meet)
    if (params.conferenceData) {
      event.conferenceData = {
        createRequest: {
          requestId: `neurix-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const requestParams: any = {
      calendarId,
      requestBody: event,
      sendUpdates: params.sendUpdates || 'none',
    };

    if (params.conferenceData) {
      requestParams.conferenceDataVersion = 1;
    }

    const response = await this.calendar.events.insert(requestParams);
    return response.data;
  }

  async quickAddEvent(calendarId: string, text: string): Promise<CalendarEvent> {
    const response = await this.calendar.events.quickAdd({
      calendarId: calendarId || 'primary',
      text,
    });
    return response.data;
  }

  async updateEvent(params: UpdateEventParams): Promise<CalendarEvent> {
    const calendarId = params.calendarId || 'primary';

    // First get the existing event
    const existing = await this.getEvent(calendarId, params.eventId);
    const event: any = { ...existing };

    if (params.summary !== undefined) event.summary = params.summary;
    if (params.description !== undefined) event.description = params.description;
    if (params.location !== undefined) event.location = params.location;

    if (params.startDateTime) {
      event.start = { dateTime: params.startDateTime, timeZone: params.timeZone || existing.start?.timeZone };
    } else if (params.startDate) {
      event.start = { date: params.startDate };
    }

    if (params.endDateTime) {
      event.end = { dateTime: params.endDateTime, timeZone: params.timeZone || existing.end?.timeZone };
    } else if (params.endDate) {
      event.end = { date: params.endDate };
    }

    if (params.attendees) {
      event.attendees = params.attendees.map(email => ({ email }));
    }

    if (params.recurrence) {
      event.recurrence = params.recurrence;
    }

    if (params.reminders && params.reminders.length > 0) {
      event.reminders = { useDefault: false, overrides: params.reminders };
    }

    if (params.colorId) event.colorId = params.colorId;
    if (params.visibility) event.visibility = params.visibility;

    const response = await this.calendar.events.update({
      calendarId,
      eventId: params.eventId,
      requestBody: event,
      sendUpdates: params.sendUpdates || 'none',
    });
    return response.data;
  }

  async deleteEvent(calendarId: string, eventId: string, sendUpdates: string = 'none'): Promise<void> {
    await this.calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId,
      sendUpdates,
    });
  }

  async moveEvent(calendarId: string, eventId: string, destinationCalendarId: string): Promise<CalendarEvent> {
    const response = await this.calendar.events.move({
      calendarId: calendarId || 'primary',
      eventId,
      destination: destinationCalendarId,
    });
    return response.data;
  }

  async listEventInstances(calendarId: string, eventId: string, maxResults: number = 25): Promise<CalendarEvent[]> {
    const response = await this.calendar.events.instances({
      calendarId: calendarId || 'primary',
      eventId,
      maxResults,
    });
    return response.data.items || [];
  }

  async searchEvents(query: string, calendarId?: string, maxResults: number = 25): Promise<CalendarEvent[]> {
    const result = await this.listEvents({
      calendarId: calendarId || 'primary',
      q: query,
      maxResults,
      timeMin: undefined, // Search past events too
    });
    return result.events;
  }

  // ─── Free/Busy ───────────────────────────────────────────────

  async checkFreeBusy(params: FreeBusyParams): Promise<FreeBusyResponse> {
    const calendarIds = params.calendarIds || ['primary'];

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        timeZone: params.timeZone,
        items: calendarIds.map(id => ({ id })),
      },
    });

    return { calendars: response.data.calendars || {} };
  }

  // ─── ACL (Access Control) ────────────────────────────────────

  async listAclRules(calendarId: string): Promise<AclRule[]> {
    const response = await this.calendar.acl.list({
      calendarId: calendarId || 'primary',
    });
    return response.data.items || [];
  }

  async getAclRule(calendarId: string, ruleId: string): Promise<AclRule> {
    const response = await this.calendar.acl.get({
      calendarId: calendarId || 'primary',
      ruleId,
    });
    return response.data;
  }

  async createAclRule(params: AclRuleParams): Promise<AclRule> {
    const response = await this.calendar.acl.insert({
      calendarId: params.calendarId || 'primary',
      requestBody: {
        role: params.role,
        scope: {
          type: params.scopeType,
          value: params.scopeValue,
        },
      },
      sendNotifications: params.sendNotifications !== false,
    });
    return response.data;
  }

  async updateAclRule(calendarId: string, ruleId: string, role: string): Promise<AclRule> {
    // First get the existing rule
    const existing = await this.getAclRule(calendarId, ruleId);
    const response = await this.calendar.acl.update({
      calendarId: calendarId || 'primary',
      ruleId,
      requestBody: {
        ...existing,
        role,
      },
    });
    return response.data;
  }

  async deleteAclRule(calendarId: string, ruleId: string): Promise<void> {
    await this.calendar.acl.delete({
      calendarId: calendarId || 'primary',
      ruleId,
    });
  }

  // ─── Colors ──────────────────────────────────────────────────

  async getColors(): Promise<CalendarColors> {
    const response = await this.calendar.colors.get();
    return response.data;
  }

  // ─── Settings ────────────────────────────────────────────────

  async listSettings(): Promise<any[]> {
    const response = await this.calendar.settings.list();
    return response.data.items || [];
  }

  async getSetting(settingId: string): Promise<any> {
    const response = await this.calendar.settings.get({ setting: settingId });
    return response.data;
  }
}
