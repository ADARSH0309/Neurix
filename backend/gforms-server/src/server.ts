/**
 * Google Forms MCP Server
 */

import { NeurixBaseServer } from '@neurix/mcp-sdk';
import { GFormsClient } from './gforms-client.js';
import { z } from 'zod';

// Validation schemas
const GetFormSchema = z.object({
  formId: z.string(),
});

const ListResponsesSchema = z.object({
  formId: z.string(),
  pageSize: z.number().min(1).max(100).optional().default(50),
  pageToken: z.string().optional(),
});

const GetResponseSchema = z.object({
  formId: z.string(),
  responseId: z.string(),
});

const CreateFormSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  documentTitle: z.string().optional(),
});

const AddQuestionSchema = z.object({
  formId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questionType: z.enum(['TEXT', 'PARAGRAPH_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN']),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  index: z.number().optional(),
  points: z.number().optional(),
  correctAnswers: z.array(z.string()).optional(),
});

const DeleteItemSchema = z.object({
  formId: z.string(),
  index: z.number(),
});

const UpdateFormTitleSchema = z.object({
  formId: z.string(),
  title: z.string(),
});

const ListFormsSchema = z.object({
  pageSize: z.number().min(1).max(100).optional().default(20),
  pageToken: z.string().optional(),
});

export class GFormsServer extends NeurixBaseServer {
  private gformsClient: GFormsClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    super({
      name: 'neurix-gforms-server',
      version: '0.1.0',
      description: 'Google Forms MCP Server for managing forms, questions, and responses',
    });

