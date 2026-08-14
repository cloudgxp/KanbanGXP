import {
  createNavFolder,
  deleteNavFolder,
  moveItemToNavFolder,
  toggleNavFolderCollapse,
  renameNavFolder,
  organizeItemsByFolder,
} from './folders';
import type { NavFolder } from '../types';

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

console.log('--- Running KanbanGXP Folder Navigation System Tests ---\n');

// 1. Create folder
const f1 = createNavFolder('Work Projects', 'projects');
assert(f1.id.startsWith('folder-'), 'createNavFolder generates folder ID');
assertEqual(f1.name, 'Work Projects', 'createNavFolder sets folder name');
assertEqual(f1.tab, 'projects', 'createNavFolder sets folder tab');
assertEqual(f1.order, 1, 'createNavFolder assigns order 1 for first folder');

const f2 = createNavFolder('Certifications', 'projects', [f1]);
assertEqual(f2.order, 2, 'createNavFolder assigns order 2 for next folder');

// 2. Toggle collapse
const folders = [f1, f2];
const toggled = toggleNavFolderCollapse(f1.id, folders);
assertEqual(toggled.find(f => f.id === f1.id)?.isCollapsed, true, 'toggleNavFolderCollapse sets isCollapsed to true');
const untoggled = toggleNavFolderCollapse(f1.id, toggled);
assertEqual(untoggled.find(f => f.id === f1.id)?.isCollapsed, false, 'toggleNavFolderCollapse uncollapses folder');

// 3. Rename folder
const renamed = renameNavFolder(f1.id, '  Client Engagements  ', folders);
assertEqual(renamed.find(f => f.id === f1.id)?.name, 'Client Engagements', 'renameNavFolder trims and updates name');

const blankRename = renameNavFolder(f1.id, '   ', folders);
assertEqual(blankRename.find(f => f.id === f1.id)?.name, 'Work Projects', 'renameNavFolder ignores empty name');

// 4. Move item into folder and between folders
interface MockProject {
  id: string;
  name: string;
  folderId?: string;
  order?: number;
}

const mockProjects: MockProject[] = [
  { id: 'p1', name: 'GHES Upgrade' },
  { id: 'p2', name: 'Security Audit', folderId: f1.id },
  { id: 'p3', name: 'Anime Calendar' },
];

const movedToF2 = moveItemToNavFolder('p1', f2.id, mockProjects);
assertEqual(movedToF2.find(p => p.id === 'p1')?.folderId, f2.id, 'moveItemToNavFolder moves item to f2');

const movedToRoot = moveItemToNavFolder('p2', null, mockProjects);
assertEqual(movedToRoot.find(p => p.id === 'p2')?.folderId, undefined, 'moveItemToNavFolder moves item back to root');

// 5. Organize items by folder
const organized = organizeItemsByFolder(
  [
    { id: 'p1', name: 'GHES Upgrade', folderId: f1.id, order: 2 },
    { id: 'p2', name: 'Client Migration', folderId: f1.id, order: 1 },
    { id: 'p3', name: 'Anime Calendar', order: 1 },
    { id: 'p4', name: 'Home Server', order: 2 },
  ],
  [f1, f2],
  'projects'
);

assertEqual(organized.foldersWithItems.length, 2, 'organizeItemsByFolder returns all tab folders');
assertEqual(organized.foldersWithItems[0].folder.id, f1.id, 'First folder is f1');
assertEqual(organized.foldersWithItems[0].items.map(i => i.id), ['p2', 'p1'], 'Items inside folder are sorted by order');
assertEqual(organized.foldersWithItems[1].items.length, 0, 'Empty folder f2 has 0 items');
assertEqual(organized.rootItems.map(i => i.id), ['p3', 'p4'], 'Root items are grouped separately');

// 6. Safe folder deletion (NEVER deletes items)
const { updatedFolders, updatedItems, orphanedCount } = deleteNavFolder(
  f1.id,
  [f1, f2],
  [
    { id: 'p1', name: 'GHES Upgrade', folderId: f1.id },
    { id: 'p2', name: 'Security Audit', folderId: f1.id },
    { id: 'p3', name: 'Anime Calendar', folderId: f2.id },
  ]
);

assertEqual(updatedFolders.length, 1, 'deleteNavFolder removes folder from folders array');
assertEqual(updatedFolders[0].id, f2.id, 'Remaining folder is f2');
assertEqual(updatedItems.length, 3, 'deleteNavFolder does NOT delete any items');
assertEqual(orphanedCount, 2, 'deleteNavFolder tracks orphaned count');
assertEqual(updatedItems.find(p => p.id === 'p1')?.folderId, undefined, 'Deleted folder contents moved safely to root');
assertEqual(updatedItems.find(p => p.id === 'p2')?.folderId, undefined, 'Deleted folder contents moved safely to root');
assertEqual(updatedItems.find(p => p.id === 'p3')?.folderId, f2.id, 'Other folder items retain their folder');

// 7. Label folders
const labelFolder = createNavFolder('Status Tags', 'labels');
assertEqual(labelFolder.tab, 'labels', 'createNavFolder creates folder with tab=labels');

const mockLabels = [
  { id: 'l1', name: 'Bug', color: 'bg-rose-500', folderId: labelFolder.id },
  { id: 'l2', name: 'Feature', color: 'bg-blue-500' },
  { id: 'l3', name: 'Security', color: 'bg-amber-500', folderId: labelFolder.id },
];

const organizedLabels = organizeItemsByFolder(mockLabels, [labelFolder], 'labels');
assertEqual(organizedLabels.foldersWithItems.length, 1, 'organizeItemsByFolder organizes labels');
assertEqual(organizedLabels.foldersWithItems[0].items.length, 2, 'Label folder contains 2 items');
assertEqual(organizedLabels.rootItems.length, 1, 'Unfiled labels contains 1 item');

const { updatedItems: safeLabels } = deleteNavFolder(labelFolder.id, [labelFolder], mockLabels);
assertEqual(safeLabels.length, 3, 'Deleting label folder does not delete labels');
assertEqual(safeLabels.filter(l => !l.folderId).length, 3, 'All labels returned to root after label folder deletion');

console.log(`\n========================================`);
console.log(`Total tests: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
