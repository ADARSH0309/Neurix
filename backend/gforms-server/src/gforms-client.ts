/**
 * Google Forms API client wrapper
 *
 * All Google Forms API calls are wrapped with circuit breaker for resilience.
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';

type OAuth2Client = Auth.OAuth2Client;
import CircuitBreaker from 'opossum';
import {
  FormInfo,
  FormQuestion,
  FormResponse,
  FormAnswer,
  GetFormParams,
  ListResponsesParams,
  CreateFormParams,
  AddQuestionParams,
} from './types.js';
import {
  createGFormsCircuitBreaker,
  formatCircuitBreakerError,
  type CircuitBreakerStateCallback,
} from './utils/circuit-breaker.js';
import { gforms_circuit_breaker_state_changes_total } from './http/metrics/prometheus.js';

export class GFormsClient {
  private oauth2Client: OAuth2Client;
  private forms: any;
  private drive: any;
  private sheets: any;

  // Circuit breakers for each Forms API operation
  private getFormBreaker?: CircuitBreaker<any[], any>;
  private listResponsesBreaker?: CircuitBreaker<any[], any>;
  private getResponseBreaker?: CircuitBreaker<any[], any>;
  private createFormBreaker?: CircuitBreaker<any[], any>;
  private updateFormBreaker?: CircuitBreaker<any[], any>;
  private listFormsBreaker?: CircuitBreaker<any[], any>;
  private createSheetBreaker?: CircuitBreaker<any[], any>;
  private updateSheetBreaker?: CircuitBreaker<any[], any>;
  private createPermissionBreaker?: CircuitBreaker<any[], any>;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenPath: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Creates a state change callback for circuit breakers that increments Prometheus metrics
   */
  private createStateChangeCallback(circuitName: string): CircuitBreakerStateCallback {
    return (state: 'open' | 'halfOpen' | 'close') => {
      gforms_circuit_breaker_state_changes_total.inc({ state, circuit: circuitName });
    };
  }

  /**
   * Initializes circuit breakers for all Forms API operations
   */
  private initializeCircuitBreakers(): void {
    // Circuit breaker for getting form details
    this.getFormBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.forms.forms.get(params),
      { name: 'getForm' },
      this.createStateChangeCallback('getForm')
    );

    // Circuit breaker for listing responses
    this.listResponsesBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.forms.forms.responses.list(params),
      { name: 'listResponses' },
      this.createStateChangeCallback('listResponses')
    );

    // Circuit breaker for getting a single response
    this.getResponseBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.forms.forms.responses.get(params),
      { name: 'getResponse' },
      this.createStateChangeCallback('getResponse')
    );

    // Circuit breaker for creating forms
    this.createFormBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.forms.forms.create(params),
      { name: 'createForm' },
      this.createStateChangeCallback('createForm')
    );

    // Circuit breaker for updating forms
    this.updateFormBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.forms.forms.batchUpdate(params),
      { name: 'updateForm' },
      this.createStateChangeCallback('updateForm')
    );

    // Circuit breaker for listing forms (via Drive API)
    this.listFormsBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.drive.files.list(params),
      { name: 'listForms' },
      this.createStateChangeCallback('listForms')
    );

    // Circuit breaker for creating spreadsheets
    this.createSheetBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.sheets.spreadsheets.create(params),
      { name: 'createSheet' },
      this.createStateChangeCallback('createSheet')
    );

    // Circuit breaker for updating spreadsheets
    this.updateSheetBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.sheets.spreadsheets.values.update(params),
      { name: 'updateSheet' },
      this.createStateChangeCallback('updateSheet')
    );

    // Circuit breaker for creating permissions (Drive API)
    this.createPermissionBreaker = createGFormsCircuitBreaker(
      async (params: any) => this.drive.permissions.create(params),
      { name: 'createPermission' },
      this.createStateChangeCallback('createPermission')
    );
  }

  async initialize(): Promise<void> {
    // Load token from file
    try {
      const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);

      // Setup auto-refresh
      this.oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          try {
            await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
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

      this.forms = google.forms({ version: 'v1', auth: this.oauth2Client });
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

      // Initialize circuit breakers after Forms client is ready
      this.initializeCircuitBreakers();
    } catch (error) {
      throw new Error(
        `Failed to load Google Forms credentials. Please run OAuth setup first. Error: ${error}`
      );
    }
  }

  /**
   * Set OAuth credentials directly (for session-based auth)
   */
  setCredentials(tokens: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  }): void {
    this.oauth2Client.setCredentials(tokens);
    this.forms = google.forms({ version: 'v1', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

    // Initialize circuit breakers after Forms client is ready
    this.initializeCircuitBreakers();
  }

  /**
   * Get form details
   */
  async getForm(params: GetFormParams): Promise<FormInfo> {
    try {
      if (!this.getFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getFormBreaker.fire({
        formId: params.formId,
      });

      const form = response.data;

      return {
        formId: form.formId,
        title: form.info?.title || '',
        description: form.info?.description,
        documentTitle: form.info?.documentTitle || '',
        responderUri: form.responderUri || '',
        linkedSheetId: form.linkedSheetId,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getForm');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get form questions/items
   */
  async getFormQuestions(formId: string): Promise<FormQuestion[]> {
    try {
      if (!this.getFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getFormBreaker.fire({
        formId: formId,
      });

      const form = response.data;
      const questions: FormQuestion[] = [];

      if (form.items) {
        for (const item of form.items) {
          if (item.questionItem) {
            const question = item.questionItem.question;
            let questionType: FormQuestion['questionType'] = 'UNKNOWN';
            let options: string[] | undefined;

            if (question.textQuestion) {
              questionType = question.textQuestion.paragraph ? 'PARAGRAPH_TEXT' : 'TEXT';
            } else if (question.choiceQuestion) {
              const choiceType = question.choiceQuestion.type;
              if (choiceType === 'RADIO') questionType = 'MULTIPLE_CHOICE';
              else if (choiceType === 'CHECKBOX') questionType = 'CHECKBOXES';
              else if (choiceType === 'DROP_DOWN') questionType = 'DROPDOWN';

              options = question.choiceQuestion.options?.map((opt: any) => opt.value) || [];
            } else if (question.scaleQuestion) {
              questionType = 'LINEAR_SCALE';
            } else if (question.dateQuestion) {
              questionType = 'DATE';
            } else if (question.timeQuestion) {
              questionType = 'TIME';
            } else if (question.fileUploadQuestion) {
              questionType = 'FILE_UPLOAD';
            }

            questions.push({
              questionId: question.questionId,
              title: item.title || '',
              description: item.description,
              required: question.required || false,
              questionType,
              options,
            });
          }
        }
      }

      return questions;
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getFormQuestions');
      throw new Error(errorMessage);
    }
  }

  /**
   * List form responses
   */
  async listResponses(params: ListResponsesParams): Promise<{ responses: FormResponse[]; nextPageToken?: string }> {
    try {
      if (!this.listResponsesBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.listResponsesBreaker.fire({
        formId: params.formId,
        pageSize: params.pageSize || 50,
        pageToken: params.pageToken,
      });

      const data = response.data;
      const responses: FormResponse[] = (data.responses || []).map((resp: any) => this.parseResponse(resp));

      return {
        responses,
        nextPageToken: data.nextPageToken,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listResponses');
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a single form response
   */
  async getResponse(formId: string, responseId: string): Promise<FormResponse> {
    try {
      if (!this.getResponseBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.getResponseBreaker.fire({
        formId,
        responseId,
      });

      return this.parseResponse(response.data);
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'getResponse');
      throw new Error(errorMessage);
    }
  }

  /**
   * Parse a form response from the API
   */
  private parseResponse(resp: any): FormResponse {
    const answers: FormAnswer[] = [];

    if (resp.answers) {
      for (const [questionId, answerData] of Object.entries(resp.answers as Record<string, any>)) {
        const answer: FormAnswer = {
          questionId,
        };

        if (answerData.textAnswers?.answers) {
          const textValues = answerData.textAnswers.answers.map((a: any) => a.value);
          if (textValues.length === 1) {
            answer.textAnswer = textValues[0];
          } else {
            answer.textAnswers = textValues;
          }
        }

        if (answerData.fileUploadAnswers?.answers) {
          answer.fileUploadAnswers = answerData.fileUploadAnswers.answers.map((f: any) => ({
            fileId: f.fileId,
            fileName: f.fileName,
            mimeType: f.mimeType,
          }));
        }

        answers.push(answer);
      }
    }

    return {
      responseId: resp.responseId,
      createTime: resp.createTime,
      lastSubmittedTime: resp.lastSubmittedTime,
      respondentEmail: resp.respondentEmail,
      answers,
    };
  }

  /**
   * Create a new form
   */
  async createForm(params: CreateFormParams): Promise<FormInfo> {
    try {
      if (!this.createFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.createFormBreaker.fire({
        requestBody: {
          info: {
            title: params.title,
            documentTitle: params.documentTitle || params.title,
          },
        },
      });

      const form = response.data;

      // If description is provided, update the form
      if (params.description) {
        await this.updateFormDescription(form.formId, params.description);
      }

      return {
        formId: form.formId,
        title: form.info?.title || params.title,
        description: params.description,
        documentTitle: form.info?.documentTitle || params.title,
        responderUri: form.responderUri || '',
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'createForm');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update form description
   */
  async updateFormDescription(formId: string, description: string): Promise<{ success: boolean }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.updateFormBreaker.fire({
        formId,
        requestBody: {
          requests: [
            {
              updateFormInfo: {
                info: {
                  description,
                },
                updateMask: 'description',
              },
            },
          ],
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateFormDescription');
      throw new Error(errorMessage);
    }
  }

  /**
   * Add a question to a form
   */
  async addQuestion(params: AddQuestionParams): Promise<{ questionId: string }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      let questionConfig: any = {};

      switch (params.questionType) {
        case 'TEXT':
          questionConfig = {
            textQuestion: {
              paragraph: false,
            },
          };
          break;
        case 'PARAGRAPH_TEXT':
          questionConfig = {
            textQuestion: {
              paragraph: true,
            },
          };
          break;
        case 'MULTIPLE_CHOICE':
          questionConfig = {
            choiceQuestion: {
              type: 'RADIO',
              options: params.options?.filter(v => v.trim() !== '').map(value => ({ value })) || [],
            },
          };
          break;
        case 'CHECKBOXES':
          questionConfig = {
            choiceQuestion: {
              type: 'CHECKBOX',
              options: params.options?.filter(v => v.trim() !== '').map(value => ({ value })) || [],
            },
          };
          break;
        case 'DROPDOWN':
          questionConfig = {
            choiceQuestion: {
              type: 'DROP_DOWN',
              options: params.options?.filter(v => v.trim() !== '').map(value => ({ value })) || [],
            },
          };
          break;
      }

      const response = await this.updateFormBreaker.fire({
        formId: params.formId,
        requestBody: {
          requests: [
            {
              createItem: {
                item: {
                  title: params.title,
                  description: params.description,
                  questionItem: {
                    question: {
                      required: params.required || false,
                      ...questionConfig,
                    },
                  },
                },
                location: {
                  index: params.index ?? 0,
                },
              },
            },
          ],
        },
      });

      const questionId = response.data.replies?.[0]?.createItem?.questionId?.[0]?.questionId || '';

      return { questionId };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'addQuestion');
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete an item from a form
   */
  async deleteItem(formId: string, index: number): Promise<{ success: boolean }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.updateFormBreaker.fire({
        formId,
        requestBody: {
          requests: [
            {
              deleteItem: {
                location: {
                  index,
                },
              },
            },
          ],
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'deleteItem');
      throw new Error(errorMessage);
    }
  }

  /**
   * List forms owned by the user (via Drive API)
   */
  async listForms(pageSize: number = 20, pageToken?: string): Promise<{ forms: FormInfo[]; nextPageToken?: string }> {
    try {
      if (!this.listFormsBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const response = await this.listFormsBreaker.fire({
        q: "mimeType='application/vnd.google-apps.form'",
        pageSize,
        pageToken,
        fields: 'nextPageToken, files(id, name)',
      });

      const files = response.data.files || [];
      const forms: FormInfo[] = [];

      // Get details for each form
      for (const file of files) {
        try {
          const formInfo = await this.getForm({ formId: file.id });
          forms.push(formInfo);
        } catch (error) {
          // If we can't get form details, add basic info
          forms.push({
            formId: file.id,
            title: file.name || '',
            documentTitle: file.name || '',
            responderUri: `https://docs.google.com/forms/d/${file.id}/viewform`,
          });
        }
      }

      return {
        forms,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'listForms');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update form title
   */
  async updateFormTitle(formId: string, title: string): Promise<{ success: boolean }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      await this.updateFormBreaker.fire({
        formId,
        requestBody: {
          requests: [
            {
              updateFormInfo: {
                info: {
                  title,
                },
                updateMask: 'title',
              },
            },
          ],
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateFormTitle');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update question title/text
   */
  async updateQuestionTitle(
    formId: string,
    questionIndex: number,
    title: string,
    description?: string
  ): Promise<{ success: boolean }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      const updateItem: any = {
        item: {
          title,
        },
        location: {
          index: questionIndex,
        },
        updateMask: 'title',
      };

      if (description !== undefined) {
        updateItem.item.description = description;
        updateItem.updateMask = 'title,description';
      }

      await this.updateFormBreaker.fire({
        formId,
        requestBody: {
          requests: [
            {
              updateItem,
            },
          ],
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateQuestionTitle');
      throw new Error(errorMessage);
    }
  }

  /**
   * Update question options (for choice questions)
   */
  async updateQuestionOptions(
    formId: string,
    questionIndex: number,
    options: string[]
  ): Promise<{ success: boolean }> {
    try {
      if (!this.updateFormBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      // Filter empty options
      const filteredOptions = options.filter(o => o.trim() !== '');

      await this.updateFormBreaker.fire({
        formId,
        requestBody: {
          requests: [
            {
              updateItem: {
                item: {
                  questionItem: {
                    question: {
                      choiceQuestion: {
                        options: filteredOptions.map(value => ({ value })),
                      },
                    },
                  },
                },
                location: {
                  index: questionIndex,
                },
                updateMask: 'questionItem.question.choiceQuestion.options',
              },
            },
          ],
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'updateQuestionOptions');
      throw new Error(errorMessage);
    }
  }

  /**
   * Export form responses to a Google Sheet
   */
  async exportResponsesToSheet(
    formId: string,
    sheetTitle?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
    try {
      if (!this.createSheetBreaker || !this.updateSheetBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      // Get form details and questions
      const formInfo = await this.getForm({ formId });
      const questions = await this.getFormQuestions(formId);

      // Get all responses
      const responsesResult = await this.listResponses({ formId, pageSize: 100 });
      const responses = responsesResult.responses;

      // Build headers from questions
      const headers = ['Response ID', 'Submitted At'];
      const questionIdToIndex: Map<string, number> = new Map();

      questions.forEach((q: FormQuestion, idx: number) => {
        headers.push(q.title || `Question ${idx + 1}`);
        questionIdToIndex.set(q.questionId, headers.length - 1);
      });

      // Build data rows
      const rows: string[][] = [headers];

      for (const response of responses) {
        const row: string[] = new Array(headers.length).fill('');
        row[0] = response.responseId;
        row[1] = response.createTime || '';

        if (response.answers) {
          for (const answer of response.answers) {
            const colIndex = questionIdToIndex.get(answer.questionId);
            if (colIndex !== undefined) {
              // Handle both single answer (textAnswer) and multiple answers (textAnswers)
              row[colIndex] = answer.textAnswers?.join(', ') || answer.textAnswer || '';
            }
          }
        }
        rows.push(row);
      }

      // Create new spreadsheet
      const title = sheetTitle || `${formInfo.title || 'Form'} Responses - ${new Date().toISOString().split('T')[0]}`;

      const createResponse = await this.createSheetBreaker.fire({
        requestBody: {
          properties: {
            title,
          },
          sheets: [
            {
              properties: {
                title: 'Responses',
              },
            },
          ],
        },
      });

      const spreadsheetId = createResponse.data.spreadsheetId;
      const spreadsheetUrl = createResponse.data.spreadsheetUrl;

      // Write data to sheet
      await this.updateSheetBreaker.fire({
        spreadsheetId,
        range: 'Responses!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });

      return {
        spreadsheetId,
        spreadsheetUrl,
        rowCount: rows.length - 1, // Exclude header row
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'exportResponsesToSheet');
      throw new Error(errorMessage);
    }
  }

  /**
   * Share a form with a user or make it accessible to anyone
   * @param formId - The form ID to share
   * @param shareType - 'user' for specific email, 'anyone' for anyone with link
   * @param role - 'reader' (view only), 'writer' (can edit), 'commenter' (can comment)
   * @param email - Email address (required when shareType is 'user')
   * @param sendNotification - Whether to send email notification (default: true)
   */
  async shareForm(params: {
    formId: string;
    shareType: 'user' | 'anyone';
    role: 'reader' | 'writer' | 'commenter';
    email?: string;
    sendNotification?: boolean;
  }): Promise<{ permissionId: string; shareLink: string }> {
    try {
      if (!this.createPermissionBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      if (params.shareType === 'user' && !params.email) {
        throw new Error('Email is required when sharing with a specific user');
      }

      const permissionRequest: any = {
        fileId: params.formId,
        requestBody: {
          role: params.role,
          type: params.shareType,
        },
      };

      if (params.shareType === 'user') {
        permissionRequest.requestBody.emailAddress = params.email;
        // Always send notification unless explicitly set to false
        permissionRequest.sendNotificationEmail = params.sendNotification !== false;
      }

      // Debug logging
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'shareForm request',
        sendNotificationParam: params.sendNotification,
        sendNotificationEmail: permissionRequest.sendNotificationEmail,
        shareType: params.shareType,
        email: params.email,
      }));

      const response = await this.createPermissionBreaker.fire(permissionRequest);

      // Get the form URL
      const formInfo = await this.getForm({ formId: params.formId });
      const shareLink = params.shareType === 'anyone'
        ? formInfo.responderUri
        : `https://docs.google.com/forms/d/${params.formId}/edit`;

      return {
        permissionId: response.data.id,
        shareLink,
      };
    } catch (error) {
      const errorMessage = formatCircuitBreakerError(error, 'shareForm');
      throw new Error(errorMessage);
    }
  }
}
