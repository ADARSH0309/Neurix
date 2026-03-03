/**
 * Google Tasks API client wrapper
 */

import { google, type Auth } from 'googleapis';
import fs from 'fs/promises';
import type {
  Task,
  TaskList,
  ListTaskListsParams,
  ListTasksParams,
  CreateTaskParams,
  UpdateTaskParams,
  MoveTaskParams,
  CreateTaskListParams,
  UpdateTaskListParams,
} from './types.js';

type OAuth2Client = Auth.OAuth2Client;

export class GTaskClient {
  private oauth2Client: OAuth2Client;
  private tasks: any;

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

      this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
    } catch (error) {
      throw new Error(
        `Failed to load Tasks credentials. Please run OAuth setup first. Error: ${error}`
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
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
  }

  // ─── Task Lists ────────────────────────────────────────────

  async listTaskLists(params: ListTaskListsParams = {}): Promise<{ taskLists: TaskList[]; nextPageToken?: string }> {
    const response = await this.tasks.tasklists.list({
      maxResults: params.maxResults || 100,
      pageToken: params.pageToken,
    });
    return {
      taskLists: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async getTaskList(taskListId: string): Promise<TaskList> {
    const response = await this.tasks.tasklists.get({ tasklist: taskListId });
    return response.data;
  }

  async createTaskList(params: CreateTaskListParams): Promise<TaskList> {
    const response = await this.tasks.tasklists.insert({
      requestBody: { title: params.title },
    });
    return response.data;
  }

  async updateTaskList(params: UpdateTaskListParams): Promise<TaskList> {
    const response = await this.tasks.tasklists.update({
      tasklist: params.taskListId,
      requestBody: { title: params.title },
    });
    return response.data;
  }

  async deleteTaskList(taskListId: string): Promise<void> {
    await this.tasks.tasklists.delete({ tasklist: taskListId });
  }

  // ─── Tasks ─────────────────────────────────────────────────

  async listTasks(params: ListTasksParams = {}): Promise<{ tasks: Task[]; nextPageToken?: string }> {
    const taskListId = params.taskListId || '@default';
    const response = await this.tasks.tasks.list({
      tasklist: taskListId,
      completedMin: params.completedMin,
      completedMax: params.completedMax,
      dueMin: params.dueMin,
      dueMax: params.dueMax,
      maxResults: params.maxResults || 100,
      pageToken: params.pageToken,
      showCompleted: params.showCompleted !== false,
      showDeleted: params.showDeleted || false,
      showHidden: params.showHidden || false,
      updatedMin: params.updatedMin,
    });
    return {
      tasks: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async getTask(taskListId: string, taskId: string): Promise<Task> {
    const response = await this.tasks.tasks.get({
      tasklist: taskListId || '@default',
      task: taskId,
    });
    return response.data;
  }

  async createTask(params: CreateTaskParams): Promise<Task> {
    const taskListId = params.taskListId || '@default';
    const response = await this.tasks.tasks.insert({
      tasklist: taskListId,
      parent: params.parent,
      previous: params.previous,
      requestBody: {
        title: params.title,
        notes: params.notes,
        due: params.due,
        status: params.status,
      },
    });
    return response.data;
  }

  async updateTask(params: UpdateTaskParams): Promise<Task> {
    const taskListId = params.taskListId || '@default';
    // First get the existing task
    const existing = await this.getTask(taskListId, params.taskId);
    const requestBody: any = { ...existing };

    if (params.title !== undefined) requestBody.title = params.title;
    if (params.notes !== undefined) requestBody.notes = params.notes;
    if (params.due !== undefined) requestBody.due = params.due;
    if (params.status !== undefined) requestBody.status = params.status;

    const response = await this.tasks.tasks.update({
      tasklist: taskListId,
      task: params.taskId,
      requestBody,
    });
    return response.data;
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    await this.tasks.tasks.delete({
      tasklist: taskListId || '@default',
      task: taskId,
    });
  }

  async completeTask(taskListId: string, taskId: string): Promise<Task> {
    return this.updateTask({
      taskListId,
      taskId,
      status: 'completed',
    });
  }

  async uncompleteTask(taskListId: string, taskId: string): Promise<Task> {
    return this.updateTask({
      taskListId,
      taskId,
      status: 'needsAction',
    });
  }

  async moveTask(params: MoveTaskParams): Promise<Task> {
    const taskListId = params.taskListId || '@default';
    const response = await this.tasks.tasks.move({
      tasklist: taskListId,
      task: params.taskId,
      parent: params.parent,
      previous: params.previous,
    });
    return response.data;
  }

  async clearCompletedTasks(taskListId: string): Promise<void> {
    await this.tasks.tasks.clear({
      tasklist: taskListId || '@default',
    });
  }
}
