/**
 * Google Tasks server types
 */

export interface TaskList {
  id: string;
  title?: string;
  updated?: string;
  selfLink?: string;
  kind?: string;
}

export interface Task {
  id: string;
  title?: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  parent?: string;
  position?: string;
  selfLink?: string;
  updated?: string;
  kind?: string;
  links?: TaskLink[];
}

export interface TaskLink {
  type?: string;
  description?: string;
  link?: string;
}

// Parameter interfaces
export interface ListTaskListsParams {
  maxResults?: number;
  pageToken?: string;
}

export interface ListTasksParams {
  taskListId?: string;
  completedMin?: string;
  completedMax?: string;
  dueMin?: string;
  dueMax?: string;
  maxResults?: number;
  pageToken?: string;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  updatedMin?: string;
}

export interface CreateTaskParams {
  taskListId?: string;
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
  parent?: string;
  previous?: string;
}

export interface UpdateTaskParams {
  taskListId?: string;
  taskId: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}

export interface MoveTaskParams {
  taskListId?: string;
  taskId: string;
  parent?: string;
  previous?: string;
}

export interface CreateTaskListParams {
  title: string;
}

export interface UpdateTaskListParams {
  taskListId: string;
  title: string;
}
