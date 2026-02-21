/**
 * MCP API Service
 * Handles communication with MCP servers via JSON-RPC
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

let requestId = 0;

function getNextRequestId(): number {
  return ++requestId;
}

/**
 * Send a JSON-RPC request to the MCP server
 */
async function sendJsonRpcRequest<T>(
  baseUrl: string,
  token: string,
  method: string,
  params?: Record<string, any>,
  path: string = '/'
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: getNextRequestId(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Unknown RPC error');
  }

  return data.result;
}

/**
 * Initialize the MCP connection
 */
export async function initializeMcp(baseUrl: string, token: string): Promise<any> {
  return sendJsonRpcRequest(baseUrl, token, 'initialize');
}

/**
 * List available tools from the MCP server
 */
export async function listTools(baseUrl: string, token: string): Promise<{ tools: McpTool[] }> {
  return sendJsonRpcRequest(baseUrl, token, 'tools/list');
}

/**
 * Call a tool on the MCP server
 */
export async function callTool(
  baseUrl: string,
  token: string,
  toolName: string,
  args: Record<string, any> = {}
): Promise<McpToolResult> {
  return sendJsonRpcRequest(baseUrl, token, 'tools/call', {
    name: toolName,
    arguments: args,
  });
}

/**
 * Call a tool and return the result as a string
 */
export async function callToolAndGetText(
  baseUrl: string,
  token: string,
  toolName: string,
  args: Record<string, any> = {}
): Promise<string> {
  const result = await callTool(baseUrl, token, toolName, args);

  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'Tool execution failed');
  }

  // Extract text from content
  if (result.content && result.content.length > 0) {
    const rawText = result.content
      .map(c => c.text || (c.data ? `[Binary data: ${c.mimeType}]` : ''))
      .filter(Boolean)
      .join('\n');

    // Try to format JSON responses nicely
    return formatToolResponse(rawText, toolName);
  }

  return 'Operation completed successfully.';
}

/**
 * Format tool response for better readability
 */
function formatToolResponse(text: string, _toolName: string): string {
  // Check if text already contains readable format (from MCP server)
  if (text.includes('Form created successfully') ||
      text.includes('Found') && text.includes('forms:') ||
      text.includes('Form Details:') ||
      text.includes('Form has') && text.includes('questions:')) {
    // Convert URLs in the text to markdown links
    return convertUrlsToMarkdownLinks(text);
  }

  // Try to parse as JSON
  try {
    const data = JSON.parse(text);

    // ── Gmail: Success action responses ──
    if (data.success && data.action) {
      return formatGmailActionResponse(data);
    }

    // ── Gmail: Profile ──
    if (data.action === 'get_profile' && data.emailAddress) {
      return `**Gmail Profile**\n\n` +
        `**Email:** ${data.emailAddress}\n` +
        `**Total Messages:** ${data.messagesTotal?.toLocaleString() || 'N/A'}\n` +
        `**Total Threads:** ${data.threadsTotal?.toLocaleString() || 'N/A'}\n` +
        (data.historyId ? `**History ID:** \`${data.historyId}\`` : '');
    }

    // ── Gmail: Labels list ──
    if (data.action === 'list_labels' && data.labels) {
      return formatGmailLabels(data.labels);
    }

    // ── Gmail: Threads list ──
    if (data.action === 'list_threads' && data.threads) {
      return formatGmailThreads(data.threads);
    }

    // ── Gmail: Thread detail ──
    if (data.action === 'get_thread' && data.messages) {
      return formatGmailThreadDetail(data);
    }

    // ── Gmail: Drafts list ──
    if (data.action === 'list_drafts' && data.drafts) {
      return formatGmailDrafts(data.drafts);
    }

    // ── Gmail: Message array (list_messages, search, get_unread, etc.) ──
    if (Array.isArray(data) && data.length > 0 && data[0].from !== undefined) {
      return formatGmailMessages(data);
    }

    // ── Gmail: Single email detail (get_message) ──
    if (data.from !== undefined && data.subject !== undefined && data.body !== undefined) {
      return formatGmailSingleMessage(data);
    }

    // Handle files list (Google Drive)
    if (data.files && Array.isArray(data.files)) {
      if (data.files.length === 0) {
        return 'No files found.';
      }
      let output = `Found **${data.files.length}** file(s):\n\n`;
      data.files.slice(0, 15).forEach((file: any, index: number) => {
        const icon = getFileIconEmoji(file.mimeType);
        output += `${index + 1}. ${icon} **${file.name}**\n`;
        if (file.modifiedTime) {
          output += `   Modified: ${new Date(file.modifiedTime).toLocaleDateString()}\n`;
        }
        if (file.webViewLink) {
          output += `   [Open in Drive](${file.webViewLink})\n`;
        }
        output += '\n';
      });
      if (data.files.length > 15) {
        output += `\n*...and ${data.files.length - 15} more files.*`;
      }
      return output;
    }

    // Handle forms list (Google Forms)
    if (data.forms && Array.isArray(data.forms)) {
      if (data.forms.length === 0) {
        return 'No forms found.';
      }
      let output = `Found **${data.forms.length}** form(s):\n\n`;
      data.forms.forEach((form: any, index: number) => {
        output += `${index + 1}. **${form.title || form.name || 'Untitled'}**\n`;
        if (form.formId) output += `   ID: \`${form.formId}\`\n`;
        if (form.responderUri) output += `   [Open Form](${form.responderUri})\n`;
        output += '\n';
      });
      return output;
    }

    // Handle single file/form details
    if (data.id && data.name) {
      const icon = getFileIconEmoji(data.mimeType);
      let output = `${icon} **${data.name}**\n\n`;
      if (data.mimeType) output += `**Type:** ${data.mimeType}\n`;
      if (data.size) output += `**Size:** ${formatFileSize(Number(data.size))}\n`;
      if (data.modifiedTime) output += `**Modified:** ${new Date(data.modifiedTime).toLocaleDateString()}\n`;
      if (data.createdTime) output += `**Created:** ${new Date(data.createdTime).toLocaleDateString()}\n`;
      if (data.webViewLink) output += `\n[Open in Drive](${data.webViewLink})`;
      return output;
    }

    // Handle form creation response
    if (data.formId && data.responderUri) {
      return `**Form created successfully!**\n\n` +
        `**Title:** ${data.title || 'Untitled'}\n` +
        `**Form ID:** \`${data.formId}\`\n\n` +
        `[Open Form](${data.responderUri})`;
    }

    // Default: return formatted JSON in a code block
    return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
  } catch {
    // Not JSON - convert any URLs to markdown links
    return convertUrlsToMarkdownLinks(text);
  }
}

