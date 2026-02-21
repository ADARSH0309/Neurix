/**
 * MCP HTTP Adapter for Google Drive
 *
 * Implements JSON-RPC 2.0 protocol for HTTP Streamable transport
 */

import { GDriveClient } from '../gdrive-client.js';
import { z } from 'zod';
import { GOOGLE_MIME_TYPES } from '../types.js';

// Validation schemas
const ListFilesSchema = z.object({
  folderId: z.string().optional(),
  query: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional().default(20),
  pageToken: z.string().optional(),
  orderBy: z.string().optional(),
});

const SearchFilesSchema = z.object({
  query: z.string(),
  maxResults: z.number().min(1).max(100).optional().default(20),
  fileType: z.string().optional(),
});

const GetFileSchema = z.object({
  fileId: z.string(),
});

const CreateFolderSchema = z.object({
  name: z.string(),
  parentId: z.string().optional(),
  description: z.string().optional(),
});

const UploadFileSchema = z.object({
  name: z.string(),
  content: z.string(),
  mimeType: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  isBase64: z.union([z.boolean(), z.string()]).optional().transform(val =>
    val === true || val === 'true' || val === '1'
  ),
});

const CreateGoogleDocSchema = z.object({
  name: z.string(),
  content: z.string().optional(),
  parentId: z.string().optional(),
});

const CreateGoogleSheetSchema = z.object({
  name: z.string(),
  content: z.string().optional(),
  parentId: z.string().optional(),
});

const CreatePresentationSchema = z.object({
  name: z.string(),
  slides: z.array(z.object({
    title: z.string(),
    body: z.string(),
  })).min(1),
  parentId: z.string().optional(),
});

const UpdateFileSchema = z.object({
  fileId: z.string(),
  name: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
});

const CopyFileSchema = z.object({
  fileId: z.string(),
  name: z.string().optional(),
  parentId: z.string().optional(),
});

const MoveFileSchema = z.object({
  fileId: z.string(),
  newParentId: z.string(),
});

const DeleteFileSchema = z.object({
  fileId: z.string(),
  permanent: z.boolean().optional().default(false),
});

const ShareFileSchema = z.object({
  fileId: z.string(),
  email: z.string().email().optional(),
  role: z.enum(['reader', 'writer', 'commenter']),
  type: z.enum(['user', 'group', 'domain', 'anyone']),
  domain: z.string().optional(),
  sendNotification: z.boolean().optional().default(true),
  message: z.string().optional(),
});

const UnshareFileSchema = z.object({
  fileId: z.string(),
  permissionId: z.string(),
});

const StarFileSchema = z.object({
  fileId: z.string(),
  starred: z.boolean(),
});

const MaxResultsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(20),
});

export class McpHttpAdapter {
  private driveClient: GDriveClient;
  private initialized = false;

