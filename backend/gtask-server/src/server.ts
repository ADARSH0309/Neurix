/**
 * Google Tasks MCP Server (Standalone)
 */

import { NeurixBaseServer } from '@neurix/mcp-sdk';
import { GTaskClient } from './gtask-client.js';
import { z } from 'zod';

// Validation schemas
const TaskListIdSchema = z.object({
  taskListId: z.string(),
});

const ListTasksSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  maxResults: z.number().min(1).max(100).optional().default(20),
  showCompleted: z.boolean().optional().default(true),
  showDeleted: z.boolean().optional().default(false),
  showHidden: z.boolean().optional().default(false),
  dueMin: z.string().optional(),
  dueMax: z.string().optional(),
  pageToken: z.string().optional(),
});

const GetTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
});

const CreateTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  title: z.string(),
  notes: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
  parent: z.string().optional(),
  previous: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
  title: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
});

const DeleteTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
});

const CompleteTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
});

const MoveTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
  parent: z.string().optional(),
  previous: z.string().optional(),
});

const CreateTaskListSchema = z.object({
  title: z.string(),
});

const UpdateTaskListSchema = z.object({
  taskListId: z.string(),
  title: z.string(),
});

export class GTaskServer extends NeurixBaseServer {
  private taskClient: GTaskClient;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string
  ) {
    super({
      name: 'neurix-gtask-server',
      version: '0.1.0',
      description: 'Google Tasks MCP Server for managing task lists and tasks',
    });

    this.taskClient = new GTaskClient(clientId, clientSecret, redirectUri, tokenPath);
  }

  async initialize(): Promise<void> {
    await this.taskClient.initialize();
    this.logger.info('Google Tasks client initialized successfully');
  }

  protected async listTools() {
    return [
      // ─── Task List Management ─────────────────────────────────
      {
        name: 'list_task_lists',
        description: 'List all task lists for the authenticated user',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_task_list',
        description: 'Get details of a specific task list',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID' },
          },
          required: ['taskListId'],
        },
      },
      {
        name: 'create_task_list',
        description: 'Create a new task list',
        inputSchema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Task list title' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task_list',
        description: 'Update a task list title',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID' },
            title: { type: 'string', description: 'New title' },
          },
          required: ['taskListId', 'title'],
        },
      },
      {
        name: 'delete_task_list',
        description: 'Delete a task list',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID to delete' },
          },
          required: ['taskListId'],
        },
      },

      // ─── Task Management ────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List tasks from a task list. Defaults to the default task list.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            maxResults: { type: 'number', description: 'Maximum tasks to return (1-100, default: 20)' },
            showCompleted: { type: 'boolean', description: 'Show completed tasks (default: true)' },
            showDeleted: { type: 'boolean', description: 'Show deleted tasks (default: false)' },
            showHidden: { type: 'boolean', description: 'Show hidden tasks (default: false)' },
            dueMin: { type: 'string', description: 'Lower bound for due date (RFC 3339)' },
            dueMax: { type: 'string', description: 'Upper bound for due date (RFC 3339)' },
            pageToken: { type: 'string', description: 'Token for pagination' },
          },
        },
      },
      {
        name: 'get_task',
        description: 'Get full details of a specific task',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in a task list',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            title: { type: 'string', description: 'Task title' },
            notes: { type: 'string', description: 'Task notes/description' },
            due: { type: 'string', description: 'Due date (RFC 3339, e.g., "2024-01-15T00:00:00.000Z")' },
            status: { type: 'string', enum: ['needsAction', 'completed'], description: 'Task status' },
            parent: { type: 'string', description: 'Parent task ID (for subtasks)' },
            previous: { type: 'string', description: 'Previous sibling task ID (for ordering)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task. Only provided fields will be changed.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID to update' },
            title: { type: 'string', description: 'New title' },
            notes: { type: 'string', description: 'New notes/description' },
            due: { type: 'string', description: 'New due date (RFC 3339)' },
            status: { type: 'string', enum: ['needsAction', 'completed'], description: 'New status' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID to delete' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as completed',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID to complete' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'uncomplete_task',
        description: 'Mark a completed task as not completed (needs action)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID to uncomplete' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'move_task',
        description: 'Move a task to a different position or make it a subtask',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
            taskId: { type: 'string', description: 'Task ID to move' },
            parent: { type: 'string', description: 'New parent task ID (for making it a subtask)' },
            previous: { type: 'string', description: 'Previous sibling task ID (for ordering)' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'clear_completed_tasks',
        description: 'Clear all completed tasks from a task list',
        inputSchema: {
          type: 'object' as const,
          properties: {
            taskListId: { type: 'string', description: 'Task list ID (default: "@default")' },
          },
        },
      },
    ];
  }

  protected async callTool(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        // Task List Management
        case 'list_task_lists': {
          const taskLists = await this.taskClient.listTaskLists();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ taskLists }) }],
          };
        }
        case 'get_task_list': {
          const params = TaskListIdSchema.parse(args);
          const taskList = await this.taskClient.getTaskList(params.taskListId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ taskList }) }],
          };
        }
        case 'create_task_list': {
          const params = CreateTaskListSchema.parse(args);
          const taskList = await this.taskClient.createTaskList(params);
          return {
            content: [{ type: 'text' as const, text: `Task list created!\n\nID: ${taskList.id}\nTitle: ${taskList.title}` }],
          };
        }
        case 'update_task_list': {
          const params = UpdateTaskListSchema.parse(args);
          const taskList = await this.taskClient.updateTaskList(params);
          return {
            content: [{ type: 'text' as const, text: `Task list updated!\n\nID: ${taskList.id}\nTitle: ${taskList.title}` }],
          };
        }
        case 'delete_task_list': {
          const params = TaskListIdSchema.parse(args);
          await this.taskClient.deleteTaskList(params.taskListId);
          return {
            content: [{ type: 'text' as const, text: 'Task list deleted successfully' }],
          };
        }

        // Task Management
        case 'list_tasks': {
          const params = ListTasksSchema.parse(args);
          const result = await this.taskClient.listTasks(params);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ tasks: result.tasks, nextPageToken: result.nextPageToken }) }],
          };
        }
        case 'get_task': {
          const params = GetTaskSchema.parse(args);
          const task = await this.taskClient.getTask(params.taskListId, params.taskId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ task }) }],
          };
        }
        case 'create_task': {
          const params = CreateTaskSchema.parse(args);
          const task = await this.taskClient.createTask(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Task created!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}${task.due ? `\nDue: ${task.due}` : ''}`,
            }],
          };
        }
        case 'update_task': {
          const params = UpdateTaskSchema.parse(args);
          const task = await this.taskClient.updateTask(params);
          return {
            content: [{
              type: 'text' as const,
              text: `Task updated!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}${task.due ? `\nDue: ${task.due}` : ''}`,
            }],
          };
        }
        case 'delete_task': {
          const params = DeleteTaskSchema.parse(args);
          await this.taskClient.deleteTask(params.taskListId, params.taskId);
          return {
            content: [{ type: 'text' as const, text: 'Task deleted successfully' }],
          };
        }
        case 'complete_task': {
          const params = CompleteTaskSchema.parse(args);
          const task = await this.taskClient.completeTask(params.taskListId, params.taskId);
          return {
            content: [{ type: 'text' as const, text: `Task completed!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}` }],
          };
        }
        case 'uncomplete_task': {
          const params = CompleteTaskSchema.parse(args);
          const task = await this.taskClient.uncompleteTask(params.taskListId, params.taskId);
          return {
            content: [{ type: 'text' as const, text: `Task uncompleted!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}` }],
          };
        }
        case 'move_task': {
          const params = MoveTaskSchema.parse(args);
          const task = await this.taskClient.moveTask(params);
          return {
            content: [{ type: 'text' as const, text: `Task moved!\n\nID: ${task.id}\nTitle: ${task.title}` }],
          };
        }
        case 'clear_completed_tasks': {
          const taskListId = (args.taskListId as string) || '@default';
          await this.taskClient.clearCompletedTasks(taskListId);
          return {
            content: [{ type: 'text' as const, text: 'Completed tasks cleared successfully' }],
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
      const result = await this.taskClient.listTaskLists();
      return result.taskLists.map((tl: { id: string; title?: string }) => ({
        uri: `gtask://tasklist/${tl.id}`,
        name: tl.title || tl.id,
        description: `Task List: ${tl.title}`,
        mimeType: 'application/json',
      }));
    } catch {
      return [];
    }
  }

  protected async readResource(uri: string) {
    const tlMatch = uri.match(/^gtask:\/\/tasklist\/(.+)$/);
    if (tlMatch) {
      const taskListId = tlMatch[1];
      const result = await this.taskClient.listTasks({ taskListId, maxResults: 100 });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result.tasks, null, 2),
        }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  protected async listPrompts() {
    return [
      {
        name: 'daily_tasks',
        description: 'Get a formatted list of tasks for today',
        arguments: [
          { name: 'taskListId', description: 'Task list ID (default: "@default")', required: false },
        ],
      },
      {
        name: 'create_todo',
        description: 'Help create a new task with details',
        arguments: [
          { name: 'title', description: 'Task title', required: true },
          { name: 'details', description: 'Additional details or context', required: false },
        ],
      },
    ];
  }

  protected async getPrompt(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'daily_tasks': {
        const taskListId = (args.taskListId as string) || '@default';
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please show me my tasks from task list "${taskListId}". List all pending tasks with their due dates and notes in a clear format. Highlight any overdue tasks.`,
            },
          }],
        };
      }
      case 'create_todo': {
        const title = args.title as string || 'New Task';
        const details = args.details as string || '';
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please help me create a new task:\n\nTitle: ${title}${details ? `\nDetails: ${details}` : ''}\n\nPlease:\n1. Create the task with an appropriate due date if mentioned\n2. Add any relevant notes\n3. Confirm the task was created`,
            },
          }],
        };
      }
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