// ── Gmail formatting helpers ──

function formatGmailMessages(messages: any[]): string {
  if (messages.length === 0) {
    return 'No emails found.';
  }

  let output = `**Inbox** - ${messages.length} message${messages.length !== 1 ? 's' : ''}\n\n`;

  messages.slice(0, 25).forEach((msg, index) => {
    const from = msg.from || 'Unknown sender';
    const subject = msg.subject || '(No subject)';
    const date = msg.date || '';
    const isUnread = msg.labels?.includes('UNREAD');
    const isStarred = msg.labels?.includes('STARRED');

    // Use snippet for clean preview (Gmail API generates a clean text summary)
    const preview = (msg.snippet || '').replace(/\s+/g, ' ').trim();

    const badges: string[] = [];
    if (isUnread) badges.push('new');
    if (isStarred) badges.push('starred');
    const badgeStr = badges.length > 0 ? `  \`${badges.join('  ')}\`` : '';

    // Gmail web link
    const gmailLink = msg.id ? `[Open in Gmail](https://mail.google.com/mail/u/0/#inbox/${msg.id})` : '';

    output += `---\n\n`;
    output += `**${index + 1}. ${subject}**${badgeStr}\n\n`;
    output += `> **From:** ${formatEmailSender(from)}  \n`;
    output += `> **Date:** ${date ? formatEmailDate(date) : 'Unknown'}\n\n`;
    if (preview) {
      output += `${preview}\n\n`;
    }
    if (gmailLink) {
      output += `${gmailLink}\n\n`;
    }
  });

  if (messages.length > 25) {
    output += `---\n\n*...and ${messages.length - 25} more messages.*\n`;
  }

  return output;
}

function formatGmailSingleMessage(msg: any): string {
  let output = `**${msg.subject || '(No subject)'}**\n\n`;
  output += `**From:** ${formatEmailSender(msg.from || 'Unknown')}\n`;
  output += `**To:** ${msg.to || 'Unknown'}\n`;
  if (msg.cc) output += `**CC:** ${msg.cc}\n`;
  if (msg.date) output += `**Date:** ${formatEmailDate(msg.date)}\n`;
  if (msg.attachments && msg.attachments.length > 0) {
    output += `**Attachments:** ${msg.attachments.map((a: any) => a.filename).join(', ')}\n`;
  }
  output += '\n---\n\n';

  // Clean up HTML if needed
  let body = msg.body || msg.snippet || '';
  if (msg.isHtml) {
    body = stripHtmlTags(body);
  }
  // Truncate very long bodies
  if (body.length > 2000) {
    body = body.slice(0, 2000) + '\n\n*... (message truncated)*';
  }
  output += body;

  // Gmail link
  if (msg.id) {
    output += `\n\n---\n\n[Open in Gmail](https://mail.google.com/mail/u/0/#inbox/${msg.id})`;
  }

  return output;
}

