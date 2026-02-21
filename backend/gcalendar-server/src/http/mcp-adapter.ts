/**
 * MCP HTTP Adapter for Google Calendar
 *
 * Implements JSON-RPC 2.0 protocol for HTTP transport
 */

import { GCalendarClient } from '../gcalendar-client.js';
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

export class McpHttpAdapter {
  private calendarClient: GCalendarClient;

  constructor(calendarClient: GCalendarClient) {
    this.calendarClient = calendarClient;
  }

  async initialize(): Promise<{ protocolVersion: string; capabilities: any; serverInfo: any }> {
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'neurix-gcalendar-server', version: '0.1.0' },
    };
  }

  async listTools(): Promise<{ tools: any[] }> {
    return {
      tools: [
        // Calendar Management
        { name: 'list_calendars', description: 'List all calendars accessible by the user', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_calendar', description: 'Get details of a specific calendar', inputSchema: { type: 'object', properties: { calendarId: { type: 'string', description: 'Calendar ID' } }, required: ['calendarId'] } },
        { name: 'create_calendar', description: 'Create a new calendar', inputSchema: { type: 'object', properties: { summary: { type: 'string', description: 'Calendar name' }, description: { type: 'string' }, timeZone: { type: 'string' } }, required: ['summary'] } },
        { name: 'update_calendar', description: 'Update calendar properties', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, timeZone: { type: 'string' } }, required: ['calendarId'] } },
        { name: 'delete_calendar', description: 'Delete a calendar', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' } }, required: ['calendarId'] } },
        { name: 'clear_calendar', description: 'Clear all events from a calendar', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' } }, required: ['calendarId'] } },

        // Event Management
        {
          name: 'list_events', description: 'List upcoming events from a calendar',
          inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, timeMin: { type: 'string' }, timeMax: { type: 'string' }, maxResults: { type: 'number' }, q: { type: 'string' }, orderBy: { type: 'string' }, singleEvents: { type: 'boolean' }, pageToken: { type: 'string' }, timeZone: { type: 'string' }, showDeleted: { type: 'boolean' } } },
        },
        { name: 'get_event', description: 'Get full details of a specific event', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, eventId: { type: 'string' } }, required: ['eventId'] } },
        {
          name: 'create_event', description: 'Create a new calendar event with optional Google Meet',
          inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, location: { type: 'string' }, startDateTime: { type: 'string' }, startDate: { type: 'string' }, endDateTime: { type: 'string' }, endDate: { type: 'string' }, timeZone: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, recurrence: { type: 'array', items: { type: 'string' } }, colorId: { type: 'string' }, visibility: { type: 'string' }, conferenceData: { type: 'boolean' }, sendUpdates: { type: 'string' } }, required: ['summary'] },
        },
        { name: 'quick_add_event', description: 'Quick add event from natural language', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, text: { type: 'string' } }, required: ['text'] } },
        {
          name: 'update_event', description: 'Update an existing event',
          inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, eventId: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, location: { type: 'string' }, startDateTime: { type: 'string' }, startDate: { type: 'string' }, endDateTime: { type: 'string' }, endDate: { type: 'string' }, timeZone: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, colorId: { type: 'string' }, visibility: { type: 'string' }, sendUpdates: { type: 'string' } }, required: ['eventId'] },
        },
        { name: 'delete_event', description: 'Delete a calendar event', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, eventId: { type: 'string' }, sendUpdates: { type: 'string' } }, required: ['eventId'] } },
        { name: 'move_event', description: 'Move event to another calendar', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, eventId: { type: 'string' }, destinationCalendarId: { type: 'string' } }, required: ['eventId', 'destinationCalendarId'] } },
        { name: 'list_event_instances', description: 'List instances of a recurring event', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, eventId: { type: 'string' }, maxResults: { type: 'number' } }, required: ['eventId'] } },
        { name: 'search_events', description: 'Search events by keyword', inputSchema: { type: 'object', properties: { query: { type: 'string' }, calendarId: { type: 'string' }, maxResults: { type: 'number' } }, required: ['query'] } },

        // Free/Busy
        { name: 'check_free_busy', description: 'Check free/busy status', inputSchema: { type: 'object', properties: { timeMin: { type: 'string' }, timeMax: { type: 'string' }, calendarIds: { type: 'array', items: { type: 'string' } }, timeZone: { type: 'string' } }, required: ['timeMin', 'timeMax'] } },

        // ACL
        { name: 'list_acl_rules', description: 'List calendar sharing rules', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' } } } },
        { name: 'get_acl_rule', description: 'Get a specific sharing rule', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, ruleId: { type: 'string' } }, required: ['ruleId'] } },
        { name: 'share_calendar', description: 'Share a calendar', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, role: { type: 'string' }, scopeType: { type: 'string' }, scopeValue: { type: 'string' }, sendNotifications: { type: 'boolean' } }, required: ['role', 'scopeType'] } },
        { name: 'update_acl_rule', description: 'Update sharing permission', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, ruleId: { type: 'string' }, role: { type: 'string' } }, required: ['ruleId', 'role'] } },
        { name: 'unshare_calendar', description: 'Remove sharing permission', inputSchema: { type: 'object', properties: { calendarId: { type: 'string' }, ruleId: { type: 'string' } }, required: ['ruleId'] } },

        // Colors & Settings
        { name: 'get_colors', description: 'Get available calendar/event colors', inputSchema: { type: 'object', properties: {} } },
        { name: 'list_settings', description: 'List user calendar settings', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_setting', description: 'Get a specific calendar setting', inputSchema: { type: 'object', properties: { settingId: { type: 'string' } }, required: ['settingId'] } },
      ],
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      switch (name) {
        case 'list_calendars': {
          const calendars = await this.calendarClient.listCalendars();
          return { content: [{ type: 'text', text: JSON.stringify({ calendars }) }] };
        }
        case 'get_calendar': {
          const params = CalendarIdSchema.parse(args);
          const calendar = await this.calendarClient.getCalendar(params.calendarId);
          return { content: [{ type: 'text', text: JSON.stringify({ calendar }) }] };
        }
        case 'create_calendar': {
          const params = CreateCalendarSchema.parse(args);
          const calendar = await this.calendarClient.createCalendar(params);
          return { content: [{ type: 'text', text: JSON.stringify({ calendar }) }] };
        }
        case 'update_calendar': {
          const params = UpdateCalendarSchema.parse(args);
          const calendar = await this.calendarClient.updateCalendar(params);
          return { content: [{ type: 'text', text: JSON.stringify({ calendar }) }] };
        }
        case 'delete_calendar': {
          const params = CalendarIdSchema.parse(args);
          await this.calendarClient.deleteCalendar(params.calendarId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted' }) }] };
        }
        case 'clear_calendar': {
          const params = CalendarIdSchema.parse(args);
          await this.calendarClient.clearCalendar(params.calendarId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'cleared' }) }] };
        }
        case 'list_events': {
          const params = ListEventsSchema.parse(args);
          const result = await this.calendarClient.listEvents(params);
          return { content: [{ type: 'text', text: JSON.stringify({ events: result.events, nextPageToken: result.nextPageToken }) }] };
        }
        case 'get_event': {
          const params = GetEventSchema.parse(args);
          const event = await this.calendarClient.getEvent(params.calendarId, params.eventId);
          return { content: [{ type: 'text', text: JSON.stringify({ event }) }] };
        }
        case 'create_event': {
          const params = CreateEventSchema.parse(args);
          const event = await this.calendarClient.createEvent(params);
          return { content: [{ type: 'text', text: JSON.stringify({ event }) }] };
        }
        case 'quick_add_event': {
          const params = QuickAddSchema.parse(args);
          const event = await this.calendarClient.quickAddEvent(params.calendarId, params.text);
          return { content: [{ type: 'text', text: JSON.stringify({ event }) }] };
        }
        case 'update_event': {
          const params = UpdateEventSchema.parse(args);
          const event = await this.calendarClient.updateEvent(params);
          return { content: [{ type: 'text', text: JSON.stringify({ event }) }] };
        }
        case 'delete_event': {
          const params = DeleteEventSchema.parse(args);
          await this.calendarClient.deleteEvent(params.calendarId, params.eventId, params.sendUpdates);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted' }) }] };
        }
        case 'move_event': {
          const params = MoveEventSchema.parse(args);
          const event = await this.calendarClient.moveEvent(params.calendarId, params.eventId, params.destinationCalendarId);
          return { content: [{ type: 'text', text: JSON.stringify({ event, action: 'moved' }) }] };
        }
        case 'list_event_instances': {
          const params = ListInstancesSchema.parse(args);
          const instances = await this.calendarClient.listEventInstances(params.calendarId, params.eventId, params.maxResults);
          return { content: [{ type: 'text', text: JSON.stringify({ instances }) }] };
        }
        case 'search_events': {
          const params = SearchEventsSchema.parse(args);
          const events = await this.calendarClient.searchEvents(params.query, params.calendarId, params.maxResults);
          return { content: [{ type: 'text', text: JSON.stringify({ query: params.query, events }) }] };
        }
        case 'check_free_busy': {
          const params = FreeBusySchema.parse(args);
          const result = await this.calendarClient.checkFreeBusy(params);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }
        case 'list_acl_rules': {
          const calendarId = (args.calendarId as string) || 'primary';
          const rules = await this.calendarClient.listAclRules(calendarId);
          return { content: [{ type: 'text', text: JSON.stringify({ rules }) }] };
        }
        case 'get_acl_rule': {
          const params = GetAclRuleSchema.parse(args);
          const rule = await this.calendarClient.getAclRule(params.calendarId, params.ruleId);
          return { content: [{ type: 'text', text: JSON.stringify({ rule }) }] };
        }
        case 'share_calendar': {
          const params = AclRuleSchema.parse(args);
          const rule = await this.calendarClient.createAclRule(params);
          return { content: [{ type: 'text', text: JSON.stringify({ rule, action: 'shared' }) }] };
        }
        case 'update_acl_rule': {
          const params = UpdateAclRuleSchema.parse(args);
          const rule = await this.calendarClient.updateAclRule(params.calendarId, params.ruleId, params.role);
          return { content: [{ type: 'text', text: JSON.stringify({ rule, action: 'updated' }) }] };
        }
        case 'unshare_calendar': {
          const params = DeleteAclRuleSchema.parse(args);
          await this.calendarClient.deleteAclRule(params.calendarId, params.ruleId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'unshared' }) }] };
        }
        case 'get_colors': {
          const colors = await this.calendarClient.getColors();
          return { content: [{ type: 'text', text: JSON.stringify(colors) }] };
        }
        case 'list_settings': {
          const settings = await this.calendarClient.listSettings();
          return { content: [{ type: 'text', text: JSON.stringify({ settings }) }] };
        }
        case 'get_setting': {
          const params = SettingSchema.parse(args);
          const setting = await this.calendarClient.getSetting(params.settingId);
          return { content: [{ type: 'text', text: JSON.stringify({ setting }) }] };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  async listResources(): Promise<{ resources: any[] }> {
    try {
      const calendars = await this.calendarClient.listCalendars();
      return {
        resources: calendars.map((cal) => ({
          uri: `gcalendar://calendar/${cal.id}`,
          name: cal.summary || cal.id,
          description: `Calendar: ${cal.summary}${cal.primary ? ' (Primary)' : ''}`,
          mimeType: 'application/json',
        })),
      };
    } catch {
      return { resources: [] };
    }
  }

  async readResource(uri: string): Promise<{ contents: any[] }> {
    const calMatch = uri.match(/^gcalendar:\/\/calendar\/(.+)$/);
    if (calMatch) {
      const calendarId = calMatch[1];
      const result = await this.calendarClient.listEvents({ calendarId, maxResults: 50 });
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(result.events, null, 2) }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  async listPrompts(): Promise<{ prompts: any[] }> {
    return {
      prompts: [
        { name: 'schedule_meeting', description: 'Help schedule a meeting', arguments: [{ name: 'topic', required: true }, { name: 'participants', required: false }] },
        { name: 'daily_agenda', description: 'Get daily agenda', arguments: [{ name: 'date', required: false }] },
      ],
    };
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'schedule_meeting':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Schedule a meeting about: ${args.topic || 'meeting'}` } }] };
      case 'daily_agenda':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Show my agenda for ${args.date || 'today'}` } }] };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
