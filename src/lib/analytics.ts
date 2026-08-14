import { Goal, Project, Sprint, Epic, WorkflowColumn, Priority } from '../types';

export type DateRangePreset = '7d' | '30d' | '90d' | 'this_year' | 'all' | 'custom';
export type ItemTypeFilter = 'all' | 'goals' | 'sprints' | 'epics' | 'projects';

export interface AnalyticsFilter {
  datePreset: DateRangePreset;
  customStart?: number; // ms timestamp
  customEnd?: number;   // ms timestamp
  itemType?: ItemTypeFilter;
  projectId?: string | null;
  sprintId?: string | null;
  epicId?: string | null;
  priority?: Priority | 'all';
  status?: string | 'all';
}

export interface TimeBucketPoint {
  label: string;
  startDate: number;
  endDate: number;
  createdCount: number;
  completedCount: number;
}

export interface StatusDistPoint {
  status: string;
  title: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PriorityDistPoint {
  priority: Priority;
  title: string;
  total: number;
  completed: number;
  completionRate: number;
  color: string;
}

export interface SprintPerformancePoint {
  sprintId: string;
  sprintName: string;
  status: string;
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
  startDate?: string;
  endDate?: string;
}

export interface EpicProgressPoint {
  epicId: string;
  epicName: string;
  status: string;
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
}

export interface SummaryMetrics {
  activeItems: number;
  completedItems: number;
  totalEligible: number;
  completionRate: number;
  completedThisWeek: number;
  completedThisMonth: number;
  overdueCount: number;
  overdueHighPriority: number;
  averageCompletionTimeMs: number;
  averageCompletionTimeFormatted: string;
  currentSprintVelocity?: {
    sprintName: string;
    total: number;
    completed: number;
    rate: number;
  };
  currentStreakDays: number;
  longestStreakDays: number;
  lastCompletedDate?: string;
}

/**
 * Resolves a date range preset into concrete start/end timestamps (ms).
 */
export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: number,
  customEnd?: number,
  now: number = Date.now()
): { start: number; end: number } {
  const ONE_DAY = 86_400_000;
  const nowDate = new Date(now);

  switch (preset) {
    case '7d':
      return { start: now - 7 * ONE_DAY, end: now };
    case '30d':
      return { start: now - 30 * ONE_DAY, end: now };
    case '90d':
      return { start: now - 90 * ONE_DAY, end: now };
    case 'this_year': {
      const yearStart = new Date(nowDate.getFullYear(), 0, 1).getTime();
      return { start: yearStart, end: now };
    }
    case 'custom':
      return {
        start: customStart ?? now - 30 * ONE_DAY,
        end: customEnd ?? now,
      };
    case 'all':
    default:
      return { start: 0, end: now + ONE_DAY };
  }
}

/**
 * Finds the exact historical completion timestamp for a goal.
 * Checks activity events first for recorded 'done' / 'completed' transitions,
 * then falls back to creation timestamp or now if marked completed.
 */
export function getGoalCompletionTimestamp(goal: Goal): number | undefined {
  const isCompleted =
    goal.lifecycleStatus === 'completed' ||
    goal.status === 'done' ||
    goal.status.toLowerCase().includes('done') ||
    goal.status.toLowerCase().includes('complete');

  if (!isCompleted) return undefined;

  if (goal.activities && goal.activities.length > 0) {
    // Find the latest completed activity event
    const completedEvents = goal.activities.filter(
      a =>
        (a.type === 'lifecycle_changed' && a.to === 'completed') ||
        (a.type === 'status_changed' && (a.to === 'done' || String(a.to).toLowerCase().includes('done')))
    );

    if (completedEvents.length > 0) {
      const latest = completedEvents.reduce((max, ev) => (ev.timestamp > max.timestamp ? ev : max));
      return latest.timestamp;
    }
  }

  // Fallback: If no activity event recorded, use goal.dueDate or goal.createdAt
  return goal.createdAt;
}

/**
 * Determines if a goal is completed.
 */
