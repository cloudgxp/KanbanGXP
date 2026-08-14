import {
  generateId,
  generateStableGoalNumber,
  calculateGoalProgress,
  createActivityEvent,
  createComment,
  buildUnifiedTimeline,
  formatTimelineEventMessage,
  resolveGoalByQuery,
  formatRelativeTime,
  formatDateString,
} from './timeline';
import type { Goal, ActivityEvent, Comment } from '../types';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  if (isMatch) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

console.log('--- Running KanbanGXP GitHub-Issue Timeline & Model Tests ---\n');

// 1. generateId
const id1 = generateId();
const id2 = generateId();
assert(typeof id1 === 'string' && id1.length >= 6, 'generateId returns non-empty string');
assert(id1 !== id2, 'generateId produces unique ids');

// 2. generateStableGoalNumber
const mockGoals: Goal[] = [
  { id: '1', number: 1, title: 'First', projectId: 'p1', description: '', lifecycleStatus: 'active', status: 'backlog', priority: 'medium', board: 'Work', createdAt: Date.now() },
  { id: '2', number: 4, title: 'Fourth', projectId: 'p1', description: '', lifecycleStatus: 'active', status: 'backlog', priority: 'medium', board: 'Work', createdAt: Date.now() },
];
assertEqual(generateStableGoalNumber(mockGoals), 5, 'generateStableGoalNumber finds highest + 1');
assertEqual(generateStableGoalNumber([]), 1, 'generateStableGoalNumber returns 1 for empty goals');

// 3. calculateGoalProgress
const checklistGoal: Goal = {
  id: 'g1',
  number: 1,
  title: 'Checklist Goal',
  projectId: 'p1',
  description: '',
  lifecycleStatus: 'active',
  status: 'in_progress',
  priority: 'high',
  board: 'Work',
  createdAt: Date.now(),
  successMetric: {
    type: 'checklist',
    items: [
      { id: 'c1', text: 'Item 1', completed: true },
      { id: 'c2', text: 'Item 2', completed: false },
      { id: 'c3', text: 'Item 3', completed: true },
      { id: 'c4', text: 'Item 4', completed: false },
    ],
  },
};
assertEqual(calculateGoalProgress(checklistGoal), 50, 'calculateGoalProgress returns 50% for 2/4 completed items');

const numericGoal: Goal = {
  id: 'g2',
  number: 2,
  title: 'Numeric Goal',
  projectId: 'p1',
  description: '',
  lifecycleStatus: 'active',
  status: 'in_progress',
  priority: 'medium',
  board: 'Work',
  createdAt: Date.now(),
  successMetric: {
    type: 'numeric',
    current: 75,
    target: 100,
    unit: 'pages',
  },
};
assertEqual(calculateGoalProgress(numericGoal), 75, 'calculateGoalProgress returns 75% for 75/100 numeric');

const completedLifecycleGoal: Goal = {
  id: 'g3',
  number: 3,
  title: 'Completed Lifecycle Goal',
  projectId: 'p1',
  description: '',
  status: 'done',
  lifecycleStatus: 'completed',
  priority: 'low',
  board: 'Work',
  createdAt: Date.now(),
};
assertEqual(calculateGoalProgress(completedLifecycleGoal), 100, 'calculateGoalProgress returns 100% when lifecycle is completed');

// 4. Activity events creation and message formatting
const evCreated = createActivityEvent('g1', 'created', {}, 'Alice');
assertEqual(evCreated.goalId, 'g1', 'createActivityEvent sets goalId');
assertEqual(evCreated.actor, 'Alice', 'createActivityEvent sets actor');
assertEqual(formatTimelineEventMessage(evCreated), 'created this goal', 'formatTimelineEventMessage formats creation');

const evStatus = createActivityEvent('g1', 'status_changed', { from: 'Backlog', to: 'In Progress' });
assertEqual(formatTimelineEventMessage(evStatus), 'moved this from Backlog → In Progress', 'formatTimelineEventMessage formats status move');

const evPriority = createActivityEvent('g1', 'priority_changed', { from: 'low', to: 'high' });
assertEqual(formatTimelineEventMessage(evPriority), 'changed priority from low → high', 'formatTimelineEventMessage formats priority change');

const evProgress = createActivityEvent('g1', 'progress_changed', { from: 25, to: 50 });
assertEqual(formatTimelineEventMessage(evProgress), 'progress changed from 25% → 50%', 'formatTimelineEventMessage formats progress change');

// 5. Comments creation
const { comment: comm, event: commEv } = createComment('g1', 'Hello **world**', 'Bob');
assertEqual(comm.goalId, 'g1', 'createComment sets goalId');
assertEqual(comm.content, 'Hello **world**', 'createComment sets content');
assertEqual(comm.actor, 'Bob', 'createComment sets actor');
assertEqual(commEv.type, 'comment', 'createComment generates comment activity event');

// 6. buildUnifiedTimeline sorting
const now = Date.now();
const act1: ActivityEvent = {
  id: 'a1',
  goalId: 'g1',
  type: 'created',
  actor: 'You',
  timestamp: now - 3000,
  message: 'Created',
};
const comm1: Comment = {
  id: 'c1',
  goalId: 'g1',
  actor: 'Colleague',
  content: 'Nice progress!',
  createdAt: now - 2000,
};
const act2: ActivityEvent = {
  id: 'a2',
  goalId: 'g1',
  type: 'status_changed',
  actor: 'You',
  timestamp: now - 1000,
  from: 'Backlog',
  to: 'Done',
};

const goalWithTimeline: Goal = {
  ...checklistGoal,
  activities: [act2, act1], // intentionally unsorted
  comments: [comm1],
};

const timeline = buildUnifiedTimeline(goalWithTimeline);
assertEqual(timeline.length, 3, 'buildUnifiedTimeline merges all events and comments');
assertEqual(timeline[0].id, 'a1', 'Unified timeline first item is earliest event');
assertEqual(timeline[1].id, 'comment-item-c1', 'Unified timeline second item is middle comment');
assertEqual(timeline[2].id, 'a2', 'Unified timeline third item is latest event');

// 7. resolveGoalByQuery
const allTestGoals: Goal[] = [
  { id: 'uuid-1234', number: 142, title: 'Auth flow update', projectId: 'p1', description: '', lifecycleStatus: 'active', status: 'backlog', priority: 'high', board: 'Work', createdAt: Date.now() },
  { id: 'uuid-5678', number: 7, title: 'Database index', projectId: 'p1', description: '', lifecycleStatus: 'active', status: 'backlog', priority: 'medium', board: 'Work', createdAt: Date.now() },
];

assertEqual(resolveGoalByQuery(allTestGoals, '142')?.id, 'uuid-1234', 'resolveGoalByQuery finds by numeric string');
assertEqual(resolveGoalByQuery(allTestGoals, '#142')?.id, 'uuid-1234', 'resolveGoalByQuery finds by #number');
assertEqual(resolveGoalByQuery(allTestGoals, 'uuid-5678')?.id, 'uuid-5678', 'resolveGoalByQuery finds by UUID');
assertEqual(resolveGoalByQuery(allTestGoals, '999'), undefined, 'resolveGoalByQuery returns undefined for unknown goal');

// 8. formatRelativeTime
assertEqual(formatRelativeTime(Date.now() - 10000), 'just now', 'formatRelativeTime handles just now');
assertEqual(formatRelativeTime(Date.now() - 120000), '2m ago', 'formatRelativeTime handles minutes ago');

console.log(`\n========================================`);
console.log(`Total tests: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