function formatGmailActionResponse(data: any): string {
  const actionMessages: Record<string, string> = {
    'send_message': `**Email sent successfully!**\n\nMessage ID: \`${data.id}\`${data.threadId ? `\nThread ID: \`${data.threadId}\`` : ''}`,
    'reply_to_message': `**Reply sent successfully!**\n\nMessage ID: \`${data.id}\`${data.threadId ? `\nThread ID: \`${data.threadId}\`` : ''}`,
    'forward_message': `**Message forwarded successfully!**\n\nMessage ID: \`${data.id}\`${data.threadId ? `\nThread ID: \`${data.threadId}\`` : ''}`,
    'trash_message': `**Message moved to trash.**\n\nMessage ID: \`${data.messageId}\``,
    'untrash_message': `**Message restored from trash.**\n\nMessage ID: \`${data.messageId}\``,
    'delete_message': `**Message permanently deleted.**\n\nMessage ID: \`${data.messageId}\``,
    'mark_as_read': `**Message marked as read.**\n\nMessage ID: \`${data.messageId}\``,
    'mark_as_unread': `**Message marked as unread.**\n\nMessage ID: \`${data.messageId}\``,
    'star_message': `**Message starred.**\n\nMessage ID: \`${data.messageId}\``,
    'unstar_message': `**Star removed from message.**\n\nMessage ID: \`${data.messageId}\``,
    'archive_message': `**Message archived.**\n\nMessage ID: \`${data.messageId}\``,
    'modify_labels': `**Labels updated.**\n\nMessage ID: \`${data.messageId}\``,
    'trash_thread': `**Thread moved to trash.**\n\nThread ID: \`${data.threadId}\``,
    'delete_thread': `**Thread permanently deleted.**\n\nThread ID: \`${data.threadId}\``,
    'create_label': `**Label created!**\n\nName: ${data.name}\nID: \`${data.id}\``,
    'update_label': `**Label updated!**\n\nName: ${data.name}\nID: \`${data.id}\``,
    'delete_label': `**Label deleted.**\n\nLabel ID: \`${data.labelId}\``,
    'create_draft': `**Draft created!**\n\nDraft ID: \`${data.draftId}\``,
    'delete_draft': `**Draft deleted.**\n\nDraft ID: \`${data.draftId}\``,
    'send_draft': `**Draft sent!**\n\nMessage ID: \`${data.id}\`${data.threadId ? `\nThread ID: \`${data.threadId}\`` : ''}`,
    'get_attachment': `**Attachment retrieved.**\n\nSize: ${formatFileSize(data.size || 0)}`,
  };

  return actionMessages[data.action] || `**Operation completed successfully.**`;
}

function formatGmailLabels(labels: any[]): string {
  if (!labels || labels.length === 0) {
    return 'No labels found.';
  }

  const systemLabels = labels.filter((l: any) => l.type === 'system');
  const userLabels = labels.filter((l: any) => l.type !== 'system');

  let output = '**Gmail Labels**\n\n';

  if (systemLabels.length > 0) {
    output += '**System Labels:**\n';
    systemLabels.forEach((l: any) => {
      output += `- ${l.name} (\`${l.id}\`)\n`;
    });
  }

  if (userLabels.length > 0) {
    output += '\n**Custom Labels:**\n';
    userLabels.forEach((l: any) => {
      output += `- ${l.name} (\`${l.id}\`)\n`;
    });
  }

  return output;
}

function formatGmailThreads(threads: any[]): string {
  if (!threads || threads.length === 0) {
    return 'No threads found.';
  }

  let output = `**${threads.length} thread(s)**\n\n`;
  threads.slice(0, 20).forEach((thread: any, i: number) => {
    output += `${i + 1}. **Thread** \`${thread.id}\`\n`;
    if (thread.snippet) {
      output += `   ${thread.snippet.slice(0, 100)}${thread.snippet.length > 100 ? '...' : ''}\n`;
    }
    output += '\n';
  });

  return output;
}

function formatGmailThreadDetail(data: any): string {
  let output = `**Thread** \`${data.threadId}\` - ${data.messages.length} message(s)\n\n`;

  data.messages.forEach((msg: any, i: number) => {
    output += `---\n\n`;
    output += `**Message ${i + 1}:** ${msg.subject || '(No subject)'}\n`;
    output += `**From:** ${formatEmailSender(msg.from || '')}\n`;
    if (msg.date) output += `**Date:** ${formatEmailDate(msg.date)}\n`;
    output += '\n';
    if (msg.snippet) {
      output += `${msg.snippet.slice(0, 200)}${msg.snippet.length > 200 ? '...' : ''}\n`;
    }
    if (msg.id) output += `\nID: \`${msg.id}\`\n`;
    output += '\n';
  });

  return output;
}

