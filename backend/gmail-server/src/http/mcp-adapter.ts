/**
 * MCP HTTP Adapter for Gmail
 *
 * Implements JSON-RPC 2.0 protocol for HTTP transport
 */

import { GmailClient } from '../gmail-client.js';
import { z } from 'zod';

// Validation schemas
const ListMessagesSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(20),
  query: z.string().optional(),
});

const GetMessageSchema = z.object({
  messageId: z.string(),
});

const SendMessageSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

const ReplyMessageSchema = z.object({
  messageId: z.string(),
  body: z.string(),
});

const ForwardMessageSchema = z.object({
  messageId: z.string(),
  to: z.string(),
  additionalMessage: z.string().optional(),
});

const SearchMessagesSchema = z.object({
  query: z.string(),
  maxResults: z.number().min(1).max(100).optional().default(20),
});

const ModifyLabelsSchema = z.object({
  messageId: z.string(),
  addLabelIds: z.union([z.string(), z.array(z.string())]).optional(),
  removeLabelIds: z.union([z.string(), z.array(z.string())]).optional(),
});

const MaxResultsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(20),
});

const GetThreadSchema = z.object({
  threadId: z.string(),
});

const CreateDraftSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

export class McpHttpAdapter {
  private gmailClient: GmailClient;
  private initialized = false;

  constructor(gmailClient: GmailClient) {
    this.gmailClient = gmailClient;
  }

