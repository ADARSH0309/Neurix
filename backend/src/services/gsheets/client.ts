/**
 * Google Sheets API client wrapper
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';
import type {
  Spreadsheet,
  Sheet,
  DriveFile,
  Permission,
  NamedRange,
  ReadRangeParams,
  WriteRangeParams,
  AppendRowsParams,
  BatchReadParams,
  BatchWriteParams,
  CreateSpreadsheetParams,
  AddSheetParams,
  FormatCellsParams,
  SortRangeParams,
  FindReplaceParams,
  InsertDimensionParams,
  DeleteDimensionParams,
  MergeCellsParams,
  ShareSpreadsheetParams,
  AddFilterViewParams,
} from './types.js';

type OAuth2Client = Auth.OAuth2Client;

export class GSheetsClient {
  private oauth2Client: OAuth2Client;
  private sheets: any;
  private drive: any;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenPath: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
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

      this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    } catch (error) {
      throw new Error(
        `Failed to load Sheets credentials. Please run OAuth setup first. Error: ${error}`
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
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // ─── Spreadsheet Management ─────────────────────────────────

  async listSpreadsheets(maxResults: number = 25, query?: string): Promise<DriveFile[]> {
    let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
    if (query) {
      q += ` and fullText contains '${query.replace(/'/g, "\\'")}'`;
    }

    const response = await this.drive.files.list({
      q,
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,createdTime,modifiedTime,owners,webViewLink,starred)',
      orderBy: 'modifiedTime desc',
    });
    return response.data.files || [];
  }

  async getSpreadsheet(spreadsheetId: string, includeGridData: boolean = false): Promise<Spreadsheet> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData,
    });
    return response.data;
  }

  async createSpreadsheet(params: CreateSpreadsheetParams): Promise<Spreadsheet> {
    const requestBody: any = {
      properties: {
        title: params.title,
        locale: params.locale,
        timeZone: params.timeZone,
      },
    };

    if (params.sheetTitles && params.sheetTitles.length > 0) {
      requestBody.sheets = params.sheetTitles.map((title, index) => ({
        properties: { title, index },
      }));
    }

    const response = await this.sheets.spreadsheets.create({ requestBody });
    return response.data;
  }

  async renameSpreadsheet(spreadsheetId: string, title: string): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSpreadsheetProperties: {
            properties: { title },
            fields: 'title',
          },
        }],
      },
    });
  }

  async deleteSpreadsheet(spreadsheetId: string): Promise<void> {
    await this.drive.files.update({
      fileId: spreadsheetId,
      requestBody: { trashed: true },
    });
  }

  async copySpreadsheet(spreadsheetId: string, newTitle: string): Promise<DriveFile> {
    const response = await this.drive.files.copy({
      fileId: spreadsheetId,
      requestBody: { name: newTitle },
    });
    return response.data;
  }

  // ─── Sheet (Tab) Management ──────────────────────────────────

  async listSheets(spreadsheetId: string): Promise<Sheet[]> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    return spreadsheet.sheets || [];
  }

  async addSheet(params: AddSheetParams): Promise<any> {
    const properties: any = {
      title: params.title,
    };
    if (params.rowCount) properties.gridProperties = { ...properties.gridProperties, rowCount: params.rowCount };
    if (params.columnCount) properties.gridProperties = { ...properties.gridProperties, columnCount: params.columnCount };
    if (params.tabColor) properties.tabColorStyle = { rgbColor: params.tabColor };

    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties } }],
      },
    });
    return response.data.replies?.[0]?.addSheet?.properties;
  }

  async deleteSheet(spreadsheetId: string, sheetId: number): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId } }],
      },
    });
  }

  async renameSheet(spreadsheetId: string, sheetId: number, title: string): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId, title },
            fields: 'title',
          },
        }],
      },
    });
  }

  async duplicateSheet(spreadsheetId: string, sheetId: number, newSheetName?: string, destinationSpreadsheetId?: string): Promise<any> {
    if (destinationSpreadsheetId) {
      const response = await this.sheets.spreadsheets.sheets.copyTo({
        spreadsheetId,
        sheetId,
        requestBody: { destinationSpreadsheetId },
      });
      return response.data;
    }

    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          duplicateSheet: {
            sourceSheetId: sheetId,
            newSheetName: newSheetName || undefined,
          },
        }],
      },
    });
    return response.data.replies?.[0]?.duplicateSheet?.properties;
  }

  // ─── Cell Read/Write ──────────────────────────────────────────

  async readRange(params: ReadRangeParams): Promise<{ values: any[][]; range: string }> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range: params.range,
      majorDimension: params.majorDimension || 'ROWS',
      valueRenderOption: params.valueRenderOption || 'FORMATTED_VALUE',
      dateTimeRenderOption: params.dateTimeRenderOption || 'FORMATTED_STRING',
    });
    return {
      values: response.data.values || [],
      range: response.data.range || params.range,
    };
  }

  async writeRange(params: WriteRangeParams): Promise<{ updatedRange: string; updatedRows: number; updatedColumns: number; updatedCells: number }> {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId: params.spreadsheetId,
      range: params.range,
      valueInputOption: params.valueInputOption || 'USER_ENTERED',
      requestBody: {
        majorDimension: params.majorDimension || 'ROWS',
        values: params.values,
      },
    });
    return {
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells,
    };
  }

  async appendRows(params: AppendRowsParams): Promise<{ updatedRange: string; updatedRows: number; updatedCells: number }> {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: params.spreadsheetId,
      range: params.range,
      valueInputOption: params.valueInputOption || 'USER_ENTERED',
      insertDataOption: params.insertDataOption || 'INSERT_ROWS',
      requestBody: {
        values: params.values,
      },
    });
    return {
      updatedRange: response.data.updates?.updatedRange || '',
      updatedRows: response.data.updates?.updatedRows || 0,
      updatedCells: response.data.updates?.updatedCells || 0,
    };
  }

  async clearRange(spreadsheetId: string, range: string): Promise<string> {
    const response = await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    return response.data.clearedRange || range;
  }

  async batchRead(params: BatchReadParams): Promise<Array<{ range: string; values: any[][] }>> {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: params.spreadsheetId,
      ranges: params.ranges,
      majorDimension: params.majorDimension || 'ROWS',
      valueRenderOption: params.valueRenderOption || 'FORMATTED_VALUE',
    });
    return (response.data.valueRanges || []).map((vr: any) => ({
      range: vr.range,
      values: vr.values || [],
    }));
  }

  async batchWrite(params: BatchWriteParams): Promise<{ totalUpdatedCells: number; totalUpdatedRows: number; totalUpdatedSheets: number }> {
    const response = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        valueInputOption: params.valueInputOption || 'USER_ENTERED',
        data: params.data.map(d => ({
          range: d.range,
          majorDimension: 'ROWS',
          values: d.values,
        })),
      },
    });
    return {
      totalUpdatedCells: response.data.totalUpdatedCells || 0,
      totalUpdatedRows: response.data.totalUpdatedRows || 0,
      totalUpdatedSheets: response.data.totalUpdatedSheets || 0,
    };
  }

  // ─── Row/Column Operations ───────────────────────────────────

  async insertDimension(params: InsertDimensionParams): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          insertDimension: {
            range: {
              sheetId: params.sheetId,
              dimension: params.dimension,
              startIndex: params.startIndex,
              endIndex: params.endIndex,
            },
            inheritFromBefore: params.inheritFromBefore ?? false,
          },
        }],
      },
    });
  }

  async deleteDimension(params: DeleteDimensionParams): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: params.sheetId,
              dimension: params.dimension,
              startIndex: params.startIndex,
              endIndex: params.endIndex,
            },
          },
        }],
      },
    });
  }

  async autoResizeColumns(spreadsheetId: string, sheetId: number, startIndex: number, endIndex: number): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex,
              endIndex,
            },
          },
        }],
      },
    });
  }

  // ─── Formatting ───────────────────────────────────────────────

  async formatCells(params: FormatCellsParams): Promise<void> {
    const format: any = {};
    const fields: string[] = [];

    if (params.bold !== undefined || params.italic !== undefined || params.fontSize !== undefined || params.fontFamily !== undefined || params.textColor) {
      format.textFormat = {};
      if (params.bold !== undefined) { format.textFormat.bold = params.bold; fields.push('userEnteredFormat.textFormat.bold'); }
      if (params.italic !== undefined) { format.textFormat.italic = params.italic; fields.push('userEnteredFormat.textFormat.italic'); }
      if (params.fontSize !== undefined) { format.textFormat.fontSize = params.fontSize; fields.push('userEnteredFormat.textFormat.fontSize'); }
      if (params.fontFamily !== undefined) { format.textFormat.fontFamily = params.fontFamily; fields.push('userEnteredFormat.textFormat.fontFamily'); }
      if (params.textColor) { format.textFormat.foregroundColorStyle = { rgbColor: params.textColor }; fields.push('userEnteredFormat.textFormat.foregroundColorStyle'); }
    }

    if (params.backgroundColor) {
      format.backgroundColorStyle = { rgbColor: params.backgroundColor };
      fields.push('userEnteredFormat.backgroundColorStyle');
    }

    if (params.horizontalAlignment) {
      format.horizontalAlignment = params.horizontalAlignment;
      fields.push('userEnteredFormat.horizontalAlignment');
    }

    if (params.verticalAlignment) {
      format.verticalAlignment = params.verticalAlignment;
      fields.push('userEnteredFormat.verticalAlignment');
    }

    if (params.wrapStrategy) {
      format.wrapStrategy = params.wrapStrategy;
      fields.push('userEnteredFormat.wrapStrategy');
    }

    if (params.numberFormat) {
      format.numberFormat = params.numberFormat;
      fields.push('userEnteredFormat.numberFormat');
    }

    if (fields.length === 0) return;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: params.sheetId,
              startRowIndex: params.startRowIndex,
              endRowIndex: params.endRowIndex,
              startColumnIndex: params.startColumnIndex,
              endColumnIndex: params.endColumnIndex,
            },
            cell: { userEnteredFormat: format },
            fields: fields.join(','),
          },
        }],
      },
    });
  }

  async mergeCells(params: MergeCellsParams): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          mergeCells: {
            range: {
              sheetId: params.sheetId,
              startRowIndex: params.startRowIndex,
              endRowIndex: params.endRowIndex,
              startColumnIndex: params.startColumnIndex,
              endColumnIndex: params.endColumnIndex,
            },
            mergeType: params.mergeType || 'MERGE_ALL',
          },
        }],
      },
    });
  }

  async unmergeCells(spreadsheetId: string, sheetId: number, startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          unmergeCells: {
            range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
          },
        }],
      },
    });
  }

  // ─── Data Operations ──────────────────────────────────────────

  async sortRange(params: SortRangeParams): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          sortRange: {
            range: {
              sheetId: params.sheetId,
              startRowIndex: params.startRowIndex,
              endRowIndex: params.endRowIndex,
              startColumnIndex: params.startColumnIndex,
              endColumnIndex: params.endColumnIndex,
            },
            sortSpecs: params.sortSpecs,
          },
        }],
      },
    });
  }

  async findReplace(params: FindReplaceParams): Promise<{ valuesChanged: number; sheetsChanged: number; occurrencesChanged: number }> {
    const request: any = {
      find: params.find,
      replacement: params.replacement,
      matchCase: params.matchCase ?? false,
      matchEntireCell: params.matchEntireCell ?? false,
      searchByRegex: params.searchByRegex ?? false,
    };

    if (params.allSheets) {
      request.allSheets = true;
    } else if (params.sheetId !== undefined) {
      request.sheetId = params.sheetId;
    } else {
      request.allSheets = true;
    }

    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{ findReplace: request }],
      },
    });

    const reply = response.data.replies?.[0]?.findReplace || {};
    return {
      valuesChanged: reply.valuesChanged || 0,
      sheetsChanged: reply.sheetsChanged || 0,
      occurrencesChanged: reply.occurrencesChanged || 0,
    };
  }

  async addFilterView(params: AddFilterViewParams): Promise<any> {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
      requestBody: {
        requests: [{
          addFilterView: {
            filter: {
              title: params.title,
              range: {
                sheetId: params.sheetId,
                startRowIndex: params.startRowIndex,
                endRowIndex: params.endRowIndex,
                startColumnIndex: params.startColumnIndex,
                endColumnIndex: params.endColumnIndex,
              },
              sortSpecs: params.sortSpecs,
            },
          },
        }],
      },
    });
    return response.data.replies?.[0]?.addFilterView?.filter;
  }

  // ─── Named Ranges ─────────────────────────────────────────────

  async listNamedRanges(spreadsheetId: string): Promise<NamedRange[]> {
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'namedRanges',
    });
    return spreadsheet.data.namedRanges || [];
  }

  async addNamedRange(spreadsheetId: string, name: string, sheetId: number, startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number): Promise<any> {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addNamedRange: {
            namedRange: {
              name,
              range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
            },
          },
        }],
      },
    });
    return response.data.replies?.[0]?.addNamedRange?.namedRange;
  }

  async deleteNamedRange(spreadsheetId: string, namedRangeId: string): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteNamedRange: { namedRangeId } }],
      },
    });
  }

  // ─── Sharing & Permissions (Drive API) ─────────────────────────

  async shareSpreadsheet(params: ShareSpreadsheetParams): Promise<Permission> {
    const permission: any = {
      role: params.role,
      type: params.type,
    };
    if (params.emailAddress) permission.emailAddress = params.emailAddress;
    if (params.domain) permission.domain = params.domain;

    const response = await this.drive.permissions.create({
      fileId: params.spreadsheetId,
      requestBody: permission,
      sendNotificationEmail: params.sendNotification ?? true,
    });
    return response.data;
  }

  async listPermissions(spreadsheetId: string): Promise<Permission[]> {
    const response = await this.drive.permissions.list({
      fileId: spreadsheetId,
      fields: 'permissions(id,type,role,emailAddress,domain,displayName)',
    });
    return response.data.permissions || [];
  }

  async removePermission(spreadsheetId: string, permissionId: string): Promise<void> {
    await this.drive.permissions.delete({
      fileId: spreadsheetId,
      permissionId,
    });
  }

  // ─── Export ────────────────────────────────────────────────────

  async exportSpreadsheet(spreadsheetId: string, mimeType: string): Promise<Buffer> {
    const response = await this.drive.files.export({
      fileId: spreadsheetId,
      mimeType,
    }, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