  constructor(driveClient: GDriveClient) {
    this.driveClient = driveClient;
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
        name: 'neurix-gdrive-server',
        version: '0.1.0',
      },
    };
  }

  async listTools(): Promise<{ tools: any[] }> {
    return {
      tools: [
        // File listing tools
        {
          name: 'list_files',
          description: 'List files and folders in Google Drive. Can filter by folder, query, and sorting.',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: { type: 'string', description: 'Folder ID to list contents of (optional)' },
              query: { type: 'string', description: 'Additional query filter in Drive query syntax' },
              pageSize: { type: 'number', description: 'Number of files to return (1-100, default: 20)' },
              pageToken: { type: 'string', description: 'Token for pagination' },
              orderBy: { type: 'string', description: 'Sort order (e.g., "name", "modifiedTime desc")' },
            },
          },
        },
        {
          name: 'search_files',
          description: 'Search for files by name or content in Google Drive',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              maxResults: { type: 'number', description: 'Maximum results (1-100, default: 20)' },
              fileType: { type: 'string', description: 'Filter by MIME type (optional)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_recent',
          description: 'List recently viewed files',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number' } } },
        },
        {
          name: 'list_starred',
          description: 'List starred files',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number' } } },
        },
        {
          name: 'list_shared_with_me',
          description: 'List files shared with the current user',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number' } } },
        },
        {
          name: 'list_trashed',
          description: 'List files in trash',
          inputSchema: { type: 'object', properties: { maxResults: { type: 'number' } } },
        },
        {
          name: 'get_file',
          description: 'Get file metadata and details',
          inputSchema: {
            type: 'object',
            properties: { fileId: { type: 'string', description: 'File ID' } },
            required: ['fileId'],
          },
        },
        {
          name: 'read_file',
          description: 'Read the content of a text-based file',
          inputSchema: {
            type: 'object',
            properties: { fileId: { type: 'string', description: 'File ID' } },
            required: ['fileId'],
          },
        },
        {
          name: 'create_folder',
          description: 'Create a new folder in Google Drive',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Folder name' },
              parentId: { type: 'string', description: 'Parent folder ID (optional)' },
              description: { type: 'string', description: 'Folder description (optional)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'upload_file',
          description: 'Upload a new file to Google Drive. Supports text or base64-encoded binary content (Excel, Word, PDF, images, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'File name' },
              content: { type: 'string', description: 'File content (text or base64-encoded binary)' },
              mimeType: { type: 'string', description: 'MIME type (default: text/plain). For binary files use appropriate type like application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, etc.' },
              parentId: { type: 'string', description: 'Parent folder ID (optional)' },
              isBase64: { type: 'boolean', description: 'Set to true if content is base64-encoded binary data (default: false)' },
            },
            required: ['name', 'content'],
          },
        },
        {
          name: 'create_google_doc',
          description: 'Create a new Google Docs document with optional content',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Document name' },
              content: { type: 'string', description: 'Document content (plain text)' },
              parentId: { type: 'string', description: 'Parent folder ID (optional)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'create_google_sheet',
          description: 'Create a new Google Sheets spreadsheet with optional content',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Spreadsheet name' },
              content: { type: 'string', description: 'Spreadsheet content in CSV format (e.g., "Name,Age\\nJohn,30\\nJane,25")' },
              parentId: { type: 'string', description: 'Parent folder ID (optional)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'create_presentation',
          description: 'Create a Google Slides presentation with multiple slides. Each slide has a title and body content.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Presentation name' },
              slides: {
                type: 'array',
                description: 'Array of slides, each with title and body',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Slide title' },
                    body: { type: 'string', description: 'Slide body content' },
                  },
                  required: ['title', 'body'],
                },
              },
              parentId: { type: 'string', description: 'Parent folder ID (optional)' },
            },
            required: ['name', 'slides'],
          },
        },
        {
          name: 'update_file',
          description: 'Update file metadata or content',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              name: { type: 'string', description: 'New file name' },
              content: { type: 'string', description: 'New content' },
              description: { type: 'string', description: 'New description' },
            },
            required: ['fileId'],
          },
        },
        {
          name: 'copy_file',
          description: 'Create a copy of a file',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'Source file ID' },
              name: { type: 'string', description: 'Name for the copy' },
              parentId: { type: 'string', description: 'Destination folder ID' },
            },
            required: ['fileId'],
          },
        },
        {
          name: 'move_file',
          description: 'Move a file to a different folder',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              newParentId: { type: 'string', description: 'Destination folder ID' },
            },
            required: ['fileId', 'newParentId'],
          },
        },
        {
          name: 'delete_file',
          description: 'Delete a file (move to trash or permanently)',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              permanent: { type: 'boolean', description: 'Permanently delete (default: false)' },
            },
            required: ['fileId'],
          },
        },
        {
          name: 'restore_file',
          description: 'Restore a file from trash',
          inputSchema: {
            type: 'object',
            properties: { fileId: { type: 'string', description: 'File ID' } },
            required: ['fileId'],
          },
        },
        {
          name: 'star_file',
          description: 'Star or unstar a file',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              starred: { type: 'boolean', description: 'true to star, false to unstar' },
            },
            required: ['fileId', 'starred'],
          },
        },
        {
          name: 'empty_trash',
          description: 'Permanently delete all files in trash',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'share_file',
          description: 'Share a file with a user, group, domain, or make it public',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              email: { type: 'string', description: 'Email address (for user/group)' },
              role: { type: 'string', enum: ['reader', 'writer', 'commenter'], description: 'Permission role' },
              type: { type: 'string', enum: ['user', 'group', 'domain', 'anyone'], description: 'Share type' },
              domain: { type: 'string', description: 'Domain (for domain type)' },
              sendNotification: { type: 'boolean', description: 'Send notification (default: true)' },
            },
            required: ['fileId', 'role', 'type'],
          },
        },
        {
          name: 'unshare_file',
          description: 'Remove sharing permission from a file',
          inputSchema: {
            type: 'object',
            properties: {
              fileId: { type: 'string', description: 'File ID' },
              permissionId: { type: 'string', description: 'Permission ID' },
            },
            required: ['fileId', 'permissionId'],
          },
        },
        {
          name: 'list_permissions',
          description: 'List all sharing permissions for a file',
          inputSchema: {
            type: 'object',
            properties: { fileId: { type: 'string', description: 'File ID' } },
            required: ['fileId'],
          },
        },
        {
          name: 'get_about',
          description: 'Get Google Drive account info and storage quota',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      switch (name) {
        case 'list_files': {
          const params = ListFilesSchema.parse(args);
          const result = await this.driveClient.listFiles(params);
          return {
            content: [{ type: 'text', text: JSON.stringify({ files: result.files, nextPageToken: result.nextPageToken }) }],
          };
        }

        case 'search_files': {
          const params = SearchFilesSchema.parse(args);
          const files = await this.driveClient.searchFiles(params.query, params.maxResults, params.fileType);
          return {
            content: [{ type: 'text', text: JSON.stringify({ query: params.query, files }) }],
          };
        }

        case 'list_recent': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listRecent(params.maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify({ files }) }],
          };
        }

        case 'list_starred': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listStarred(params.maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify({ files }) }],
          };
        }

        case 'list_shared_with_me': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listSharedWithMe(params.maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify({ files }) }],
          };
        }

        case 'list_trashed': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listTrashed(params.maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify({ files }) }],
          };
        }

        case 'get_file': {
          const params = GetFileSchema.parse(args);
          const file = await this.driveClient.getFile(params.fileId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ file }) }],
          };
        }

        case 'read_file': {
          const params = GetFileSchema.parse(args);
          const content = await this.driveClient.getFileContent(params.fileId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ content }) }],
          };
        }

        case 'create_folder': {
          const params = CreateFolderSchema.parse(args);
          const folder = await this.driveClient.createFolder({
            name: params.name,
            parentId: params.parentId,
            description: params.description,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ folder }) }],
          };
        }

        case 'upload_file': {
          const params = UploadFileSchema.parse(args);
          const file = await this.driveClient.uploadFile({
            name: params.name,
            content: params.content,
            mimeType: params.mimeType,
            parentId: params.parentId,
            description: params.description,
            isBase64: params.isBase64,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ file }) }],
          };
        }

        case 'create_google_doc': {
          const params = CreateGoogleDocSchema.parse(args);
          const doc = await this.driveClient.createGoogleDoc(params.name, params.parentId, params.content);
          return {
            content: [{ type: 'text', text: JSON.stringify({ doc }) }],
          };
        }

        case 'create_google_sheet': {
          const params = CreateGoogleSheetSchema.parse(args);
          const sheet = await this.driveClient.createGoogleSheet(params.name, params.parentId, params.content);
          return {
            content: [{ type: 'text', text: JSON.stringify({ sheet }) }],
          };
        }

        case 'create_presentation': {
          const params = CreatePresentationSchema.parse(args);
          const slides = params.slides.map(s => ({ title: s.title, body: s.body }));
          const presentation = await this.driveClient.createPresentation(params.name, slides, params.parentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ presentation }) }],
          };
        }

        case 'update_file': {
          const params = UpdateFileSchema.parse(args);
          const file = await this.driveClient.updateFile({
            fileId: params.fileId,
            name: params.name,
            content: params.content,
            description: params.description,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ file }) }],
          };
        }

        case 'copy_file': {
          const params = CopyFileSchema.parse(args);
          const file = await this.driveClient.copyFile({
            fileId: params.fileId,
            name: params.name,
            parentId: params.parentId,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ file }) }],
          };
        }

        case 'move_file': {
          const params = MoveFileSchema.parse(args);
          const file = await this.driveClient.moveFile({
            fileId: params.fileId,
            newParentId: params.newParentId,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ file, action: 'moved' }) }],
          };
        }

        case 'delete_file': {
          const params = DeleteFileSchema.parse(args);
          await this.driveClient.deleteFile(params.fileId, params.permanent);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, action: params.permanent ? 'permanently_deleted' : 'moved_to_trash' }) }],
          };
        }

        case 'restore_file': {
          const params = GetFileSchema.parse(args);
          const file = await this.driveClient.restoreFile(params.fileId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ file, action: 'restored' }) }],
          };
        }

        case 'star_file': {
          const params = StarFileSchema.parse(args);
          await this.driveClient.starFile(params.fileId, params.starred);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, action: params.starred ? 'starred' : 'unstarred' }) }],
          };
        }

        case 'empty_trash': {
          await this.driveClient.emptyTrash();
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'trash_emptied' }) }],
          };
        }

        case 'share_file': {
          const params = ShareFileSchema.parse(args);
          const permission = await this.driveClient.shareFile({
            fileId: params.fileId,
            email: params.email,
            role: params.role,
            type: params.type,
            domain: params.domain,
            sendNotification: params.sendNotification,
            message: params.message,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ permission, action: 'shared' }) }],
          };
        }

        case 'unshare_file': {
          const params = UnshareFileSchema.parse(args);
          await this.driveClient.unshareFile(params.fileId, params.permissionId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'permission_removed' }) }],
          };
        }

        case 'list_permissions': {
          const params = GetFileSchema.parse(args);
          const permissions = await this.driveClient.listPermissions(params.fileId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ permissions }) }],
          };
        }

        case 'get_about': {
          const about = await this.driveClient.getAbout();
          return {
            content: [{ type: 'text', text: JSON.stringify({ about }) }],
          };
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
      const result = await this.driveClient.listFiles({
        query: `mimeType = '${GOOGLE_MIME_TYPES.FOLDER}'`,
        pageSize: 50,
      });

      return {
        resources: result.files.map((folder) => ({
          uri: `gdrive://folder/${folder.id}`,
          name: folder.name,
          description: `Folder: ${folder.name}`,
          mimeType: 'application/json',
        })),
      };
    } catch {
      return { resources: [] };
    }
  }

  async readResource(uri: string): Promise<{ contents: any[] }> {
    const folderMatch = uri.match(/^gdrive:\/\/folder\/(.+)$/);
    if (folderMatch) {
      const folderId = folderMatch[1];
      const result = await this.driveClient.listFiles({ folderId, pageSize: 50 });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result.files, null, 2),
        }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  async listPrompts(): Promise<{ prompts: any[] }> {
    return {
      prompts: [
        {
          name: 'organize_files',
          description: 'Generate a plan to organize files in Google Drive',
          arguments: [
            { name: 'folderId', description: 'Folder ID to organize', required: false },
            { name: 'criteria', description: 'Organization criteria', required: false },
          ],
        },
        {
          name: 'storage_analysis',
          description: 'Analyze storage usage and suggest cleanup',
          arguments: [],
        },
      ],
    };
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'organize_files':
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the files in ${args.folderId || 'my Google Drive'} and suggest an organization plan.`,
            },
          }],
        };
      case 'storage_analysis':
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: 'Please analyze my Google Drive storage usage and provide recommendations for freeing up space.',
            },
          }],
        };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private formatFileList(files: any[], nextPageToken?: string): string {
    if (files.length === 0) return 'No files found.';
    const formatted = files.map((file, idx) => {
      const icon = file.mimeType === GOOGLE_MIME_TYPES.FOLDER ? '📁' : '📄';
      return `${idx + 1}. ${icon} ${file.name}\n   ID: ${file.id}\n   Modified: ${file.modifiedTime || 'N/A'}`;
    }).join('\n\n');
    return nextPageToken ? `${formatted}\n\n--- More files available ---` : formatted;
  }

  private formatFileDetails(file: any): string {
    return `File: ${file.name}\nID: ${file.id}\nType: ${file.mimeType}\nSize: ${file.size || 'N/A'}\nModified: ${file.modifiedTime || 'N/A'}\nLink: ${file.webViewLink || 'N/A'}`;
  }
}
