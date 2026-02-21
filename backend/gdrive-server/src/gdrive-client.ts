/**
 * Google Drive API client wrapper
 *
 * All Drive API calls are wrapped with circuit breaker for resilience.
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';
import { PassThrough } from 'stream';
import CircuitBreaker from 'opossum';
import {
  DriveFile,
  DriveAbout,
  ListFilesParams,
  ListFilesResult,
  CreateFolderParams,
  UploadFileParams,
  UpdateFileParams,
  CopyFileParams,
  MoveFileParams,
  ShareFileParams,
  DrivePermission,
  GOOGLE_MIME_TYPES,
} from './types.js';
import {
  createDriveCircuitBreaker,
  formatCircuitBreakerError,
  CircuitBreakerStateCallback,
} from './utils/circuit-breaker.js';

type OAuth2Client = Auth.OAuth2Client;

export class GDriveClient {
  private oauth2Client: OAuth2Client;
  private drive: any;
  private slides: any;
  private metricsCallback?: CircuitBreakerStateCallback;

  // Circuit breakers for each Drive API operation
  private listFilesBreaker?: CircuitBreaker<any[], any>;
  private getFileBreaker?: CircuitBreaker<any[], any>;
  private createFileBreaker?: CircuitBreaker<any[], any>;
  private updateFileBreaker?: CircuitBreaker<any[], any>;
  private deleteFileBreaker?: CircuitBreaker<any[], any>;
  private copyFileBreaker?: CircuitBreaker<any[], any>;
  private createPermissionBreaker?: CircuitBreaker<any[], any>;
  private deletePermissionBreaker?: CircuitBreaker<any[], any>;
  private listPermissionsBreaker?: CircuitBreaker<any[], any>;
  private getAboutBreaker?: CircuitBreaker<any[], any>;
  private exportFileBreaker?: CircuitBreaker<any[], any>;
  private downloadFileBreaker?: CircuitBreaker<any[], any>;
  private slidesBreaker?: CircuitBreaker<any[], any>;

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
    this.listFilesBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.list(params),
      { name: 'listFiles' },
      this.metricsCallback
    );

    this.getFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.get(params),
      { name: 'getFile' },
      this.metricsCallback
    );

    this.createFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.create(params),
      { name: 'createFile', timeout: 30000 }, // Longer timeout for uploads
      this.metricsCallback
    );

    this.updateFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.update(params),
      { name: 'updateFile', timeout: 30000 },
      this.metricsCallback
    );

    this.deleteFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.delete(params),
      { name: 'deleteFile' },
      this.metricsCallback
    );

    this.copyFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.copy(params),
      { name: 'copyFile' },
      this.metricsCallback
    );

    this.createPermissionBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.permissions.create(params),
      { name: 'createPermission' },
      this.metricsCallback
    );

    this.deletePermissionBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.permissions.delete(params),
      { name: 'deletePermission' },
      this.metricsCallback
    );

    this.listPermissionsBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.permissions.list(params),
      { name: 'listPermissions' },
      this.metricsCallback
    );

    this.getAboutBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.about.get(params),
      { name: 'getAbout' },
      this.metricsCallback
    );

    this.exportFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.export(
        { fileId: params.fileId, mimeType: params.mimeType },
        { responseType: 'stream' }
      ),
      { name: 'exportFile', timeout: 30000 },
      this.metricsCallback
    );

    this.downloadFileBreaker = createDriveCircuitBreaker(
      async (params: any) => this.drive.files.get(params),
      { name: 'downloadFile', timeout: 30000 },
      this.metricsCallback
    );

    this.slidesBreaker = createDriveCircuitBreaker(
      async (params: any) => this.slides.presentations.batchUpdate(params),
      { name: 'slidesUpdate', timeout: 30000 },
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

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.slides = google.slides({ version: 'v1', auth: this.oauth2Client });
      this.initializeCircuitBreakers();
    } catch (error) {
      throw new Error(
        `Failed to load Drive credentials. Please run OAuth setup first. Error: ${error}`
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
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.slides = google.slides({ version: 'v1', auth: this.oauth2Client });
    this.initializeCircuitBreakers();
  }

  /**
   * List files in Drive
   */
  async listFiles(params: ListFilesParams = {}): Promise<ListFilesResult> {
    const { query, pageSize = 20, pageToken, orderBy = 'modifiedTime desc', folderId, trashed = false } = params;

    try {
      if (!this.listFilesBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      let q = `trashed = ${trashed}`;
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }
      if (query) {
        q += ` and ${query}`;
      }

      const response = await this.listFilesBreaker.fire({
        pageSize,
        pageToken,
        orderBy,
        q,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, iconLink, thumbnailLink, description, starred, trashed, shared)',
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listFiles');
      throw new Error(errorMessage);
    }
  }

  /**
   * Search files using query
   */
  async searchFiles(searchQuery: string, maxResults = 20, fileType?: string): Promise<DriveFile[]> {
    try {
      if (!this.listFilesBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      let q = `trashed = false and (name contains '${searchQuery}' or fullText contains '${searchQuery}')`;
      if (fileType) {
        q += ` and mimeType = '${fileType}'`;
      }

      const response = await this.listFilesBreaker.fire({
        pageSize: maxResults,
        q,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, iconLink, thumbnailLink, description, starred, trashed, shared)',
      });

      return response.data.files || [];
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'searchFiles');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile> {
    try {
      if (!this.getFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getFileBreaker.fire({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, iconLink, thumbnailLink, description, starred, trashed, shared, owners, permissions',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if file is a Google Workspace file
   */
  private isGoogleWorkspaceFile(mimeType: string): boolean {
    return mimeType.startsWith('application/vnd.google-apps.');
  }

  /**
   * Get the appropriate export MIME type for a Google Workspace file
   */
  private getDefaultExportMimeType(mimeType: string): string {
    switch (mimeType) {
      case GOOGLE_MIME_TYPES.DOCUMENT:
        return 'text/plain';
      case GOOGLE_MIME_TYPES.SPREADSHEET:
        return 'text/csv';
      case GOOGLE_MIME_TYPES.PRESENTATION:
        return 'text/plain';
      case GOOGLE_MIME_TYPES.DRAWING:
        return 'image/png';
      default:
        return 'text/plain';
    }
  }

  /**
   * Get file content - automatically handles Google Workspace files
   */
  async getFileContent(fileId: string): Promise<string> {
    try {
      // First get file metadata to check type
      const file = await this.getFile(fileId);

      // If it's a Google Workspace file, export it
      if (this.isGoogleWorkspaceFile(file.mimeType)) {
        const exportMimeType = this.getDefaultExportMimeType(file.mimeType);
        return await this.exportFile(fileId, exportMimeType);
      }

      // For regular files, download content
      if (!this.downloadFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.downloadFileBreaker.fire({
        fileId,
        alt: 'media',
      });

      // Handle different response types
      if (typeof response.data === 'string') {
        return response.data;
      } else if (Buffer.isBuffer(response.data)) {
        return response.data.toString('utf-8');
      } else if (response.data && typeof response.data === 'object') {
        return JSON.stringify(response.data, null, 2);
      }

      return String(response.data);
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getFileContent');
      throw new Error(errorMessage);
    }
  }

  /**
   * Download file as base64 - works for any file type including binary files
   * Returns: { content: base64String, mimeType: string, name: string, size: string }
   */
  async downloadFile(fileId: string): Promise<{ content: string; mimeType: string; name: string; size: string }> {
    try {
      // First get file metadata
      const file = await this.getFile(fileId);

      // Google Workspace files need to be exported, not downloaded directly
      if (this.isGoogleWorkspaceFile(file.mimeType)) {
        throw new Error(
          `Cannot download Google Workspace files directly. Use read_file instead to get text content.`
        );
      }

      if (!this.downloadFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.downloadFileBreaker.fire({
        fileId,
        alt: 'media',
      });

      // Convert to base64
      let base64Content: string;
      if (Buffer.isBuffer(response.data)) {
        base64Content = response.data.toString('base64');
      } else if (response.data instanceof ArrayBuffer || ArrayBuffer.isView(response.data)) {
        base64Content = Buffer.from(response.data as ArrayBuffer).toString('base64');
      } else if (typeof response.data === 'string') {
        base64Content = Buffer.from(response.data).toString('base64');
      } else if (response.data && typeof response.data === 'object') {
        // Check if it's a stream-like object
        if ('pipe' in response.data || Symbol.asyncIterator in response.data) {
          const chunks: Buffer[] = [];
          for await (const chunk of response.data as AsyncIterable<Buffer>) {
            chunks.push(Buffer.from(chunk));
          }
          base64Content = Buffer.concat(chunks).toString('base64');
        } else {
          base64Content = Buffer.from(JSON.stringify(response.data)).toString('base64');
        }
      } else {
        base64Content = Buffer.from(String(response.data)).toString('base64');
      }

      return {
        content: base64Content,
        mimeType: file.mimeType,
        name: file.name,
        size: file.size || '0',
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'downloadFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Export Google Workspace file to specified format (internal use)
   */
  async exportFile(fileId: string, mimeType: string): Promise<string> {
    try {
      if (!this.exportFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      // Use stream responseType to get actual binary content
      const response = await this.exportFileBreaker.fire({
        fileId,
        mimeType,
      });

      // Collect stream data into buffer
      const chunks: Buffer[] = [];

      // response.data should be a readable stream
      const stream = response.data;

      return new Promise<string>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
        });

        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          // For binary formats, return base64
          if (mimeType === 'application/pdf' || mimeType.startsWith('image/') ||
              mimeType.includes('officedocument') || mimeType.includes('opendocument')) {
            resolve(buffer.toString('base64'));
          } else {
            resolve(buffer.toString('utf-8'));
          }
        });

        stream.on('error', (err: Error) => {
          reject(err);
        });
      });
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'exportFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(params: CreateFolderParams): Promise<DriveFile> {
    const { name, parentId, description } = params;

    try {
      if (!this.createFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const fileMetadata: any = {
        name,
        mimeType: GOOGLE_MIME_TYPES.FOLDER,
        description,
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.createFileBreaker.fire({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createFolder');
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload a new file
   * Supports both text content and base64-encoded binary content
   */
  async uploadFile(params: UploadFileParams): Promise<DriveFile> {
    const { name, content, mimeType = 'text/plain', parentId, description, isBase64 = false } = params;

    try {
      const fileMetadata: any = {
        name,
        description,
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // For all uploads, use string body - this works with googleapis
      // If base64, decode to string first
      let bodyContent: string;
      if (isBase64) {
        // Decode base64 to buffer, then to latin1 string (preserves binary data)
        const buffer = Buffer.from(content, 'base64');
        bodyContent = buffer.toString('latin1');
      } else {
        bodyContent = content;
      }

      // Use the circuit breaker for consistent behavior
      if (!this.createFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.createFileBreaker.fire({
        requestBody: fileMetadata,
        media: {
          mimeType,
          body: bodyContent,
        },
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink',
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Google Drive API error (uploadFile): ${error.message || error}`);
    }
  }

  /**
   * Create a Google Doc with optional content
   */
  async createGoogleDoc(name: string, parentId?: string, content?: string): Promise<DriveFile> {
    try {
      if (!this.createFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const fileMetadata: any = {
        name,
        mimeType: GOOGLE_MIME_TYPES.DOCUMENT,
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // If content is provided, upload with content conversion
      if (content) {
        const media = {
          mimeType: 'text/plain',
          body: content,
        };

        const response = await this.createFileBreaker.fire({
          requestBody: fileMetadata,
          media,
          fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
        });

        return response.data;
      }

      // Create empty doc if no content
      const response = await this.createFileBreaker.fire({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createGoogleDoc');
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a Google Sheet with optional content (CSV format)
   */
  async createGoogleSheet(name: string, parentId?: string, content?: string): Promise<DriveFile> {
    try {
      if (!this.createFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const fileMetadata: any = {
        name,
        mimeType: GOOGLE_MIME_TYPES.SPREADSHEET,
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // If content is provided (CSV format), upload with content conversion
      if (content) {
        // Convert escaped newlines to actual newlines for CSV parsing
        console.log('DEBUG: Raw content:', JSON.stringify(content));
        const csvContent = content.replace(/\\n/g, '\n');
        console.log('DEBUG: After replace:', JSON.stringify(csvContent));
        const media = {
          mimeType: 'text/csv',
          body: csvContent,
        };

        const response = await this.createFileBreaker.fire({
          requestBody: fileMetadata,
          media,
          fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
        });

        return response.data;
      }

      // Create empty sheet if no content
      const response = await this.createFileBreaker.fire({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createGoogleSheet');
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a Google Slides presentation with multiple slides
   * Each slide has a title and body content
   */
  async createPresentation(
    name: string,
    slides: Array<{ title: string; body: string }>,
    parentId?: string
  ): Promise<DriveFile & { slideCount: number }> {
    try {
      if (!this.createFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      // Step 1: Create empty presentation using Drive API
      const fileMetadata: any = {
        name,
        mimeType: GOOGLE_MIME_TYPES.PRESENTATION,
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const createResponse = await this.createFileBreaker.fire({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink',
      });

      const presentationId = createResponse.data.id;

      // Step 2: Get the presentation to find the default slide ID
      const presentation = await this.slides.presentations.get({
        presentationId,
      });

      // Delete the default blank slide if we have slides to add
      const defaultSlideId = presentation.data.slides?.[0]?.objectId;

      // Step 3: Build batch update requests for slides
      const requests: any[] = [];

      // Add each slide with title and body
      slides.forEach((slide, index) => {
        const slideId = `slide_${Date.now()}_${index}`;
        const titleId = `title_${Date.now()}_${index}`;
        const bodyId = `body_${Date.now()}_${index}`;

        // Create slide
        requests.push({
          createSlide: {
            objectId: slideId,
            insertionIndex: index,
            slideLayoutReference: {
              predefinedLayout: 'TITLE_AND_BODY',
            },
            placeholderIdMappings: [
              {
                layoutPlaceholder: { type: 'TITLE', index: 0 },
                objectId: titleId,
              },
              {
                layoutPlaceholder: { type: 'BODY', index: 0 },
                objectId: bodyId,
              },
            ],
          },
        });

        // Insert title text
        requests.push({
          insertText: {
            objectId: titleId,
            text: slide.title,
            insertionIndex: 0,
          },
        });

        // Insert body text
        requests.push({
          insertText: {
            objectId: bodyId,
            text: slide.body,
            insertionIndex: 0,
          },
        });
      });

      // Delete default slide after adding new ones
      if (defaultSlideId && slides.length > 0) {
        requests.push({
          deleteObject: {
            objectId: defaultSlideId,
          },
        });
      }

      // Step 4: Execute batch update
      if (requests.length > 0) {
        await this.slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests,
          },
        });
      }

      return {
        ...createResponse.data,
        slideCount: slides.length,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createPresentation');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update file metadata or content
   */
  async updateFile(params: UpdateFileParams): Promise<DriveFile> {
    const { fileId, name, content, mimeType, description, addParents, removeParents } = params;

    try {
      if (!this.updateFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestParams: any = {
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink',
      };

      const fileMetadata: any = {};
      if (name) fileMetadata.name = name;
      if (description !== undefined) fileMetadata.description = description;

      if (Object.keys(fileMetadata).length > 0) {
        requestParams.requestBody = fileMetadata;
      }

      if (addParents) {
        requestParams.addParents = addParents.join(',');
      }
      if (removeParents) {
        requestParams.removeParents = removeParents.join(',');
      }

      if (content) {
        requestParams.media = {
          mimeType: mimeType || 'text/plain',
          body: content,
        };
      }

      const response = await this.updateFileBreaker.fire(requestParams);

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Copy a file
   */
  async copyFile(params: CopyFileParams): Promise<DriveFile> {
    const { fileId, name, parentId } = params;

    try {
      if (!this.copyFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestBody: any = {};
      if (name) requestBody.name = name;
      if (parentId) requestBody.parents = [parentId];

      const response = await this.copyFileBreaker.fire({
        fileId,
        requestBody,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'copyFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Move a file to a new folder
   */
  async moveFile(params: MoveFileParams): Promise<DriveFile> {
    const { fileId, newParentId, removeFromParents = true } = params;

    try {
      // First get current parents
      const file = await this.getFile(fileId);
      const currentParents = file.parents?.join(',') || '';

      if (!this.updateFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const requestParams: any = {
        fileId,
        addParents: newParentId,
        fields: 'id, name, mimeType, parents, webViewLink',
      };

      if (removeFromParents && currentParents) {
        requestParams.removeParents = currentParents;
      }

      const response = await this.updateFileBreaker.fire(requestParams);

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'moveFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a file (move to trash or permanently)
   */
  async deleteFile(fileId: string, permanent = false): Promise<{ success: boolean }> {
    try {
      if (permanent) {
        if (!this.deleteFileBreaker) {
          throw new Error('Circuit breaker not initialized');
        }
        await this.deleteFileBreaker.fire({ fileId });
      } else {
        // Move to trash
        if (!this.updateFileBreaker) {
          throw new Error('Circuit breaker not initialized');
        }
        await this.updateFileBreaker.fire({
          fileId,
          requestBody: { trashed: true },
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Restore a file from trash
   */
  async restoreFile(fileId: string): Promise<DriveFile> {
    try {
      if (!this.updateFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.updateFileBreaker.fire({
        fileId,
        requestBody: { trashed: false },
        fields: 'id, name, mimeType, parents, webViewLink',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'restoreFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Star/unstar a file
   */
  async starFile(fileId: string, starred: boolean): Promise<DriveFile> {
    try {
      if (!this.updateFileBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.updateFileBreaker.fire({
        fileId,
        requestBody: { starred },
        fields: 'id, name, starred',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'starFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Share a file with a user or make it public
   */
  async shareFile(params: ShareFileParams): Promise<DrivePermission> {
    const { fileId, email, role, type, domain, sendNotification = true, message } = params;

    try {
      if (!this.createPermissionBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const permission: any = {
        role,
        type,
      };

      // Build request parameters
      const requestParams: any = {
        fileId,
        requestBody: permission,
        fields: 'id, type, role, emailAddress, displayName',
      };

      if (type === 'user' || type === 'group') {
        permission.emailAddress = email;
        // sendNotificationEmail only valid for user/group types
        requestParams.sendNotificationEmail = sendNotification;
        if (message) {
          requestParams.emailMessage = message;
        }
      } else if (type === 'domain') {
        permission.domain = domain;
      }
      // For type 'anyone', no email/domain/notification needed

      const response = await this.createPermissionBreaker.fire(requestParams);

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'shareFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove sharing permission from a file
   */
  async unshareFile(fileId: string, permissionId: string): Promise<{ success: boolean }> {
    try {
      if (!this.deletePermissionBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.deletePermissionBreaker.fire({
        fileId,
        permissionId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'unshareFile');
      throw new Error(errorMessage);
    }
  }

  /**
   * List permissions for a file
   */
  async listPermissions(fileId: string): Promise<DrivePermission[]> {
    try {
      if (!this.listPermissionsBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.listPermissionsBreaker.fire({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, displayName)',
      });

      return response.data.permissions || [];
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listPermissions');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get Drive storage info and user details
   */
  async getAbout(): Promise<DriveAbout> {
    try {
      if (!this.getAboutBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getAboutBreaker.fire({
        fields: 'user(displayName, emailAddress, photoLink), storageQuota(limit, usage, usageInDrive, usageInDriveTrash)',
      });

      return response.data;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getAbout');
      throw new Error(errorMessage);
    }
  }

  /**
   * List files in trash
   */
  async listTrashed(maxResults = 20): Promise<DriveFile[]> {
    const result = await this.listFiles({ trashed: true, pageSize: maxResults });
    return result.files;
  }

  /**
   * Empty trash
   */
  async emptyTrash(): Promise<{ success: boolean }> {
    try {
      await this.drive.files.emptyTrash();
      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'emptyTrash');
      throw new Error(errorMessage);
    }
  }

  /**
   * List starred files
   */
  async listStarred(maxResults = 20): Promise<DriveFile[]> {
    const result = await this.listFiles({ query: 'starred = true', pageSize: maxResults });
    return result.files;
  }

  /**
   * List recent files
   */
  async listRecent(maxResults = 20): Promise<DriveFile[]> {
    const result = await this.listFiles({
      orderBy: 'viewedByMeTime desc',
      pageSize: maxResults,
    });
    return result.files;
  }

  /**
   * List shared with me files
   */
  async listSharedWithMe(maxResults = 20): Promise<DriveFile[]> {
    const result = await this.listFiles({
      query: 'sharedWithMe = true',
      pageSize: maxResults,
    });
    return result.files;
  }
}
