export type BoardType = 'Work' | 'Life';

export type GoalStatus = string;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
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
}

export type GoalLifecycleStatus = 'active' | 'completed' | 'archived';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Goal {
  id: string;
  projectId: string;
  sprintId?: string;
  title: string;
  description: string;
  status: GoalStatus;
  lifecycleStatus: GoalLifecycleStatus;
  board: BoardType;
  priority: Priority;
  dueDate?: number;
  successMetric?: SuccessMetric;
  plannedForToday?: boolean;
  labelIds?: string[];
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
