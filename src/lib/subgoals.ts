import { Goal, GoalLifecycleStatus } from '../types';

/**
 * Returns all direct subgoals for a given parent goal.
 */
export function getSubgoals(goals: Goal[], parentGoalId: string): Goal[] {
  if (!parentGoalId) return [];
  return goals.filter(goal => goal.parentId === parentGoalId);
}

/**
 * Calculates the progress of subgoals for a parent goal.
 */
export function calculateSubgoalProgress(
  goals: Goal[],
  parentGoalId: string
): { total: number; completed: number; percentage: number } {
  const subgoals = getSubgoals(goals, parentGoalId);
  const total = subgoals.length;
  if (total === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  const completed = subgoals.filter(goal => goal.lifecycleStatus === 'completed').length;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

/**
 * Returns all valid goals that can serve as a parent for the given goal.
 * Rules enforced:
 * 1. Must belong to the same project.
 * 2. Cannot be the goal itself.
 * 3. Cannot be an existing subgoal (1-level nesting only: subgoals cannot have subgoals).
 * 4. If current goal is already a parent (has subgoals), it cannot have a parent assigned.
 */
export function getValidParentGoals(
  goals: Goal[],
  currentGoalId?: string,
  projectId?: string
): Goal[] {
  // If current goal already has subgoals, it cannot become a subgoal of another goal
  if (currentGoalId) {
    const hasChildren = goals.some(g => g.parentId === currentGoalId);
    if (hasChildren) {
      return [];
    }
  }

  return goals.filter(candidate => {
    // Must match project if project is provided
    if (projectId && candidate.projectId !== projectId) {
      return false;
    }
    // Cannot be self
    if (currentGoalId && candidate.id === currentGoalId) {
      return false;
    }
    // Candidate cannot be a subgoal itself (enforce max 1 level of nesting)
    if (candidate.parentId) {
      return false;
    }
    return true;
  });
}

/**
 * Validates whether assigning targetParentId to childGoalId is valid.
 */
export function canAssignParent(
  goals: Goal[],
  childGoalId: string | undefined,
  targetParentId: string | undefined,
  targetProjectId?: string
): { allowed: boolean; reason?: string } {
  if (!targetParentId) {
    return { allowed: true };
  }

  if (childGoalId && childGoalId === targetParentId) {
    return { allowed: false, reason: 'A goal cannot be its own parent.' };
  }

  const targetParent = goals.find(g => g.id === targetParentId);
  if (!targetParent) {
    return { allowed: false, reason: 'The selected parent goal does not exist.' };
  }

  // Check 1-level limit: parent cannot be a subgoal itself
  if (targetParent.parentId) {
    return {
      allowed: false,
      reason: 'Subgoals cannot contain additional subgoals (1 level of nesting supported).',
    };
  }

  // Check if child already has subgoals
  if (childGoalId) {
    const hasChildren = goals.some(g => g.parentId === childGoalId);
    if (hasChildren) {
      return {
        allowed: false,
        reason: 'A goal that already has subgoals cannot become a subgoal itself.',
      };
    }
  }

  // Check project context
  const childProject = targetProjectId || (childGoalId ? goals.find(g => g.id === childGoalId)?.projectId : undefined);
  if (childProject && targetParent.projectId !== childProject) {
    return {
      allowed: false,
      reason: 'Parent goals and subgoals must belong to the same project.',
    };
  }

  return { allowed: true };
}

export type ParentDeletionStrategy = 'promote' | 'reassign' | 'cascade_delete';

/**
 * Handles removing a parent goal safely according to the selected strategy.
 * - 'promote': Subgoals become top-level goals (parentId removed).
 * - 'reassign': Subgoals are assigned to targetParentId.
 * - 'cascade_delete': Parent and all subgoals are deleted.
 */
export function handleParentDeletion(
  goals: Goal[],
  parentId: string,
  strategy: ParentDeletionStrategy,
  targetParentId?: string
): Goal[] {
  if (strategy === 'cascade_delete') {
    return goals.filter(g => g.id !== parentId && g.parentId !== parentId);
  }

  if (strategy === 'reassign' && targetParentId) {
    return goals
      .filter(g => g.id !== parentId)
      .map(g => (g.parentId === parentId ? { ...g, parentId: targetParentId } : g));
  }

  // Default 'promote'
  return goals
    .filter(g => g.id !== parentId)
    .map(g => (g.parentId === parentId ? { ...g, parentId: undefined } : g));
}

/**
 * Checks if updating/completing a subgoal causes all subgoals of its parent to be completed.
 * Returns the parent Goal if all subgoals are now completed and the parent is still active.
 */
export function checkAllSubgoalsCompleted(
  goals: Goal[],
  subgoalId: string,
  newLifecycleStatus: GoalLifecycleStatus
): Goal | null {
  if (newLifecycleStatus !== 'completed') {
    return null;
  }

  const currentGoal = goals.find(g => g.id === subgoalId);
  if (!currentGoal || !currentGoal.parentId) {
    return null;
  }

  const parentGoal = goals.find(g => g.id === currentGoal.parentId);
  if (!parentGoal || parentGoal.lifecycleStatus === 'completed') {
    return null;
  }

  // Find all sibling subgoals
  const subgoals = goals.filter(g => g.parentId === currentGoal.parentId);
  if (subgoals.length === 0) {
    return null;
  }

  // Check if every sibling (considering this subgoal as completed) is completed
  const allCompleted = subgoals.every(g => {
    if (g.id === subgoalId) return true;
    return g.lifecycleStatus === 'completed';
  });

  return allCompleted ? parentGoal : null;
}