function formatGmailDrafts(drafts: any[]): string {
  if (!drafts || drafts.length === 0) {
    return 'No drafts found.';
  }

  let output = `**${drafts.length} draft(s)**\n\n`;
  drafts.forEach((draft: any, i: number) => {
    output += `${i + 1}. Draft ID: \`${draft.id}\`\n`;
  });

  return output;
}

function formatEmailSender(from: string): string {
  // Extract just the name if it's "Name <email>" format
  const match = from.match(/^"?([^"<]+)"?\s*<(.+)>$/);
  if (match) {
    return `**${match[1].trim()}** (${match[2]})`;
  }
  return from;
}

function formatEmailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert plain URLs in text to markdown links
 */
function convertUrlsToMarkdownLinks(text: string): string {
  // Match URLs that aren't already in markdown format
  const urlRegex = /(?<!\]\()(?<!\[)(https?:\/\/[^\s\)]+)/g;
  return text.replace(urlRegex, (url) => {
    // Determine link text based on URL
    let linkText = 'Open Link';
    if (url.includes('docs.google.com/forms')) linkText = '📝 Open Form';
    else if (url.includes('docs.google.com/document')) linkText = '📄 Open Document';
    else if (url.includes('docs.google.com/spreadsheets')) linkText = '📊 Open Spreadsheet';
    else if (url.includes('drive.google.com')) linkText = '📂 Open in Drive';
    else if (url.includes('forms/d/e/')) linkText = '📝 Open Form';
    return `[${linkText}](${url})`;
  });
}

/**
 * Format file size to human readable
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get emoji icon for file type
 */
function getFileIconEmoji(mimeType: string): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('folder')) return '📁';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('form')) return '📋';
  return '📄';
}

/**
 * Generate a help message from available tools
 */
export function generateToolsHelpMessage(tools: McpTool[], serverName: string): string {
  if (!tools || tools.length === 0) {
    return `No tools available for ${serverName}.`;
  }

  let message = `Here's what I can help you with in **${serverName}**:\n\n**Available Commands:**\n`;

  tools.forEach(tool => {
    const toolName = tool.name.replace(/_/g, ' ');
    message += `- **"${toolName}"** - ${tool.description || 'No description'}\n`;
  });

  message += `\n**Examples:**\n`;
  // Add a few example commands based on tool names
  const exampleTools = tools.slice(0, 3);
  exampleTools.forEach(tool => {
    const toolName = tool.name.replace(/_/g, ' ');
    message += `- "${toolName}"\n`;
  });

  message += `\nTry one of the commands above!`;
  return message;
}

/**
 * Match user input to a tool
 */
export function matchUserInputToTool(
  input: string,
  tools: McpTool[]
): { tool: McpTool | null; args: Record<string, unknown>; missingRequired: string[] } {
  const lowerInput = input.toLowerCase().trim();
  const originalInput = input.trim();

  // Try to match tool name (with underscores replaced by spaces)
  for (const tool of tools) {
    const toolNameLower = tool.name.toLowerCase();
    const toolNameSpaces = toolNameLower.replace(/_/g, ' ');

    // Exact match or starts with
    if (lowerInput === toolNameSpaces ||
        lowerInput === toolNameLower ||
        lowerInput.startsWith(toolNameSpaces + ' ') ||
        lowerInput.startsWith(toolNameLower + ' ')) {

      // Extract potential arguments from the rest of the input
      const args: Record<string, unknown> = {};
      let restOfInput = originalInput;

      // Remove the tool name from input to get arguments
      if (lowerInput.startsWith(toolNameSpaces + ' ')) {
        restOfInput = originalInput.slice(toolNameSpaces.length).trim();
      } else if (lowerInput.startsWith(toolNameLower + ' ')) {
        restOfInput = originalInput.slice(toolNameLower.length).trim();
      } else {
        restOfInput = '';
      }

      // If there's remaining text, try to use it as the first required string argument
      if (restOfInput && tool.inputSchema?.properties) {
        const required = tool.inputSchema.required || [];
        const propNames = Object.keys(tool.inputSchema.properties);

        // Find the first required string property
        const firstRequiredString = propNames.find(
          p => required.includes(p) && (tool.inputSchema.properties?.[p] as any)?.type === 'string'
        );

        if (firstRequiredString) {
          args[firstRequiredString] = restOfInput;
        } else {
          // Otherwise use first string property
          const firstStringProp = propNames.find(
            p => (tool.inputSchema.properties?.[p] as any)?.type === 'string'
          );
          if (firstStringProp) {
            args[firstStringProp] = restOfInput;
          }
        }
      }

      // Check for missing required arguments
      const missingRequired: string[] = [];
      if (tool.inputSchema?.required) {
        for (const req of tool.inputSchema.required) {
          if (args[req] === undefined) {
            missingRequired.push(req);
          }
        }
      }

      return { tool, args, missingRequired };
    }

    // Check if input contains key words from tool name
    const toolWords = toolNameSpaces.split(' ');
    const inputWords = lowerInput.split(' ');
    const matchedWords = toolWords.filter(w => inputWords.includes(w));

    if (matchedWords.length >= Math.ceil(toolWords.length * 0.7)) {
      // Check for missing required arguments
      const missingRequired: string[] = [];
      if (tool.inputSchema?.required) {
        missingRequired.push(...tool.inputSchema.required);
      }
      return { tool, args: {}, missingRequired };
    }
  }

  return { tool: null, args: {}, missingRequired: [] };
}

