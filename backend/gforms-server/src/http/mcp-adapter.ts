import { GFormsClient } from '../gforms-client.js';
import { z } from 'zod';

// Helper to safely coerce numbers - handles empty strings and NaN
const safeNumber = z.preprocess(
  (val) => (val === '' || val === undefined || val === null) ? undefined : Number(val),
  z.number().optional()
).transform((val) => (val !== undefined && isNaN(val)) ? undefined : val);

const safeNumberRequired = z.preprocess(
  (val) => (val === '' || val === undefined || val === null) ? NaN : Number(val),
  z.number()
);

// Validation schemas
const GetFormSchema = z.object({
  formId: z.string(),
});

const ListResponsesSchema = z.object({
  formId: z.string(),
  pageSize: safeNumber.pipe(z.number().min(1).max(100).optional().default(50)),
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
  index: safeNumber,
});

const DeleteItemSchema = z.object({
  formId: z.string(),
  index: safeNumberRequired,
});

const UpdateFormTitleSchema = z.object({
  formId: z.string(),
  title: z.string(),
});

const ListFormsSchema = z.object({
  pageSize: safeNumber.pipe(z.number().min(1).max(100).optional().default(20)),
  pageToken: z.string().optional(),
});

const ExportResponsesToSheetSchema = z.object({
  formId: z.string(),
  sheetTitle: z.string().optional(),
});

const UpdateFormDescriptionSchema = z.object({
  formId: z.string(),
  description: z.string(),
});

const UpdateQuestionTitleSchema = z.object({
  formId: z.string(),
  questionIndex: safeNumberRequired,
  title: z.string(),
  description: z.string().optional(),
});

const UpdateQuestionOptionsSchema = z.object({
  formId: z.string(),
  questionIndex: safeNumberRequired,
  options: z.array(z.string()),
});

const ShareFormSchema = z.object({
  formId: z.string(),
  shareType: z.enum(['user', 'anyone']),
  role: z.enum(['reader', 'writer', 'commenter']),
  email: z.string().optional(),
  sendNotification: z.boolean().optional().default(true),
});

/**
 * MCP HTTP Adapter
 *
 * Implements MCP protocol methods for HTTP transport.
 * Does NOT use MCP SDK's Server class (that's for STDIO).
 * Instead, manually implements JSON-RPC 2.0 handling.
 */

