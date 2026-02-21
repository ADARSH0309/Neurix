/**
 * Gmail API client wrapper
 *
 * All Gmail API calls are wrapped with circuit breaker for resilience.
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';
import CircuitBreaker from 'opossum';
import {
  GmailMessage,
  GmailThread,
  GmailLabel,
  GmailDraft,
  GmailProfile,
  GmailAttachment,
  ListMessagesParams,
  ListMessagesResult,
  ListThreadsParams,
  ListThreadsResult,
  SendMessageParams,
  ReplyMessageParams,
  ForwardMessageParams,
  ModifyLabelsParams,
  CreateLabelParams,
  UpdateLabelParams,
  CreateDraftParams,
  UpdateDraftParams,
  ParsedEmail,
  GMAIL_LABELS,
} from './types.js';
import {
  createGmailCircuitBreaker,
  formatCircuitBreakerError,
  CircuitBreakerStateCallback,
} from './utils/circuit-breaker.js';

type OAuth2Client = Auth.OAuth2Client;

export class GmailClient {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private metricsCallback?: CircuitBreakerStateCallback;

  // Circuit breakers for each Gmail API operation
  private listMessagesBreaker?: CircuitBreaker<any[], any>;
  private getMessageBreaker?: CircuitBreaker<any[], any>;
  private sendMessageBreaker?: CircuitBreaker<any[], any>;
  private modifyMessageBreaker?: CircuitBreaker<any[], any>;
  private deleteMessageBreaker?: CircuitBreaker<any[], any>;
  private trashMessageBreaker?: CircuitBreaker<any[], any>;
  private untrashMessageBreaker?: CircuitBreaker<any[], any>;
  private listThreadsBreaker?: CircuitBreaker<any[], any>;
  private getThreadBreaker?: CircuitBreaker<any[], any>;
  private modifyThreadBreaker?: CircuitBreaker<any[], any>;
  private deleteThreadBreaker?: CircuitBreaker<any[], any>;
  private trashThreadBreaker?: CircuitBreaker<any[], any>;
  private listLabelsBreaker?: CircuitBreaker<any[], any>;
  private createLabelBreaker?: CircuitBreaker<any[], any>;
  private updateLabelBreaker?: CircuitBreaker<any[], any>;
  private deleteLabelBreaker?: CircuitBreaker<any[], any>;
  private listDraftsBreaker?: CircuitBreaker<any[], any>;
  private getDraftBreaker?: CircuitBreaker<any[], any>;
  private createDraftBreaker?: CircuitBreaker<any[], any>;
  private updateDraftBreaker?: CircuitBreaker<any[], any>;
  private deleteDraftBreaker?: CircuitBreaker<any[], any>;
  private sendDraftBreaker?: CircuitBreaker<any[], any>;
  private getProfileBreaker?: CircuitBreaker<any[], any>;
  private getAttachmentBreaker?: CircuitBreaker<any[], any>;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenPath: string,
    metricsCallback?: CircuitBreakerStateCallback
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.metricsCallback = metricsCallback;
  }

  private initializeCircuitBreakers(): void {
    this.listMessagesBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.list(params),
      { name: 'listMessages' },
      this.metricsCallback
    );

    this.getMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.get(params),
      { name: 'getMessage' },
      this.metricsCallback
    );

    this.sendMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.send(params),
      { name: 'sendMessage', timeout: 30000 },
      this.metricsCallback
    );

    this.modifyMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.modify(params),
      { name: 'modifyMessage' },
      this.metricsCallback
    );

    this.deleteMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.delete(params),
      { name: 'deleteMessage' },
      this.metricsCallback
    );

    this.trashMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.trash(params),
      { name: 'trashMessage' },
      this.metricsCallback
    );

    this.untrashMessageBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.untrash(params),
      { name: 'untrashMessage' },
      this.metricsCallback
    );

    this.listThreadsBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.threads.list(params),
      { name: 'listThreads' },
      this.metricsCallback
    );

    this.getThreadBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.threads.get(params),
      { name: 'getThread' },
      this.metricsCallback
    );

    this.modifyThreadBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.threads.modify(params),
      { name: 'modifyThread' },
      this.metricsCallback
    );

    this.deleteThreadBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.threads.delete(params),
      { name: 'deleteThread' },
      this.metricsCallback
    );

    this.trashThreadBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.threads.trash(params),
      { name: 'trashThread' },
      this.metricsCallback
    );

    this.listLabelsBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.labels.list(params),
      { name: 'listLabels' },
      this.metricsCallback
    );

    this.createLabelBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.labels.create(params),
      { name: 'createLabel' },
      this.metricsCallback
    );

    this.updateLabelBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.labels.update(params),
      { name: 'updateLabel' },
      this.metricsCallback
    );

    this.deleteLabelBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.labels.delete(params),
      { name: 'deleteLabel' },
      this.metricsCallback
    );

    this.listDraftsBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.list(params),
      { name: 'listDrafts' },
      this.metricsCallback
    );

    this.getDraftBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.get(params),
      { name: 'getDraft' },
      this.metricsCallback
    );

    this.createDraftBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.create(params),
      { name: 'createDraft' },
      this.metricsCallback
    );

    this.updateDraftBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.update(params),
      { name: 'updateDraft' },
      this.metricsCallback
    );

    this.deleteDraftBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.delete(params),
      { name: 'deleteDraft' },
      this.metricsCallback
    );

    this.sendDraftBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.drafts.send(params),
      { name: 'sendDraft', timeout: 30000 },
      this.metricsCallback
    );

    this.getProfileBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.getProfile(params),
      { name: 'getProfile' },
      this.metricsCallback
    );

    this.getAttachmentBreaker = createGmailCircuitBreaker(
      async (params: any) => this.gmail.users.messages.attachments.get(params),
      { name: 'getAttachment', timeout: 30000 },
      this.metricsCallback
    );
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
            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'OAuth tokens refreshed and persisted successfully',
            }));
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

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.initializeCircuitBreakers();
    } catch (error) {
      throw new Error(
        `Failed to load Gmail credentials. Please run OAuth setup first. Error: ${error}`
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
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.initializeCircuitBreakers();
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(): Promise<GmailProfile> {
    try {
      if (!this.getProfileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getProfileBreaker.fire({
        userId: 'me',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getProfile');
      throw new Error(errorMessage);
    }
  }

  /**
   * List messages in the mailbox
   */
  async listMessages(params: ListMessagesParams = {}): Promise<ListMessagesResult> {
    const { maxResults = 20, pageToken, q, labelIds, includeSpamTrash = false } = params;

    try {
      if (!this.listMessagesBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestParams: any = {
        userId: 'me',
        maxResults,
        includeSpamTrash,
      };

      if (pageToken) requestParams.pageToken = pageToken;
      if (q) requestParams.q = q;
      if (labelIds && labelIds.length > 0) requestParams.labelIds = labelIds;

      const response = await this.listMessagesBreaker.fire(requestParams);

      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listMessages');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific message with full details
   */
  async getMessage(messageId: string, format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full'): Promise<GmailMessage> {
    try {
      if (!this.getMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getMessageBreaker.fire({
        userId: 'me',
        id: messageId,
        format,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Parse a message into a more readable format
   */
  parseMessage(message: GmailMessage): ParsedEmail {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string): string => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    // Extract body
    let body = '';
    let isHtml = false;

    const extractBody = (part: any): { text: string; isHtml: boolean } | null => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return { text: Buffer.from(part.body.data, 'base64').toString('utf-8'), isHtml: false };
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        return { text: Buffer.from(part.body.data, 'base64').toString('utf-8'), isHtml: true };
      }
      if (part.parts) {
        for (const subPart of part.parts) {
          const result = extractBody(subPart);
          if (result) return result;
        }
      }
      return null;
    };

    if (message.payload) {
      const bodyResult = extractBody(message.payload);
      if (bodyResult) {
        body = bodyResult.text;
        isHtml = bodyResult.isHtml;
      }
    }

    // Extract attachments
    const attachments: ParsedEmail['attachments'] = [];
    const extractAttachments = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    if (message.payload) {
      extractAttachments(message.payload);
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc') || undefined,
      bcc: getHeader('Bcc') || undefined,
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: message.snippet || '',
      body,
      isHtml,
      labels: message.labelIds || [],
      attachments,
    };
  }

  /**
   * Send a new email
   */
  async sendMessage(params: SendMessageParams): Promise<GmailMessage> {
    const { to, subject, body, cc, bcc, isHtml = false, threadId, attachments } = params;

    try {
      if (!this.sendMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      // Build email
      const boundary = `boundary_${Date.now()}`;
      const mimeType = isHtml ? 'text/html' : 'text/plain';

      let email: string;

      if (attachments && attachments.length > 0) {
        // Multipart email with attachments
        const emailParts = [
          `MIME-Version: 1.0`,
          `To: ${to}`,
          cc ? `Cc: ${cc}` : '',
          bcc ? `Bcc: ${bcc}` : '',
          `Subject: ${subject}`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          `Content-Type: ${mimeType}; charset="UTF-8"`,
          '',
          body,
        ].filter(Boolean);

        // Add attachments
        for (const attachment of attachments) {
          emailParts.push(
            `--${boundary}`,
            `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            `Content-Transfer-Encoding: base64`,
            '',
            attachment.content
          );
        }

        emailParts.push(`--${boundary}--`);
        email = emailParts.join('\r\n');
      } else {
        // Simple email without attachments
        email = [
          `MIME-Version: 1.0`,
          `To: ${to}`,
          cc ? `Cc: ${cc}` : '',
          bcc ? `Bcc: ${bcc}` : '',
          `Subject: ${subject}`,
          `Content-Type: ${mimeType}; charset="UTF-8"`,
          '',
          body,
        ].filter(Boolean).join('\r\n');
      }

      const encodedEmail = Buffer.from(email).toString('base64url');

      const requestParams: any = {
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      };

      if (threadId) {
        requestParams.requestBody.threadId = threadId;
      }

      const response = await this.sendMessageBreaker.fire(requestParams);
      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'sendMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Reply to a message
   */
  async replyToMessage(params: ReplyMessageParams): Promise<GmailMessage> {
    const { messageId, body, isHtml = false } = params;

    try {
      // Get original message to extract thread and headers
      const original = await this.getMessage(messageId);
      const parsed = this.parseMessage(original);

      // Build reply
      const subject = parsed.subject.startsWith('Re:') ? parsed.subject : `Re: ${parsed.subject}`;

      return await this.sendMessage({
        to: parsed.from,
        subject,
        body,
        isHtml,
        threadId: original.threadId,
      });
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'replyToMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Forward a message
   */
  async forwardMessage(params: ForwardMessageParams): Promise<GmailMessage> {
    const { messageId, to, additionalMessage } = params;

    try {
      // Get original message
      const original = await this.getMessage(messageId);
      const parsed = this.parseMessage(original);

      // Build forward body
      const forwardHeader = [
        '---------- Forwarded message ----------',
        `From: ${parsed.from}`,
        `Date: ${parsed.date}`,
        `Subject: ${parsed.subject}`,
        `To: ${parsed.to}`,
        '',
      ].join('\n');

      const body = additionalMessage
        ? `${additionalMessage}\n\n${forwardHeader}${parsed.body}`
        : `${forwardHeader}${parsed.body}`;

      const subject = parsed.subject.startsWith('Fwd:') ? parsed.subject : `Fwd: ${parsed.subject}`;

      return await this.sendMessage({
        to,
        subject,
        body,
        isHtml: parsed.isHtml,
      });
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'forwardMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Modify message labels
   */
  async modifyMessageLabels(params: ModifyLabelsParams): Promise<GmailMessage> {
    const { messageId, addLabelIds, removeLabelIds } = params;

    try {
      if (!this.modifyMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.modifyMessageBreaker.fire({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || [],
        },
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'modifyMessageLabels');
      throw new Error(errorMessage);
    }
  }

  /**
   * Move message to trash
   */
  async trashMessage(messageId: string): Promise<GmailMessage> {
    try {
      if (!this.trashMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.trashMessageBreaker.fire({
        userId: 'me',
        id: messageId,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'trashMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove message from trash
   */
  async untrashMessage(messageId: string): Promise<GmailMessage> {
    try {
      if (!this.untrashMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.untrashMessageBreaker.fire({
        userId: 'me',
        id: messageId,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'untrashMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Permanently delete a message
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    try {
      if (!this.deleteMessageBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.deleteMessageBreaker.fire({
        userId: 'me',
        id: messageId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteMessage');
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<GmailMessage> {
    return this.modifyMessageLabels({
      messageId,
      removeLabelIds: [GMAIL_LABELS.UNREAD],
    });
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId: string): Promise<GmailMessage> {
    return this.modifyMessageLabels({
      messageId,
      addLabelIds: [GMAIL_LABELS.UNREAD],
    });
  }

  /**
   * Star a message
   */
  async starMessage(messageId: string): Promise<GmailMessage> {
    return this.modifyMessageLabels({
      messageId,
      addLabelIds: [GMAIL_LABELS.STARRED],
    });
  }

  /**
   * Unstar a message
   */
  async unstarMessage(messageId: string): Promise<GmailMessage> {
    return this.modifyMessageLabels({
      messageId,
      removeLabelIds: [GMAIL_LABELS.STARRED],
    });
  }

  /**
   * Archive a message (remove from inbox)
   */
  async archiveMessage(messageId: string): Promise<GmailMessage> {
    return this.modifyMessageLabels({
      messageId,
      removeLabelIds: [GMAIL_LABELS.INBOX],
    });
  }

  /**
   * List threads
   */
  async listThreads(params: ListThreadsParams = {}): Promise<ListThreadsResult> {
    const { maxResults = 20, pageToken, q, labelIds, includeSpamTrash = false } = params;

    try {
      if (!this.listThreadsBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestParams: any = {
        userId: 'me',
        maxResults,
        includeSpamTrash,
      };

      if (pageToken) requestParams.pageToken = pageToken;
      if (q) requestParams.q = q;
      if (labelIds && labelIds.length > 0) requestParams.labelIds = labelIds;

      const response = await this.listThreadsBreaker.fire(requestParams);

      return {
        threads: response.data.threads || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listThreads');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a thread with all messages
   */
  async getThread(threadId: string): Promise<GmailThread> {
    try {
      if (!this.getThreadBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getThreadBreaker.fire({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getThread');
      throw new Error(errorMessage);
    }
  }

  /**
   * Trash a thread
   */
  async trashThread(threadId: string): Promise<GmailThread> {
    try {
      if (!this.trashThreadBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.trashThreadBreaker.fire({
        userId: 'me',
        id: threadId,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'trashThread');
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a thread permanently
   */
  async deleteThread(threadId: string): Promise<{ success: boolean }> {
    try {
      if (!this.deleteThreadBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.deleteThreadBreaker.fire({
        userId: 'me',
        id: threadId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteThread');
      throw new Error(errorMessage);
    }
  }

  /**
   * List all labels
   */
  async listLabels(): Promise<GmailLabel[]> {
    try {
      if (!this.listLabelsBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.listLabelsBreaker.fire({
        userId: 'me',
      });

      return response.data.labels || [];
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listLabels');
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new label
   */
  async createLabel(params: CreateLabelParams): Promise<GmailLabel> {
    const { name, messageListVisibility, labelListVisibility, backgroundColor, textColor } = params;

    try {
      if (!this.createLabelBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestBody: any = { name };
      if (messageListVisibility) requestBody.messageListVisibility = messageListVisibility;
      if (labelListVisibility) requestBody.labelListVisibility = labelListVisibility;
      if (backgroundColor || textColor) {
        requestBody.color = {};
        if (backgroundColor) requestBody.color.backgroundColor = backgroundColor;
        if (textColor) requestBody.color.textColor = textColor;
      }

      const response = await this.createLabelBreaker.fire({
        userId: 'me',
        requestBody,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createLabel');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update a label
   */
  async updateLabel(params: UpdateLabelParams): Promise<GmailLabel> {
    const { labelId, name, messageListVisibility, labelListVisibility, backgroundColor, textColor } = params;

    try {
      if (!this.updateLabelBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestBody: any = {};
      if (name) requestBody.name = name;
      if (messageListVisibility) requestBody.messageListVisibility = messageListVisibility;
      if (labelListVisibility) requestBody.labelListVisibility = labelListVisibility;
      if (backgroundColor || textColor) {
        requestBody.color = {};
        if (backgroundColor) requestBody.color.backgroundColor = backgroundColor;
        if (textColor) requestBody.color.textColor = textColor;
      }

      const response = await this.updateLabelBreaker.fire({
        userId: 'me',
        id: labelId,
        requestBody,
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateLabel');
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId: string): Promise<{ success: boolean }> {
    try {
      if (!this.deleteLabelBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.deleteLabelBreaker.fire({
        userId: 'me',
        id: labelId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteLabel');
      throw new Error(errorMessage);
    }
  }

  /**
   * List drafts
   */
  async listDrafts(maxResults = 20, pageToken?: string): Promise<{ drafts: GmailDraft[]; nextPageToken?: string }> {
    try {
      if (!this.listDraftsBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestParams: any = {
        userId: 'me',
        maxResults,
      };

      if (pageToken) requestParams.pageToken = pageToken;

      const response = await this.listDraftsBreaker.fire(requestParams);

      return {
        drafts: response.data.drafts || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listDrafts');
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a draft
   */
  async createDraft(params: CreateDraftParams): Promise<GmailDraft> {
    const { to, subject, body, cc, bcc, isHtml = false } = params;

    try {
      if (!this.createDraftBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const mimeType = isHtml ? 'text/html' : 'text/plain';
      const email = [
        `MIME-Version: 1.0`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: ${mimeType}; charset="UTF-8"`,
        '',
        body,
      ].filter(Boolean).join('\r\n');

      const encodedEmail = Buffer.from(email).toString('base64url');

      const response = await this.createDraftBreaker.fire({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createDraft');
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<{ success: boolean }> {
    try {
      if (!this.deleteDraftBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.deleteDraftBreaker.fire({
        userId: 'me',
        id: draftId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteDraft');
      throw new Error(errorMessage);
    }
  }

  /**
   * Send a draft
   */
  async sendDraft(draftId: string): Promise<GmailMessage> {
    try {
      if (!this.sendDraftBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.sendDraftBreaker.fire({
        userId: 'me',
        requestBody: {
          id: draftId,
        },
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'sendDraft');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get an attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<GmailAttachment> {
    try {
      if (!this.getAttachmentBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getAttachmentBreaker.fire({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      return {
        attachmentId,
        size: response.data.size || 0,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getAttachment');
      throw new Error(errorMessage);
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, maxResults = 20): Promise<GmailMessage[]> {
    const result = await this.listMessages({ q: query, maxResults });
    return result.messages;
  }

  /**
   * Get unread messages
   */
  async getUnreadMessages(maxResults = 20): Promise<GmailMessage[]> {
    const result = await this.listMessages({
      labelIds: [GMAIL_LABELS.INBOX, GMAIL_LABELS.UNREAD],
      maxResults,
    });
    return result.messages;
  }

  /**
   * Get sent messages
   */
  async getSentMessages(maxResults = 20): Promise<GmailMessage[]> {
    const result = await this.listMessages({
      labelIds: [GMAIL_LABELS.SENT],
      maxResults,
    });
    return result.messages;
  }

  /**
   * Get starred messages
   */
  async getStarredMessages(maxResults = 20): Promise<GmailMessage[]> {
    const result = await this.listMessages({
      labelIds: [GMAIL_LABELS.STARRED],
      maxResults,
    });
    return result.messages;
  }

  /**
   * Get trashed messages
   */
  async getTrashedMessages(maxResults = 20): Promise<GmailMessage[]> {
    const result = await this.listMessages({
      labelIds: [GMAIL_LABELS.TRASH],
      maxResults,
      includeSpamTrash: true,
    });
    return result.messages;
  }
}