/**
 * List files from Google Drive
 */
export async function listDriveFiles(
  baseUrl: string,
  token: string,
  options?: { folderId?: string; pageSize?: number; query?: string }
): Promise<DriveFile[]> {
  const result = await callTool(baseUrl, token, 'list_files', options || {});

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to list files');
  }

  const data = JSON.parse(result.content[0].text);
  return data.files || [];
}

/**
 * Search files in Google Drive
 */
export async function searchDriveFiles(
  baseUrl: string,
  token: string,
  query: string
): Promise<DriveFile[]> {
  const result = await callTool(baseUrl, token, 'search_files', { query });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to search files');
  }

  const data = JSON.parse(result.content[0].text);
  return data.files || [];
}

/**
 * Get file details from Google Drive
 */
export async function getFileDetails(
  baseUrl: string,
  token: string,
  fileId: string
): Promise<any> {
  const result = await callTool(baseUrl, token, 'get_file', { fileId });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to get file');
  }

  return JSON.parse(result.content[0].text);
}

/**
 * Parse user message and determine appropriate action
 */
export function parseUserIntent(message: string): {
  action: 'list' | 'search' | 'help' | 'unknown';
  query?: string;
} {
  const lowerMessage = message.toLowerCase().trim();

  // Skip if user is asking about forms (should use Google Forms service)
  if (
    lowerMessage.includes('forms') ||
    lowerMessage.includes('form') ||
    lowerMessage.includes('survey') ||
    lowerMessage.includes('questionnaire')
  ) {
    return { action: 'unknown' };
  }

  // List files intent
  if (
    lowerMessage.includes('list') ||
    lowerMessage.includes('show') ||
    lowerMessage.includes('files') ||
    lowerMessage === 'ls' ||
    lowerMessage.includes('what files') ||
    lowerMessage.includes('my files') ||
    lowerMessage.includes('my documents')
  ) {
    return { action: 'list' };
  }

  // Search intent
  if (
    lowerMessage.startsWith('search') ||
    lowerMessage.startsWith('find') ||
    lowerMessage.startsWith('look for') ||
    lowerMessage.includes('search for')
  ) {
    // Extract search query
    const searchMatch = lowerMessage.match(/(?:search|find|look for)\s*(?:for)?\s*(.+)/i);
    if (searchMatch) {
      return { action: 'search', query: searchMatch[1].trim() };
    }
    return { action: 'search' };
  }

  // Help intent
  if (
    lowerMessage === 'help' ||
    lowerMessage === '?' ||
    lowerMessage.includes('what can you do') ||
    lowerMessage.includes('how do')
  ) {
    return { action: 'help' };
  }

  return { action: 'unknown' };
}

/**
 * Format files as a readable message
 */
export function formatFilesAsMessage(files: DriveFile[]): string {
  if (files.length === 0) {
    return 'No files found in your Google Drive.';
  }

  let message = `Found **${files.length}** files in your Google Drive:\n\n`;

  files.slice(0, 20).forEach((file, index) => {
    const icon = getFileIcon(file.mimeType);
    message += `${index + 1}. ${icon} **${file.name}**\n`;
    if (file.modifiedTime) {
      const date = new Date(file.modifiedTime).toLocaleDateString();
      message += `   *Modified: ${date}*\n`;
    }
  });

  if (files.length > 20) {
    message += `\n...and ${files.length - 20} more files.`;
  }

  return message;
}

/**
 * Get an icon for a file type
 */
function getFileIcon(mimeType: string): string {
  if (mimeType.includes('folder')) return '\uD83D\uDCC1';
  if (mimeType.includes('document') || mimeType.includes('word')) return '\uD83D\uDCC4';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\uD83D\uDCCA';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\uD83D\uDCCA';
  if (mimeType.includes('image')) return '\uD83D\uDDBC\uFE0F';
  if (mimeType.includes('pdf')) return '\uD83D\uDCD5';
  if (mimeType.includes('video')) return '\uD83C\uDFAC';
  if (mimeType.includes('audio')) return '\uD83C\uDFB5';
  return '\uD83D\uDCC4';
}

/**
 * Get help message for available commands
 */
