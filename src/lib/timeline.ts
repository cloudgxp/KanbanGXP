import { ActivityEvent, ActivityEventType, Comment, Goal, TimelineItem } from '../types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}

export function generateStableGoalNumber(existingGoals: Goal[]): number {
  const maxNumber = existingGoals.reduce((max, g) => {
    return typeof g.number === 'number' && g.number > max ? g.number : max;
  }, 0);
  return maxNumber + 1;
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.successMetric) {
    if (goal.successMetric.type === 'numeric') {
      const target = goal.successMetric.target ?? 1;
      const current = goal.successMetric.current ?? 0;
      if (target <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
    }

    if (goal.successMetric.type === 'checklist' || goal.successMetric.type === 'milestones') {
      const items = goal.successMetric.items || [];
      if (items.length === 0) return 0;
      const completed = items.filter(i => i.completed).length;
      return Math.min(100, Math.max(0, Math.round((completed / items.length) * 100)));
    }
  }

  if (goal.lifecycleStatus === 'completed') {
    return 100;
  }

  return 0;
}

export function createActivityEvent(
  goalId: string,
  type: ActivityEventType,
  details: {
    from?: any;
    to?: any;
    message?: string;
    commentId?: string;
  } = {},
  actor = 'You',
  timestamp = Date.now()
): ActivityEvent {
  return {
    id: generateId(),
    goalId,
    type,
    actor,
    timestamp,
    from: details.from,
    to: details.to,
    message: details.message,
    commentId: details.commentId,
  };
}

export function createComment(
  goalId: string,
  content: string,
  actor = 'You',
  timestamp = Date.now()
): { comment: Comment; event: ActivityEvent } {
  const commentId = generateId();
  const comment: Comment = {
    id: commentId,
    goalId,
    actor,
    content,
    createdAt: timestamp,
  };

  const event: ActivityEvent = {
    id: generateId(),
    goalId,
    type: 'comment',
    actor,
    timestamp,
    commentId,
    message: content.slice(0, 100),
  };

  return { comment, event };
}

export function buildUnifiedTimeline(goal: Goal): TimelineItem[] {
  const items: TimelineItem[] = [];
  const activities = goal.activities && goal.activities.length > 0
    ? [...goal.activities]
    : [
        {
          id: `init-${goal.id}`,
          goalId: goal.id,
          type: 'created' as ActivityEventType,
          actor: 'You',
          timestamp: goal.createdAt || Date.now(),
          message: 'Created this goal',
        },
      ];

  const commentsMap = new Map<string, Comment>();
  if (goal.comments) {
    for (const comment of goal.comments) {
      commentsMap.set(comment.id, comment);
    }
  }

  // Add all activity events
  for (const act of activities) {
    if (act.type === 'comment' && act.commentId && commentsMap.has(act.commentId)) {
      const comment = commentsMap.get(act.commentId);
      items.push({
        id: act.id,
        goalId: goal.id,
        kind: 'comment',
        type: 'comment',
        actor: act.actor || comment?.actor || 'You',
        timestamp: act.timestamp || comment?.createdAt || Date.now(),
        comment,
      });
      // Mark as processed from map so we don't duplicate
      commentsMap.delete(act.commentId);
    } else {
      items.push({
        id: act.id,
        goalId: goal.id,
        kind: 'event',
        type: act.type,
        actor: act.actor || 'You',
        timestamp: act.timestamp,
        from: act.from,
        to: act.to,
        message: act.message,
      });
    }
  }

  // Any remaining comments not linked to a specific activity event
  for (const comment of commentsMap.values()) {
    items.push({
      id: `comment-item-${comment.id}`,
      goalId: goal.id,
      kind: 'comment',
      type: 'comment',
      actor: comment.actor || 'You',
      timestamp: comment.createdAt,
      comment,
    });
  }

  // Chronological order: oldest to newest
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

export function formatTimelineEventMessage(item: TimelineItem | ActivityEvent): string {
  if (item.message) return item.message;

  switch (item.type) {
    case 'created':
      return 'created this goal';
    case 'comment':
      return 'commented';
    case 'status_changed':
    case 'column_changed':
      if (item.from && item.to) {
        return `moved this from ${item.from} → ${item.to}`;
      }
      if (item.to) {
        return `moved this to ${item.to}`;
      }
      return 'changed workflow stage';
    case 'lifecycle_changed':
      if (item.to === 'completed') return 'closed this goal as completed';
      if (item.to === 'archived') return 'archived this goal';
      if (item.to === 'active') return 'reopened this goal';
      return `changed lifecycle status to ${item.to}`;
    case 'priority_changed':
      if (item.from && item.to) {
        return `changed priority from ${item.from} → ${item.to}`;
      }
      return `set priority to ${item.to}`;
    case 'progress_changed':
      if (item.from !== undefined && item.to !== undefined) {
        return `progress changed from ${item.from}% → ${item.to}%`;
      }
      return `updated progress to ${item.to}%`;
    case 'due_date_changed':
      if (!item.to) return 'removed the due date';
      if (item.from) return `changed due date from ${formatDateString(item.from)} to ${formatDateString(item.to)}`;
      return `set due date to ${formatDateString(item.to)}`;
    case 'start_date_changed':
      if (!item.to) return 'removed the start date';
      if (item.from) return `changed start date from ${formatDateString(item.from)} to ${formatDateString(item.to)}`;
      return `set start date to ${formatDateString(item.to)}`;
    case 'category_changed':
      if (item.from && item.to) return `changed category from ${item.from} to ${item.to}`;
      return `set category to ${item.to}`;
    case 'title_changed':
      return `changed title to "${item.to}"`;
    case 'description_changed':
      return 'updated description';
    case 'sprint_changed':
      if (!item.to) return 'removed this goal from sprint';
      return `assigned this goal to sprint "${item.to}"`;
    case 'epic_changed':
      if (!item.to) return 'removed this goal from epic';
      return `assigned this goal to epic "${item.to}"`;
    case 'labels_changed':
      return 'updated labels';
    case 'metric_changed':
      return 'updated success metric';
    case 'parent_changed':
      if (!item.to) return 'removed parent goal (promoted to top-level goal)';
      return `set parent goal to "${item.to}"`;
    default:
      return 'updated this goal';
  }
}

export function formatDateString(dateVal: number | string | undefined): string {
  if (!dateVal) return '';
  const date = typeof dateVal === 'number' ? new Date(dateVal) : new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 30 * 1000) {
    return 'just now';
  }

  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 30) {
    return `${days}d ago`;
  }

  return formatDateString(timestamp);
}

export function resolveGoalByQuery(goals: Goal[], query: string): Goal | undefined {
  if (!query) return undefined;
  const cleanQuery = query.trim().replace(/^#/, '');

  // Check by number first
  const num = parseInt(cleanQuery, 10);
  if (!isNaN(num)) {
    const matchedByNumber = goals.find(g => g.number === num);
    if (matchedByNumber) return matchedByNumber;
  }

  // Check by exact ID
  return goals.find(g => g.id === cleanQuery || g.id === query.trim());
}