export function isGoalCompleted(goal: Goal): boolean {
  return (
    goal.lifecycleStatus === 'completed' ||
    goal.status === 'done' ||
    goal.status.toLowerCase().includes('done') ||
    goal.status.toLowerCase().includes('complete')
  );
}

/**
 * Normalized completion rate calculation (0% to 100%).
 */
export function calculateCompletionRate(completedCount: number, eligibleCount: number): number {
  if (eligibleCount <= 0) return 0;
  const rate = (completedCount / eligibleCount) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}

/**
 * Formats duration in milliseconds into a readable human string (e.g. "2.4 days", "18 hours").
 */
export function formatDuration(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '0 hours';
  const hours = ms / 3_600_000;
  if (hours < 1) return '< 1 hour';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

/**
 * Calculates the average completion time for completed goals.
 * Duration = Completed At - Created/Started At.
 */
export function calculateAverageCompletionTime(goals: Goal[]): {
  avgMs: number;
  avgDays: number;
  formatted: string;
} {
  const completedGoals = goals.filter(isGoalCompleted);
  if (completedGoals.length === 0) {
    return { avgMs: 0, avgDays: 0, formatted: '0 days' };
  }

  let totalDurationMs = 0;
  let countWithDuration = 0;

  for (const goal of completedGoals) {
    const completionTs = getGoalCompletionTimestamp(goal) ?? goal.createdAt;
    const startTs = goal.startDate ?? goal.createdAt;
    const duration = Math.max(0, completionTs - startTs);
    totalDurationMs += duration;
    countWithDuration++;
  }

  if (countWithDuration === 0) {
    return { avgMs: 0, avgDays: 0, formatted: '0 days' };
  }

  const avgMs = totalDurationMs / countWithDuration;
  const avgDays = Math.round((avgMs / 86_400_000) * 10) / 10;
  return {
    avgMs,
    avgDays,
    formatted: formatDuration(avgMs),
  };
}

/**
 * Identifies overdue goals: Due Date passed AND Not Completed.
 */
export function calculateOverdueItems(
  goals: Goal[],
  now: number = Date.now()
): {
  count: number;
  items: Goal[];
  highPriorityCount: number;
} {
  const overdueGoals = goals.filter(goal => {
    if (isGoalCompleted(goal) || goal.lifecycleStatus === 'archived') {
      return false;
    }
    if (!goal.dueDate) return false;
    return goal.dueDate < now;
  });

  const highPriorityCount = overdueGoals.filter(g => g.priority === 'high').length;

  return {
    count: overdueGoals.length,
    items: overdueGoals,
    highPriorityCount,
  };
}

/**
 * Calculates current and longest completion streak in days.
 */
export function calculateCompletionStreak(
  goals: Goal[],
  now: number = Date.now()
): {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
} {
  const completedGoals = goals.filter(isGoalCompleted);
  if (completedGoals.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Map each completed goal to its calendar date string (YYYY-MM-DD)
  const uniqueDates = new Set<string>();
  for (const goal of completedGoals) {
    const ts = getGoalCompletionTimestamp(goal) ?? goal.createdAt;
    const dateStr = new Date(ts).toISOString().split('T')[0];
    uniqueDates.add(dateStr);
  }

  const sortedDates = Array.from(uniqueDates).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDates) {
    const currentDate = new Date(dStr);
    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / 86_400_000);
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevDate = currentDate;
  }

  // Check if the current streak is still active (completed today or yesterday)
  const todayStr = new Date(now).toISOString().split('T')[0];
  const yesterdayStr = new Date(now - 86_400_000).toISOString().split('T')[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  let currentStreak = 0;
  if (lastDate === todayStr || lastDate === yesterdayStr) {
    // Trace back contiguous days from lastDate
    let streakCount = 1;
    let expectedDate = new Date(lastDate);
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const prevExpected = new Date(expectedDate.getTime() - 86_400_000)
        .toISOString()
        .split('T')[0];
      if (sortedDates[i] === prevExpected) {
        streakCount++;
        expectedDate = new Date(sortedDates[i]);
      } else {
        break;
      }
    }
    currentStreak = streakCount;
  }

  return {
    currentStreak,
    longestStreak,
    lastCompletedDate: lastDate,
  };
}