export function getHelpMessage(): string {
  return `Here's what I can help you with:

**Available Commands:**
- **"list files"** or **"show my files"** - List files in your Google Drive
- **"search [query]"** - Search for files by name
- **"find [query]"** - Same as search
- **"help"** - Show this help message

**Examples:**
- "Show my files"
- "Search for project report"
- "Find budget spreadsheet"

Try asking me to list your files!`;
}

// ─── Gmail MCP API helpers ───────────────────────────────────────────────────

export interface GmailMessage {
  id: string;
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  snippet?: string;
  date?: string;
  labelIds?: string[];
}

/**
 * Call a tool on the Gmail MCP server (uses root path "/")
 */
async function callGmailTool(
  baseUrl: string,
  token: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<McpToolResult> {
  return sendJsonRpcRequest(baseUrl, token, 'tools/call', {
    name: toolName,
    arguments: args,
  }, '/');
}

/**
 * Parse user message and determine Gmail-specific action
 */
export function parseGmailIntent(message: string): {
  action: 'inbox' | 'search' | 'send' | 'labels' | 'help' | 'unknown';
  query?: string;
  to?: string;
  subject?: string;
  body?: string;
} {
  const lower = message.toLowerCase().trim();

  // Inbox / list intent
  if (
    lower.includes('inbox') ||
    lower.includes('my emails') ||
    lower.includes('my mail') ||
    lower.includes('list emails') ||
    lower.includes('list messages') ||
    lower.includes('show emails') ||
    lower.includes('show messages') ||
    lower.includes('show mail') ||
    lower.includes('recent emails') ||
    lower.includes('recent mail') ||
    lower.includes('check mail') ||
    lower.includes('check email') ||
    lower.includes('last mail') ||
    lower.includes('last email') ||
    lower.includes('latest mail') ||
    lower.includes('latest email') ||
    /show.*\d+.*mail/i.test(lower) ||
    /show.*\d+.*email/i.test(lower) ||
    /get.*mail/i.test(lower) ||
    /get.*email/i.test(lower) ||
    lower === 'emails' ||
    lower === 'mail'
  ) {
    return { action: 'inbox' };
  }

  // Search intent
  if (
    lower.startsWith('search emails') ||
    lower.startsWith('search mail') ||
    lower.startsWith('find emails') ||
    lower.startsWith('find mail') ||
    lower.includes('search for email') ||
    lower.includes('find email')
  ) {
    const searchMatch = lower.match(/(?:search|find)\s*(?:for)?\s*(?:emails?|mail|messages?)\s*(?:about|for|from|with)?\s*(.+)/i);
    if (searchMatch) {
      return { action: 'search', query: searchMatch[1].trim() };
    }
    return { action: 'search' };
  }

  // Labels intent
  if (
    lower.includes('labels') ||
    lower.includes('categories') ||
    lower.includes('folders') ||
    lower === 'list labels'
  ) {
    return { action: 'labels' };
  }

  // Send intent - try to extract email details
  if (
    lower.startsWith('send') ||
    lower.startsWith('compose') ||
    lower.startsWith('write email') ||
    lower.startsWith('write an email') ||
    lower.startsWith('draft') ||
    lower.includes('email to ') ||
    lower.includes('mail to ')
  ) {
    // Try to extract: "send 'message' to email@example.com"
    // Or: "send email to email@example.com with subject X and body Y"
    // Or: "email to email@example.com saying message"

    // Extract email address
    const emailMatch = message.match(/(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const to = emailMatch ? emailMatch[1] : undefined;

    // Extract message/body in various formats
    let body: string | undefined;
    let subject: string | undefined;

    // Format: send 'message' to email
    const quotedMsgMatch = message.match(/send\s+['"](.+?)['"]\s+(?:to|mail)/i);
    if (quotedMsgMatch) {
      body = quotedMsgMatch[1];
      subject = body.length > 50 ? body.slice(0, 47) + '...' : body;
    }

    // Format: with subject X and body Y
    const subjectMatch = message.match(/(?:with\s+)?subject\s*[:\s]+['"]?([^'"]+?)['"]?\s*(?:and|body|$)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }

    const bodyMatch = message.match(/(?:body|message|saying|content)\s*[:\s]+['"]?(.+?)['"]?$/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    }

    // If no body found but has "saying" pattern
    const sayingMatch = message.match(/saying\s+['"]?(.+?)['"]?$/i);
    if (!body && sayingMatch) {
      body = sayingMatch[1].trim();
    }

    return { action: 'send', to, subject, body };
  }

  // Help intent
  if (
    lower === 'help' ||
    lower === '?' ||
    lower.includes('what can you do') ||
    lower.includes('how do')
  ) {
    return { action: 'help' };
  }

  return { action: 'unknown' };
}

/**
 * List Gmail messages (inbox)
 */
export async function listGmailMessages(
  baseUrl: string,
  token: string,
  options?: { maxResults?: number; query?: string }
): Promise<GmailMessage[]> {
  const result = await callGmailTool(baseUrl, token, 'list_messages', {
    maxResults: options?.maxResults ?? 15,
    ...(options?.query ? { query: options.query } : {}),
  });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to list messages');
  }

  const data = JSON.parse(result.content[0].text);
  return Array.isArray(data) ? data : data.messages || [];
}

/**
 * Search Gmail messages
 */
export async function searchGmailMessages(
  baseUrl: string,
  token: string,
  query: string,
  maxResults: number = 15
): Promise<GmailMessage[]> {
  const result = await callGmailTool(baseUrl, token, 'search_messages', {
    query,
    maxResults,
  });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to search messages');
  }

  const data = JSON.parse(result.content[0].text);
  return Array.isArray(data) ? data : data.messages || [];
}

/**
 * Get Gmail user profile
 */
export async function getGmailProfile(
  baseUrl: string,
  token: string
): Promise<Record<string, unknown>> {
  const result = await callGmailTool(baseUrl, token, 'get_profile');

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to get profile');
  }

  return JSON.parse(result.content[0].text);
}

/**
 * Format Gmail messages as a readable markdown message
 */
export function formatEmailsAsMessage(messages: GmailMessage[]): string {
  if (messages.length === 0) {
    return 'No emails found.';
  }

  let output = `Found **${messages.length}** email(s):\n\n`;

  messages.slice(0, 20).forEach((msg, index) => {
    const from = msg.from || 'Unknown sender';
    const subject = msg.subject || '(No subject)';
    const date = msg.date ? new Date(msg.date).toLocaleDateString() : '';
    const snippet = msg.snippet ? `\n   ${msg.snippet.slice(0, 80)}${msg.snippet.length > 80 ? '...' : ''}` : '';

    output += `${index + 1}. **${subject}**\n`;
    output += `   From: ${from}`;
    if (date) output += ` | ${date}`;
    output += snippet + '\n\n';
  });

  if (messages.length > 20) {
    output += `\n...and ${messages.length - 20} more emails.`;
  }

  return output;
}

/**
 * List Gmail labels
 */
export async function listGmailLabels(
  baseUrl: string,
  token: string
): Promise<Array<{ name?: string; id?: string }>> {
  const result = await callGmailTool(baseUrl, token, 'list_labels');

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to list labels');
  }

  const data = JSON.parse(result.content[0].text);
  return Array.isArray(data) ? data : data.labels || [];
}

/**
 * Send a Gmail message
 */
export async function sendGmailMessage(
  baseUrl: string,
  token: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; message: string }> {
  const result = await callGmailTool(baseUrl, token, 'send_message', {
    to,
    subject,
    body,
  });

  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'Failed to send email');
  }

  return {
    id: result.content?.[0]?.text || '',
    message: `Email sent successfully to ${to}!`,
  };
}

/**
 * Get Gmail-specific help message
 */
export function getGmailHelpMessage(): string {
  return `Here's what I can help you with in **Gmail**:

**Available Commands:**
- **"show my inbox"** or **"check email"** - List recent emails
- **"search emails about [topic]"** - Search your emails
- **"find emails from [sender]"** - Find emails from a specific sender
- **"send 'message' to email@example.com"** - Send an email
- **"labels"** - List your Gmail labels
- **"help"** - Show this help message

**Examples:**
- "Show my inbox"
- "Check my email"
- "Search emails about project update"
- "Find emails from john@example.com"
- "Send 'Hello!' to friend@example.com"
- "Email to boss@work.com saying Meeting confirmed"

Try asking me to show your inbox!`;
}

// ─── Google Forms MCP API helpers ────────────────────────────────────────────

export interface GoogleForm {
  formId: string;
  title: string;
  description?: string;
  responderUri?: string;
  documentTitle?: string;
}

export interface FormQuestion {
  questionId: string;
  title: string;
  description?: string;
  questionType: string;
  required?: boolean;
  options?: string[];
}

/**
 * Call a tool on the Google Forms MCP server
 */
async function callFormsTool(
  baseUrl: string,
  token: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<McpToolResult> {
  return sendJsonRpcRequest(baseUrl, token, 'tools/call', {
    name: toolName,
    arguments: args,
  }, '/');
}

/**
 * List all Google Forms
 */
export async function listForms(
  baseUrl: string,
  token: string,
  pageSize: number = 20
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'list_forms', { pageSize });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to list forms');
  }

  // The server returns formatted text directly
  return result.content[0].text;
}

/**
 * Create a new Google Form
 */
export async function createForm(
  baseUrl: string,
  token: string,
  title: string,
  description?: string
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'create_form', {
    title,
    description,
  });

  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'Failed to create form');
  }

  return result.content?.[0]?.text || 'Form created successfully';
}

