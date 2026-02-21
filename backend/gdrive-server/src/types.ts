/**
 * Google Drive server types
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
  shared?: boolean;
  owners?: DriveUser[];
  permissions?: DrivePermission[];
}

export interface DriveUser {
  displayName: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  displayName?: string;
}

export interface DriveFolder extends DriveFile {
  mimeType: 'application/vnd.google-apps.folder';
}

export interface ListFilesParams {
  query?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  folderId?: string;
  trashed?: boolean;
}

export interface ListFilesResult {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface SearchFilesParams {
  query: string;
  maxResults?: number;
  fileType?: string;
}

export interface CreateFolderParams {
  name: string;
  parentId?: string;
  description?: string;
}

export interface UploadFileParams {
  name: string;
  content: string;
  mimeType?: string;
  parentId?: string;
  description?: string;
  isBase64?: boolean;
}

export interface UpdateFileParams {
  fileId: string;
  name?: string;
  content?: string;
  mimeType?: string;
  description?: string;
  addParents?: string[];
  removeParents?: string[];
}

export interface CopyFileParams {
  fileId: string;
  name?: string;
  parentId?: string;
}

export interface MoveFileParams {
  fileId: string;
  newParentId: string;
  removeFromParents?: boolean;
}

export interface ShareFileParams {
  fileId: string;
  email?: string;
  role: 'reader' | 'writer' | 'commenter';
  type: 'user' | 'group' | 'domain' | 'anyone';
  domain?: string;
  sendNotification?: boolean;
  message?: string;
}

export interface GetFileParams {
  fileId: string;
}

export interface DeleteFileParams {
  fileId: string;
  permanent?: boolean;
}

export interface DownloadFileParams {
  fileId: string;
}

export interface DriveAbout {
  user: DriveUser;
  storageQuota: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

// Google Workspace MIME types
export const GOOGLE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FORM: 'application/vnd.google-apps.form',
  DRAWING: 'application/vnd.google-apps.drawing',
  SCRIPT: 'application/vnd.google-apps.script',
  SITE: 'application/vnd.google-apps.site',
  SHORTCUT: 'application/vnd.google-apps.shortcut',
} as const;

