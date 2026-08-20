export type BoardType = 'Work' | 'Life';

export type GoalStatus = string;

export interface NavFolder {
  id: string;
  name: string;
  order?: number;
  tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all';
  isCollapsed?: boolean;
  color?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  workflowColumns: WorkflowColumn[];
  folderId?: string;
  order?: number;
}

export type Priority = 'low' | 'medium' | 'high';

export type SuccessMetricType = 'checklist' | 'milestones' | 'numeric';

export interface SuccessMetric {
  type: SuccessMetricType;
  target?: number;
  current?: number;
  unit?: string;
  items?: { id: string; text: string; completed: boolean }[];
}

export type SprintLength = '1-week' | '2-weeks' | '1-month' | 'custom';

export type SprintStatus = 'planned' | 'active' | 'completed' | 'archived';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  length: SprintLength;
  status: SprintStatus;
  goalIds: string[];
  createdAt: number;
  folderId?: string;
  order?: number;
}

export type EpicStatus = 'planned' | 'active' | 'completed' | 'archived';

export interface Epic {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: EpicStatus;
  createdAt: number;
  folderId?: string;
  order?: number;
}

export type GoalLifecycleStatus = 'active' | 'completed' | 'archived';

export interface Label {
  id: string;
  name: string;
  color: string;
  folderId?: string;
  order?: number;
}

export type ActivityEventType =
  | 'created'
  | 'comment'
  | 'status_changed'
  | 'column_changed'
  | 'lifecycle_changed'
  | 'priority_changed'
  | 'progress_changed'
  | 'due_date_changed'
  | 'start_date_changed'
  | 'category_changed'
  | 'title_changed'
  | 'description_changed'
  | 'sprint_changed'
  | 'epic_changed'
  | 'labels_changed'
  | 'metric_changed'
  | 'parent_changed';

export interface ActivityEvent {
  id: string;
  goalId: string;
  type: ActivityEventType;
  actor: string;
  timestamp: number;
  from?: any;
  to?: any;
  message?: string;
  commentId?: string;
}

export interface Comment {
  id: string;
  goalId: string;
  actor: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface TimelineItem {
  id: string;
  goalId: string;
  kind: 'event' | 'comment';
  type: ActivityEventType;
  actor: string;
  timestamp: number;
  from?: any;
  to?: any;
  message?: string;
  comment?: Comment;
}

export interface Goal {
  id: string;
  number?: number;
  projectId: string;
  parentId?: string;
  sprintId?: string;
  epicId?: string;
  title: string;
  description: string;
  status: GoalStatus;
  lifecycleStatus: GoalLifecycleStatus;
  board?: BoardType | string;
  category?: string;
  priority: Priority;
  startDate?: number;
  dueDate?: number;
  successMetric?: SuccessMetric;
  plannedForToday?: boolean;
  labelIds?: string[];
  activities?: ActivityEvent[];
  comments?: Comment[];
  createdAt: number;
}

export interface WorkflowColumn {
  id: GoalStatus;
  title: string;
}

export const DEFAULT_WORKFLOW_COLUMNS: WorkflowColumn[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

