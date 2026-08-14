import {
  resolveDateRange,
  getGoalCompletionTimestamp,
  calculateCompletionRate,
  calculateAverageCompletionTime,
  calculateOverdueItems,
  calculateCompletionStreak,
  filterGoals,
  calculateCreatedVsCompletedOverTime,
  calculateStatusDistribution,
  calculatePriorityDistribution,
  calculateSprintPerformance,
  calculateEpicProgress,
  calculateSummaryMetrics,
} from './analytics';
import { Goal, Sprint, Epic } from '../types';

let testsPassed = 0;
let testsFailed = 0;

function assertEqual<T>(actual: T, expected: T, testName: string) {
  if (actual === expected) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ ${testName} - Expected: ${expected}, Received: ${actual}`);
    testsFailed++;
  }
}

console.log('--- Running KanbanGXP Analytics & Statistics Engine Tests ---\n');

const FIXED_NOW = 1723572000000; // Thursday, Aug 13, 2024 ~18:00 UTC
const ONE_DAY = 86_400_000;

// 1. Date Range Resolution
const range7d = resolveDateRange('7d', undefined, undefined, FIXED_NOW);
assertEqual(range7d.end - range7d.start, 7 * ONE_DAY, 'resolveDateRange 7d is 7 days');

const range30d = resolveDateRange('30d', undefined, undefined, FIXED_NOW);
assertEqual(range30d.end - range30d.start, 30 * ONE_DAY, 'resolveDateRange 30d is 30 days');

const rangeCustom = resolveDateRange('custom', 1000, 5000, FIXED_NOW);
assertEqual(rangeCustom.start, 1000, 'resolveDateRange custom sets start');
assertEqual(rangeCustom.end, 5000, 'resolveDateRange custom sets end');

// 2. Completion Timestamp with Activity Events
const goalWithHistory: Goal = {
  id: 'g-1',
  projectId: 'p-1',
  title: 'Deploy GHES',
  description: '',
  status: 'done',
  lifecycleStatus: 'completed',
  board: 'Work',
  priority: 'high',
  createdAt: FIXED_NOW - 5 * ONE_DAY,
  activities: [
    {
      id: 'a-1',
      goalId: 'g-1',
      type: 'created',
      actor: 'You',
      timestamp: FIXED_NOW - 5 * ONE_DAY,
    },
    {
      id: 'a-2',
      goalId: 'g-1',
      type: 'status_changed',
      from: 'in-progress',
      to: 'done',
      actor: 'You',
      timestamp: FIXED_NOW - 2 * ONE_DAY,
    },
  ],
};

const ts = getGoalCompletionTimestamp(goalWithHistory);
assertEqual(ts, FIXED_NOW - 2 * ONE_DAY, 'getGoalCompletionTimestamp extracts timestamp from status_changed to done');

const goalNoActivities: Goal = {
  id: 'g-2',
  projectId: 'p-1',
  title: 'Setup monitoring',
  description: '',
  status: 'done',
  lifecycleStatus: 'completed',
  board: 'Work',
  priority: 'medium',
  createdAt: FIXED_NOW - 3 * ONE_DAY,
};
assertEqual(getGoalCompletionTimestamp(goalNoActivities), FIXED_NOW - 3 * ONE_DAY, 'getGoalCompletionTimestamp falls back to createdAt if no activity log');

// 3. Completion Rate
assertEqual(calculateCompletionRate(5, 10), 50, 'calculateCompletionRate calculates 50%');
assertEqual(calculateCompletionRate(1, 3), 33.3, 'calculateCompletionRate rounds to 1 decimal (33.3%)');
assertEqual(calculateCompletionRate(0, 0), 0, 'calculateCompletionRate handles 0 eligible items');

// 4. Average Completion Time
const avgComp = calculateAverageCompletionTime([goalWithHistory, goalNoActivities]);
assertEqual(avgComp.avgDays, 1.5, 'calculateAverageCompletionTime calculates mean duration in days');

// 5. Overdue Items
const mockGoals: Goal[] = [
  {
    id: 'g-active-ontime',
    projectId: 'p-1',
    title: 'Future Goal',
    description: '',
    status: 'todo',
    lifecycleStatus: 'active',
    board: 'Work',
    priority: 'low',
    dueDate: FIXED_NOW + 2 * ONE_DAY,
    createdAt: FIXED_NOW - 1 * ONE_DAY,
  },
  {
    id: 'g-overdue-high',
    projectId: 'p-1',
    title: 'Critical Fix',
    description: '',
    status: 'in-progress',
    lifecycleStatus: 'active',
    board: 'Work',
    priority: 'high',
    dueDate: FIXED_NOW - 1 * ONE_DAY,
    createdAt: FIXED_NOW - 4 * ONE_DAY,
  },
  {
    id: 'g-completed-past-due',
    projectId: 'p-1',
    title: 'Done Fix',
    description: '',
    status: 'done',
    lifecycleStatus: 'completed',
    board: 'Work',
    priority: 'high',
    dueDate: FIXED_NOW - 2 * ONE_DAY,
    createdAt: FIXED_NOW - 5 * ONE_DAY,
  },
];

const overdue = calculateOverdueItems(mockGoals, FIXED_NOW);
assertEqual(overdue.count, 1, 'calculateOverdueItems only counts active items past due');
assertEqual(overdue.highPriorityCount, 1, 'calculateOverdueItems tracks high priority overdue items');

// 6. Completion Streak
const streakGoals: Goal[] = [
  {
    id: 's-1',
    projectId: 'p-1',
    title: 'Task Day 1',
    description: '',
    status: 'done',
    lifecycleStatus: 'completed',
    board: 'Work',
    priority: 'medium',
    createdAt: FIXED_NOW - 2 * ONE_DAY,
    activities: [
      { id: 'a1', goalId: 's-1', type: 'status_changed', to: 'done', actor: 'You', timestamp: FIXED_NOW - 2 * ONE_DAY },
    ],
  },
  {
    id: 's-2',
    projectId: 'p-1',
    title: 'Task Day 2',
    description: '',
    status: 'done',
    lifecycleStatus: 'completed',
    board: 'Work',
    priority: 'medium',
    createdAt: FIXED_NOW - 1 * ONE_DAY,
    activities: [
      { id: 'a2', goalId: 's-2', type: 'status_changed', to: 'done', actor: 'You', timestamp: FIXED_NOW - 1 * ONE_DAY },
    ],
  },
  {
    id: 's-3',
    projectId: 'p-1',
    title: 'Task Day 3',
    description: '',
    status: 'done',
    lifecycleStatus: 'completed',
    board: 'Work',
    priority: 'medium',
    createdAt: FIXED_NOW,
    activities: [
      { id: 'a3', goalId: 's-3', type: 'status_changed', to: 'done', actor: 'You', timestamp: FIXED_NOW },
    ],
  },
];

const streakResult = calculateCompletionStreak(streakGoals, FIXED_NOW);
assertEqual(streakResult.currentStreak, 3, 'calculateCompletionStreak calculates 3-day active streak');
assertEqual(streakResult.longestStreak, 3, 'calculateCompletionStreak calculates longest streak');

// 7. Filtering
const filteredWork = filterGoals(
  mockGoals,
  { datePreset: 'all', board: 'Work' },
  FIXED_NOW
);
assertEqual(filteredWork.length, 3, 'filterGoals filters by board=Work');

const filteredHigh = filterGoals(
  mockGoals,
  { datePreset: 'all', board: 'Work', priority: 'high' },
  FIXED_NOW
);
assertEqual(filteredHigh.length, 2, 'filterGoals filters by priority=high');

// 8. Time series bucketing
const timeBuckets = calculateCreatedVsCompletedOverTime(
  [goalWithHistory, goalNoActivities],
  { start: FIXED_NOW - 7 * ONE_DAY, end: FIXED_NOW },
  7
);
assertEqual(timeBuckets.length, 7, 'calculateCreatedVsCompletedOverTime generates 7 buckets');

// 9. Sprint Performance
const mockSprints: Sprint[] = [
  {
    id: 'sp-1',
    projectId: 'p-1',
    name: 'Sprint 1',
    startDate: '2024-08-01',
    endDate: '2024-08-14',
    length: '2-weeks',
    status: 'active',
    goalIds: ['g-1', 'g-2'],
    createdAt: FIXED_NOW - 10 * ONE_DAY,
  },
];
const sprintPerf = calculateSprintPerformance(mockSprints, [goalWithHistory, goalNoActivities]);
assertEqual(sprintPerf[0].completedGoals, 2, 'calculateSprintPerformance finds 2 completed goals');
assertEqual(sprintPerf[0].completionRate, 100, 'calculateSprintPerformance completion rate is 100%');

// 10. Epic Progress
const mockEpics: Epic[] = [
  {
    id: 'ep-1',
    projectId: 'p-1',
    name: 'Enterprise Rollout',
    description: '',
    status: 'active',
    createdAt: FIXED_NOW - 20 * ONE_DAY,
  },
];
const epicProgress = calculateEpicProgress(mockEpics, [{ ...goalWithHistory, epicId: 'ep-1' }]);
assertEqual(epicProgress[0].totalGoals, 1, 'calculateEpicProgress total goals is 1');
assertEqual(epicProgress[0].completedGoals, 1, 'calculateEpicProgress completed goals is 1');

// 11. Summary Metrics
const summary = calculateSummaryMetrics({
  goals: mockGoals,
  projects: [{ id: 'p-1', name: 'Cloud Migration', createdAt: 0, workflowColumns: [] }],
  sprints: mockSprints,
  epics: mockEpics,
  columns: [{ id: 'todo', title: 'To Do' }, { id: 'done', title: 'Done' }],
  filter: { datePreset: 'all', board: 'All' },
  now: FIXED_NOW,
});
assertEqual(summary.totalEligible, 3, 'Summary total eligible is 3');
assertEqual(summary.completedItems, 1, 'Summary completed is 1');
assertEqual(summary.activeItems, 2, 'Summary active is 2');
assertEqual(summary.completionRate, 33.3, 'Summary completion rate is 33.3%');

console.log(`\n========================================`);
console.log(`Total tests: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
