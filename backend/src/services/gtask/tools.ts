/**
 * MCP HTTP Adapter for Google Tasks
 *
 * Implements JSON-RPC 2.0 protocol for HTTP transport
 */

import { GTaskClient } from './client.js';
import { z } from 'zod';

// Validation schemas
const ListTaskListsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(100),
  pageToken: z.string().optional(),
});

const TaskListIdSchema = z.object({
  taskListId: z.string(),
});

const CreateTaskListSchema = z.object({
  title: z.string(),
});

const UpdateTaskListSchema = z.object({
  taskListId: z.string(),
  title: z.string(),
});

const ListTasksSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  completedMin: z.string().optional(),
  completedMax: z.string().optional(),
  dueMin: z.string().optional(),
  dueMax: z.string().optional(),
  maxResults: z.number().min(1).max(100).optional().default(100),
  pageToken: z.string().optional(),
  showCompleted: z.boolean().optional().default(true),
  showDeleted: z.boolean().optional().default(false),
  showHidden: z.boolean().optional().default(false),
  updatedMin: z.string().optional(),
});

const GetTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
});

const CreateTaskSchema = z.object({
  taskListId: z.string().optional(),
  taskListName: z.string().optional(),
  title: z.string(),
  notes: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
  parent: z.string().optional(),
  previous: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
});

const DeleteTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});

const CompleteTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});

const MoveTaskSchema = z.object({
  taskListId: z.string().optional().default('@default'),
  taskId: z.string(),
  parent: z.string().optional(),
  previous: z.string().optional(),
});

const ClearCompletedSchema = z.object({
  taskListId: z.string().optional().default('@default'),
});

export class McpHttpAdapter {
  private taskClient: GTaskClient;

  constructor(taskClient: GTaskClient) {
    this.taskClient = taskClient;
  }