    this.gformsClient = new GFormsClient(clientId, clientSecret, redirectUri, tokenPath);
  }

  async initialize(): Promise<void> {
    await this.gformsClient.initialize();
    this.logger.info('Google Forms client initialized successfully');
  }

  protected async listTools() {
    return [
      {
        name: 'list_forms',
        description: 'List all Google Forms owned by the user',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Maximum number of forms to return (1-100, default: 20)',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
        },
      },
      {
        name: 'get_form',
        description: 'Get details of a specific Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
          },
          required: ['formId'],
        },
      },
      {
        name: 'get_form_questions',
        description: 'Get all questions from a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
          },
          required: ['formId'],
        },
      },
      {
        name: 'list_responses',
        description: 'List all responses for a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of responses to return (1-100, default: 50)',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
          required: ['formId'],
        },
      },
      {
        name: 'get_response',
        description: 'Get a specific response from a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
            responseId: {
              type: 'string',
              description: 'Response ID',
            },
          },
          required: ['formId', 'responseId'],
        },
      },
      {
        name: 'create_form',
        description: 'Create a new Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Form title',
            },
            description: {
              type: 'string',
              description: 'Form description (optional)',
            },
            documentTitle: {
              type: 'string',
              description: 'Document title in Google Drive (optional, defaults to form title)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'add_question',
        description: 'Add a question to a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
            title: {
              type: 'string',
              description: 'Question title',
            },
            description: {
              type: 'string',
              description: 'Question description (optional)',
            },
            questionType: {
              type: 'string',
              enum: ['TEXT', 'PARAGRAPH_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'],
              description: 'Type of question',
            },
            required: {
              type: 'boolean',
              description: 'Whether the question is required',
              default: false,
            },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Options for choice questions (required for MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN)',
            },
            index: {
              type: 'number',
              description: 'Position to insert the question (0-based, optional)',
            },
            points: {
              type: 'number',
              description: 'Points/marks for this question (for quiz grading)',
            },
            correctAnswers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Correct answers for auto-grading (for MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN)',
            },
          },
          required: ['formId', 'title', 'questionType'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete an item (question) from a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
            index: {
              type: 'number',
              description: 'Index of the item to delete (0-based)',
            },
          },
          required: ['formId', 'index'],
        },
      },
      {
        name: 'update_form_title',
        description: 'Update the title of a Google Form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: {
              type: 'string',
              description: 'Google Form ID',
            },
            title: {
              type: 'string',
              description: 'New form title',
            },
          },
          required: ['formId', 'title'],
        },
      },
    ];
  }

  protected async callTool(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        case 'list_forms': {
          const params = ListFormsSchema.parse(args);
          const result = await this.gformsClient.listForms(params.pageSize, params.pageToken);
          return {
            content: [
              {
                type: 'text',
                text: `Found ${result.forms.length} forms:\n\n${result.forms
                  .map(
                    (form, idx) =>
                      `${idx + 1}. ${form.title}\n   ID: ${form.formId}\n   URL: ${form.responderUri}\n`
                  )
                  .join('\n')}${result.nextPageToken ? `\nMore results available (pageToken: ${result.nextPageToken})` : ''}`,
              },
            ],
          };
        }

        case 'get_form': {
          const params = GetFormSchema.parse(args);
          const form = await this.gformsClient.getForm(params);
          return {
            content: [
              {
                type: 'text',
                text: `Form Details:\n\nTitle: ${form.title}\nDescription: ${form.description || 'No description'}\nDocument Title: ${form.documentTitle}\nForm ID: ${form.formId}\nResponder URL: ${form.responderUri}${form.linkedSheetId ? `\nLinked Sheet ID: ${form.linkedSheetId}` : ''}`,
              },
            ],
          };
        }

        case 'get_form_questions': {
          const params = GetFormSchema.parse(args);
          const questions = await this.gformsClient.getFormQuestions(params.formId);
          return {
            content: [
              {
                type: 'text',
                text: `Form has ${questions.length} questions:\n\n${questions
                  .map(
                    (q, idx) =>
                      `${idx + 1}. ${q.title}${q.required ? ' (Required)' : ''}\n   Type: ${q.questionType}\n   ID: ${q.questionId}${q.description ? `\n   Description: ${q.description}` : ''}${q.options ? `\n   Options: ${q.options.join(', ')}` : ''}\n`
                  )
                  .join('\n')}`,
              },
            ],
          };
        }

        case 'list_responses': {
          const params = ListResponsesSchema.parse(args);
          const result = await this.gformsClient.listResponses(params);
          return {
            content: [
              {
                type: 'text',
                text: `Found ${result.responses.length} responses:\n\n${result.responses
                  .map(
                    (resp, idx) =>
                      `${idx + 1}. Response ID: ${resp.responseId}\n   Submitted: ${resp.lastSubmittedTime}${resp.respondentEmail ? `\n   Email: ${resp.respondentEmail}` : ''}\n   Answers: ${resp.answers.length}\n`
                  )
                  .join('\n')}${result.nextPageToken ? `\nMore results available (pageToken: ${result.nextPageToken})` : ''}`,
              },
            ],
          };
        }

        case 'get_response': {
          const params = GetResponseSchema.parse(args);
          const response = await this.gformsClient.getResponse(params.formId, params.responseId);
          return {
            content: [
              {
                type: 'text',
                text: `Response Details:\n\nResponse ID: ${response.responseId}\nSubmitted: ${response.lastSubmittedTime}${response.respondentEmail ? `\nEmail: ${response.respondentEmail}` : ''}\n\nAnswers:\n${response.answers
                  .map(
                    (a) =>
                      `- Question ${a.questionId}: ${a.textAnswer || a.textAnswers?.join(', ') || 'No text answer'}`
                  )
                  .join('\n')}`,
              },
            ],
          };
        }

        case 'create_form': {
          const params = CreateFormSchema.parse(args);
          const form = await this.gformsClient.createForm(params);
          return {
            content: [
              {
                type: 'text',
                text: `Form created successfully!\n\nTitle: ${form.title}\nForm ID: ${form.formId}\nResponder URL: ${form.responderUri}`,
              },
            ],
          };
        }

        case 'add_question': {
          const params = AddQuestionSchema.parse(args);
          const result = await this.gformsClient.addQuestion(params);
          return {
            content: [
              {
                type: 'text',
                text: `Question added successfully!\n\nQuestion ID: ${result.questionId}\nTitle: ${params.title}\nType: ${params.questionType}`,
              },
            ],
          };
        }

        case 'delete_item': {
          const params = DeleteItemSchema.parse(args);
          await this.gformsClient.deleteItem(params.formId, params.index);
          return {
            content: [
              {
                type: 'text',
                text: `Item at index ${params.index} deleted successfully from form ${params.formId}`,
              },
            ],
          };
        }

        case 'update_form_title': {
          const params = UpdateFormTitleSchema.parse(args);
          await this.gformsClient.updateFormTitle(params.formId, params.title);
          return {
            content: [
              {
                type: 'text',
                text: `Form title updated successfully to: ${params.title}`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error calling tool ${name}`, error as Error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  protected async listResources() {
    try {
      const result = await this.gformsClient.listForms(20);
      return result.forms.map((form) => ({
        uri: `gforms://form/${form.formId}`,
        name: form.title,
        description: `Google Form: ${form.title}`,
        mimeType: 'application/json',
      }));
    } catch (error) {
      this.logger.error('Error listing resources', error as Error);
      return [];
    }
  }

  protected async readResource(uri: string) {
    const match = uri.match(/^gforms:\/\/form\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const formId = match[1];
    const [form, questions, responsesResult] = await Promise.all([
      this.gformsClient.getForm({ formId }),
      this.gformsClient.getFormQuestions(formId),
      this.gformsClient.listResponses({ formId, pageSize: 10 }),
    ]);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            form,
            questions,
            recentResponses: responsesResult.responses,
          }, null, 2),
        },
      ],
    };
  }

  protected async listPrompts() {
    return [
      {
        name: 'create_survey',
        description: 'Generate a survey form with questions based on a topic',
        arguments: [
          {
            name: 'topic',
            description: 'Topic or subject of the survey',
            required: true,
          },
          {
            name: 'questionCount',
            description: 'Number of questions to generate (default: 5)',
            required: false,
          },
          {
            name: 'questionTypes',
            description: 'Types of questions to include (e.g., "multiple choice, text")',
            required: false,
          },
        ],
      },
      {
        name: 'analyze_responses',
        description: 'Analyze and summarize form responses',
        arguments: [
          {
            name: 'formId',
            description: 'Google Form ID to analyze',
            required: true,
          },
        ],
      },
    ];
  }

  protected async getPrompt(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'create_survey': {
        const topic = args.topic as string;
        const questionCount = (args.questionCount as number) || 5;
        const questionTypes = (args.questionTypes as string) || 'multiple choice, text, rating';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please create a survey about: ${topic}

Generate ${questionCount} questions using these question types: ${questionTypes}

For each question, provide:
1. Question text
2. Question type (TEXT, PARAGRAPH_TEXT, MULTIPLE_CHOICE, CHECKBOXES, or DROPDOWN)
3. Whether it's required
4. Options (for choice questions)

Format the output as a list of questions that can be added to a Google Form.`,
              },
            },
          ],
        };
      }

      case 'analyze_responses': {
        const formId = args.formId as string;

        // Fetch form data for context
        let formContext = '';
        try {
          const [form, questions, responsesResult] = await Promise.all([
            this.gformsClient.getForm({ formId }),
            this.gformsClient.getFormQuestions(formId),
            this.gformsClient.listResponses({ formId, pageSize: 50 }),
          ]);

          formContext = `
Form: ${form.title}
Questions: ${questions.map(q => q.title).join(', ')}
Total Responses: ${responsesResult.responses.length}

Response Data:
${JSON.stringify(responsesResult.responses, null, 2)}`;
        } catch (error) {
          formContext = `Unable to fetch form data: ${error}`;
        }

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze the following Google Form responses and provide:

1. Summary statistics for each question
2. Key insights and trends
3. Notable patterns in responses
4. Recommendations based on the data

${formContext}`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
