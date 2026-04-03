/**
 * MCP HTTP Adapter for Google Sheets
 *
 * Implements JSON-RPC 2.0 protocol for HTTP transport
 */

import { GSheetsClient } from './client.js';
import { z } from 'zod';

// ─── Validation Schemas ──────────────────────────────────────────

const SpreadsheetIdSchema = z.object({
  spreadsheetId: z.string(),
});

const ListSpreadsheetsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(25),
  query: z.string().optional(),
});

const CreateSpreadsheetSchema = z.object({
  title: z.string(),
  sheetTitles: z.array(z.string()).optional(),
  locale: z.string().optional(),
  timeZone: z.string().optional(),
});

const RenameSpreadsheetSchema = z.object({
  spreadsheetId: z.string(),
  title: z.string(),
});

const CopySpreadsheetSchema = z.object({
  spreadsheetId: z.string(),
  newTitle: z.string(),
});

const AddSheetSchema = z.object({
  spreadsheetId: z.string(),
  title: z.string(),
  rowCount: z.number().optional(),
  columnCount: z.number().optional(),
});

const DeleteSheetSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
});

const RenameSheetSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  title: z.string(),
});

const DuplicateSheetSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  newSheetName: z.string().optional(),
  destinationSpreadsheetId: z.string().optional(),
});

const ReadRangeSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  valueRenderOption: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).optional(),
});

const WriteRangeSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  values: z.array(z.array(z.any())),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional(),
});

const AppendRowsSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  values: z.array(z.array(z.any())),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional(),
});

const ClearRangeSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
});

const BatchReadSchema = z.object({
  spreadsheetId: z.string(),
  ranges: z.array(z.string()),
  valueRenderOption: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).optional(),
});

const BatchWriteSchema = z.object({
  spreadsheetId: z.string(),
  data: z.array(z.object({ range: z.string(), values: z.array(z.array(z.any())) })),
  valueInputOption: z.enum(['RAW', 'USER_ENTERED']).optional(),
});

const InsertDimensionSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  dimension: z.enum(['ROWS', 'COLUMNS']),
  startIndex: z.number(),
  endIndex: z.number(),
  inheritFromBefore: z.boolean().optional(),
});

const DeleteDimensionSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  dimension: z.enum(['ROWS', 'COLUMNS']),
  startIndex: z.number(),
  endIndex: z.number(),
});

const AutoResizeSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  startIndex: z.number(),
  endIndex: z.number(),
});

const FormatCellsSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  startRowIndex: z.number(),
  endRowIndex: z.number(),
  startColumnIndex: z.number(),
  endColumnIndex: z.number(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
  verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
  wrapStrategy: z.enum(['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP']).optional(),
  numberFormatType: z.string().optional(),
  numberFormatPattern: z.string().optional(),
});

const MergeCellsSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  startRowIndex: z.number(),
  endRowIndex: z.number(),
  startColumnIndex: z.number(),
  endColumnIndex: z.number(),
  mergeType: z.enum(['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS']).optional(),
});

const UnmergeCellsSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  startRowIndex: z.number(),
  endRowIndex: z.number(),
  startColumnIndex: z.number(),
  endColumnIndex: z.number(),
});

const SortRangeSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  startRowIndex: z.number(),
  endRowIndex: z.number(),
  startColumnIndex: z.number(),
  endColumnIndex: z.number(),
  sortSpecs: z.array(z.object({
    dimensionIndex: z.number(),
    sortOrder: z.enum(['ASCENDING', 'DESCENDING']),
  })),
});

const FindReplaceSchema = z.object({
  spreadsheetId: z.string(),
  find: z.string(),
  replacement: z.string(),
  sheetId: z.number().optional(),
  matchCase: z.boolean().optional(),
  matchEntireCell: z.boolean().optional(),
  searchByRegex: z.boolean().optional(),
  allSheets: z.boolean().optional(),
});

const ShareSpreadsheetSchema = z.object({
  spreadsheetId: z.string(),
  role: z.enum(['reader', 'writer', 'commenter', 'owner']),
  type: z.enum(['user', 'group', 'domain', 'anyone']),
  emailAddress: z.string().optional(),
  domain: z.string().optional(),
  sendNotification: z.boolean().optional(),
});

const RemovePermissionSchema = z.object({
  spreadsheetId: z.string(),
  permissionId: z.string(),
});