  async initialize(): Promise<{ protocolVersion: string; capabilities: any; serverInfo: any }> {
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'neurix-gtask-server', version: '0.1.0' },
    };
  }

  async listTools(): Promise<{ tools: any[] }> {
    return {
      tools: [
        // Task List Management
        { name: 'list_task_lists', description: 'List all task lists for the user', inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Max results (1-100)' }, pageToken: { type: 'string' } } } },
        { name: 'get_task_list', description: 'Get details of a specific task list', inputSchema: { type: 'object', properties: { taskListId: { type: 'string', description: 'Task list ID' } }, required: ['taskListId'] } },
        { name: 'create_task_list', description: 'Create a new task list', inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'Task list title' } }, required: ['title'] } },
        { name: 'update_task_list', description: 'Update a task list title', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, title: { type: 'string' } }, required: ['taskListId', 'title'] } },
        { name: 'delete_task_list', description: 'Delete a task list', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' } }, required: ['taskListId'] } },

        // Task Management
        {
          name: 'list_tasks', description: 'List tasks in a task list',
          inputSchema: { type: 'object', properties: { taskListId: { type: 'string', description: 'Task list ID (default: @default)' }, completedMin: { type: 'string' }, completedMax: { type: 'string' }, dueMin: { type: 'string' }, dueMax: { type: 'string' }, maxResults: { type: 'number' }, pageToken: { type: 'string' }, showCompleted: { type: 'boolean' }, showDeleted: { type: 'boolean' }, showHidden: { type: 'boolean' }, updatedMin: { type: 'string' } } },
        },
        { name: 'get_task', description: 'Get full details of a specific task', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' } }, required: ['taskId'] } },
        {
          name: 'create_task', description: 'Create a new task in a task list',
          inputSchema: { type: 'object', properties: { taskListId: { type: 'string', description: 'Task list ID' }, taskListName: { type: 'string', description: 'Task list name (alternative to taskListId)' }, title: { type: 'string', description: 'Task title' }, notes: { type: 'string', description: 'Task notes/description' }, due: { type: 'string', description: 'Due date (RFC 3339)' }, status: { type: 'string', enum: ['needsAction', 'completed'] }, parent: { type: 'string', description: 'Parent task ID for subtasks' }, previous: { type: 'string', description: 'Previous sibling task ID for ordering' } }, required: ['title'] },
        },
        {
          name: 'update_task', description: 'Update an existing task',
          inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' }, taskTitle: { type: 'string', description: 'Task name (alternative to taskId)' }, title: { type: 'string' }, notes: { type: 'string' }, due: { type: 'string' }, status: { type: 'string', enum: ['needsAction', 'completed'] } } },
        },
        { name: 'delete_task', description: 'Delete a task by name', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' }, taskTitle: { type: 'string', description: 'Task name (alternative to taskId)' } }, required: ['taskTitle'] } },
        { name: 'complete_task', description: 'Mark a task as completed by name', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' }, taskTitle: { type: 'string', description: 'Task name (alternative to taskId)' } }, required: ['taskTitle'] } },
        { name: 'uncomplete_task', description: 'Mark a completed task as not completed', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' }, taskTitle: { type: 'string', description: 'Task name (alternative to taskId)' } }, required: ['taskTitle'] } },
        { name: 'move_task', description: 'Move a task to a different position or parent', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' }, taskId: { type: 'string' }, parent: { type: 'string', description: 'New parent task ID' }, previous: { type: 'string', description: 'Previous sibling task ID' } }, required: ['taskId'] } },
        { name: 'clear_completed_tasks', description: 'Clear all completed tasks from a task list', inputSchema: { type: 'object', properties: { taskListId: { type: 'string' } } } },
      ],
    };
  }

  /**
   * Resolve a task title to its ID by searching the task list.
   * Returns the task ID or an error response object.
   */
  private async resolveTaskByTitle(
    taskListId: string,
    taskTitle: string
  ): Promise<{ taskId: string } | { error: any }> {
    const result = await this.taskClient.listTasks({ taskListId, maxResults: 100 });
    const match = result.tasks.find(
      t => t.title?.toLowerCase() === taskTitle.toLowerCase()
    );
    if (match) {
      return { taskId: match.id };
    }
    const available = result.tasks
      .filter(t => t.title)
      .map(t => t.title)
      .slice(0, 10)
      .join(', ');
    return {
      error: {
        content: [{ type: 'text', text: `Task "${taskTitle}" not found. Available tasks: ${available || 'none'}` }],
        isError: true,
      },
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      switch (name) {
        // Task List operations
        case 'list_task_lists': {
          const params = ListTaskListsSchema.parse(args);
          const result = await this.taskClient.listTaskLists(params);
          return { content: [{ type: 'text', text: JSON.stringify({ taskLists: result.taskLists, nextPageToken: result.nextPageToken }) }] };
        }
        case 'get_task_list': {
          const params = TaskListIdSchema.parse(args);
          const taskList = await this.taskClient.getTaskList(params.taskListId);
          return { content: [{ type: 'text', text: JSON.stringify({ taskList }) }] };
        }
        case 'create_task_list': {
          const params = CreateTaskListSchema.parse(args);
          const taskList = await this.taskClient.createTaskList(params);
          return { content: [{ type: 'text', text: JSON.stringify({ taskList }) }] };
        }
        case 'update_task_list': {
          const params = UpdateTaskListSchema.parse(args);
          const taskList = await this.taskClient.updateTaskList(params);
          return { content: [{ type: 'text', text: JSON.stringify({ taskList }) }] };
        }
        case 'delete_task_list': {
          const params = TaskListIdSchema.parse(args);
          await this.taskClient.deleteTaskList(params.taskListId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted' }) }] };
        }

        // Task operations
        case 'list_tasks': {
          const params = ListTasksSchema.parse(args);
          const result = await this.taskClient.listTasks(params);
          return { content: [{ type: 'text', text: JSON.stringify({ tasks: result.tasks, nextPageToken: result.nextPageToken }) }] };
        }
        case 'get_task': {
          const params = GetTaskSchema.parse(args);
          const task = await this.taskClient.getTask(params.taskListId, params.taskId);
          return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
        }
        case 'create_task': {
          const params = CreateTaskSchema.parse(args);
          // Resolve taskListName to taskListId if provided
          if (params.taskListName && !params.taskListId) {
            const lists = await this.taskClient.listTaskLists();
            const match = lists.taskLists.find(
              tl => tl.title?.toLowerCase() === params.taskListName!.toLowerCase()
            );
            if (match) {
              params.taskListId = match.id;
            } else {
              const available = lists.taskLists.map(tl => tl.title).filter(Boolean).join(', ');
              return { content: [{ type: 'text', text: `Task list "${params.taskListName}" not found. Available lists: ${available}` }], isError: true };
            }
          }
          if (!params.taskListId) params.taskListId = '@default';
          const task = await this.taskClient.createTask(params);
          // Include the list name in response for better UX
          let listName = 'My Tasks';
          if (params.taskListId !== '@default') {
            try {
              const tl = await this.taskClient.getTaskList(params.taskListId);
              listName = tl.title || listName;
            } catch { /* ignore */ }
          }
          return { content: [{ type: 'text', text: JSON.stringify({ task, taskListName: listName }) }] };
        }
        case 'update_task': {
          const params = UpdateTaskSchema.parse(args);
          if (!params.taskId && params.taskTitle) {
            const resolved = await this.resolveTaskByTitle(params.taskListId, params.taskTitle);
            if ('error' in resolved) return resolved.error;
            params.taskId = resolved.taskId;
          }
          if (!params.taskId) return { content: [{ type: 'text', text: 'Please provide a task name or taskId.' }], isError: true };
          const task = await this.taskClient.updateTask({ ...params, taskId: params.taskId });
          return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
        }
        case 'delete_task': {
          const params = DeleteTaskSchema.parse(args);
          if (!params.taskId && params.taskTitle) {
            const resolved = await this.resolveTaskByTitle(params.taskListId, params.taskTitle);
            if ('error' in resolved) return resolved.error;
            params.taskId = resolved.taskId;
          }
          if (!params.taskId) return { content: [{ type: 'text', text: 'Please provide a task name or taskId.' }], isError: true };
          const taskTitle = params.taskTitle || params.taskId;
          await this.taskClient.deleteTask(params.taskListId, params.taskId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'deleted', title: taskTitle }) }] };
        }
        case 'complete_task': {
          const params = CompleteTaskSchema.parse(args);
          if (!params.taskId && params.taskTitle) {
            const resolved = await this.resolveTaskByTitle(params.taskListId, params.taskTitle);
            if ('error' in resolved) return resolved.error;
            params.taskId = resolved.taskId;
          }
          if (!params.taskId) return { content: [{ type: 'text', text: 'Please provide a task name or taskId.' }], isError: true };
          const task = await this.taskClient.completeTask(params.taskListId, params.taskId);
          return { content: [{ type: 'text', text: JSON.stringify({ task, action: 'completed' }) }] };
        }
        case 'uncomplete_task': {
          const params = CompleteTaskSchema.parse(args);
          if (!params.taskId && params.taskTitle) {
            const resolved = await this.resolveTaskByTitle(params.taskListId, params.taskTitle);
            if ('error' in resolved) return resolved.error;
            params.taskId = resolved.taskId;
          }
          if (!params.taskId) return { content: [{ type: 'text', text: 'Please provide a task name or taskId.' }], isError: true };
          const task = await this.taskClient.uncompleteTask(params.taskListId, params.taskId);
          return { content: [{ type: 'text', text: JSON.stringify({ task, action: 'uncompleted' }) }] };
        }
        case 'move_task': {
          const params = MoveTaskSchema.parse(args);
          const task = await this.taskClient.moveTask(params);
          return { content: [{ type: 'text', text: JSON.stringify({ task, action: 'moved' }) }] };
        }
        case 'clear_completed_tasks': {
          const params = ClearCompletedSchema.parse(args);
          await this.taskClient.clearCompletedTasks(params.taskListId);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, action: 'cleared_completed' }) }] };
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
      const result = await this.taskClient.listTaskLists();
      return {
        resources: result.taskLists.map((tl) => ({
          uri: `gtask://tasklist/${tl.id}`,
          name: tl.title || tl.id,
          description: `Task List: ${tl.title}`,
          mimeType: 'application/json',
        })),
      };
    } catch {
      return { resources: [] };
    }
  }

  async readResource(uri: string): Promise<{ contents: any[] }> {
    const tlMatch = uri.match(/^gtask:\/\/tasklist\/(.+)$/);
    if (tlMatch) {
      const taskListId = tlMatch[1];
      const result = await this.taskClient.listTasks({ taskListId, maxResults: 100 });
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(result.tasks, null, 2) }],
      };
    }
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  async listPrompts(): Promise<{ prompts: any[] }> {
    return {
      prompts: [
        { name: 'daily_tasks', description: 'Get your daily task overview', arguments: [{ name: 'date', required: false }] },
        { name: 'create_todo', description: 'Help create a new task', arguments: [{ name: 'description', required: true }] },
      ],
    };
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    switch (name) {
      case 'daily_tasks':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Show my tasks for ${args.date || 'today'}` } }] };
      case 'create_todo':
        return { messages: [{ role: 'user', content: { type: 'text', text: `Create a task: ${args.description || 'new task'}` } }] };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}
