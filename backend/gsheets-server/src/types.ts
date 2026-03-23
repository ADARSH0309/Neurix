/**
 * Google Sheets server types
 */

export interface Spreadsheet {
  spreadsheetId: string;
  properties: SpreadsheetProperties;
  sheets?: Sheet[];
  spreadsheetUrl?: string;
}

export interface SpreadsheetProperties {
  title: string;
  locale?: string;
  autoRecalc?: string;
  timeZone?: string;
  defaultFormat?: CellFormat;
}

export interface Sheet {
  properties: SheetProperties;
  data?: GridData[];
  charts?: EmbeddedChart[];
  filterViews?: FilterView[];
  protectedRanges?: ProtectedRange[];
  conditionalFormats?: ConditionalFormatRule[];
}

export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  sheetType?: string;
  gridProperties?: GridProperties;
  hidden?: boolean;
  tabColorStyle?: ColorStyle;
  rightToLeft?: boolean;
}

export interface GridProperties {
  rowCount?: number;
  columnCount?: number;
  frozenRowCount?: number;
  frozenColumnCount?: number;
  hideGridlines?: boolean;
}

export interface GridData {
  startRow?: number;
  startColumn?: number;
  rowData?: RowData[];
}

export interface RowData {
  values?: CellData[];
}

export interface CellData {
  userEnteredValue?: ExtendedValue;
  effectiveValue?: ExtendedValue;
  formattedValue?: string;
  userEnteredFormat?: CellFormat;
  effectiveFormat?: CellFormat;
  note?: string;
}

export interface ExtendedValue {
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  formulaValue?: string;
  errorValue?: ErrorValue;
}

export interface ErrorValue {
  type: string;
  message: string;
}

export interface CellFormat {
  numberFormat?: NumberFormat;
  backgroundColor?: Color;
  borders?: Borders;
  padding?: Padding;
  horizontalAlignment?: string;
  verticalAlignment?: string;
  wrapStrategy?: string;
  textDirection?: string;
  textFormat?: TextFormat;
  textRotation?: TextRotation;
}

export interface NumberFormat {
  type: string;
  pattern?: string;
}

export interface Color {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface ColorStyle {
  rgbColor?: Color;
  themeColor?: string;
}

export interface Borders {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
}

export interface Border {
  style?: string;
  colorStyle?: ColorStyle;
  width?: number;
}

export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface TextFormat {
  foregroundColorStyle?: ColorStyle;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

export interface TextRotation {
  angle?: number;
  vertical?: boolean;
}

export interface EmbeddedChart {
  chartId?: number;
  position?: EmbeddedObjectPosition;
  spec?: any;
}

export interface EmbeddedObjectPosition {
  sheetId?: number;
  overlayPosition?: OverlayPosition;
}

export interface OverlayPosition {
  anchorCell?: GridCoordinate;
  offsetXPixels?: number;
  offsetYPixels?: number;
  widthPixels?: number;
  heightPixels?: number;
}

export interface GridCoordinate {
  sheetId?: number;
  rowIndex?: number;
  columnIndex?: number;
}

export interface GridRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface FilterView {
  filterViewId?: number;
  title?: string;
  range?: GridRange;
  sortSpecs?: SortSpec[];
  criteria?: Record<string, FilterCriteria>;
}

export interface SortSpec {
  dimensionIndex?: number;
  sortOrder?: string;
}

export interface FilterCriteria {
  hiddenValues?: string[];
  condition?: BooleanCondition;
}

export interface BooleanCondition {
  type: string;
  values?: ConditionValue[];
}

export interface ConditionValue {
  userEnteredValue?: string;
  relativeDate?: string;
}

export interface ProtectedRange {
  protectedRangeId?: number;
  range?: GridRange;
  namedRangeId?: string;
  description?: string;
  warningOnly?: boolean;
  editors?: Editors;
}

export interface Editors {
  users?: string[];
  groups?: string[];
  domainUsersCanEdit?: boolean;
}

export interface ConditionalFormatRule {
  ranges?: GridRange[];
  booleanRule?: BooleanRule;
  gradientRule?: GradientRule;
}

export interface BooleanRule {
  condition?: BooleanCondition;
  format?: CellFormat;
}

export interface GradientRule {
  minpoint?: InterpolationPoint;
  midpoint?: InterpolationPoint;
  maxpoint?: InterpolationPoint;
}

export interface InterpolationPoint {
  color?: Color;
  colorStyle?: ColorStyle;
  type?: string;
  value?: string;
}

export interface NamedRange {
  namedRangeId?: string;
  name?: string;
  range?: GridRange;
}

// Drive file info for listing spreadsheets
export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
  webViewLink?: string;
  starred?: boolean;
}

// Permission type from Drive API
export interface Permission {
  id?: string;
  type: string;
  role: string;
  emailAddress?: string;
  domain?: string;
  displayName?: string;
}

// Parameter interfaces
export interface ReadRangeParams {
  spreadsheetId: string;
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
}

export interface WriteRangeParams {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  majorDimension?: 'ROWS' | 'COLUMNS';
}

export interface AppendRowsParams {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS';
}

export interface BatchReadParams {
  spreadsheetId: string;
  ranges: string[];
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}

export interface BatchWriteParams {
  spreadsheetId: string;
  data: Array<{ range: string; values: any[][] }>;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface CreateSpreadsheetParams {
  title: string;
  sheetTitles?: string[];
  locale?: string;
  timeZone?: string;
}

export interface AddSheetParams {
  spreadsheetId: string;
  title: string;
  rowCount?: number;
  columnCount?: number;
  tabColor?: Color;
}

export interface FormatCellsParams {
  spreadsheetId: string;
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: Color;
  backgroundColor?: Color;
  horizontalAlignment?: string;
  verticalAlignment?: string;
  wrapStrategy?: string;
  numberFormat?: NumberFormat;
}

export interface SortRangeParams {
  spreadsheetId: string;
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  sortSpecs: Array<{ dimensionIndex: number; sortOrder: 'ASCENDING' | 'DESCENDING' }>;
}

export interface FindReplaceParams {
  spreadsheetId: string;
  find: string;
  replacement: string;
  sheetId?: number;
  matchCase?: boolean;
  matchEntireCell?: boolean;
  searchByRegex?: boolean;
  allSheets?: boolean;
}

export interface InsertDimensionParams {
  spreadsheetId: string;
  sheetId: number;
  dimension: 'ROWS' | 'COLUMNS';
  startIndex: number;
  endIndex: number;
  inheritFromBefore?: boolean;
}

export interface DeleteDimensionParams {
  spreadsheetId: string;
  sheetId: number;
  dimension: 'ROWS' | 'COLUMNS';
  startIndex: number;
  endIndex: number;
}

export interface MergeCellsParams {
  spreadsheetId: string;
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  mergeType?: 'MERGE_ALL' | 'MERGE_COLUMNS' | 'MERGE_ROWS';
}

export interface ShareSpreadsheetParams {
  spreadsheetId: string;
  role: 'reader' | 'writer' | 'commenter' | 'owner';
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  domain?: string;
  sendNotification?: boolean;
}

export interface ExportParams {
  spreadsheetId: string;
  mimeType: 'application/pdf' | 'text/csv' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'application/vnd.oasis.opendocument.spreadsheet' | 'text/tab-separated-values';
  sheetId?: number;
}

export interface AddFilterViewParams {
  spreadsheetId: string;
  sheetId: number;
  title: string;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  sortSpecs?: SortSpec[];
}
