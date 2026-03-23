/**
 * Google Sheets MCP Server
 */

import { NeurixBaseServer } from '@neurix/mcp-sdk';
import { GSheetsClient } from './gsheets-client.js';
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

export class GSheetsServer extends NeurixBaseServer {
  private sheetsClient: GSheetsClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    super({
      name: 'neurix-gsheets-server',
      version: '0.1.0',
      description: 'Google Sheets MCP Server for managing spreadsheets, data, and formatting',
    });

    this.sheetsClient = new GSheetsClient(clientId, clientSecret, redirectUri, tokenPath);
  }

  async initialize(): Promise<void> {
    await this.sheetsClient.initialize();
    this.logger.info('Google Sheets client initialized successfully');
  }

  protected async listTools() {
    return [
      // ─── Spreadsheet Management ─────────────────────────────────
      {
        name: 'list_spreadsheets',
        description: 'List recent Google Sheets spreadsheets. Optionally search by keyword.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            maxResults: { type: 'number', description: 'Max results (1-100, default: 25)' },
            query: { type: 'string', description: 'Search keyword to filter spreadsheets' },
          },
        },
      },
      {
        name: 'get_spreadsheet',
        description: 'Get spreadsheet metadata including all sheet names, properties, and URL',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          },
          required: ['spreadsheetId'],
        },
      },
      {
        name: 'create_spreadsheet',
        description: 'Create a new Google Sheets spreadsheet with optional initial sheet tabs',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Spreadsheet title' },
            sheetTitles: { type: 'array', items: { type: 'string' }, description: 'Names for initial sheets (default: one "Sheet1")' },
            locale: { type: 'string', description: 'Locale (e.g., "en_US")' },
            timeZone: { type: 'string', description: 'Time zone (e.g., "America/New_York")' },
          },
          required: ['title'],
        },
      },
      {
        name: 'rename_spreadsheet',
        description: 'Rename a spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            title: { type: 'string', description: 'New title' },
          },
          required: ['spreadsheetId', 'title'],
        },
      },
      {
        name: 'delete_spreadsheet',
        description: 'Move a spreadsheet to trash',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID to delete' },
          },
          required: ['spreadsheetId'],
        },
      },
      {
        name: 'copy_spreadsheet',
        description: 'Create a copy of an entire spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Source spreadsheet ID' },
            newTitle: { type: 'string', description: 'Title for the copy' },
          },
          required: ['spreadsheetId', 'newTitle'],
        },
      },

      // ─── Sheet (Tab) Management ─────────────────────────────────
      {
        name: 'list_sheets',
        description: 'List all sheet tabs in a spreadsheet with their properties',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          },
          required: ['spreadsheetId'],
        },
      },
      {
        name: 'add_sheet',
        description: 'Add a new sheet tab to a spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            title: { type: 'string', description: 'Sheet tab name' },
            rowCount: { type: 'number', description: 'Initial row count' },
            columnCount: { type: 'number', description: 'Initial column count' },
          },
          required: ['spreadsheetId', 'title'],
        },
      },
      {
        name: 'delete_sheet',
        description: 'Delete a sheet tab from a spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID (numeric, from sheet properties)' },
          },
          required: ['spreadsheetId', 'sheetId'],
        },
      },
      {
        name: 'rename_sheet',
        description: 'Rename a sheet tab',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            title: { type: 'string', description: 'New sheet name' },
          },
          required: ['spreadsheetId', 'sheetId', 'title'],
        },
      },
      {
        name: 'duplicate_sheet',
        description: 'Duplicate a sheet tab within the same or to another spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Source spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID to duplicate' },
            newSheetName: { type: 'string', description: 'Name for the copy (same spreadsheet only)' },
            destinationSpreadsheetId: { type: 'string', description: 'Target spreadsheet ID (for cross-spreadsheet copy)' },
          },
          required: ['spreadsheetId', 'sheetId'],
        },
      },

      // ─── Cell Read/Write ─────────────────────────────────────────
      {
        name: 'read_range',
        description: 'Read cell values from a range (e.g., "Sheet1!A1:D10"). Returns a 2D array of values.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1:D10")' },
            valueRenderOption: { type: 'string', enum: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'], description: 'How to render values (default: FORMATTED_VALUE)' },
          },
          required: ['spreadsheetId', 'range'],
        },
      },
      {
        name: 'write_range',
        description: 'Write values to a cell range. Values is a 2D array where each inner array is a row.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            range: { type: 'string', description: 'A1 notation range (e.g., "Sheet1!A1")' },
            values: { type: 'array', items: { type: 'array', items: {} }, description: '2D array of values (rows × columns)' },
            valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], description: 'How to interpret input (default: USER_ENTERED — parses formulas & dates)' },
          },
          required: ['spreadsheetId', 'range', 'values'],
        },
      },
      {
        name: 'append_rows',
        description: 'Append rows after the last row with data in the specified range',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            range: { type: 'string', description: 'Range to search for data table (e.g., "Sheet1!A:E")' },
            values: { type: 'array', items: { type: 'array', items: {} }, description: '2D array of rows to append' },
            valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], description: 'Input interpretation (default: USER_ENTERED)' },
          },
          required: ['spreadsheetId', 'range', 'values'],
        },
      },
      {
        name: 'clear_range',
        description: 'Clear all values from a cell range (formatting is preserved)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            range: { type: 'string', description: 'A1 notation range to clear' },
          },
          required: ['spreadsheetId', 'range'],
        },
      },
      {
        name: 'batch_read',
        description: 'Read multiple ranges in a single request for efficiency',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            ranges: { type: 'array', items: { type: 'string' }, description: 'Array of A1 notation ranges' },
            valueRenderOption: { type: 'string', enum: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'], description: 'How to render values' },
          },
          required: ['spreadsheetId', 'ranges'],
        },
      },
      {
        name: 'batch_write',
        description: 'Write to multiple ranges in a single request for efficiency',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            data: {
              type: 'array',
              items: {
                type: 'object' as const,
                properties: {
                  range: { type: 'string' },
                  values: { type: 'array', items: { type: 'array', items: {} } },
                },
              },
              description: 'Array of { range, values } pairs',
            },
            valueInputOption: { type: 'string', enum: ['RAW', 'USER_ENTERED'], description: 'Input interpretation' },
          },
          required: ['spreadsheetId', 'data'],
        },
      },

      // ─── Row/Column Operations ───────────────────────────────────
      {
        name: 'insert_rows_or_columns',
        description: 'Insert empty rows or columns at a position',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            dimension: { type: 'string', enum: ['ROWS', 'COLUMNS'], description: 'ROWS or COLUMNS' },
            startIndex: { type: 'number', description: 'Start index (0-based, inclusive)' },
            endIndex: { type: 'number', description: 'End index (exclusive). To insert 3 rows at row 5: startIndex=4, endIndex=7' },
            inheritFromBefore: { type: 'boolean', description: 'Inherit formatting from row/column before (default: false)' },
          },
          required: ['spreadsheetId', 'sheetId', 'dimension', 'startIndex', 'endIndex'],
        },
      },
      {
        name: 'delete_rows_or_columns',
        description: 'Delete rows or columns from a sheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            dimension: { type: 'string', enum: ['ROWS', 'COLUMNS'], description: 'ROWS or COLUMNS' },
            startIndex: { type: 'number', description: 'Start index (0-based, inclusive)' },
            endIndex: { type: 'number', description: 'End index (exclusive)' },
          },
          required: ['spreadsheetId', 'sheetId', 'dimension', 'startIndex', 'endIndex'],
        },
      },
      {
        name: 'auto_resize_columns',
        description: 'Auto-resize columns to fit their content',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            startIndex: { type: 'number', description: 'Start column index (0-based)' },
            endIndex: { type: 'number', description: 'End column index (exclusive)' },
          },
          required: ['spreadsheetId', 'sheetId', 'startIndex', 'endIndex'],
        },
      },

      // ─── Formatting ──────────────────────────────────────────────
      {
        name: 'format_cells',
        description: 'Apply formatting to a cell range (bold, italic, font, color, alignment, number format)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            startRowIndex: { type: 'number', description: 'Start row (0-based)' },
            endRowIndex: { type: 'number', description: 'End row (exclusive)' },
            startColumnIndex: { type: 'number', description: 'Start column (0-based)' },
            endColumnIndex: { type: 'number', description: 'End column (exclusive)' },
            bold: { type: 'boolean', description: 'Bold text' },
            italic: { type: 'boolean', description: 'Italic text' },
            fontSize: { type: 'number', description: 'Font size in points' },
            fontFamily: { type: 'string', description: 'Font family (e.g., "Arial")' },
            horizontalAlignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT'], description: 'Horizontal alignment' },
            verticalAlignment: { type: 'string', enum: ['TOP', 'MIDDLE', 'BOTTOM'], description: 'Vertical alignment' },
            wrapStrategy: { type: 'string', enum: ['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP'], description: 'Text wrap strategy' },
            numberFormatType: { type: 'string', description: 'Number format type (TEXT, NUMBER, PERCENT, CURRENCY, DATE, TIME, etc.)' },
            numberFormatPattern: { type: 'string', description: 'Custom format pattern (e.g., "#,##0.00")' },
          },
          required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'],
        },
      },
      {
        name: 'merge_cells',
        description: 'Merge a range of cells',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            startRowIndex: { type: 'number', description: 'Start row (0-based)' },
            endRowIndex: { type: 'number', description: 'End row (exclusive)' },
            startColumnIndex: { type: 'number', description: 'Start column (0-based)' },
            endColumnIndex: { type: 'number', description: 'End column (exclusive)' },
            mergeType: { type: 'string', enum: ['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'], description: 'Merge type (default: MERGE_ALL)' },
          },
          required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'],
        },
      },
      {
        name: 'unmerge_cells',
        description: 'Unmerge previously merged cells in a range',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            startRowIndex: { type: 'number', description: 'Start row (0-based)' },
            endRowIndex: { type: 'number', description: 'End row (exclusive)' },
            startColumnIndex: { type: 'number', description: 'Start column (0-based)' },
            endColumnIndex: { type: 'number', description: 'End column (exclusive)' },
          },
          required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex'],
        },
      },

      // ─── Data Operations ──────────────────────────────────────────
      {
        name: 'sort_range',
        description: 'Sort a range by one or more columns',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            sheetId: { type: 'number', description: 'Sheet ID' },
            startRowIndex: { type: 'number', description: 'Start row (0-based)' },
            endRowIndex: { type: 'number', description: 'End row (exclusive)' },
            startColumnIndex: { type: 'number', description: 'Start column (0-based)' },
            endColumnIndex: { type: 'number', description: 'End column (exclusive)' },
            sortSpecs: {
              type: 'array',
              items: {
                type: 'object' as const,
                properties: {
                  dimensionIndex: { type: 'number', description: 'Column index to sort by (0-based within range)' },
                  sortOrder: { type: 'string', enum: ['ASCENDING', 'DESCENDING'] },
                },
              },
              description: 'Sort specifications',
            },
          },
          required: ['spreadsheetId', 'sheetId', 'startRowIndex', 'endRowIndex', 'startColumnIndex', 'endColumnIndex', 'sortSpecs'],
        },
      },
      {
        name: 'find_replace',
        description: 'Find and replace text across one or all sheets',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            find: { type: 'string', description: 'Text to find' },
            replacement: { type: 'string', description: 'Replacement text' },
            sheetId: { type: 'number', description: 'Specific sheet ID (omit for all sheets)' },
            matchCase: { type: 'boolean', description: 'Case-sensitive match (default: false)' },
            matchEntireCell: { type: 'boolean', description: 'Match entire cell content (default: false)' },
            searchByRegex: { type: 'boolean', description: 'Use regex for find pattern (default: false)' },
            allSheets: { type: 'boolean', description: 'Search all sheets (default: true)' },
          },
          required: ['spreadsheetId', 'find', 'replacement'],
        },
      },

      // ─── Sharing & Permissions ───────────────────────────────────
      {
        name: 'share_spreadsheet',
        description: 'Share a spreadsheet with a user, group, domain, or make public',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            role: { type: 'string', enum: ['reader', 'writer', 'commenter', 'owner'], description: 'Permission role' },
            type: { type: 'string', enum: ['user', 'group', 'domain', 'anyone'], description: 'Grantee type' },
            emailAddress: { type: 'string', description: 'Email (for user/group type)' },
            domain: { type: 'string', description: 'Domain (for domain type)' },
            sendNotification: { type: 'boolean', description: 'Send notification email (default: true)' },
          },
          required: ['spreadsheetId', 'role', 'type'],
        },
      },
      {
        name: 'list_permissions',
        description: 'List all sharing permissions for a spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          },
          required: ['spreadsheetId'],
        },
      },
      {
        name: 'remove_permission',
        description: 'Remove a sharing permission from a spreadsheet',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
            permissionId: { type: 'string', description: 'Permission ID to remove' },
          },
          required: ['spreadsheetId', 'permissionId'],
        },
      },
    ];
  }

  protected async callTool(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        // ─── Spreadsheet Management ───────────────────────────
        case 'list_spreadsheets': {
          const params = ListSpreadsheetsSchema.parse(args);
          const files = await this.sheetsClient.listSpreadsheets(params.maxResults, params.query);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ spreadsheets: files, count: files.length }) }],
          };
        }
        case 'get_spreadsheet': {
          const params = SpreadsheetIdSchema.parse(args);
          const spreadsheet = await this.sheetsClient.getSpreadsheet(params.spreadsheetId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ spreadsheet }) }],
          };
        }
        case 'create_spreadsheet': {
          const params = CreateSpreadsheetSchema.parse(args);
          const spreadsheet = await this.sheetsClient.createSpreadsheet(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Spreadsheet created!\n\nID: ${spreadsheet.spreadsheetId}\nTitle: ${spreadsheet.properties.title}\nURL: ${spreadsheet.spreadsheetUrl}`,
            }],
          };
        }
        case 'rename_spreadsheet': {
          const params = RenameSpreadsheetSchema.parse(args);
          await this.sheetsClient.renameSpreadsheet(params.spreadsheetId, params.title);
          return {
            content: [{ type: 'text' as const, text: `Spreadsheet renamed to "${params.title}"` }],
          };
        }
        case 'delete_spreadsheet': {
          const params = SpreadsheetIdSchema.parse(args);
          await this.sheetsClient.deleteSpreadsheet(params.spreadsheetId);
          return {
            content: [{ type: 'text' as const, text: 'Spreadsheet moved to trash' }],
          };
        }
        case 'copy_spreadsheet': {
          const params = CopySpreadsheetSchema.parse(args);
          const file = await this.sheetsClient.copySpreadsheet(params.spreadsheetId, params.newTitle);
          return {
            content: [{
              type: 'text' as const,
              text: `Spreadsheet copied!\n\nNew ID: ${file.id}\nTitle: ${file.name}`,
            }],
          };
        }

        // ─── Sheet (Tab) Management ───────────────────────────
        case 'list_sheets': {
          const params = SpreadsheetIdSchema.parse(args);
          const sheets = await this.sheetsClient.listSheets(params.spreadsheetId);
          const summary = sheets.map(s => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title,
            index: s.properties.index,
            rowCount: s.properties.gridProperties?.rowCount,
            columnCount: s.properties.gridProperties?.columnCount,
            hidden: s.properties.hidden,
          }));
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ sheets: summary }) }],
          };
        }
        case 'add_sheet': {
          const params = AddSheetSchema.parse(args);
          const props = await this.sheetsClient.addSheet(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Sheet added!\n\nSheet ID: ${props.sheetId}\nTitle: ${props.title}`,
            }],
          };
        }
        case 'delete_sheet': {
          const params = DeleteSheetSchema.parse(args);
          await this.sheetsClient.deleteSheet(params.spreadsheetId, params.sheetId);
          return {
            content: [{ type: 'text' as const, text: 'Sheet deleted successfully' }],
          };
        }
        case 'rename_sheet': {
          const params = RenameSheetSchema.parse(args);
          await this.sheetsClient.renameSheet(params.spreadsheetId, params.sheetId, params.title);
          return {
            content: [{ type: 'text' as const, text: `Sheet renamed to "${params.title}"` }],
          };
        }
        case 'duplicate_sheet': {
          const params = DuplicateSheetSchema.parse(args);
          const result = await this.sheetsClient.duplicateSheet(
            params.spreadsheetId, params.sheetId, params.newSheetName, params.destinationSpreadsheetId
          );
          return {
            content: [{
              type: 'text' as const,
              text: `Sheet duplicated!\n\nNew Sheet ID: ${result.sheetId}\nTitle: ${result.title}`,
            }],
          };
        }

        // ─── Cell Read/Write ───────────────────────────────────
        case 'read_range': {
          const params = ReadRangeSchema.parse(args);
          const result = await this.sheetsClient.readRange(params);
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ range: result.range, values: result.values, rowCount: result.values.length }),
            }],
          };
        }
        case 'write_range': {
          const params = WriteRangeSchema.parse(args);
          const result = await this.sheetsClient.writeRange(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Values written!\n\nRange: ${result.updatedRange}\nRows: ${result.updatedRows}\nColumns: ${result.updatedColumns}\nCells: ${result.updatedCells}`,
            }],
          };
        }
        case 'append_rows': {
          const params = AppendRowsSchema.parse(args);
          const result = await this.sheetsClient.appendRows(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Rows appended!\n\nRange: ${result.updatedRange}\nRows added: ${result.updatedRows}\nCells updated: ${result.updatedCells}`,
            }],
          };
        }
        case 'clear_range': {
          const params = ClearRangeSchema.parse(args);
          const clearedRange = await this.sheetsClient.clearRange(params.spreadsheetId, params.range);
          return {
            content: [{ type: 'text' as const, text: `Range cleared: ${clearedRange}` }],
          };
        }
        case 'batch_read': {
          const params = BatchReadSchema.parse(args);
          const results = await this.sheetsClient.batchRead(params);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ ranges: results }) }],
          };
        }
        case 'batch_write': {
          const params = BatchWriteSchema.parse(args);
          const result = await this.sheetsClient.batchWrite(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Batch write complete!\n\nCells updated: ${result.totalUpdatedCells}\nRows updated: ${result.totalUpdatedRows}\nSheets affected: ${result.totalUpdatedSheets}`,
            }],
          };
        }

        // ─── Row/Column Operations ─────────────────────────────
        case 'insert_rows_or_columns': {
          const params = InsertDimensionSchema.parse(args);
          await this.sheetsClient.insertDimension(params);
          const count = params.endIndex - params.startIndex;
          return {
            content: [{ type: 'text' as const, text: `Inserted ${count} ${params.dimension.toLowerCase()} at index ${params.startIndex}` }],
          };
        }
        case 'delete_rows_or_columns': {
          const params = DeleteDimensionSchema.parse(args);
          await this.sheetsClient.deleteDimension(params);
          const count = params.endIndex - params.startIndex;
          return {
            content: [{ type: 'text' as const, text: `Deleted ${count} ${params.dimension.toLowerCase()} from index ${params.startIndex}` }],
          };
        }
        case 'auto_resize_columns': {
          const params = AutoResizeSchema.parse(args);
          await this.sheetsClient.autoResizeColumns(params.spreadsheetId, params.sheetId, params.startIndex, params.endIndex);
          return {
            content: [{ type: 'text' as const, text: `Columns ${params.startIndex}-${params.endIndex - 1} auto-resized` }],
          };
        }

        // ─── Formatting ────────────────────────────────────────
        case 'format_cells': {
          const params = FormatCellsSchema.parse(args);
          await this.sheetsClient.formatCells({
            ...params,
            numberFormat: params.numberFormatType ? { type: params.numberFormatType, pattern: params.numberFormatPattern } : undefined,
          });
          return {
            content: [{ type: 'text' as const, text: 'Formatting applied successfully' }],
          };
        }
        case 'merge_cells': {
          const params = MergeCellsSchema.parse(args);
          await this.sheetsClient.mergeCells(params);
          return {
            content: [{ type: 'text' as const, text: 'Cells merged successfully' }],
          };
        }
        case 'unmerge_cells': {
          const params = UnmergeCellsSchema.parse(args);
          await this.sheetsClient.unmergeCells(
            params.spreadsheetId, params.sheetId,
            params.startRowIndex, params.endRowIndex,
            params.startColumnIndex, params.endColumnIndex
          );
          return {
            content: [{ type: 'text' as const, text: 'Cells unmerged successfully' }],
          };
        }

        // ─── Data Operations ───────────────────────────────────
        case 'sort_range': {
          const params = SortRangeSchema.parse(args);
          await this.sheetsClient.sortRange(params);
          return {
            content: [{ type: 'text' as const, text: 'Range sorted successfully' }],
          };
        }
        case 'find_replace': {
          const params = FindReplaceSchema.parse(args);
          const result = await this.sheetsClient.findReplace(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Find & Replace complete!\n\nOccurrences changed: ${result.occurrencesChanged}\nValues changed: ${result.valuesChanged}\nSheets changed: ${result.sheetsChanged}`,
            }],
          };
        }

        // ─── Sharing & Permissions ─────────────────────────────
        case 'share_spreadsheet': {
          const params = ShareSpreadsheetSchema.parse(args);
          const permission = await this.sheetsClient.shareSpreadsheet(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Spreadsheet shared!\n\nPermission ID: ${permission.id}\nRole: ${params.role}\nGranted to: ${params.emailAddress || params.domain || 'anyone'}`,
            }],
          };
        }
        case 'list_permissions': {
          const params = SpreadsheetIdSchema.parse(args);
          const permissions = await this.sheetsClient.listPermissions(params.spreadsheetId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ permissions }) }],
          };
        }
        case 'remove_permission': {
          const params = RemovePermissionSchema.parse(args);
          await this.sheetsClient.removePermission(params.spreadsheetId, params.permissionId);
          return {
            content: [{ type: 'text' as const, text: 'Permission removed successfully' }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error calling tool ${name}`, error as Error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  protected async listResources() {
    try {
      const files = await this.sheetsClient.listSpreadsheets(10);
      return files.map((file) => ({
        uri: `gsheets://spreadsheet/${file.id}`,
        name: file.name,
        description: `Spreadsheet: ${file.name}`,
        mimeType: 'application/json',
      }));
    } catch {
      return [];
    }
  }

  protected async readResource(uri: string) {
    const match = uri.match(/^gsheets:\/\/spreadsheet\/(.+)$/);
    if (match) {
      const spreadsheetId = match[1];
      const spreadsheet = await this.sheetsClient.getSpreadsheet(spreadsheetId);
      const sheets = spreadsheet.sheets || [];
      // Read first sheet's data by default
      let firstSheetData: any[][] = [];
      if (sheets.length > 0) {
        const title = sheets[0].properties.title;
        const result = await this.sheetsClient.readRange({ spreadsheetId, range: `${title}!A1:Z100` });
        firstSheetData = result.values;
      }
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            title: spreadsheet.properties.title,
            sheets: sheets.map(s => s.properties.title),
            firstSheetData,
          }, null, 2),
        }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  protected async listPrompts() {
    return [
      {
        name: 'analyze_data',
        description: 'Read a sheet and summarize key patterns, totals, and outliers',
        arguments: [
          { name: 'spreadsheetId', description: 'Spreadsheet ID', required: true },
          { name: 'range', description: 'Range to analyze (e.g., "Sheet1!A1:F100")', required: false },
        ],
      },
      {
        name: 'create_report',
        description: 'Create a formatted report spreadsheet from provided data',
        arguments: [
          { name: 'title', description: 'Report title', required: true },
          { name: 'description', description: 'What the report should contain', required: false },
        ],
      },
      {
        name: 'compare_sheets',
        description: 'Compare two sheets or ranges and highlight differences',
        arguments: [
          { name: 'spreadsheetId', description: 'Spreadsheet ID', required: true },
          { name: 'range1', description: 'First range to compare', required: true },
          { name: 'range2', description: 'Second range to compare', required: true },
        ],
      },
    ];
  }

  protected async getPrompt(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'analyze_data': {
        const spreadsheetId = args.spreadsheetId as string;
        const range = args.range as string || 'Sheet1';
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please analyze the data in spreadsheet ${spreadsheetId}, range "${range}".\n\nPlease:\n1. Read the data\n2. Identify column headers and data types\n3. Summarize key statistics (counts, totals, averages)\n4. Note any patterns, trends, or outliers\n5. Suggest any data quality issues`,
            },
          }],
        };
      }
      case 'create_report': {
        const title = args.title as string || 'Report';
        const description = args.description as string || '';
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please create a formatted report spreadsheet titled "${title}".\n\n${description ? `Description: ${description}\n\n` : ''}Please:\n1. Create the spreadsheet with appropriate sheet tabs\n2. Add headers with bold formatting\n3. Set up appropriate column widths\n4. Apply number formatting where relevant`,
            },
          }],
        };
      }
      case 'compare_sheets': {
        const spreadsheetId = args.spreadsheetId as string;
        const range1 = args.range1 as string;
        const range2 = args.range2 as string;
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please compare two ranges in spreadsheet ${spreadsheetId}:\n\nRange 1: ${range1}\nRange 2: ${range2}\n\nPlease:\n1. Read both ranges\n2. Compare cell-by-cell\n3. List all differences (row, column, value in range 1 vs range 2)\n4. Summarize the comparison`,
            },
          }],
        };
      }
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