export class McpHttpAdapter {
  private sheetsClient: GSheetsClient;

  constructor(sheetsClient: GSheetsClient) {
    this.sheetsClient = sheetsClient;
  }

  async initialize(): Promise<{ protocolVersion: string; capabilities: any; serverInfo: any }> {
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'neurix-gsheets-server', version: '0.1.0' },
    };
  }

  async listTools(): Promise<{ tools: any[] }> {
    return {
      tools: [
        // Spreadsheet Management
        { name: 'list_spreadsheets', description: 'List recent Google Sheets spreadsheets. Optionally search by keyword.', inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Max results (1-100, default: 25)' }, query: { type: 'string', description: 'Search keyword' } } } },
        { name: 'get_spreadsheet', description: 'Get spreadsheet metadata including all sheet names, properties, and URL', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' } }, required: ['spreadsheetId'] } },
        { name: 'create_spreadsheet', description: 'Create a new Google Sheets spreadsheet with optional initial sheet tabs', inputSchema: { type: 'object', properties: { title: { type: 'string' }, sheetTitles: { type: 'array', items: { type: 'string' } }, locale: { type: 'string' }, timeZone: { type: 'string' } }, required: ['title'] } },
        { name: 'rename_spreadsheet', description: 'Rename a spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, title: { type: 'string' } }, required: ['spreadsheetId', 'title'] } },
        { name: 'delete_spreadsheet', description: 'Move a spreadsheet to trash', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' } }, required: ['spreadsheetId'] } },
        { name: 'copy_spreadsheet', description: 'Create a copy of an entire spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, newTitle: { type: 'string' } }, required: ['spreadsheetId', 'newTitle'] } },

        // Sheet (Tab) Management
        { name: 'list_sheets', description: 'List all sheet tabs in a spreadsheet with their properties', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' } }, required: ['spreadsheetId'] } },
        { name: 'add_sheet', description: 'Add a new sheet tab to a spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, title: { type: 'string' }, rowCount: { type: 'number' }, columnCount: { type: 'number' } }, required: ['spreadsheetId', 'title'] } },
        { name: 'delete_sheet', description: 'Delete a sheet tab from a spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' } }, required: ['spreadsheetId', 'sheetId'] } },
        { name: 'rename_sheet', description: 'Rename a sheet tab', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, title: { type: 'string' } }, required: ['spreadsheetId', 'sheetId', 'title'] } },
        { name: 'duplicate_sheet', description: 'Duplicate a sheet tab within the same or to another spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, newSheetName: { type: 'string' }, destinationSpreadsheetId: { type: 'string' } }, required: ['spreadsheetId', 'sheetId'] } },

        // Cell Read/Write
        { name: 'read_range', description: 'Read cell values from a range (e.g., "Sheet1!A1:D10")', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, range: { type: 'string' }, valueRenderOption: { type: 'string', enum: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'] } }, required: ['spreadsheetId', 'range'] } },
        { name: 'write_range', description: 'Write values to a cell range', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, range: { type: 'string' }, values: { type: 'array', items: { type: 'array' } }, valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'] } }, required: ['spreadsheetId', 'range', 'values'] } },
        { name: 'append_rows', description: 'Append rows after the last row with data', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, range: { type: 'string' }, values: { type: 'array', items: { type: 'array' } }, valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'] } }, required: ['spreadsheetId', 'range', 'values'] } },
        { name: 'clear_range', description: 'Clear all values from a cell range', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, range: { type: 'string' } }, required: ['spreadsheetId', 'range'] } },
        { name: 'batch_read', description: 'Read multiple ranges in a single request', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, ranges: { type: 'array', items: { type: 'string' } }, valueRenderOption: { type: 'string' } }, required: ['spreadsheetId', 'ranges'] } },
        { name: 'batch_write', description: 'Write to multiple ranges in a single request', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, data: { type: 'array' }, valueInputOption: { type: 'string' } }, required: ['spreadsheetId', 'data'] } },

        // Row/Column Operations
        { name: 'insert_rows_or_columns', description: 'Insert empty rows or columns at a position', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, dimension: { type: 'string', enum: ['ROWS', 'COLUMNS'] }, startIndex: { type: 'number' }, endIndex: { type: 'number' }, inheritFromBefore: { type: 'boolean' } }, required: ['spreadsheetId', 'sheetId', 'dimension', 'startIndex', 'endIndex'] } },
        { name: 'delete_rows_or_columns', description: 'Delete rows or columns from a sheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, dimension: { type: 'string', enum: ['ROWS', 'COLUMNS'] }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['spreadsheetId', 'sheetId', 'dimension', 'startIndex', 'endIndex'] } },
        { name: 'auto_resize_columns', description: 'Auto-resize columns to fit their content', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['spreadsheetId', 'sheetId', 'startIndex', 'endIndex'] } },

        // Formatting
        { name: 'format_cells', description: 'Apply formatting to a cell range (bold, italic, font, color, alignment)', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, startRowIndex: { type: 'number' }, endRowIndex: { type: 'number' }, startColumnIndex: { type: 'number' }, endColumnIndex: { type: 'number' }, bold: { type: 'boolean' }, italic: { type: 'boolean' }, fontSize: { type: 'number' }, fontFamily: { type: 'string' }, horizontalAlignment: { type: 'string' }, verticalAlignment: { type: 'string' }, wrapStrategy: { type: 'string' }, numberFormatType: { type: 'string' }, numberFormatPattern: { type: 'string' } }, required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'] } },
        { name: 'merge_cells', description: 'Merge a range of cells', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, startRowIndex: { type: 'number' }, endRowIndex: { type: 'number' }, startColumnIndex: { type: 'number' }, endColumnIndex: { type: 'number' }, mergeType: { type: 'string', enum: ['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'] } }, required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'] } },
        { name: 'unmerge_cells', description: 'Unmerge previously merged cells', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, startRowIndex: { type: 'number' }, endRowIndex: { type: 'number' }, startColumnIndex: { type: 'number' }, endColumnIndex: { type: 'number' } }, required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'] } },

        // Data Operations
        { name: 'sort_range', description: 'Sort a range by one or more columns', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, sheetId: { type: 'number' }, startRowIndex: { type: 'number' }, endRowIndex: { type: 'number' }, startColumnIndex: { type: 'number' }, endColumnIndex: { type: 'number' }, sortSpecs: { type: 'array' } }, required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex', 'sortSpecs'] } },
        { name: 'find_replace', description: 'Find and replace text across one or all sheets', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, find: { type: 'string' }, replacement: { type: 'string' }, sheetId: { type: 'number' }, matchCase: { type: 'boolean' }, matchEntireCell: { type: 'boolean' }, searchByRegex: { type: 'boolean' }, allSheets: { type: 'boolean' } }, required: ['spreadsheetId', 'find', 'replacement'] } },

        // Sharing & Permissions
        { name: 'share_spreadsheet', description: 'Share a spreadsheet with a user, group, domain, or make public', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, role: { type: 'string', enum: ['reader', 'writer', 'commenter', 'owner'] }, type: { type: 'string', enum: ['user', 'group', 'domain', 'anyone'] }, emailAddress: { type: 'string' }, domain: { type: 'string' }, sendNotification: { type: 'boolean' } }, required: ['spreadsheetId', 'role', 'type'] } },
        { name: 'list_permissions', description: 'List all sharing permissions for a spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' } }, required: ['spreadsheetId'] } },
        { name: 'remove_permission', description: 'Remove a sharing permission from a spreadsheet', inputSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' }, permissionId: { type: 'string' } }, required: ['spreadsheetId', 'permissionId'] } },
      ],
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      switch (name) {
        // ─── Spreadsheet Management ───────────────────────────
        case 'list_spreadsheets': {
          const params = ListSpreadsheetsSchema.parse(args);
          const files = await this.sheetsClient.listSpreadsheets(params.maxResults, params.query);
          return { content: [{ type: 'text', text: JSON.stringify({ spreadsheets: files, count: files.length }) }] };
        }
        case 'get_spreadsheet': {
          const params = SpreadsheetIdSchema.parse(args);
          const spreadsheet = await this.sheetsClient.getSpreadsheet(params.spreadsheetId);
          return { content: [{ type: 'text', text: JSON.stringify({ spreadsheet }) }] };
        }
        case 'create_spreadsheet': {
          const params = CreateSpreadsheetSchema.parse(args);
          const spreadsheet = await this.sheetsClient.createSpreadsheet(params);
          return { content: [{ type: 'text', text: JSON.stringify({ spreadsheet, action: 'created' }) }] };
        }
        case 'rename_spreadsheet': {
          const params = RenameSpreadsheetSchema.parse(args);
          await this.sheetsClient.renameSpreadsheet(params.spreadsheetId, params.title);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'renamed', title: params.title }) }] };
        }
        case 'delete_spreadsheet': {
          const params = SpreadsheetIdSchema.parse(args);
          await this.sheetsClient.deleteSpreadsheet(params.spreadsheetId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'trashed' }) }] };
        }
        case 'copy_spreadsheet': {
          const params = CopySpreadsheetSchema.parse(args);
          const file = await this.sheetsClient.copySpreadsheet(params.spreadsheetId, params.newTitle);
          return { content: [{ type: 'text', text: JSON.stringify({ file, action: 'copied' }) }] };
        }

        // ─── Sheet (Tab) Management ───────────────────────────
        case 'list_sheets': {
          const params = SpreadsheetIdSchema.parse(args);
          const sheets = await this.sheetsClient.listSheets(params.spreadsheetId);
          const summary = sheets.map((s: any) => ({
            sheetId: s.properties?.sheetId,
            title: s.properties?.title,
            index: s.properties?.index,
            rowCount: s.properties?.gridProperties?.rowCount,
            columnCount: s.properties?.gridProperties?.columnCount,
            hidden: s.properties?.hidden,
          }));
          return { content: [{ type: 'text', text: JSON.stringify({ sheets: summary }) }] };
        }
        case 'add_sheet': {
          const params = AddSheetSchema.parse(args);
          const props = await this.sheetsClient.addSheet(params);
          return { content: [{ type: 'text', text: JSON.stringify({ sheetProperties: props, action: 'added' }) }] };
        }
        case 'delete_sheet': {
          const params = DeleteSheetSchema.parse(args);
          await this.sheetsClient.deleteSheet(params.spreadsheetId, params.sheetId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted' }) }] };
        }
        case 'rename_sheet': {
          const params = RenameSheetSchema.parse(args);
          await this.sheetsClient.renameSheet(params.spreadsheetId, params.sheetId, params.title);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'renamed', title: params.title }) }] };
        }
        case 'duplicate_sheet': {
          const params = DuplicateSheetSchema.parse(args);
          const result = await this.sheetsClient.duplicateSheet(params.spreadsheetId, params.sheetId, params.newSheetName, params.destinationSpreadsheetId);
          return { content: [{ type: 'text', text: JSON.stringify({ sheetProperties: result, action: 'duplicated' }) }] };
        }

        // ─── Cell Read/Write ───────────────────────────────────
        case 'read_range': {
          const params = ReadRangeSchema.parse(args);
          const result = await this.sheetsClient.readRange(params);
          return { content: [{ type: 'text', text: JSON.stringify({ range: result.range, values: result.values, rowCount: result.values.length }) }] };
        }
        case 'write_range': {
          const params = WriteRangeSchema.parse(args);
          const result = await this.sheetsClient.writeRange(params);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }
        case 'append_rows': {
          const params = AppendRowsSchema.parse(args);
          const result = await this.sheetsClient.appendRows(params);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }
        case 'clear_range': {
          const params = ClearRangeSchema.parse(args);
          const clearedRange = await this.sheetsClient.clearRange(params.spreadsheetId, params.range);
          return { content: [{ type: 'text', text: JSON.stringify({ clearedRange }) }] };
        }
        case 'batch_read': {
          const params = BatchReadSchema.parse(args);
          const results = await this.sheetsClient.batchRead(params);
          return { content: [{ type: 'text', text: JSON.stringify({ ranges: results }) }] };
        }
        case 'batch_write': {
          const params = BatchWriteSchema.parse(args);
          const result = await this.sheetsClient.batchWrite(params);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }

        // ─── Row/Column Operations ─────────────────────────────
        case 'insert_rows_or_columns': {
          const params = InsertDimensionSchema.parse(args);
          await this.sheetsClient.insertDimension(params);
          const count = params.endIndex - params.startIndex;
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'inserted', count, dimension: params.dimension }) }] };
        }
        case 'delete_rows_or_columns': {
          const params = DeleteDimensionSchema.parse(args);
          await this.sheetsClient.deleteDimension(params);
          const count = params.endIndex - params.startIndex;
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted', count, dimension: params.dimension }) }] };
        }
        case 'auto_resize_columns': {
          const params = AutoResizeSchema.parse(args);
          await this.sheetsClient.autoResizeColumns(params.spreadsheetId, params.sheetId, params.startIndex, params.endIndex);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'auto_resized' }) }] };
        }

        // ─── Formatting ────────────────────────────────────────
        case 'format_cells': {
          const params = FormatCellsSchema.parse(args);
          await this.sheetsClient.formatCells({
            ...params,
            numberFormat: params.numberFormatType ? { type: params.numberFormatType, pattern: params.numberFormatPattern } : undefined,
          });
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'formatted' }) }] };
        }
        case 'merge_cells': {
          const params = MergeCellsSchema.parse(args);
          await this.sheetsClient.mergeCells(params);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'merged' }) }] };
        }
        case 'unmerge_cells': {
          const params = UnmergeCellsSchema.parse(args);
          await this.sheetsClient.unmergeCells(
            params.spreadsheetId, params.sheetId,
            params.startRowIndex, params.endRowIndex,
            params.startColumnIndex, params.endColumnIndex
          );
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'unmerged' }) }] };
        }

        // ─── Data Operations ───────────────────────────────────
        case 'sort_range': {
          const params = SortRangeSchema.parse(args);
          await this.sheetsClient.sortRange(params);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'sorted' }) }] };
        }
        case 'find_replace': {
          const params = FindReplaceSchema.parse(args);
          const result = await this.sheetsClient.findReplace(params);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }

        // ─── Sharing & Permissions ─────────────────────────────
        case 'share_spreadsheet': {
          const params = ShareSpreadsheetSchema.parse(args);
          const permission = await this.sheetsClient.shareSpreadsheet(params);
          return { content: [{ type: 'text', text: JSON.stringify({ permission, action: 'shared' }) }] };
        }
        case 'list_permissions': {
          const params = SpreadsheetIdSchema.parse(args);
          const permissions = await this.sheetsClient.listPermissions(params.spreadsheetId);
          return { content: [{ type: 'text', text: JSON.stringify({ permissions }) }] };
        }
        case 'remove_permission': {
          const params = RemovePermissionSchema.parse(args);
          await this.sheetsClient.removePermission(params.spreadsheetId, params.permissionId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'permission_removed' }) }] };
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
      const spreadsheets = await this.sheetsClient.listSpreadsheets(25);
      return {
        resources: spreadsheets.map((file: any) => ({
          uri: `gsheets://spreadsheet/${file.id}`,
          name: file.name || file.id,
          description: `Spreadsheet: ${file.name}`,
          mimeType: 'application/json',
        })),
      };
    } catch {
      return { resources: [] };
    }
  }

  async readResource(uri: string): Promise<{ contents: any[] }> {
    const match = uri.match(/^gsheets:\/\/spreadsheet\/(.+)$/);
    if (match) {
      const spreadsheetId = match[1];
      const spreadsheet = await this.sheetsClient.getSpreadsheet(spreadsheetId);
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(spreadsheet, null, 2) }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  async listPrompts(): Promise<{ prompts: any[] }> {
    return {
      prompts: [
        { name: 'analyze_data', description: 'Analyze data in a spreadsheet range', arguments: [{ name: 'spreadsheetId', required: true }, { name: 'range', required: true }] },
        { name: 'create_report', description: 'Create a formatted report spreadsheet', arguments: [{ name: 'title', required: true }, { name: 'dataDescription', required: false }] },
        { name: 'compare_sheets', description: 'Compare data across two sheets', arguments: [{ name: 'spreadsheetId', required: true }, { name: 'sheet1', required: true }, { name: 'sheet2', required: true }] },
      ],
    };
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'analyze_data':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Analyze the data in spreadsheet ${args.spreadsheetId || 'unknown'} range ${args.range || 'Sheet1!A1:Z100'}. Summarize key findings, trends, and any anomalies.` } }] };
      case 'create_report':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Create a formatted report spreadsheet titled "${args.title || 'Report'}". ${args.dataDescription ? `Data description: ${args.dataDescription}` : ''}` } }] };
      case 'compare_sheets':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Compare data in spreadsheet ${args.spreadsheetId || 'unknown'} between sheets "${args.sheet1 || 'Sheet1'}" and "${args.sheet2 || 'Sheet2'}". Identify differences and similarities.` } }] };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
