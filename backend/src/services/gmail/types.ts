/**
 * Google Gmail server types
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  raw?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePartBody {
  attachmentId?: string;
  size?: number;
  data?: string;
}

export interface GmailThread {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
  snippet?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type?: 'system' | 'user';
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor?: string;
    backgroundColor?: string;
  };
}

export interface GmailDraft {
  id: string;
  message?: GmailMessage;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export interface GmailAttachment {
  attachmentId: string;
  size: number;
  data?: string;
  filename?: string;
  mimeType?: string;
}

// Request/Response interfaces
export interface ListMessagesParams {
  maxResults?: number;
  pageToken?: string;
  q?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface ListMessagesResult {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface ListThreadsParams {
  maxResults?: number;
  pageToken?: string;
  q?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface ListThreadsResult {
  threads: GmailThread[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface SendMessageParams {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
  threadId?: string;
  attachments?: AttachmentInput[];
}

export interface AttachmentInput {
  filename: string;
  content: string; // base64 encoded
  mimeType: string;
}

export interface ReplyMessageParams {
  messageId: string;
  body: string;
  isHtml?: boolean;
}

export interface ForwardMessageParams {
  messageId: string;
  to: string;
  additionalMessage?: string;
}

export interface ModifyLabelsParams {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface CreateLabelParams {
  name: string;
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  backgroundColor?: string;
  textColor?: string;
}

export interface UpdateLabelParams {
  labelId: string;
  name?: string;
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  backgroundColor?: string;
  textColor?: string;
}

export interface CreateDraftParams {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
}

export interface UpdateDraftParams {
  draftId: string;
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
}

export interface SearchMessagesParams {
  query: string;
  maxResults?: number;
}

// Parsed email for display
export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isHtml: boolean;
  labels: string[];
  attachments: {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }[];
}

// Gmail system labels
export const GMAIL_LABELS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFT: 'DRAFT',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
  UNREAD: 'UNREAD',
  STARRED: 'STARRED',
  IMPORTANT: 'IMPORTANT',
  CATEGORY_PERSONAL: 'CATEGORY_PERSONAL',
  CATEGORY_SOCIAL: 'CATEGORY_SOCIAL',
  CATEGORY_PROMOTIONS: 'CATEGORY_PROMOTIONS',
  CATEGORY_UPDATES: 'CATEGORY_UPDATES',
  CATEGORY_FORUMS: 'CATEGORY_FORUMS',
} as const;