/**
 * Get form details
 */
export async function getForm(
  baseUrl: string,
  token: string,
  formId: string
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'get_form', { formId });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to get form');
  }

  return result.content[0].text;
}

/**
 * Get form questions
 */
export async function getFormQuestions(
  baseUrl: string,
  token: string,
  formId: string
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'get_form_questions', { formId });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to get form questions');
  }

  return result.content[0].text;
}

/**
 * Add a question to a form
 */
export async function addQuestion(
  baseUrl: string,
  token: string,
  formId: string,
  title: string,
  questionType: 'TEXT' | 'PARAGRAPH_TEXT' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROPDOWN',
  options?: {
    description?: string;
    required?: boolean;
    choices?: string[];
  }
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'add_question', {
    formId,
    title,
    questionType,
    description: options?.description,
    required: options?.required ?? false,
    options: options?.choices,
  });

  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'Failed to add question');
  }

  return result.content?.[0]?.text || 'Question added';
}

/**
 * List form responses
 */
export async function listFormResponses(
  baseUrl: string,
  token: string,
  formId: string,
  pageSize: number = 50
): Promise<string> {
  const result = await callFormsTool(baseUrl, token, 'list_responses', {
    formId,
    pageSize,
  });

  if (result.isError || !result.content?.[0]?.text) {
    throw new Error(result.content?.[0]?.text || 'Failed to list responses');
  }

  return result.content[0].text;
}

