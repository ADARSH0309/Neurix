/**
 * Google Drive MCP Server
 */

import { NeurixBaseServer } from '@neurix/mcp-sdk';
import { GDriveClient } from './gdrive-client.js';
import { z } from 'zod';
import { GOOGLE_MIME_TYPES } from './types.js';

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

const ReadFileSchema = z.object({
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

export class GDriveServer extends NeurixBaseServer {
  private driveClient: GDriveClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    super({
      name: 'neurix-gdrive-server',
      version: '0.1.0',
      description: 'Google Drive MCP Server for managing files, folders, and sharing',
    });

    this.driveClient = new GDriveClient(clientId, clientSecret, redirectUri, tokenPath);
  }

  async initialize(): Promise<void> {
    await this.driveClient.initialize();
    this.logger.info('Google Drive client initialized successfully');
  }

  protected async listTools() {
    return [
      // File listing tools
      {
        name: 'list_files',
        description: 'List files and folders in Google Drive. Can filter by folder, query, and sorting.',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'Folder ID to list contents of (optional, defaults to root)' },
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
            query: { type: 'string', description: 'Search query (searches name and content)' },
            maxResults: { type: 'number', description: 'Maximum results (1-100, default: 20)' },
            fileType: { type: 'string', description: 'Filter by MIME type (optional)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_recent',
        description: 'List recently viewed files',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
          },
        },
      },
      {
        name: 'list_starred',
        description: 'List starred files',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
          },
        },
      },
      {
        name: 'list_shared_with_me',
        description: 'List files shared with the current user',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
          },
        },
      },
      {
        name: 'list_trashed',
        description: 'List files in trash',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
          },
        },
      },

      // File operations
      {
        name: 'get_file',
        description: 'Get file metadata and details',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the content of a text-based file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
          required: ['fileId'],
        },
      },
      // File creation
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
            description: { type: 'string', description: 'File description (optional)' },
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
            content: { type: 'string', description: 'Spreadsheet content in CSV format (e.g., "Name,Age\\nJohn,30")' },
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

      // File modification
      {
        name: 'update_file',
        description: 'Update file metadata or content',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
            name: { type: 'string', description: 'New file name (optional)' },
            content: { type: 'string', description: 'New file content (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
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
            name: { type: 'string', description: 'Name for the copy (optional)' },
            parentId: { type: 'string', description: 'Destination folder ID (optional)' },
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
        description: 'Delete a file (move to trash or permanently delete)',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
            permanent: { type: 'boolean', description: 'Permanently delete (default: false, moves to trash)' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'restore_file',
        description: 'Restore a file from trash',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
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
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Sharing
      {
        name: 'share_file',
        description: 'Share a file with a user, group, domain, or make it public',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
            email: { type: 'string', description: 'Email address (for user/group type)' },
            role: { type: 'string', enum: ['reader', 'writer', 'commenter'], description: 'Permission role' },
            type: { type: 'string', enum: ['user', 'group', 'domain', 'anyone'], description: 'Share type' },
            domain: { type: 'string', description: 'Domain (for domain type)' },
            sendNotification: { type: 'boolean', description: 'Send email notification (default: true)' },
            message: { type: 'string', description: 'Custom message for notification' },
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
            permissionId: { type: 'string', description: 'Permission ID to remove' },
          },
          required: ['fileId', 'permissionId'],
        },
      },
      {
        name: 'list_permissions',
        description: 'List all sharing permissions for a file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
          required: ['fileId'],
        },
      },

      // Account info
      {
        name: 'get_about',
        description: 'Get Google Drive account info and storage quota',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  protected async callTool(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        // File listing
        case 'list_files': {
          const params = ListFilesSchema.parse(args);
          const result = await this.driveClient.listFiles(params);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ files: result.files, nextPageToken: result.nextPageToken }),
            }],
          };
        }

        case 'search_files': {
          const params = SearchFilesSchema.parse(args);
          const files = await this.driveClient.searchFiles(params.query, params.maxResults, params.fileType);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ files, query: params.query }),
            }],
          };
        }

        case 'list_recent': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listRecent(params.maxResults);
          return {
            content: [{
              type: 'text',
              text: `Recent files:\n\n${this.formatFileList(files)}`,
            }],
          };
        }

        case 'list_starred': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listStarred(params.maxResults);
          return {
            content: [{
              type: 'text',
              text: `Starred files:\n\n${this.formatFileList(files)}`,
            }],
          };
        }

        case 'list_shared_with_me': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listSharedWithMe(params.maxResults);
          return {
            content: [{
              type: 'text',
              text: `Shared with me:\n\n${this.formatFileList(files)}`,
            }],
          };
        }

        case 'list_trashed': {
          const params = MaxResultsSchema.parse(args);
          const files = await this.driveClient.listTrashed(params.maxResults);
          return {
            content: [{
              type: 'text',
              text: `Trashed files:\n\n${this.formatFileList(files)}`,
            }],
          };
        }

        // File operations
        case 'get_file': {
          const params = GetFileSchema.parse(args);
          const file = await this.driveClient.getFile(params.fileId);
          return {
            content: [{
              type: 'text',
              text: this.formatFileDetails(file),
            }],
          };
        }

        case 'read_file': {
          const params = ReadFileSchema.parse(args);
          const content = await this.driveClient.getFileContent(params.fileId);
          return {
            content: [{
              type: 'text',
              text: `File content:\n\n${content}`,
            }],
          };
        }

        // File creation
        case 'create_folder': {
          const params = CreateFolderSchema.parse(args);
          const folder = await this.driveClient.createFolder(params);
          return {
            content: [{
              type: 'text',
              text: `Folder created successfully!\n\nID: ${folder.id}\nName: ${folder.name}\nLink: ${folder.webViewLink}`,
            }],
          };
        }

        case 'upload_file': {
          const params = UploadFileSchema.parse(args);
          const file = await this.driveClient.uploadFile(params);
          return {
            content: [{
              type: 'text',
              text: `File uploaded successfully!\n\nID: ${file.id}\nName: ${file.name}\nSize: ${file.size} bytes\nLink: ${file.webViewLink}`,
            }],
          };
        }

        case 'create_google_doc': {
          const params = CreateGoogleDocSchema.parse(args);
          const doc = await this.driveClient.createGoogleDoc(params.name, params.parentId, params.content);
          return {
            content: [{
              type: 'text',
              text: `Google Doc created successfully!\n\nID: ${doc.id}\nName: ${doc.name}\nLink: ${doc.webViewLink}${params.content ? '\nContent: Added' : ''}`,
            }],
          };
        }

        case 'create_google_sheet': {
          const params = CreateGoogleSheetSchema.parse(args);
          const sheet = await this.driveClient.createGoogleSheet(params.name, params.parentId, params.content);
          return {
            content: [{
              type: 'text',
              text: `Google Sheet created successfully!\n\nID: ${sheet.id}\nName: ${sheet.name}\nLink: ${sheet.webViewLink}${params.content ? '\nContent: Added (CSV data)' : ''}`,
            }],
          };
        }

        case 'create_presentation': {
          const params = CreatePresentationSchema.parse(args);
          const presentation = await this.driveClient.createPresentation(params.name, params.slides, params.parentId);
          return {
            content: [{
              type: 'text',
              text: `Presentation created successfully!\n\nID: ${presentation.id}\nName: ${presentation.name}\nSlides: ${presentation.slideCount}\nLink: ${presentation.webViewLink}`,
            }],
          };
        }

        // File modification
        case 'update_file': {
          const params = UpdateFileSchema.parse(args);
          const file = await this.driveClient.updateFile(params);
          return {
            content: [{
              type: 'text',
              text: `File updated successfully!\n\nID: ${file.id}\nName: ${file.name}`,
            }],
          };
        }

        case 'copy_file': {
          const params = CopyFileSchema.parse(args);
          const file = await this.driveClient.copyFile(params);
          return {
            content: [{
              type: 'text',
              text: `File copied successfully!\n\nNew ID: ${file.id}\nName: ${file.name}\nLink: ${file.webViewLink}`,
            }],
          };
        }

        case 'move_file': {
          const params = MoveFileSchema.parse(args);
          const file = await this.driveClient.moveFile(params);
          return {
            content: [{
              type: 'text',
              text: `File moved successfully!\n\nID: ${file.id}\nName: ${file.name}\nNew parent: ${file.parents?.join(', ')}`,
            }],
          };
        }

        case 'delete_file': {
          const params = DeleteFileSchema.parse(args);
          await this.driveClient.deleteFile(params.fileId, params.permanent);
          return {
            content: [{
              type: 'text',
              text: params.permanent
                ? `File permanently deleted`
                : `File moved to trash`,
            }],
          };
        }

        case 'restore_file': {
          const params = GetFileSchema.parse(args);
          const file = await this.driveClient.restoreFile(params.fileId);
          return {
            content: [{
              type: 'text',
              text: `File restored successfully!\n\nID: ${file.id}\nName: ${file.name}`,
            }],
          };
        }

        case 'star_file': {
          const params = StarFileSchema.parse(args);
          const file = await this.driveClient.starFile(params.fileId, params.starred);
          return {
            content: [{
              type: 'text',
              text: params.starred
                ? `File starred successfully`
                : `File unstarred successfully`,
            }],
          };
        }

        case 'empty_trash': {
          await this.driveClient.emptyTrash();
          return {
            content: [{
              type: 'text',
              text: 'Trash emptied successfully',
            }],
          };
        }

        // Sharing
        case 'share_file': {
          const params = ShareFileSchema.parse(args);
          const permission = await this.driveClient.shareFile(params);
          return {
            content: [{
              type: 'text',
              text: `File shared successfully!\n\nPermission ID: ${permission.id}\nType: ${permission.type}\nRole: ${permission.role}${permission.emailAddress ? `\nEmail: ${permission.emailAddress}` : ''}`,
            }],
          };
        }

        case 'unshare_file': {
          const params = UnshareFileSchema.parse(args);
          await this.driveClient.unshareFile(params.fileId, params.permissionId);
          return {
            content: [{
              type: 'text',
              text: 'Permission removed successfully',
            }],
          };
        }

        case 'list_permissions': {
          const params = GetFileSchema.parse(args);
          const permissions = await this.driveClient.listPermissions(params.fileId);
          return {
            content: [{
              type: 'text',
              text: `Permissions:\n\n${permissions.map(p =>
                `- ${p.type}: ${p.emailAddress || p.displayName || 'anyone'} (${p.role}) [ID: ${p.id}]`
              ).join('\n')}`,
            }],
          };
        }

        // Account info
        case 'get_about': {
          const about = await this.driveClient.getAbout();
          const formatBytes = (bytes?: string) => {
            if (!bytes) return 'N/A';
            const gb = parseInt(bytes) / (1024 * 1024 * 1024);
            return `${gb.toFixed(2)} GB`;
          };
          return {
            content: [{
              type: 'text',
              text: `Google Drive Account Info\n\nUser: ${about.user.displayName}\nEmail: ${about.user.emailAddress}\n\nStorage:\n- Total: ${formatBytes(about.storageQuota.limit)}\n- Used: ${formatBytes(about.storageQuota.usage)}\n- In Drive: ${formatBytes(about.storageQuota.usageInDrive)}\n- In Trash: ${formatBytes(about.storageQuota.usageInDriveTrash)}`,
            }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error calling tool ${name}`, error as Error);
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  protected async listResources() {
    // List Drive folders as resources
    try {
      const result = await this.driveClient.listFiles({
        query: `mimeType = '${GOOGLE_MIME_TYPES.FOLDER}'`,
        pageSize: 50,
      });

      return result.files.map((folder) => ({
        uri: `gdrive://folder/${folder.id}`,
        name: folder.name,
        description: `Folder: ${folder.name}`,
        mimeType: 'application/json',
      }));
    } catch {
      return [];
    }
  }

  protected async readResource(uri: string) {
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

  protected async listPrompts() {
    return [
      {
        name: 'organize_files',
        description: 'Generate a plan to organize files in Google Drive',
        arguments: [
          {
            name: 'folderId',
            description: 'Folder ID to organize (optional, defaults to root)',
            required: false,
          },
          {
            name: 'criteria',
            description: 'Organization criteria (e.g., by type, by date, by project)',
            required: false,
          },
        ],
      },
      {
        name: 'find_duplicates',
        description: 'Find potential duplicate files in Drive',
        arguments: [
          {
            name: 'folderId',
            description: 'Folder to search for duplicates',
            required: false,
          },
        ],
      },
      {
        name: 'storage_analysis',
        description: 'Analyze storage usage and suggest cleanup',
        arguments: [],
      },
    ];
  }

  protected async getPrompt(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'organize_files': {
        const folderId = args.folderId as string | undefined;
        const criteria = (args.criteria as string) || 'by type';
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the files in ${folderId ? `folder ${folderId}` : 'my Google Drive'} and suggest an organization plan based on: ${criteria}.\n\nConsider:\n1. Current file structure\n2. File types and categories\n3. Naming conventions\n4. Potential folders to create\n5. Files to move or rename`,
            },
          }],
        };
      }

      case 'find_duplicates': {
        const folderId = args.folderId as string | undefined;
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please search for potential duplicate files in ${folderId ? `folder ${folderId}` : 'my Google Drive'}.\n\nLook for:\n1. Files with similar names\n2. Files with identical sizes\n3. Files created around the same time\n\nList potential duplicates and suggest which to keep or remove.`,
            },
          }],
        };
      }

      case 'storage_analysis': {
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze my Google Drive storage usage and provide recommendations:\n\n1. Current storage usage\n2. Largest files\n3. Files in trash\n4. Old or unused files\n5. Suggestions for freeing up space`,
            },
          }],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private formatFileList(files: any[], nextPageToken?: string): string {
    if (files.length === 0) {
      return 'No files found.';
    }

    const formatted = files.map((file, idx) => {
      const icon = file.mimeType === GOOGLE_MIME_TYPES.FOLDER ? '📁' : '📄';
      const starred = file.starred ? '⭐ ' : '';
      const shared = file.shared ? '👥 ' : '';
      return `${idx + 1}. ${icon} ${starred}${shared}${file.name}\n   ID: ${file.id}\n   Type: ${file.mimeType}\n   Modified: ${file.modifiedTime || 'N/A'}${file.size ? `\n   Size: ${file.size} bytes` : ''}`;
    }).join('\n\n');

    if (nextPageToken) {
      return `${formatted}\n\n--- More files available (pageToken: ${nextPageToken}) ---`;
    }

    return formatted;
  }

  private formatFileDetails(file: any): string {
    return `File Details:

Name: ${file.name}
ID: ${file.id}
Type: ${file.mimeType}
Size: ${file.size || 'N/A'} bytes
Created: ${file.createdTime || 'N/A'}
Modified: ${file.modifiedTime || 'N/A'}
Starred: ${file.starred ? 'Yes' : 'No'}
Shared: ${file.shared ? 'Yes' : 'No'}
Trashed: ${file.trashed ? 'Yes' : 'No'}
Parents: ${file.parents?.join(', ') || 'None'}
Web Link: ${file.webViewLink || 'N/A'}
Download Link: ${file.webContentLink || 'N/A'}
Description: ${file.description || 'None'}`;
  }
}