/**
 * Filters goals based on multidimensional filter criteria.
 */
export function filterGoals(
  goals: Goal[],
  filter: AnalyticsFilter,
  now: number = Date.now()
): Goal[] {
  const { start, end } = resolveDateRange(
    filter.datePreset,
    filter.customStart,
    filter.customEnd,
    now
  );

  return goals.filter(goal => {
    // 1. Project filter
    if (filter.projectId && goal.projectId !== filter.projectId) {
      return false;
    }

    // 3. Sprint filter
    if (filter.sprintId && goal.sprintId !== filter.sprintId) {
      return false;
    }

    // 4. Epic filter
    if (filter.epicId && goal.epicId !== filter.epicId) {
      return false;
    }

    // 5. Priority filter
    if (filter.priority && filter.priority !== 'all' && goal.priority !== filter.priority) {
      return false;
    }

    // 6. Status filter
    if (filter.status && filter.status !== 'all' && goal.status !== filter.status) {
      return false;
    }

    // 7. Date range filter: Goal either was created in range OR was completed in range
    const completionTs = getGoalCompletionTimestamp(goal);
    const inCreatedRange = goal.createdAt >= start && goal.createdAt <= end;
    const inCompletedRange = completionTs ? completionTs >= start && completionTs <= end : false;

    if (filter.datePreset === 'all') {
      return true;
    }

    return inCreatedRange || inCompletedRange;
  });
}

/**
 * Calculates created vs completed time series bucketed data points.
 */
export function calculateCreatedVsCompletedOverTime(
  goals: Goal[],
  dateRange: { start: number; end: number },
  numBuckets: number = 7
): TimeBucketPoint[] {
  const { start, end } = dateRange;
  const duration = Math.max(1, end - start);
  const bucketDuration = duration / numBuckets;

  const buckets: TimeBucketPoint[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bStart = start + i * bucketDuration;
    const bEnd = i === numBuckets - 1 ? end : bStart + bucketDuration;
    
    // Label format: e.g. "Aug 12" or "Mon"
    const date = new Date(bStart);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let createdCount = 0;
    let completedCount = 0;

    for (const goal of goals) {
      if (goal.createdAt >= bStart && goal.createdAt < bEnd) {
        createdCount++;
      }
      const completionTs = getGoalCompletionTimestamp(goal);
      if (completionTs && completionTs >= bStart && completionTs < bEnd) {
        completedCount++;
      }
    }

    buckets.push({
      label,
      startDate: bStart,
      endDate: bEnd,
      createdCount,
      completedCount,
    });
  }

  return buckets;
}

/**
 * Calculates status distribution across workflow columns.
 */
export function calculateStatusDistribution(
  goals: Goal[],
  columns: WorkflowColumn[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
  ]
): StatusDistPoint[] {
  const total = goals.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {};
  columns.forEach(col => (counts[col.id] = 0));

  const colors = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

  goals.forEach(goal => {
    const statusKey = goal.status || 'todo';
    counts[statusKey] = (counts[statusKey] || 0) + 1;
  });

  return columns.map((col, idx) => {
    const count = counts[col.id] || 0;
    return {
      status: col.id,
      title: col.title,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[idx % colors.length],
    };
  });
}

/**
 * Calculates priority breakdown.
 */
export function calculatePriorityDistribution(goals: Goal[]): PriorityDistPoint[] {
  const priorities: Priority[] = ['high', 'medium', 'low'];
  const titles: Record<Priority, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };
  const colors: Record<Priority, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
  };

  return priorities.map(p => {
    const pGoals = goals.filter(g => g.priority === p);
    const completed = pGoals.filter(isGoalCompleted).length;
    return {
      priority: p,
      title: titles[p],
      total: pGoals.length,
      completed,
      completionRate: calculateCompletionRate(completed, pGoals.length),
      color: colors[p],
    };
  });
}