export interface MCPServerInfo {
  protocolVersion: string;
  capabilities: {
    tools?: {};
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    prompts?: {};
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export class McpHttpAdapter {
  private initialized: boolean = false;

  /**
   * Create MCP adapter with an existing GFormsClient instance
   *
   * This supports per-session adapters where each session has its own
   * GFormsClient with session-specific OAuth tokens.
   */
  constructor(private gformsClient: GFormsClient) {}

  /**
   * Initialize the MCP server
   *
   * For session-based auth, the GFormsClient is already initialized via setCredentials()
   * before being passed to this adapter, so we don't need to call initialize() again.
   */
  async initialize(): Promise<MCPServerInfo> {
    // Mark as initialized (credentials already set via setCredentials for session-based auth)
    this.initialized = true;

    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {
          subscribe: false,
          listChanged: false,
        },
        prompts: {},
      },
      serverInfo: {
        name: 'gforms-mcp-server',
        version: '1.0.0',
      },
    };
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<{ tools: MCPTool[] }> {
    return {
      tools: [
        {
          name: 'list_forms',
          description: 'List all Google Forms owned by the user',
          inputSchema: {
            type: 'object',
            properties: {
              pageSize: {
                type: 'number',
                description: 'Maximum number of forms to return (1-100, default: 20)',
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
                description: 'Document title in Google Drive (optional)',
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
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Options for choice questions',
              },
              index: {
                type: 'number',
                description: 'Position to insert the question (0-based)',
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
        {
          name: 'export_responses_to_sheet',
          description: 'Export form responses to a new Google Sheet',
          inputSchema: {
            type: 'object',
            properties: {
              formId: {
                type: 'string',
                description: 'Google Form ID',
              },
              sheetTitle: {
                type: 'string',
                description: 'Title for the new spreadsheet (optional, defaults to form title + date)',
              },
            },
            required: ['formId'],
          },
        },
        {
          name: 'update_form_description',
          description: 'Update the description of a Google Form',
          inputSchema: {
            type: 'object',
            properties: {
              formId: {
                type: 'string',
                description: 'Google Form ID',
              },
              description: {
                type: 'string',
                description: 'New form description',
              },
            },
            required: ['formId', 'description'],
          },
        },
        {
          name: 'update_question_title',
          description: 'Update the title/text of a question in a Google Form',
          inputSchema: {
            type: 'object',
            properties: {
              formId: {
                type: 'string',
                description: 'Google Form ID',
              },
              questionIndex: {
                type: 'number',
                description: 'Index of the question to update (0-based)',
              },
              title: {
                type: 'string',
                description: 'New question title/text',
              },
              description: {
                type: 'string',
                description: 'New question description (optional)',
              },
            },
            required: ['formId', 'questionIndex', 'title'],
          },
        },
        {
          name: 'update_question_options',
          description: 'Update the options of a choice question (MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN)',
          inputSchema: {
            type: 'object',
            properties: {
              formId: {
                type: 'string',
                description: 'Google Form ID',
              },
              questionIndex: {
                type: 'number',
                description: 'Index of the question to update (0-based)',
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'New options for the question',
              },
            },
            required: ['formId', 'questionIndex', 'options'],
          },
        },
        {
          name: 'share_form',
          description: 'Share a Google Form with specific users or make it accessible to anyone with the link',
          inputSchema: {
            type: 'object',
            properties: {
              formId: {
                type: 'string',
                description: 'Google Form ID',
              },
              shareType: {
                type: 'string',
                enum: ['user', 'anyone'],
                description: 'Share type: "user" for specific email, "anyone" for anyone with the link',
              },
              role: {
                type: 'string',
                enum: ['reader', 'writer', 'commenter'],
                description: 'Permission role: "reader" (view only), "writer" (can edit), "commenter" (can comment)',
              },
              email: {
                type: 'string',
                description: 'Email address of the user to share with (required when shareType is "user")',
              },
              sendNotification: {
                type: 'boolean',
                description: 'Whether to send email notification (default: true)',
              },
            },
            required: ['formId', 'shareType', 'role'],
          },
        },
      ],
    };
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'list_forms': {
        const params = ListFormsSchema.parse(args);
        const result = await this.gformsClient.listForms(params.pageSize, params.pageToken);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.forms.length} forms:\n\n${result.forms
                .map((form, idx) => `${idx + 1}. ${form.title}\n   ID: ${form.formId}\n   URL: ${form.responderUri}`)
                .join('\n\n')}${result.nextPageToken ? `\n\nMore results available (pageToken: ${result.nextPageToken})` : ''}`,
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
              text: `Form Details:\n\nTitle: ${form.title}\nDescription: ${form.description || 'No description'}\nForm ID: ${form.formId}\nResponder URL: ${form.responderUri}`,
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
                .map((q, idx) => `${idx + 1}. ${q.title}${q.required ? ' (Required)' : ''}\n   Type: ${q.questionType}\n   ID: ${q.questionId}${q.options ? `\n   Options: ${q.options.join(', ')}` : ''}`)
                .join('\n\n')}`,
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
                .map((resp, idx) => `${idx + 1}. Response ID: ${resp.responseId}\n   Submitted: ${resp.lastSubmittedTime}${resp.respondentEmail ? `\n   Email: ${resp.respondentEmail}` : ''}\n   Answers: ${resp.answers.length}`)
                .join('\n\n')}${result.nextPageToken ? `\n\nMore results available (pageToken: ${result.nextPageToken})` : ''}`,
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
                .map((a) => `- Question ${a.questionId}: ${a.textAnswer || a.textAnswers?.join(', ') || 'No text answer'}`)
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

      case 'export_responses_to_sheet': {
        const params = ExportResponsesToSheetSchema.parse(args);
        const result = await this.gformsClient.exportResponsesToSheet(params.formId, params.sheetTitle);
        return {
          content: [
            {
              type: 'text',
              text: `Responses exported to Google Sheet successfully!\n\nSpreadsheet ID: ${result.spreadsheetId}\nURL: ${result.spreadsheetUrl}\nRows exported: ${result.rowCount}`,
            },
          ],
        };
      }

      case 'update_form_description': {
        const params = UpdateFormDescriptionSchema.parse(args);
        await this.gformsClient.updateFormDescription(params.formId, params.description);
        return {
          content: [
            {
              type: 'text',
              text: `Form description updated successfully!`,
            },
          ],
        };
      }

      case 'update_question_title': {
        const params = UpdateQuestionTitleSchema.parse(args);
        await this.gformsClient.updateQuestionTitle(
          params.formId,
          params.questionIndex,
          params.title,
          params.description
        );
        return {
          content: [
            {
              type: 'text',
              text: `Question at index ${params.questionIndex} updated successfully!\nNew title: ${params.title}${params.description ? `\nNew description: ${params.description}` : ''}`,
            },
          ],
        };
      }

      case 'update_question_options': {
        const params = UpdateQuestionOptionsSchema.parse(args);
        await this.gformsClient.updateQuestionOptions(
          params.formId,
          params.questionIndex,
          params.options
        );
        return {
          content: [
            {
              type: 'text',
              text: `Question options at index ${params.questionIndex} updated successfully!\nNew options: ${params.options.join(', ')}`,
            },
          ],
        };
      }

      case 'share_form': {
        const params = ShareFormSchema.parse(args);
        const result = await this.gformsClient.shareForm({
          formId: params.formId,
          shareType: params.shareType,
          role: params.role,
          email: params.email,
          sendNotification: params.sendNotification,
        });
        const shareTypeText = params.shareType === 'anyone'
          ? 'anyone with the link'
          : `user ${params.email}`;
        return {
          content: [
            {
              type: 'text',
              text: `Form shared successfully!\n\nShared with: ${shareTypeText}\nRole: ${params.role}\nPermission ID: ${result.permissionId}\nShare Link: ${result.shareLink}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<{ resources: MCPResource[] }> {
    try {
      const result = await this.gformsClient.listForms(20);
      const resources: MCPResource[] = result.forms.map((form) => ({
        uri: `gforms://form/${form.formId}`,
        name: `Google Form: ${form.title}`,
        description: `Form: ${form.title}`,
        mimeType: 'application/json',
      }));
      return { resources };
    } catch (error) {
      return { resources: [] };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<any> {
    // Parse URI: gforms://form/{formId}
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

  /**
   * List all available prompts
   */
  async listPrompts(): Promise<{ prompts: MCPPrompt[] }> {
    return {
      prompts: [
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
              description: 'Types of questions to include',
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
      ],
    };
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
    switch (name) {
      case 'create_survey': {
        const { topic, questionCount, questionTypes } = args || {};
        return {
          description: `Create a survey about: ${topic}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please create a survey about: ${topic}

Generate ${questionCount || 5} questions using these question types: ${questionTypes || 'multiple choice, text, rating'}

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
        const { formId } = args || {};
        if (!formId) {
          throw new Error('formId is required');
        }

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
          description: 'Analyze form responses',
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