  async initialize(): Promise<{ protocolVersion: string; capabilities: any; serverInfo: any }> {
    this.initialized = true;
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: 'neurix-gmail-server',
        version: '0.1.0',
      },
    };
  }

  async listTools(): Promise<{ tools: any[] }> {
    return {
      tools: [
        // Message operations
        {
          name: 'list_messages',
          description: 'List messages in the mailbox. Can filter by labels and search query.',
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: { type: 'number', description: 'Maximum number of messages to return (1-100, default: 20)' },
              query: { type: 'string', description: 'Gmail search query (e.g., "from:user@example.com", "is:unread")' },
            },
          },
        },
        {
          name: 'get_message',
          description: 'Get a specific email message with full details',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'Message ID' },
            },
            required: ['messageId'],
          },
        },
        {
          name: 'send_message',
          description: 'Send a new email message',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body content' },
              cc: { type: 'string', description: 'CC recipients (comma-separated)' },
              bcc: { type: 'string', description: 'BCC recipients (comma-separated)' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
        {
          name: 'reply_to_message',
          description: 'Reply to an existing email message',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'Message ID to reply to' },
              body: { type: 'string', description: 'Reply body content' },
            },
            required: ['messageId', 'body'],
          },
        },
        {
          name: 'forward_message',
          description: 'Forward an email message to another recipient',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'Message ID to forward' },
              to: { type: 'string', description: 'Recipient email address' },
              additionalMessage: { type: 'string', description: 'Additional message to include' },
            },
            required: ['messageId', 'to'],
          },
        },
        {
          name: 'search_messages',
          description: 'Search for messages using Gmail search syntax',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Gmail search query' },
              maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'trash_message',
          description: 'Move a message to trash',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'untrash_message',
          description: 'Remove a message from trash',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'delete_message',
          description: 'Permanently delete a message (cannot be undone)',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'mark_as_read',
          description: 'Mark a message as read',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'mark_as_unread',
          description: 'Mark a message as unread',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'star_message',
          description: 'Star a message',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'unstar_message',
          description: 'Remove star from a message',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'archive_message',
          description: 'Archive a message (remove from inbox)',
          inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Message ID' } }, required: ['messageId'] },
        },
        {
          name: 'modify_labels',
          description: 'Add or remove labels from a message',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'Message ID' },
              addLabelIds: { type: 'string', description: 'Comma-separated label IDs to add' },
              removeLabelIds: { type: 'string', description: 'Comma-separated label IDs to remove' },
            },
            required: ['messageId'],
          },
        },
        {
          name: 'get_unread',
          description: 'Get unread messages from inbox',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Maximum results (default: 20)' } } },
        },
        {
          name: 'get_sent',
          description: 'Get sent messages',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Maximum results (default: 20)' } } },
        },
        {
          name: 'get_starred',
          description: 'Get starred messages',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Maximum results (default: 20)' } } },
        },
        {
          name: 'get_trashed',
          description: 'Get messages in trash',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Maximum results (default: 20)' } } },
        },
        // Thread operations
        {
          name: 'list_threads',
          description: 'List email threads',
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: { type: 'number', description: 'Maximum threads to return (default: 20)' },
              query: { type: 'string', description: 'Gmail search query' },
            },
          },
        },
        {
          name: 'get_thread',
          description: 'Get a thread with all its messages',
          inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'Thread ID' } }, required: ['threadId'] },
        },
        {
          name: 'trash_thread',
          description: 'Move an entire thread to trash',
          inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'Thread ID' } }, required: ['threadId'] },
        },
        {
          name: 'delete_thread',
          description: 'Permanently delete a thread (cannot be undone)',
          inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'Thread ID' } }, required: ['threadId'] },
        },
        // Label operations
        {
          name: 'list_labels',
          description: 'List all labels in the mailbox',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'create_label',
          description: 'Create a new label',
          inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Label name' } }, required: ['name'] },
        },
        {
          name: 'update_label',
          description: 'Update a label',
          inputSchema: {
            type: 'object',
            properties: {
              labelId: { type: 'string', description: 'Label ID' },
              name: { type: 'string', description: 'New label name' },
            },
            required: ['labelId'],
          },
        },
        {
          name: 'delete_label',
          description: 'Delete a label',
          inputSchema: { type: 'object', properties: { labelId: { type: 'string', description: 'Label ID' } }, required: ['labelId'] },
        },
        // Draft operations
        {
          name: 'list_drafts',
          description: 'List all drafts',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Maximum drafts to return (default: 20)' } } },
        },
        {
          name: 'create_draft',
          description: 'Create a new draft email',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body content' },
              cc: { type: 'string', description: 'CC recipients' },
              bcc: { type: 'string', description: 'BCC recipients' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
        {
          name: 'delete_draft',
          description: 'Delete a draft',
          inputSchema: { type: 'object', properties: { draftId: { type: 'string', description: 'Draft ID' } }, required: ['draftId'] },
        },
        {
          name: 'send_draft',
          description: 'Send a draft',
          inputSchema: { type: 'object', properties: { draftId: { type: 'string', description: 'Draft ID' } }, required: ['draftId'] },
        },
        // Attachment operations
        {
          name: 'get_attachment',
          description: 'Download an attachment from a message',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'Message ID' },
              attachmentId: { type: 'string', description: 'Attachment ID' },
            },
            required: ['messageId', 'attachmentId'],
          },
        },
        // Profile
        {
          name: 'get_profile',
          description: 'Get Gmail account profile information',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      switch (name) {
        // Message operations
        case 'list_messages': {
          const result = await this.gmailClient.listMessages({
            maxResults: (args.maxResults as number) || 20,
            q: args.query as string,
          });
          const validMessages = await this.fetchMessageDetails(result.messages || []);
          return {
            content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }],
          };
        }

        case 'get_message': {
          const message = await this.gmailClient.getMessage(args.messageId as string);
          const parsed = this.gmailClient.parseMessage(message);
          return {
            content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }],
          };
        }

        case 'send_message': {
          const result = await this.gmailClient.sendMessage({
            to: args.to as string,
            subject: args.subject as string,
            body: args.body as string,
            cc: args.cc as string | undefined,
            bcc: args.bcc as string | undefined,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'send_message' }) }],
          };
        }

        case 'reply_to_message': {
          const result = await this.gmailClient.replyToMessage({
            messageId: args.messageId as string,
            body: args.body as string,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'reply_to_message' }) }],
          };
        }

        case 'forward_message': {
          const result = await this.gmailClient.forwardMessage({
            messageId: args.messageId as string,
            to: args.to as string,
            additionalMessage: args.additionalMessage as string | undefined,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'forward_message' }) }],
          };
        }

        case 'search_messages': {
          const messages = await this.gmailClient.searchMessages(
            args.query as string,
            (args.maxResults as number) || 20
          );
          const validMessages = await this.fetchMessageDetails(messages || []);
          return {
            content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }],
          };
        }

        case 'trash_message': {
          await this.gmailClient.trashMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'trash_message', messageId: args.messageId }) }] };
        }

        case 'untrash_message': {
          await this.gmailClient.untrashMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'untrash_message', messageId: args.messageId }) }] };
        }

        case 'delete_message': {
          await this.gmailClient.deleteMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'delete_message', messageId: args.messageId }) }] };
        }

        case 'mark_as_read': {
          await this.gmailClient.markAsRead(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'mark_as_read', messageId: args.messageId }) }] };
        }

        case 'mark_as_unread': {
          await this.gmailClient.markAsUnread(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'mark_as_unread', messageId: args.messageId }) }] };
        }

        case 'star_message': {
          await this.gmailClient.starMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'star_message', messageId: args.messageId }) }] };
        }

        case 'unstar_message': {
          await this.gmailClient.unstarMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'unstar_message', messageId: args.messageId }) }] };
        }

        case 'archive_message': {
          await this.gmailClient.archiveMessage(args.messageId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'archive_message', messageId: args.messageId }) }] };
        }

        case 'modify_labels': {
          const addLabelIds = args.addLabelIds
            ? (typeof args.addLabelIds === 'string' ? (args.addLabelIds as string).split(',').map(s => s.trim()) : args.addLabelIds as string[])
            : undefined;
          const removeLabelIds = args.removeLabelIds
            ? (typeof args.removeLabelIds === 'string' ? (args.removeLabelIds as string).split(',').map(s => s.trim()) : args.removeLabelIds as string[])
            : undefined;
          await this.gmailClient.modifyMessageLabels({
            messageId: args.messageId as string,
            addLabelIds,
            removeLabelIds,
          });
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'modify_labels', messageId: args.messageId }) }] };
        }

        case 'get_unread': {
          const messages = await this.gmailClient.getUnreadMessages((args.maxResults as number) || 20);
          const validMessages = await this.fetchMessageDetails(messages || []);
          return { content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }] };
        }

        case 'get_sent': {
          const messages = await this.gmailClient.getSentMessages((args.maxResults as number) || 20);
          const validMessages = await this.fetchMessageDetails(messages || []);
          return { content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }] };
        }

        case 'get_starred': {
          const messages = await this.gmailClient.getStarredMessages((args.maxResults as number) || 20);
          const validMessages = await this.fetchMessageDetails(messages || []);
          return { content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }] };
        }

        case 'get_trashed': {
          const messages = await this.gmailClient.getTrashedMessages((args.maxResults as number) || 20);
          const validMessages = await this.fetchMessageDetails(messages || []);
          return { content: [{ type: 'text', text: JSON.stringify(validMessages, null, 2) }] };
        }

        // Thread operations
        case 'list_threads': {
          const result = await this.gmailClient.listThreads({
            maxResults: (args.maxResults as number) || 20,
            q: args.query as string,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ threads: result.threads || [], nextPageToken: result.nextPageToken, action: 'list_threads' }, null, 2) }],
          };
        }

        case 'get_thread': {
          const thread = await this.gmailClient.getThread(args.threadId as string);
          const parsedMessages = (thread.messages || []).map((msg: any) => this.gmailClient.parseMessage(msg));
          return {
            content: [{ type: 'text', text: JSON.stringify({ threadId: thread.id, messages: parsedMessages, action: 'get_thread' }, null, 2) }],
          };
        }

        case 'trash_thread': {
          await this.gmailClient.trashThread(args.threadId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'trash_thread', threadId: args.threadId }) }] };
        }

        case 'delete_thread': {
          await this.gmailClient.deleteThread(args.threadId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'delete_thread', threadId: args.threadId }) }] };
        }

        // Label operations
        case 'list_labels': {
          const labels = await this.gmailClient.listLabels();
          return { content: [{ type: 'text', text: JSON.stringify({ labels, action: 'list_labels' }, null, 2) }] };
        }

        case 'create_label': {
          const label = await this.gmailClient.createLabel({ name: args.name as string });
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'create_label', id: label.id, name: label.name }) }] };
        }

        case 'update_label': {
          const label = await this.gmailClient.updateLabel({
            labelId: args.labelId as string,
            name: args.name as string | undefined,
          });
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'update_label', id: label.id, name: label.name }) }] };
        }

        case 'delete_label': {
          await this.gmailClient.deleteLabel(args.labelId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'delete_label', labelId: args.labelId }) }] };
        }

        // Draft operations
        case 'list_drafts': {
          const result = await this.gmailClient.listDrafts((args.maxResults as number) || 20);
          return { content: [{ type: 'text', text: JSON.stringify({ drafts: result.drafts, action: 'list_drafts' }, null, 2) }] };
        }

        case 'create_draft': {
          const draft = await this.gmailClient.createDraft({
            to: args.to as string,
            subject: args.subject as string,
            body: args.body as string,
            cc: args.cc as string | undefined,
            bcc: args.bcc as string | undefined,
          });
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'create_draft', draftId: draft.id }) }] };
        }

        case 'delete_draft': {
          await this.gmailClient.deleteDraft(args.draftId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'delete_draft', draftId: args.draftId }) }] };
        }

        case 'send_draft': {
          const result = await this.gmailClient.sendDraft(args.draftId as string);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'send_draft', id: result.id, threadId: result.threadId }) }] };
        }

        // Attachment operations
        case 'get_attachment': {
          const attachment = await this.gmailClient.getAttachment(
            args.messageId as string,
            args.attachmentId as string
          );
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'get_attachment', size: attachment.size, data: attachment.data?.substring(0, 100) + '...' }) }],
          };
        }

        // Profile
        case 'get_profile': {
          const profile = await this.gmailClient.getProfile();
          return { content: [{ type: 'text', text: JSON.stringify({ ...profile, action: 'get_profile' }, null, 2) }] };
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
    return {
      resources: [
        { uri: 'gmail://inbox', name: 'Inbox', mimeType: 'application/json' },
        { uri: 'gmail://sent', name: 'Sent', mimeType: 'application/json' },
        { uri: 'gmail://labels', name: 'Labels', mimeType: 'application/json' },
      ],
    };
  }

  async readResource(uri: string): Promise<{ contents: any[] }> {
    throw new Error(`Resource reading not supported via HTTP: ${uri}`);
  }

  async listPrompts(): Promise<{ prompts: any[] }> {
    return {
      prompts: [
        {
          name: 'compose_email',
          description: 'Help compose a professional email',
          arguments: [
            { name: 'purpose', description: 'The purpose of the email', required: true },
          ],
        },
        {
          name: 'summarize_inbox',
          description: 'Summarize recent inbox activity',
          arguments: [],
        },
      ],
    };
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'compose_email':
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Help me compose an email for: ${args.purpose || 'general communication'}`,
            },
          }],
        };
      case 'summarize_inbox':
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: 'Please analyze my recent inbox activity and provide a summary.',
            },
          }],
        };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private async fetchMessageDetails(messages: Array<{ id?: string }>): Promise<unknown[]> {
    const details = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null;
        try {
          const fullMessage = await this.gmailClient.getMessage(msg.id);
          return this.gmailClient.parseMessage(fullMessage);
        } catch {
          return null;
        }
      })
    );
    return details.filter(m => m !== null);
  }
}