/**
 * Calculates sprint performance and velocity.
 */
export function calculateSprintPerformance(
  sprints: Sprint[],
  goals: Goal[]
): SprintPerformancePoint[] {
  return sprints.map(sprint => {
    const sprintGoals = goals.filter(g => g.sprintId === sprint.id || sprint.goalIds?.includes(g.id));
    const completedGoals = sprintGoals.filter(isGoalCompleted).length;

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      totalGoals: sprintGoals.length,
      completedGoals,
      completionRate: calculateCompletionRate(completedGoals, sprintGoals.length),
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    };
  });
}

/**
 * Calculates epic roadmap progress.
 */
export function calculateEpicProgress(epics: Epic[], goals: Goal[]): EpicProgressPoint[] {
  return epics.map(epic => {
    const epicGoals = goals.filter(g => g.epicId === epic.id);
    const completedGoals = epicGoals.filter(isGoalCompleted).length;

    return {
      epicId: epic.id,
      epicName: epic.name,
      status: epic.status,
      totalGoals: epicGoals.length,
      completedGoals,
      completionRate: calculateCompletionRate(completedGoals, epicGoals.length),
    };
  });
}

/**
 * Aggregates complete summary metrics for dashboard display.
 */
export function calculateSummaryMetrics(data: {
  goals: Goal[];
  projects: Project[];
  sprints: Sprint[];
  epics: Epic[];
  columns: WorkflowColumn[];
  filter: AnalyticsFilter;
  now?: number;
}): SummaryMetrics {
  const { goals, sprints, filter, now = Date.now() } = data;
  const filtered = filterGoals(goals, filter, now);

  const completed = filtered.filter(isGoalCompleted);
  const active = filtered.filter(g => !isGoalCompleted(g) && g.lifecycleStatus !== 'archived');
  const totalEligible = filtered.length;

  const ONE_WEEK = 7 * 86_400_000;
  const ONE_MONTH = 30 * 86_400_000;

  const completedThisWeek = completed.filter(g => {
    const ts = getGoalCompletionTimestamp(g) ?? g.createdAt;
    return ts >= now - ONE_WEEK;
  }).length;

  const completedThisMonth = completed.filter(g => {
    const ts = getGoalCompletionTimestamp(g) ?? g.createdAt;
    return ts >= now - ONE_MONTH;
  }).length;

  const overdue = calculateOverdueItems(filtered, now);
  const avgCompletion = calculateAverageCompletionTime(filtered);
  const streak = calculateCompletionStreak(filtered, now);

  // Active sprint velocity
  let currentSprintVelocity: SummaryMetrics['currentSprintVelocity'] = undefined;
  const activeSprint = sprints.find(s => s.status === 'active');
  if (activeSprint) {
    const sprintGoals = goals.filter(
      g => g.sprintId === activeSprint.id || activeSprint.goalIds?.includes(g.id)
    );
    const sprintCompleted = sprintGoals.filter(isGoalCompleted).length;
    currentSprintVelocity = {
      sprintName: activeSprint.name,
      total: sprintGoals.length,
      completed: sprintCompleted,
      rate: calculateCompletionRate(sprintCompleted, sprintGoals.length),
    };
  }

  return {
    activeItems: active.length,
    completedItems: completed.length,
    totalEligible,
    completionRate: calculateCompletionRate(completed.length, totalEligible),
    completedThisWeek,
    completedThisMonth,
    overdueCount: overdue.count,
    overdueHighPriority: overdue.highPriorityCount,
    averageCompletionTimeMs: avgCompletion.avgMs,
    averageCompletionTimeFormatted: avgCompletion.formatted,
    currentSprintVelocity,
    currentStreakDays: streak.currentStreak,
    longestStreakDays: streak.longestStreak,
    lastCompletedDate: streak.lastCompletedDate,
  };
}
