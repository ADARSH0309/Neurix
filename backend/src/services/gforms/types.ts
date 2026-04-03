/**
 * Google Forms server types
 */

export interface FormInfo {
  formId: string;
  title: string;
  description?: string;
  documentTitle: string;
  responderUri: string;
  linkedSheetId?: string;
}

export interface FormQuestion {
  questionId: string;
  title: string;
  description?: string;
  required: boolean;
  questionType: 'TEXT' | 'PARAGRAPH_TEXT' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROPDOWN' | 'LINEAR_SCALE' | 'DATE' | 'TIME' | 'FILE_UPLOAD' | 'GRID' | 'UNKNOWN';
  options?: string[];
}

export interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers: FormAnswer[];
}

export interface FormAnswer {
  questionId: string;
  questionTitle?: string;
  textAnswer?: string;
  textAnswers?: string[];
  fileUploadAnswers?: FileUploadAnswer[];
}

export interface FileUploadAnswer {
  fileId: string;
  fileName: string;
  mimeType: string;
}

export interface GetFormParams {
  formId: string;
}

export interface ListResponsesParams {
  formId: string;
  pageSize?: number;
  pageToken?: string;
}

export interface GetResponseParams {
  formId: string;
  responseId: string;
}

export interface CreateFormParams {
  title: string;
  description?: string;
  documentTitle?: string;
}

export interface UpdateFormParams {
  formId: string;
  title?: string;
  description?: string;
}

export interface AddQuestionParams {
  formId: string;
  title: string;
  description?: string;
  questionType: 'TEXT' | 'PARAGRAPH_TEXT' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROPDOWN';
  required?: boolean;
  options?: string[];
  index?: number;
}

export interface DeleteItemParams {
  formId: string;
  index: number;
}

export interface ListFormsParams {
  pageSize?: number;
  pageToken?: string;
}
