import { NavFolder } from '../types';
import { generateId } from './timeline';

export interface NavItemContainer {
  id: string;
  name: string;
  folderId?: string;
  order?: number;
  [key: string]: any;
}

export function createNavFolder(
  name: string,
  tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all' = 'projects',
  existingFolders: NavFolder[] = []
): NavFolder {
  const tabFolders = existingFolders.filter(f => f.tab === tab || f.tab === 'all');
  const maxOrder = tabFolders.reduce((max, f) => Math.max(max, f.order ?? 0), 0);

  return {
    id: `folder-${generateId()}`,
    name: name.trim() || 'Untitled Folder',
    tab,
    order: maxOrder + 1,
    isCollapsed: false,
    createdAt: Date.now(),
  };
}

export function deleteNavFolder<T extends NavItemContainer>(
  folderId: string,
  folders: NavFolder[],
  items: T[]
): { updatedFolders: NavFolder[]; updatedItems: T[]; orphanedCount: number } {
  const updatedFolders = folders.filter(f => f.id !== folderId);
  let orphanedCount = 0;

  const updatedItems = items.map(item => {
    if (item.folderId === folderId) {
      orphanedCount++;
      return {
        ...item,
        folderId: undefined,
      };
    }
    return item;
  });

  return { updatedFolders, updatedItems, orphanedCount };
}

export function moveItemToNavFolder<T extends NavItemContainer>(
  itemId: string,
  targetFolderId: string | null | undefined,
  items: T[]
): T[] {
  return items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        folderId: targetFolderId || undefined,
      };
    }
    return item;
  });
}

export function toggleNavFolderCollapse(
  folderId: string,
  folders: NavFolder[]
): NavFolder[] {
  return folders.map(folder => {
    if (folder.id === folderId) {
      return {
        ...folder,
        isCollapsed: !folder.isCollapsed,
      };
    }
    return folder;
  });
}

export function renameNavFolder(
  folderId: string,
  newName: string,
  folders: NavFolder[]
): NavFolder[] {
  const trimmed = newName.trim();
  if (!trimmed) return folders;

  return folders.map(folder => {
    if (folder.id === folderId) {
      return {
        ...folder,
        name: trimmed,
      };
    }
    return folder;
  });
}

export function organizeItemsByFolder<T extends NavItemContainer>(
  items: T[],
  folders: NavFolder[],
  tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all' = 'projects'
): {
  foldersWithItems: { folder: NavFolder; items: T[] }[];
  rootItems: T[];
} {
  const relevantFolders = folders
    .filter(f => f.tab === tab || f.tab === 'all')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const folderMap = new Map<string, T[]>();
  relevantFolders.forEach(f => folderMap.set(f.id, []));

  const rootItems: T[] = [];

  items.forEach(item => {
    if (item.folderId && folderMap.has(item.folderId)) {
      folderMap.get(item.folderId)!.push(item);
    } else {
      rootItems.push(item);
    }
  });

  // Sort items inside each folder by order or createdAt
  const foldersWithItems = relevantFolders.map(folder => {
    const folderItems = (folderMap.get(folder.id) || []).sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return 0;
    });
    return { folder, items: folderItems };
  });

  return {
    foldersWithItems,
    rootItems: rootItems.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return 0;
    }),
  };
}
