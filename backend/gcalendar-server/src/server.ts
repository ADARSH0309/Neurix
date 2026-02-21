/**
 * Google Calendar MCP Server
 */

import { NeurixBaseServer } from '@neurix/mcp-sdk';
import { GCalendarClient } from './gcalendar-client.js';
import { z } from 'zod';

// Validation schemas
const ListEventsSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
  maxResults: z.number().min(1).max(250).optional().default(25),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  singleEvents: z.boolean().optional().default(true),
  pageToken: z.string().optional(),
  timeZone: z.string().optional(),
  showDeleted: z.boolean().optional().default(false),
});

const GetEventSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  eventId: z.string(),
});

const CreateEventSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().optional(),
  startDate: z.string().optional(),
  endDateTime: z.string().optional(),
  endDate: z.string().optional(),
  timeZone: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recurrence: z.array(z.string()).optional(),
  reminders: z.array(z.object({ method: z.enum(['email', 'popup']), minutes: z.number() })).optional(),
  colorId: z.string().optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  conferenceData: z.boolean().optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
});

const QuickAddSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  text: z.string(),
});

const UpdateEventSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  eventId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().optional(),
  startDate: z.string().optional(),
  endDateTime: z.string().optional(),
  endDate: z.string().optional(),
  timeZone: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recurrence: z.array(z.string()).optional(),
  reminders: z.array(z.object({ method: z.enum(['email', 'popup']), minutes: z.number() })).optional(),
  colorId: z.string().optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
});

const DeleteEventSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  eventId: z.string(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
});

const MoveEventSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  eventId: z.string(),
  destinationCalendarId: z.string(),
});

const ListInstancesSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  eventId: z.string(),
  maxResults: z.number().min(1).max(250).optional().default(25),
});

const SearchEventsSchema = z.object({
  query: z.string(),
  calendarId: z.string().optional().default('primary'),
  maxResults: z.number().min(1).max(250).optional().default(25),
});

const CalendarIdSchema = z.object({
  calendarId: z.string(),
});

const CreateCalendarSchema = z.object({
  summary: z.string(),
  description: z.string().optional(),
  timeZone: z.string().optional(),
});

const UpdateCalendarSchema = z.object({
  calendarId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  timeZone: z.string().optional(),
});

const FreeBusySchema = z.object({
  timeMin: z.string(),
  timeMax: z.string(),
  calendarIds: z.array(z.string()).optional(),
  timeZone: z.string().optional(),
});

const AclRuleSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  role: z.enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner']),
  scopeType: z.enum(['default', 'user', 'group', 'domain']),
  scopeValue: z.string().optional(),
  sendNotifications: z.boolean().optional(),
});

const GetAclRuleSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  ruleId: z.string(),
});

const UpdateAclRuleSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  ruleId: z.string(),
  role: z.enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner']),
});

const DeleteAclRuleSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  ruleId: z.string(),
});

const SettingSchema = z.object({
  settingId: z.string(),
});

export class GCalendarServer extends NeurixBaseServer {
  private calendarClient: GCalendarClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    super({
      name: 'neurix-gcalendar-server',
      version: '0.1.0',
      description: 'Google Calendar MCP Server for managing calendars, events, and scheduling',
    });

