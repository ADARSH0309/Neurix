/**
 * Gmail MCP Server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GmailClient } from './gmail-client.js';
import { z } from 'zod';
import { GMAIL_LABELS } from './types.js';

// Validation schemas
const ListMessagesSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(20),
  pageToken: z.string().optional(),
  query: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
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
  isHtml: z.boolean().optional().default(false),
});

const ReplyMessageSchema = z.object({
  messageId: z.string(),
  body: z.string(),
  isHtml: z.boolean().optional().default(false),
});

const ForwardMessageSchema = z.object({
  messageId: z.string(),
  to: z.string(),
  additionalMessage: z.string().optional(),
});

const ModifyLabelsSchema = z.object({
  messageId: z.string(),
  addLabelIds: z.array(z.string()).optional(),
  removeLabelIds: z.array(z.string()).optional(),
});

const SearchMessagesSchema = z.object({
  query: z.string(),
  maxResults: z.number().min(1).max(100).optional().default(20),
});

const CreateLabelSchema = z.object({
  name: z.string(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
});

const UpdateLabelSchema = z.object({
  labelId: z.string(),
  name: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
});

const DeleteLabelSchema = z.object({
  labelId: z.string(),
});

const CreateDraftSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  isHtml: z.boolean().optional().default(false),
});

const GetThreadSchema = z.object({
  threadId: z.string(),
});

const GetAttachmentSchema = z.object({
  messageId: z.string(),
  attachmentId: z.string(),
});

const MaxResultsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(20),
});

export class GmailServer {
  private server: Server;
  private gmailClient: GmailClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    this.server = new Server(
      {
        name: 'neurix-gmail-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.gmailClient = new GmailClient(clientId, clientSecret, redirectUri, tokenPath);
    this.setupHandlers();
  }

  async initialize(): Promise<void> {
    await this.gmailClient.initialize();
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Gmail client initialized successfully',
    }));
  }

  private setupHandlers(): void {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                pageToken: { type: 'string', description: 'Token for pagination' },
                query: { type: 'string', description: 'Gmail search query (e.g., "from:user@example.com", "is:unread")' },
                labelIds: { type: 'array', items: { type: 'string' }, description: 'Filter by label IDs' },
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
                isHtml: { type: 'boolean', description: 'Whether body is HTML (default: false)' },
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
                isHtml: { type: 'boolean', description: 'Whether body is HTML (default: false)' },
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
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'untrash_message',
            description: 'Remove a message from trash',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'delete_message',
            description: 'Permanently delete a message (cannot be undone)',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'mark_as_read',
            description: 'Mark a message as read',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'mark_as_unread',
            description: 'Mark a message as unread',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'star_message',
            description: 'Star a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'unstar_message',
            description: 'Remove star from a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'archive_message',
            description: 'Archive a message (remove from inbox)',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'modify_labels',
            description: 'Add or remove labels from a message',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID' },
                addLabelIds: { type: 'array', items: { type: 'string' }, description: 'Labels to add' },
                removeLabelIds: { type: 'array', items: { type: 'string' }, description: 'Labels to remove' },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'get_unread',
            description: 'Get unread messages from inbox',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
              },
            },
          },
          {
            name: 'get_sent',
            description: 'Get sent messages',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
              },
            },
          },
          {
            name: 'get_starred',
            description: 'Get starred messages',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
              },
            },
          },
          {
            name: 'get_trashed',
            description: 'Get messages in trash',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
              },
            },
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
                labelIds: { type: 'array', items: { type: 'string' }, description: 'Filter by label IDs' },
              },
            },
          },
          {
            name: 'get_thread',
            description: 'Get a thread with all its messages',
            inputSchema: {
              type: 'object',
              properties: {
                threadId: { type: 'string', description: 'Thread ID' },
              },
              required: ['threadId'],
            },
          },
          {
            name: 'trash_thread',
            description: 'Move an entire thread to trash',
            inputSchema: {
              type: 'object',
              properties: {
                threadId: { type: 'string', description: 'Thread ID' },
              },
              required: ['threadId'],
            },
          },
          {
            name: 'delete_thread',
            description: 'Permanently delete a thread (cannot be undone)',
            inputSchema: {
              type: 'object',
              properties: {
                threadId: { type: 'string', description: 'Thread ID' },
              },
              required: ['threadId'],
            },
          },

          // Label operations
          {
            name: 'list_labels',
            description: 'List all labels in the mailbox',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_label',
            description: 'Create a new label',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Label name' },
                backgroundColor: { type: 'string', description: 'Background color (hex)' },
                textColor: { type: 'string', description: 'Text color (hex)' },
              },
              required: ['name'],
            },
          },
          {
            name: 'update_label',
            description: 'Update a label',
            inputSchema: {
              type: 'object',
              properties: {
                labelId: { type: 'string', description: 'Label ID' },
                name: { type: 'string', description: 'New label name' },
                backgroundColor: { type: 'string', description: 'Background color (hex)' },
                textColor: { type: 'string', description: 'Text color (hex)' },
              },
              required: ['labelId'],
            },
          },
          {
            name: 'delete_label',
            description: 'Delete a label',
            inputSchema: {
              type: 'object',
              properties: {
                labelId: { type: 'string', description: 'Label ID' },
              },
              required: ['labelId'],
            },
          },

          // Draft operations
          {
            name: 'list_drafts',
            description: 'List all drafts',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: { type: 'number', description: 'Maximum drafts to return (default: 20)' },
              },
            },
          },
          {
            name: 'create_draft',
            description: 'Create a new draft',
            inputSchema: {
              type: 'object',
              properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject' },
                body: { type: 'string', description: 'Email body content' },
                cc: { type: 'string', description: 'CC recipients' },
                bcc: { type: 'string', description: 'BCC recipients' },
                isHtml: { type: 'boolean', description: 'Whether body is HTML' },
              },
              required: ['to', 'subject', 'body'],
            },
          },
          {
            name: 'delete_draft',
            description: 'Delete a draft',
            inputSchema: {
              type: 'object',
              properties: {
                draftId: { type: 'string', description: 'Draft ID' },
              },
              required: ['draftId'],
            },
          },
          {
            name: 'send_draft',
            description: 'Send a draft',
            inputSchema: {
              type: 'object',
              properties: {
                draftId: { type: 'string', description: 'Draft ID' },
              },
              required: ['draftId'],
            },
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
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Message operations
          case 'list_messages': {
            const params = ListMessagesSchema.parse(args);
            const result = await this.gmailClient.listMessages({
              maxResults: params.maxResults,
              pageToken: params.pageToken,
              q: params.query,
              labelIds: params.labelIds,
            });
            return {
              content: [{
                type: 'text',
                text: await this.formatMessageList(result.messages, result.nextPageToken),
              }],
            };
          }

          case 'get_message': {
            const params = GetMessageSchema.parse(args);
            const message = await this.gmailClient.getMessage(params.messageId);
            const parsed = this.gmailClient.parseMessage(message);
            return {
              content: [{
                type: 'text',
                text: this.formatParsedEmail(parsed),
              }],
            };
          }

          case 'send_message': {
            const params = SendMessageSchema.parse(args);
            const result = await this.gmailClient.sendMessage(params);
            return {
              content: [{
                type: 'text',
                text: `Email sent successfully!\n\nMessage ID: ${result.id}\nThread ID: ${result.threadId}`,
              }],
            };
          }

          case 'reply_to_message': {
            const params = ReplyMessageSchema.parse(args);
            const result = await this.gmailClient.replyToMessage(params);
            return {
              content: [{
                type: 'text',
                text: `Reply sent successfully!\n\nMessage ID: ${result.id}\nThread ID: ${result.threadId}`,
              }],
            };
          }

          case 'forward_message': {
            const params = ForwardMessageSchema.parse(args);
            const result = await this.gmailClient.forwardMessage(params);
            return {
              content: [{
                type: 'text',
                text: `Message forwarded successfully!\n\nMessage ID: ${result.id}\nThread ID: ${result.threadId}`,
              }],
            };
          }

          case 'search_messages': {
            const params = SearchMessagesSchema.parse(args);
            const messages = await this.gmailClient.searchMessages(params.query, params.maxResults);
            return {
              content: [{
                type: 'text',
                text: `Search results for "${params.query}":\n\n${await this.formatMessageList(messages)}`,
              }],
            };
          }

          case 'trash_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.trashMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message moved to trash',
              }],
            };
          }

          case 'untrash_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.untrashMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message removed from trash',
              }],
            };
          }

          case 'delete_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.deleteMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message permanently deleted',
              }],
            };
          }

          case 'mark_as_read': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.markAsRead(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message marked as read',
              }],
            };
          }

          case 'mark_as_unread': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.markAsUnread(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message marked as unread',
              }],
            };
          }

          case 'star_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.starMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message starred',
              }],
            };
          }

          case 'unstar_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.unstarMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message unstarred',
              }],
            };
          }

          case 'archive_message': {
            const params = GetMessageSchema.parse(args);
            await this.gmailClient.archiveMessage(params.messageId);
            return {
              content: [{
                type: 'text',
                text: 'Message archived',
              }],
            };
          }

          case 'modify_labels': {
            const params = ModifyLabelsSchema.parse(args);
            await this.gmailClient.modifyMessageLabels(params);
            return {
              content: [{
                type: 'text',
                text: 'Message labels updated',
              }],
            };
          }

          case 'get_unread': {
            const params = MaxResultsSchema.parse(args);
            const messages = await this.gmailClient.getUnreadMessages(params.maxResults);
            return {
              content: [{
                type: 'text',
                text: `Unread messages:\n\n${await this.formatMessageList(messages)}`,
              }],
            };
          }

          case 'get_sent': {
            const params = MaxResultsSchema.parse(args);
            const messages = await this.gmailClient.getSentMessages(params.maxResults);
            return {
              content: [{
                type: 'text',
                text: `Sent messages:\n\n${await this.formatMessageList(messages)}`,
              }],
            };
          }

          case 'get_starred': {
            const params = MaxResultsSchema.parse(args);
            const messages = await this.gmailClient.getStarredMessages(params.maxResults);
            return {
              content: [{
                type: 'text',
                text: `Starred messages:\n\n${await this.formatMessageList(messages)}`,
              }],
            };
          }

          case 'get_trashed': {
            const params = MaxResultsSchema.parse(args);
            const messages = await this.gmailClient.getTrashedMessages(params.maxResults);
            return {
              content: [{
                type: 'text',
                text: `Trashed messages:\n\n${await this.formatMessageList(messages)}`,
              }],
            };
          }

          // Thread operations
          case 'list_threads': {
            const params = ListMessagesSchema.parse(args);
            const result = await this.gmailClient.listThreads({
              maxResults: params.maxResults,
              pageToken: params.pageToken,
              q: params.query,
              labelIds: params.labelIds,
            });
            return {
              content: [{
                type: 'text',
                text: this.formatThreadList(result.threads, result.nextPageToken),
              }],
            };
          }

          case 'get_thread': {
            const params = GetThreadSchema.parse(args);
            const thread = await this.gmailClient.getThread(params.threadId);
            return {
              content: [{
                type: 'text',
                text: await this.formatThread(thread),
              }],
            };
          }

          case 'trash_thread': {
            const params = GetThreadSchema.parse(args);
            await this.gmailClient.trashThread(params.threadId);
            return {
              content: [{
                type: 'text',
                text: 'Thread moved to trash',
              }],
            };
          }

          case 'delete_thread': {
            const params = GetThreadSchema.parse(args);
            await this.gmailClient.deleteThread(params.threadId);
            return {
              content: [{
                type: 'text',
                text: 'Thread permanently deleted',
              }],
            };
          }

          // Label operations
          case 'list_labels': {
            const labels = await this.gmailClient.listLabels();
            return {
              content: [{
                type: 'text',
                text: this.formatLabelList(labels),
              }],
            };
          }

          case 'create_label': {
            const params = CreateLabelSchema.parse(args);
            const label = await this.gmailClient.createLabel(params);
            return {
              content: [{
                type: 'text',
                text: `Label created successfully!\n\nID: ${label.id}\nName: ${label.name}`,
              }],
            };
          }

          case 'update_label': {
            const params = UpdateLabelSchema.parse(args);
            const label = await this.gmailClient.updateLabel(params);
            return {
              content: [{
                type: 'text',
                text: `Label updated successfully!\n\nID: ${label.id}\nName: ${label.name}`,
              }],
            };
          }

          case 'delete_label': {
            const params = DeleteLabelSchema.parse(args);
            await this.gmailClient.deleteLabel(params.labelId);
            return {
              content: [{
                type: 'text',
                text: 'Label deleted successfully',
              }],
            };
          }

          // Draft operations
          case 'list_drafts': {
            const params = MaxResultsSchema.parse(args);
            const result = await this.gmailClient.listDrafts(params.maxResults);
            return {
              content: [{
                type: 'text',
                text: this.formatDraftList(result.drafts),
              }],
            };
          }

          case 'create_draft': {
            const params = CreateDraftSchema.parse(args);
            const draft = await this.gmailClient.createDraft(params);
            return {
              content: [{
                type: 'text',
                text: `Draft created successfully!\n\nDraft ID: ${draft.id}`,
              }],
            };
          }

          case 'delete_draft': {
            const draftId = (args as { draftId: string }).draftId;
            await this.gmailClient.deleteDraft(draftId);
            return {
              content: [{
                type: 'text',
                text: 'Draft deleted successfully',
              }],
            };
          }

          case 'send_draft': {
            const draftId = (args as { draftId: string }).draftId;
            const result = await this.gmailClient.sendDraft(draftId);
            return {
              content: [{
                type: 'text',
                text: `Draft sent successfully!\n\nMessage ID: ${result.id}\nThread ID: ${result.threadId}`,
              }],
            };
          }

          // Attachment operations
          case 'get_attachment': {
            const params = GetAttachmentSchema.parse(args);
            const attachment = await this.gmailClient.getAttachment(params.messageId, params.attachmentId);
            return {
              content: [{
                type: 'text',
                text: `Attachment retrieved!\n\nSize: ${attachment.size} bytes\nData (base64): ${attachment.data?.substring(0, 100)}...`,
              }],
            };
          }

          // Profile
          case 'get_profile': {
            const profile = await this.gmailClient.getProfile();
            return {
              content: [{
                type: 'text',
                text: `Gmail Profile\n\nEmail: ${profile.emailAddress}\nTotal Messages: ${profile.messagesTotal || 'N/A'}\nTotal Threads: ${profile.threadsTotal || 'N/A'}`,
              }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Error calling tool ${name}`,
          error: error instanceof Error ? error.message : String(error),
        }));
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'gmail://inbox',
            name: 'Inbox',
            description: 'Gmail inbox messages',
            mimeType: 'application/json',
          },
          {
            uri: 'gmail://sent',
            name: 'Sent',
            description: 'Sent messages',
            mimeType: 'application/json',
          },
          {
            uri: 'gmail://drafts',
            name: 'Drafts',
            description: 'Draft messages',
            mimeType: 'application/json',
          },
          {
            uri: 'gmail://labels',
            name: 'Labels',
            description: 'All labels',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'gmail://inbox') {
        const result = await this.gmailClient.listMessages({ labelIds: [GMAIL_LABELS.INBOX], maxResults: 20 });
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result.messages, null, 2),
          }],
        };
      }

      if (uri === 'gmail://sent') {
        const messages = await this.gmailClient.getSentMessages(20);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(messages, null, 2),
          }],
        };
      }

      if (uri === 'gmail://drafts') {
        const result = await this.gmailClient.listDrafts(20);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result.drafts, null, 2),
          }],
        };
      }

      if (uri === 'gmail://labels') {
        const labels = await this.gmailClient.listLabels();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(labels, null, 2),
          }],
        };
      }

      throw new Error(`Invalid resource URI: ${uri}`);
    });

    // List prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'compose_email',
            description: 'Help compose a professional email',
            arguments: [
              { name: 'purpose', description: 'The purpose of the email', required: true },
              { name: 'recipient', description: 'Who the email is for', required: false },
              { name: 'tone', description: 'Desired tone (formal, casual, friendly)', required: false },
            ],
          },
          {
            name: 'summarize_inbox',
            description: 'Summarize recent inbox activity',
            arguments: [],
          },
          {
            name: 'email_cleanup',
            description: 'Suggest emails to archive or delete',
            arguments: [],
          },
        ],
      };
    });

    // Get prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'compose_email': {
          const purpose = (args?.purpose as string) || 'general communication';
          const recipient = (args?.recipient as string) || 'the recipient';
          const tone = (args?.tone as string) || 'professional';
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Help me compose a ${tone} email to ${recipient} for the following purpose: ${purpose}\n\nPlease provide:\n1. A suitable subject line\n2. The email body\n3. Any suggestions for improving the message`,
              },
            }],
          };
        }

        case 'summarize_inbox': {
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze my recent inbox activity and provide:\n1. Number of unread messages\n2. Key senders and topics\n3. Any urgent or important messages\n4. Recommended actions`,
              },
            }],
          };
        }

        case 'email_cleanup': {
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Please help me clean up my inbox by:\n1. Identifying old or unnecessary emails\n2. Suggesting emails to archive\n3. Finding potential spam or promotional emails\n4. Recommending labels or organization strategies`,
              },
            }],
          };
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  private async formatMessageList(messages: any[], nextPageToken?: string): Promise<string> {
    if (!messages || messages.length === 0) {
      return 'No messages found.';
    }

    const formatted: string[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      try {
        const fullMsg = await this.gmailClient.getMessage(msg.id, 'metadata');
        const headers = fullMsg.payload?.headers || [];
        const getHeader = (name: string): string => {
          const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
          return header?.value || '';
        };

        const isUnread = fullMsg.labelIds?.includes(GMAIL_LABELS.UNREAD) ? '[UNREAD] ' : '';
        const isStarred = fullMsg.labelIds?.includes(GMAIL_LABELS.STARRED) ? '* ' : '';

        formatted.push(
          `${i + 1}. ${isUnread}${isStarred}${getHeader('Subject') || '(No Subject)'}\n` +
          `   From: ${getHeader('From')}\n` +
          `   Date: ${getHeader('Date')}\n` +
          `   ID: ${msg.id}`
        );
      } catch {
        formatted.push(`${i + 1}. Message ID: ${msg.id} (could not load details)`);
      }
    }

    let result = formatted.join('\n\n');

    if (nextPageToken) {
      result += `\n\n--- More messages available (pageToken: ${nextPageToken}) ---`;
    }

    return result;
  }

  private formatParsedEmail(email: any): string {
    return `Email Details:

From: ${email.from}
To: ${email.to}
${email.cc ? `CC: ${email.cc}\n` : ''}Subject: ${email.subject}
Date: ${email.date}
Labels: ${email.labels.join(', ')}
${email.attachments.length > 0 ? `Attachments: ${email.attachments.map((a: any) => a.filename).join(', ')}\n` : ''}
---
${email.body}`;
  }

  private formatThreadList(threads: any[], nextPageToken?: string): string {
    if (!threads || threads.length === 0) {
      return 'No threads found.';
    }

    const formatted = threads.map((thread, i) =>
      `${i + 1}. Thread ID: ${thread.id}\n   Snippet: ${thread.snippet || '(empty)'}`
    ).join('\n\n');

    if (nextPageToken) {
      return `${formatted}\n\n--- More threads available (pageToken: ${nextPageToken}) ---`;
    }

    return formatted;
  }

  private async formatThread(thread: any): Promise<string> {
    const messages = thread.messages || [];
    const formatted: string[] = [`Thread ID: ${thread.id}\nMessages: ${messages.length}\n`];

    for (const msg of messages) {
      const parsed = this.gmailClient.parseMessage(msg);
      formatted.push(`--- Message ---\nFrom: ${parsed.from}\nDate: ${parsed.date}\nSubject: ${parsed.subject}\n\n${parsed.snippet}...`);
    }

    return formatted.join('\n\n');
  }

  private formatLabelList(labels: any[]): string {
    if (!labels || labels.length === 0) {
      return 'No labels found.';
    }

    const systemLabels = labels.filter(l => l.type === 'system');
    const userLabels = labels.filter(l => l.type !== 'system');

    let result = 'System Labels:\n';
    result += systemLabels.map(l => `  - ${l.name} (${l.id})`).join('\n');

    if (userLabels.length > 0) {
      result += '\n\nUser Labels:\n';
      result += userLabels.map(l => `  - ${l.name} (${l.id})`).join('\n');
    }

    return result;
  }

  private formatDraftList(drafts: any[]): string {
    if (!drafts || drafts.length === 0) {
      return 'No drafts found.';
    }

    return drafts.map((draft, i) =>
      `${i + 1}. Draft ID: ${draft.id}`
    ).join('\n');
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Gmail MCP Server started on STDIO',
    }));
  }
}