/**
 * Parse user message and determine Google Forms-specific action
 */
export function parseFormsIntent(message: string): {
  action: 'list' | 'create' | 'get' | 'questions' | 'responses' | 'help' | 'unknown';
  formTitle?: string;
  formId?: string;
  description?: string;
} {
  const lower = message.toLowerCase().trim();

  // List forms intent
  if (
    lower.includes('list forms') ||
    lower.includes('my forms') ||
    lower.includes('show forms') ||
    lower.includes('list my forms') ||
    lower.includes('show my forms') ||
    lower.includes('all forms') ||
    lower === 'forms'
  ) {
    return { action: 'list' };
  }

  // Create form intent
  if (
    lower.startsWith('create form') ||
    lower.startsWith('create a form') ||
    lower.startsWith('new form') ||
    lower.startsWith('make form') ||
    lower.startsWith('create google form') ||
    lower.includes('create form name') ||
    lower.includes('create google form name')
  ) {
    // Extract form title
    const titleMatch = message.match(/(?:create|new|make)\s+(?:a\s+)?(?:google\s+)?form\s+(?:name[d]?\s*[-:]?\s*)?['"]?([^'"]+?)['"]?$/i);
    const simpleMatch = message.match(/(?:create|new|make)\s+(?:a\s+)?(?:google\s+)?form\s+['"]?(.+?)['"]?$/i);

    const formTitle = titleMatch?.[1]?.trim() || simpleMatch?.[1]?.trim();
    return { action: 'create', formTitle };
  }

  // Get form details intent
  if (
    lower.startsWith('get form') ||
    lower.startsWith('show form') ||
    lower.includes('form details')
  ) {
    const idMatch = message.match(/form\s+([a-zA-Z0-9_-]+)/i);
    return { action: 'get', formId: idMatch?.[1] };
  }

  // Get questions intent
  if (
    lower.includes('questions') ||
    lower.includes('form questions')
  ) {
    const idMatch = message.match(/(?:form|questions)\s+([a-zA-Z0-9_-]+)/i);
    return { action: 'questions', formId: idMatch?.[1] };
  }

  // Get responses intent
  if (
    lower.includes('responses') ||
    lower.includes('form responses') ||
    lower.includes('submissions')
  ) {
    const idMatch = message.match(/(?:form|responses|submissions)\s+([a-zA-Z0-9_-]+)/i);
    return { action: 'responses', formId: idMatch?.[1] };
  }

  // Help intent
  if (
    lower === 'help' ||
    lower === '?' ||
    lower.includes('what can you do') ||
    lower.includes('how do')
  ) {
    return { action: 'help' };
  }

  return { action: 'unknown' };
}

/**
 * Get Google Forms-specific help message
 */
export function getFormsHelpMessage(): string {
  return `Here's what I can help you with in **Google Forms**:

**Available Commands:**
- **"list my forms"** or **"show forms"** - List all your Google Forms
- **"create form [name]"** - Create a new form
- **"get form [id]"** - Get details of a specific form
- **"form questions [id]"** - View questions in a form
- **"form responses [id]"** - View responses for a form
- **"help"** - Show this help message

**Examples:**
- "List my forms"
- "Create form Customer Survey"
- "Create a form named Feedback Form"
- "Show forms"

Try asking me to list your forms!`;
}
