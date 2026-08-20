import {
  getSubgoals,
  calculateSubgoalProgress,
  getValidParentGoals,
  canAssignParent,
  handleParentDeletion,
  checkAllSubgoalsCompleted,
} from './subgoals';
import type { Goal } from '../types';

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
    console.error(
      `✗ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
    testsFailed++;
  }
}

console.log('--- Running KanbanGXP Subgoal Support Unit Tests ---\n');

const mockGoals: Goal[] = [
  {
    id: 'parent-1',
    number: 1,
    title: 'Ship Mobile App',
    projectId: 'proj-1',
    description: '',
    lifecycleStatus: 'active',
    status: 'in-progress',
    priority: 'high',
    createdAt: Date.now(),
  },
  {
    id: 'subgoal-1',
    number: 2,
    parentId: 'parent-1',
    title: 'Design Mockups',
    projectId: 'proj-1',
    description: '',
    lifecycleStatus: 'completed',
    status: 'done',
    priority: 'medium',
    createdAt: Date.now(),
  },
  {
    id: 'subgoal-2',
    number: 3,
    parentId: 'parent-1',
    title: 'Implement Auth',
    projectId: 'proj-1',
    description: '',
    lifecycleStatus: 'active',
    status: 'in-progress',
    priority: 'high',
    createdAt: Date.now(),
  },
  {
    id: 'parent-2',
    number: 4,
    title: 'Refactor Backend API',
    projectId: 'proj-1',
    description: '',
    lifecycleStatus: 'active',
    status: 'todo',
    priority: 'medium',
    createdAt: Date.now(),
  },
  {
    id: 'proj2-goal',
    number: 5,
    title: 'Other Project Goal',
    projectId: 'proj-2',
    description: '',
    lifecycleStatus: 'active',
    status: 'todo',
    priority: 'low',
    createdAt: Date.now(),
  },
];

// 1. getSubgoals
const subgoalsP1 = getSubgoals(mockGoals, 'parent-1');
assertEqual(subgoalsP1.length, 2, 'getSubgoals finds all direct subgoals');
assertEqual(subgoalsP1.map(g => g.id), ['subgoal-1', 'subgoal-2'], 'getSubgoals returns correct child ids');
assertEqual(getSubgoals(mockGoals, 'parent-2').length, 0, 'getSubgoals returns empty array when parent has no subgoals');

// 2. calculateSubgoalProgress
const progP1 = calculateSubgoalProgress(mockGoals, 'parent-1');
assertEqual(progP1.total, 2, 'calculateSubgoalProgress total subgoals is 2');
assertEqual(progP1.completed, 1, 'calculateSubgoalProgress completed count is 1');
assertEqual(progP1.percentage, 50, 'calculateSubgoalProgress percentage is 50%');

const progP2 = calculateSubgoalProgress(mockGoals, 'parent-2');
assertEqual(progP2.percentage, 0, 'calculateSubgoalProgress returns 0% when no subgoals');

// 3. getValidParentGoals (Hierarchy & Cycle Rules)
// Rule: Cannot choose self
const validForP2 = getValidParentGoals(mockGoals, 'parent-2', 'proj-1');
assert(!validForP2.some(g => g.id === 'parent-2'), 'getValidParentGoals excludes self');
assert(!validForP2.some(g => g.id === 'subgoal-1' || g.id === 'subgoal-2'), 'getValidParentGoals excludes subgoals (1-level only)');
assert(!validForP2.some(g => g.projectId === 'proj-2'), 'getValidParentGoals excludes goals from other projects');
assertEqual(validForP2.length, 1, 'getValidParentGoals returns valid standalone parent candidates in project');
assertEqual(validForP2[0].id, 'parent-1', 'parent-1 is candidate for parent-2');

// Rule: A goal that already has subgoals cannot become a subgoal itself (1-level nesting limit)
const validForP1 = getValidParentGoals(mockGoals, 'parent-1', 'proj-1');
assertEqual(validForP1.length, 0, 'getValidParentGoals returns empty when goal already has subgoals');

// 4. canAssignParent
assert(canAssignParent(mockGoals, 'new-goal', undefined).allowed, 'canAssignParent allows undefined parent (top-level)');
assert(canAssignParent(mockGoals, 'new-goal', 'parent-1', 'proj-1').allowed, 'canAssignParent allows assigning valid parent in same project');
assert(!canAssignParent(mockGoals, 'goal-x', 'goal-x').allowed, 'canAssignParent prevents self-parenting');
assert(!canAssignParent(mockGoals, 'new-goal', 'subgoal-1', 'proj-1').allowed, 'canAssignParent prevents assigning a subgoal as parent (1-level nesting)');
assert(!canAssignParent(mockGoals, 'parent-1', 'parent-2', 'proj-1').allowed, 'canAssignParent prevents parent with subgoals from becoming a subgoal');
assert(!canAssignParent(mockGoals, 'new-goal', 'parent-1', 'proj-2').allowed, 'canAssignParent prevents cross-project parenting');

// 5. handleParentDeletion
// 5a. Strategy: promote
const promotedGoals = handleParentDeletion(mockGoals, 'parent-1', 'promote');
assertEqual(promotedGoals.length, mockGoals.length - 1, 'handleParentDeletion promote deletes parent');
assert(!promotedGoals.some(g => g.id === 'parent-1'), 'parent-1 is removed');
const promotedSub1 = promotedGoals.find(g => g.id === 'subgoal-1');
assertEqual(promotedSub1?.parentId, undefined, 'subgoal-1 is promoted to top-level');
const promotedSub2 = promotedGoals.find(g => g.id === 'subgoal-2');
assertEqual(promotedSub2?.parentId, undefined, 'subgoal-2 is promoted to top-level');

// 5b. Strategy: reassign
const reassignedGoals = handleParentDeletion(mockGoals, 'parent-1', 'reassign', 'parent-2');
assertEqual(reassignedGoals.length, mockGoals.length - 1, 'handleParentDeletion reassign deletes parent');
const reassignedSub1 = reassignedGoals.find(g => g.id === 'subgoal-1');
assertEqual(reassignedSub1?.parentId, 'parent-2', 'subgoal-1 is reassigned to parent-2');

// 5c. Strategy: cascade_delete
const cascadedGoals = handleParentDeletion(mockGoals, 'parent-1', 'cascade_delete');
assertEqual(cascadedGoals.length, mockGoals.length - 3, 'handleParentDeletion cascade_delete removes parent and 2 subgoals');
assert(!cascadedGoals.some(g => g.id === 'parent-1' || g.id === 'subgoal-1' || g.id === 'subgoal-2'), 'parent and subgoals all deleted');

// 6. checkAllSubgoalsCompleted
// If completing subgoal-2 when subgoal-1 is already completed:
const completedParent = checkAllSubgoalsCompleted(mockGoals, 'subgoal-2', 'completed');
assertEqual(completedParent?.id, 'parent-1', 'checkAllSubgoalsCompleted detects when final subgoal is completed');

// If subgoal is not completing (e.g. active):
const activeResult = checkAllSubgoalsCompleted(mockGoals, 'subgoal-2', 'active');
assertEqual(activeResult, null, 'checkAllSubgoalsCompleted returns null when status is not completed');

// If top-level goal completes:
const topLevelResult = checkAllSubgoalsCompleted(mockGoals, 'parent-2', 'completed');
assertEqual(topLevelResult, null, 'checkAllSubgoalsCompleted returns null for top-level goal without parent');

console.log(`\n========================================`);
console.log(`Total tests: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