    this.calendarClient = new GCalendarClient(clientId, clientSecret, redirectUri, tokenPath);
  }

  async initialize(): Promise<void> {
    await this.calendarClient.initialize();
    this.logger.info('Google Calendar client initialized successfully');
  }

  protected async listTools() {
    return [
      // ─── Calendar Management ─────────────────────────────────
      {
        name: 'list_calendars',
        description: 'List all calendars accessible by the user',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_calendar',
        description: 'Get details of a specific calendar',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (use "primary" for default)' },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'create_calendar',
        description: 'Create a new calendar',
        inputSchema: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: 'Calendar name/title' },
            description: { type: 'string', description: 'Calendar description (optional)' },
            timeZone: { type: 'string', description: 'Time zone (e.g., "America/New_York")' },
          },
          required: ['summary'],
        },
      },
      {
        name: 'update_calendar',
        description: 'Update calendar properties (name, description, timezone)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID' },
            summary: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
            timeZone: { type: 'string', description: 'New time zone' },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'delete_calendar',
        description: 'Delete a calendar (cannot delete the primary calendar)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID to delete' },
          },
          required: ['calendarId'],
        },
      },
      {
        name: 'clear_calendar',
        description: 'Clear all events from a calendar',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID to clear' },
          },
          required: ['calendarId'],
        },
      },

      // ─── Event Management ────────────────────────────────────
      {
        name: 'list_events',
        description: 'List upcoming events from a calendar. Defaults to showing future events from primary calendar.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            timeMin: { type: 'string', description: 'Start time filter in ISO 8601 format (default: now)' },
            timeMax: { type: 'string', description: 'End time filter in ISO 8601 format' },
            maxResults: { type: 'number', description: 'Maximum events to return (1-250, default: 25)' },
            q: { type: 'string', description: 'Free-text search query' },
            orderBy: { type: 'string', description: 'Sort order: "startTime" or "updated"' },
            singleEvents: { type: 'boolean', description: 'Expand recurring events (default: true)' },
            pageToken: { type: 'string', description: 'Token for pagination' },
            timeZone: { type: 'string', description: 'Time zone for response' },
            showDeleted: { type: 'boolean', description: 'Show deleted events (default: false)' },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get full details of a specific event',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            eventId: { type: 'string', description: 'Event ID' },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new calendar event. Use startDateTime/endDateTime for timed events (ISO 8601), or startDate/endDate for all-day events (YYYY-MM-DD). Set conferenceData=true to add a Google Meet link.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            summary: { type: 'string', description: 'Event title' },
            description: { type: 'string', description: 'Event description' },
            location: { type: 'string', description: 'Event location' },
            startDateTime: { type: 'string', description: 'Start time in ISO 8601 (e.g., "2024-01-15T09:00:00-05:00")' },
            startDate: { type: 'string', description: 'Start date for all-day event (YYYY-MM-DD)' },
            endDateTime: { type: 'string', description: 'End time in ISO 8601' },
            endDate: { type: 'string', description: 'End date for all-day event (YYYY-MM-DD)' },
            timeZone: { type: 'string', description: 'Time zone (e.g., "America/New_York")' },
            attendees: { type: 'array', items: { type: 'string' }, description: 'Array of attendee email addresses' },
            recurrence: { type: 'array', items: { type: 'string' }, description: 'RRULE strings for recurrence (e.g., ["RRULE:FREQ=WEEKLY;COUNT=10"])' },
            reminders: {
              type: 'array',
              items: {
                type: 'object' as const,
                properties: {
                  method: { type: 'string', enum: ['email', 'popup'] },
                  minutes: { type: 'number' },
                },
              },
              description: 'Custom reminders',
            },
            colorId: { type: 'string', description: 'Event color ID (1-11)' },
            visibility: { type: 'string', enum: ['default', 'public', 'private', 'confidential'], description: 'Event visibility' },
            conferenceData: { type: 'boolean', description: 'Create a Google Meet link (default: false)' },
            sendUpdates: { type: 'string', enum: ['all', 'externalOnly', 'none'], description: 'Who to notify (default: "none")' },
          },
          required: ['summary'],
        },
      },
      {
        name: 'quick_add_event',
        description: 'Quickly create an event from a natural language string (e.g., "Meeting with John tomorrow at 3pm")',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            text: { type: 'string', description: 'Natural language event description' },
          },
          required: ['text'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event. Only provided fields will be changed.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            eventId: { type: 'string', description: 'Event ID to update' },
            summary: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            location: { type: 'string', description: 'New location' },
            startDateTime: { type: 'string', description: 'New start time (ISO 8601)' },
            startDate: { type: 'string', description: 'New start date for all-day (YYYY-MM-DD)' },
            endDateTime: { type: 'string', description: 'New end time (ISO 8601)' },
            endDate: { type: 'string', description: 'New end date for all-day (YYYY-MM-DD)' },
            timeZone: { type: 'string', description: 'Time zone' },
            attendees: { type: 'array', items: { type: 'string' }, description: 'Replace attendees list (email addresses)' },
            colorId: { type: 'string', description: 'Event color ID' },
            visibility: { type: 'string', enum: ['default', 'public', 'private', 'confidential'] },
            sendUpdates: { type: 'string', enum: ['all', 'externalOnly', 'none'] },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            eventId: { type: 'string', description: 'Event ID to delete' },
            sendUpdates: { type: 'string', enum: ['all', 'externalOnly', 'none'], description: 'Who to notify' },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'move_event',
        description: 'Move an event from one calendar to another',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Source calendar ID (default: "primary")' },
            eventId: { type: 'string', description: 'Event ID to move' },
            destinationCalendarId: { type: 'string', description: 'Destination calendar ID' },
          },
          required: ['eventId', 'destinationCalendarId'],
        },
      },
      {
        name: 'list_event_instances',
        description: 'List all instances of a recurring event',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            eventId: { type: 'string', description: 'Recurring event ID' },
            maxResults: { type: 'number', description: 'Max instances to return (default: 25)' },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'search_events',
        description: 'Search events across a calendar by keyword',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search query' },
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            maxResults: { type: 'number', description: 'Max results (default: 25)' },
          },
          required: ['query'],
        },
      },

      // ─── Free/Busy ──────────────────────────────────────────
      {
        name: 'check_free_busy',
        description: 'Check free/busy status for one or more calendars in a time range',
        inputSchema: {
          type: 'object' as const,
          properties: {
            timeMin: { type: 'string', description: 'Start of time range (ISO 8601)' },
            timeMax: { type: 'string', description: 'End of time range (ISO 8601)' },
            calendarIds: { type: 'array', items: { type: 'string' }, description: 'Calendar IDs to check (default: ["primary"])' },
            timeZone: { type: 'string', description: 'Time zone' },
          },
          required: ['timeMin', 'timeMax'],
        },
      },

      // ─── Access Control (Sharing) ───────────────────────────
      {
        name: 'list_acl_rules',
        description: 'List all access control rules (sharing permissions) for a calendar',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
          },
        },
      },
      {
        name: 'get_acl_rule',
        description: 'Get a specific access control rule',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            ruleId: { type: 'string', description: 'ACL rule ID' },
          },
          required: ['ruleId'],
        },
      },
      {
        name: 'share_calendar',
        description: 'Share a calendar with a user, group, or domain',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            role: { type: 'string', enum: ['none', 'freeBusyReader', 'reader', 'writer', 'owner'], description: 'Permission role' },
            scopeType: { type: 'string', enum: ['default', 'user', 'group', 'domain'], description: 'Who to share with' },
            scopeValue: { type: 'string', description: 'Email address or domain name' },
            sendNotifications: { type: 'boolean', description: 'Send notification (default: true)' },
          },
          required: ['role', 'scopeType'],
        },
      },
      {
        name: 'update_acl_rule',
        description: 'Update the role of an existing access control rule',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            ruleId: { type: 'string', description: 'ACL rule ID' },
            role: { type: 'string', enum: ['none', 'freeBusyReader', 'reader', 'writer', 'owner'], description: 'New role' },
          },
          required: ['ruleId', 'role'],
        },
      },
      {
        name: 'unshare_calendar',
        description: 'Remove an access control rule (unshare)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
            ruleId: { type: 'string', description: 'ACL rule ID to remove' },
          },
          required: ['ruleId'],
        },
      },

      // ─── Colors ─────────────────────────────────────────────
      {
        name: 'get_colors',
        description: 'Get available calendar and event color definitions',
        inputSchema: { type: 'object' as const, properties: {} },
      },

      // ─── Settings ───────────────────────────────────────────
      {
        name: 'list_settings',
        description: 'List all user calendar settings',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_setting',
        description: 'Get a specific user calendar setting (e.g., "timezone", "dateFieldOrder", "locale")',
        inputSchema: {
          type: 'object' as const,
          properties: {
            settingId: { type: 'string', description: 'Setting ID (e.g., "timezone", "locale")' },
          },
          required: ['settingId'],
        },
      },
    ];
  }

  protected async callTool(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        // Calendar Management
        case 'list_calendars': {
          const calendars = await this.calendarClient.listCalendars();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ calendars }) }],
          };
        }
        case 'get_calendar': {
          const params = CalendarIdSchema.parse(args);
          const calendar = await this.calendarClient.getCalendar(params.calendarId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ calendar }) }],
          };
        }
        case 'create_calendar': {
          const params = CreateCalendarSchema.parse(args);
          const calendar = await this.calendarClient.createCalendar(params);
          return {
            content: [{ type: 'text' as const, text: `Calendar created!\n\nID: ${calendar.id}\nName: ${calendar.summary}` }],
          };
        }
        case 'update_calendar': {
          const params = UpdateCalendarSchema.parse(args);
          const calendar = await this.calendarClient.updateCalendar(params);
          return {
            content: [{ type: 'text' as const, text: `Calendar updated!\n\nID: ${calendar.id}\nName: ${calendar.summary}` }],
          };
        }
        case 'delete_calendar': {
          const params = CalendarIdSchema.parse(args);
          await this.calendarClient.deleteCalendar(params.calendarId);
          return {
            content: [{ type: 'text' as const, text: 'Calendar deleted successfully' }],
          };
        }
        case 'clear_calendar': {
          const params = CalendarIdSchema.parse(args);
          await this.calendarClient.clearCalendar(params.calendarId);
          return {
            content: [{ type: 'text' as const, text: 'All events cleared from calendar' }],
          };
        }

        // Event Management
        case 'list_events': {
          const params = ListEventsSchema.parse(args);
          const result = await this.calendarClient.listEvents(params);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ events: result.events, nextPageToken: result.nextPageToken }) }],
          };
        }
        case 'get_event': {
          const params = GetEventSchema.parse(args);
          const event = await this.calendarClient.getEvent(params.calendarId, params.eventId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ event }) }],
          };
        }
        case 'create_event': {
          const params = CreateEventSchema.parse(args);
          const event = await this.calendarClient.createEvent(params);
          const meetLink = event.hangoutLink ? `\nGoogle Meet: ${event.hangoutLink}` : '';
          return {
            content: [{
              type: 'text' as const,
              text: `Event created!\n\nID: ${event.id}\nTitle: ${event.summary}\nStart: ${event.start?.dateTime || event.start?.date}\nEnd: ${event.end?.dateTime || event.end?.date}\nLink: ${event.htmlLink}${meetLink}`,
            }],
          };
        }
        case 'quick_add_event': {
          const params = QuickAddSchema.parse(args);
          const event = await this.calendarClient.quickAddEvent(params.calendarId, params.text);
          return {
            content: [{
              type: 'text' as const,
              text: `Event created!\n\nID: ${event.id}\nTitle: ${event.summary}\nStart: ${event.start?.dateTime || event.start?.date}\nLink: ${event.htmlLink}`,
            }],
          };
        }
        case 'update_event': {
          const params = UpdateEventSchema.parse(args);
          const event = await this.calendarClient.updateEvent(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Event updated!\n\nID: ${event.id}\nTitle: ${event.summary}\nStart: ${event.start?.dateTime || event.start?.date}\nEnd: ${event.end?.dateTime || event.end?.date}`,
            }],
          };
        }
        case 'delete_event': {
          const params = DeleteEventSchema.parse(args);
          await this.calendarClient.deleteEvent(params.calendarId, params.eventId, params.sendUpdates);
          return {
            content: [{ type: 'text' as const, text: 'Event deleted successfully' }],
          };
        }
        case 'move_event': {
          const params = MoveEventSchema.parse(args);
          const event = await this.calendarClient.moveEvent(params.calendarId, params.eventId, params.destinationCalendarId);
          return {
            content: [{ type: 'text' as const, text: `Event moved!\n\nID: ${event.id}\nTitle: ${event.summary}\nNew Calendar: ${params.destinationCalendarId}` }],
          };
        }
        case 'list_event_instances': {
          const params = ListInstancesSchema.parse(args);
          const instances = await this.calendarClient.listEventInstances(params.calendarId, params.eventId, params.maxResults);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ instances, count: instances.length }) }],
          };
        }
        case 'search_events': {
          const params = SearchEventsSchema.parse(args);
          const events = await this.calendarClient.searchEvents(params.query, params.calendarId, params.maxResults);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ query: params.query, events, count: events.length }) }],
          };
        }

        // Free/Busy
        case 'check_free_busy': {
          const params = FreeBusySchema.parse(args);
          const result = await this.calendarClient.checkFreeBusy(params);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          };
        }

        // ACL
        case 'list_acl_rules': {
          const calendarId = (args.calendarId as string) || 'primary';
          const rules = await this.calendarClient.listAclRules(calendarId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ rules }) }],
          };
        }
        case 'get_acl_rule': {
          const params = GetAclRuleSchema.parse(args);
          const rule = await this.calendarClient.getAclRule(params.calendarId, params.ruleId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ rule }) }],
          };
        }
        case 'share_calendar': {
          const params = AclRuleSchema.parse(args);
          const rule = await this.calendarClient.createAclRule(params);
          return {
            content: [{ type: 'text' as const, text: `Calendar shared!\n\nRule ID: ${rule.id}\nRole: ${rule.role}\nScope: ${rule.scope?.type} - ${rule.scope?.value || 'default'}` }],
          };
        }
        case 'update_acl_rule': {
          const params = UpdateAclRuleSchema.parse(args);
          const rule = await this.calendarClient.updateAclRule(params.calendarId, params.ruleId, params.role);
          return {
            content: [{ type: 'text' as const, text: `ACL rule updated!\n\nRule ID: ${rule.id}\nNew Role: ${rule.role}` }],
          };
        }
        case 'unshare_calendar': {
          const params = DeleteAclRuleSchema.parse(args);
          await this.calendarClient.deleteAclRule(params.calendarId, params.ruleId);
          return {
            content: [{ type: 'text' as const, text: 'Calendar sharing removed successfully' }],
          };
        }

        // Colors
        case 'get_colors': {
          const colors = await this.calendarClient.getColors();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(colors) }],
          };
        }

        // Settings
        case 'list_settings': {
          const settings = await this.calendarClient.listSettings();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ settings }) }],
          };
        }
        case 'get_setting': {
          const params = SettingSchema.parse(args);
          const setting = await this.calendarClient.getSetting(params.settingId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ setting }) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error calling tool ${name}`, error as Error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  protected async listResources() {
    try {
      const calendars = await this.calendarClient.listCalendars();
      return calendars.map((cal) => ({
        uri: `gcalendar://calendar/${cal.id}`,
        name: cal.summary || cal.id,
        description: `Calendar: ${cal.summary}${cal.primary ? ' (Primary)' : ''}`,
        mimeType: 'application/json',
      }));
    } catch {
      return [];
    }
  }

  protected async readResource(uri: string) {
    const calMatch = uri.match(/^gcalendar:\/\/calendar\/(.+)$/);
    if (calMatch) {
      const calendarId = calMatch[1];
      const result = await this.calendarClient.listEvents({ calendarId, maxResults: 50 });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result.events, null, 2),
        }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  protected async listPrompts() {
    return [
      {
        name: 'schedule_meeting',
        description: 'Help schedule a meeting with participants',
        arguments: [
          { name: 'topic', description: 'Meeting topic/title', required: true },
          { name: 'participants', description: 'Comma-separated email addresses', required: false },
          { name: 'duration', description: 'Duration (e.g., "1 hour")', required: false },
        ],
      },
      {
        name: 'daily_agenda',
        description: 'Get a formatted daily agenda',
        arguments: [
          { name: 'date', description: 'Date in YYYY-MM-DD format (default: today)', required: false },
        ],
      },
      {
        name: 'weekly_summary',
        description: 'Get a weekly calendar summary',
        arguments: [],
      },
    ];
  }

  protected async getPrompt(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'schedule_meeting': {
        const topic = args.topic as string || 'Meeting';
        const participants = args.participants as string || '';
        const duration = args.duration as string || '1 hour';
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please help me schedule a meeting:\n\nTopic: ${topic}\nParticipants: ${participants || 'TBD'}\nDuration: ${duration}\n\nPlease:\n1. Check my calendar for available slots\n2. Suggest optimal times\n3. Create the event with a Google Meet link`,
            },
          }],
        };
      }
      case 'daily_agenda': {
        const date = args.date as string || new Date().toISOString().split('T')[0];
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please show me my agenda for ${date}. List all events with times, locations, and attendees in a clear format.`,
            },
          }],
        };
      }
      case 'weekly_summary': {
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please provide a summary of my calendar for this week. Include:\n1. Total number of events\n2. Time spent in meetings\n3. Free time blocks\n4. Key meetings and deadlines`,
            },
          }],
        };
      }
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
