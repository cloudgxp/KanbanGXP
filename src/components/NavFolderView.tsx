import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
  FolderPlus,
  GripVertical,
  MoveRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Icon } from './Icon';
import { NavFolder } from '../types';
import { organizeItemsByFolder, NavItemContainer } from '../lib/folders';

export interface NavFolderViewProps<T extends NavItemContainer> {
  tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all';
  itemTypeName: string; // e.g. 'Project', 'Sprint', 'Epic', 'Label'
  items: T[];
  folders: NavFolder[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onEditItem?: (item: T) => void;
  onDeleteItem?: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onCreateItem: (folderId?: string) => void;
  onCreateFolder: (name: string, tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all') => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleCollapse: (folderId: string) => void;
  onMoveItemToFolder: (itemId: string, folderId: string | null) => void;
  renderItemContent: (item: T, isActive: boolean) => React.ReactNode;
}

// Droppable folder container target for dnd-kit
interface DroppableFolderTargetProps {
  key?: React.Key;
  folderId: string;
  children: React.ReactNode;
  isOverFolder?: boolean;
}

const DroppableFolderTarget: React.FC<DroppableFolderTargetProps> = ({
  folderId,
  children,
  isOverFolder,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folderId}`,
    data: { type: 'folder', folderId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl transition-all duration-200",
        (isOver || isOverFolder) && "bg-indigo-50/70 ring-2 ring-indigo-400 ring-dashed"
      )}
    >
      {children}
    </div>
  );
};

// Sortable item wrapper
interface SortableNavItemProps {
  key?: React.Key;
  id: string;
  children: (dragHandleProps: any, isDragging: boolean) => React.ReactNode;
}

const SortableNavItem: React.FC<SortableNavItemProps> = ({
  id,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item-${id}`,
    data: { type: 'item', itemId: id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/navitem">
      {children({ ...attributes, ...listeners }, isDragging)}
    </div>
  );
};

export function NavFolderView<T extends NavItemContainer>({
  tab,
  itemTypeName,
  items,
  folders,
  activeItemId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onRestoreItem,
  onCreateItem,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleCollapse,
  onMoveItemToFolder,
  renderItemContent,
}: NavFolderViewProps<T>) {
  // Modal & Menu States
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToRename, setFolderToRename] = useState<NavFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<{ folder: NavFolder; count: number } | null>(null);
  const [itemToMove, setItemToMove] = useState<T | null>(null);
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<T | null>(null);

  // Group items by folder
  const { foldersWithItems, rootItems } = organizeItemsByFolder(items, folders, tab);
  const tabFolders = folders.filter(f => f.tab === tab || f.tab === 'all');

  // Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Prevents accidental dragging on quick click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.type === 'item') {
      const found = items.find(i => i.id === activeData.itemId);
      if (found) setActiveDragItem(found);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'item') {
      const draggedItemId = activeData.itemId;

      // Dropped onto a folder
      if (overData?.type === 'folder') {
        const targetFolderId = overData.folderId;
        onMoveItemToFolder(draggedItemId, targetFolderId);
      } else if (over.id === 'root-drop-zone') {
        // Dropped onto root area
        onMoveItemToFolder(draggedItemId, null);
      } else if (overData?.type === 'item') {
        // Dropped onto another item: adopt that item's folder
        const targetItem = items.find(i => i.id === overData.itemId);
        if (targetItem) {
          onMoveItemToFolder(draggedItemId, targetItem.folderId || null);
        }
      }
    }
  };

  const submitCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), tab);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const submitRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameValue.trim()) return;
    onRenameFolder(folderToRename.id, renameValue.trim());
    setFolderToRename(null);
    setRenameValue('');
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    onDeleteFolder(folderToDelete.folder.id);
    setFolderToDelete(null);
  };

  return (
    <div className="space-y-3 select-none">
      {/* Top Action Bar for Tab */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-border/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Folders & {itemTypeName}s
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-accent hover:bg-column transition-all cursor-pointer"
            title={`Create new ${itemTypeName} folder`}
          >
            <FolderPlus size={14} />
            <span className="text-[11px]">Folder</span>
          </button>
          <button
            type="button"
            onClick={() => onCreateItem()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-accent bg-column/80 hover:bg-column transition-all cursor-pointer"
            title={`Create new ${itemTypeName}`}
          >
            <Plus size={14} />
            <span className="text-[11px]">{itemTypeName}</span>
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Folders List */}
        <div className="space-y-2">
          {foldersWithItems.map(({ folder, items: folderItems }) => {
            const isCollapsed = folder.isCollapsed ?? false;
            const isMenuOpen = activeFolderMenuId === folder.id;

            return (
              <DroppableFolderTarget key={folder.id} folderId={folder.id}>
                <div className="rounded-xl border border-border/60 bg-sidebar/50 overflow-hidden">
                  {/* Folder Header Row */}
                  <div className="group/folder relative flex items-center justify-between p-1.5 hover:bg-column/60 transition-colors">
                    <button
                      type="button"
                      onClick={() => onToggleCollapse(folder.id)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0 pr-12 cursor-pointer"
                      title={`${isCollapsed ? 'Expand' : 'Collapse'} folder "${folder.name}"`}
                    >
                      <span className="text-text-muted transition-transform duration-200">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </span>
                      {isCollapsed ? (
                        <Folder size={16} className="text-amber-500 shrink-0" />
                      ) : (
                        <FolderOpen size={16} className="text-amber-500 shrink-0" />
                      )}
                      <span className="truncate text-xs font-bold text-text">
                        {folder.name}
                      </span>
                      <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-column text-text-muted border border-border/50">
                        {folderItems.length}
                      </span>
                    </button>

                    {/* Folder Overflow Menu Actions */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateItem(folder.id);
                        }}
                        className="p-1 text-text-muted hover:text-accent rounded opacity-0 group-hover/folder:opacity-100 transition-opacity cursor-pointer"
                        title={`Add ${itemTypeName} in "${folder.name}"`}
                      >
                        <Plus size={13} />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFolderMenuId(isMenuOpen ? null : folder.id);
                          }}
                          className="p-1 text-text-muted hover:text-text rounded opacity-70 hover:opacity-100 cursor-pointer"
                          title="Folder options"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFolderToRename(folder);
                                setRenameValue(folder.name);
                                setActiveFolderMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text hover:bg-column text-left cursor-pointer"
                            >
                              <Edit2 size={12} />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFolderToDelete({ folder, count: folderItems.length });
                                setActiveFolderMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Delete Folder</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Folder Item Contents */}
                  {!isCollapsed && (
                    <div className="pl-3 pr-1.5 pb-1.5 pt-0.5 space-y-1 border-l-2 border-amber-300/40 ml-4 mb-1">
                      {folderItems.length === 0 ? (
                        <div className="py-2 px-2 text-center text-[10px] text-text-muted italic bg-column/30 rounded-lg">
                          Empty folder — drop {itemTypeName.toLowerCase()}s here
                        </div>
                      ) : (
                        <SortableContext
                          items={folderItems.map(i => `item-${i.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {folderItems.map(item => {
                            const isActive = activeItemId === item.id;
                            const isItemMenuOpen = activeItemMenuId === item.id;

                            return (
                              <SortableNavItem key={item.id} id={item.id}>
                                {(dragHandleProps) => (
                                  <div className="relative group/subitem flex items-center">
                                    <div
                                      {...dragHandleProps}
                                      className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/subitem:opacity-100 transition-opacity"
                                      title="Drag to reorder or move"
                                    >
                                      <GripVertical size={11} />
                                    </div>
                                    <div
                                      onClick={() => onSelectItem(item.id)}
                                      className={cn(
                                        "flex-1 min-w-0 pr-14 transition-all rounded-lg cursor-pointer",
                                        isActive ? "bg-column font-bold" : "hover:bg-column/50"
                                      )}
                                    >
                                      {renderItemContent(item, isActive)}
                                    </div>

                                    {/* Item Quick Actions */}
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/subitem:opacity-100 flex items-center gap-0.5 transition-opacity">
                                      {onEditItem && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditItem(item);
                                          }}
                                          className="p-1 text-text-muted hover:text-accent rounded hover:bg-sidebar transition-colors cursor-pointer"
                                          title={`Edit ${item.name}`}
                                        >
                                          <Icon name="edit" size={12} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setItemToMove(item);
                                        }}
                                        className="p-1 text-text-muted hover:text-accent rounded hover:bg-sidebar transition-colors cursor-pointer"
                                        title="Move to folder..."
                                      >
                                        <FolderInput size={12} />
                                      </button>
                                      {onDeleteItem && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteItem(item.id);
                                          }}
                                          className="p-1 text-text-muted hover:text-rose-500 rounded hover:bg-sidebar transition-colors cursor-pointer"
                                          title={`Delete ${item.name}`}
                                        >
                                          <Icon name="delete" size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </SortableNavItem>
                            );
                          })}
                        </SortableContext>
                      )}
                    </div>
                  )}
                </div>
              </DroppableFolderTarget>
            );
          })}
        </div>

        {/* Root / Unfiled Items Area */}
        <div id="root-drop-zone" className="pt-2 space-y-1">
          {tabFolders.length > 0 && rootItems.length > 0 && (
            <div className="px-1 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <span>Unfiled {itemTypeName}s</span>
              <span>{rootItems.length}</span>
            </div>
          )}

          {rootItems.length === 0 && tabFolders.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted bg-column/20 rounded-xl border border-dashed border-border/60">
              No {itemTypeName.toLowerCase()}s found. Click "+ {itemTypeName}" to create one!
            </div>
          ) : (
            <SortableContext
              items={rootItems.map(i => `item-${i.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {rootItems.map(item => {
                const isActive = activeItemId === item.id;

                return (
                  <SortableNavItem key={item.id} id={item.id}>
                    {(dragHandleProps) => (
                      <div className="relative group/rootitem flex items-center">
                        <div
                          {...dragHandleProps}
                          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/rootitem:opacity-100 transition-opacity"
                          title="Drag into a folder or reorder"
                        >
                          <GripVertical size={11} />
                        </div>
                        <div
                          onClick={() => onSelectItem(item.id)}
                          className={cn(
                            "flex-1 min-w-0 pr-14 transition-all rounded-lg cursor-pointer",
                            isActive ? "bg-column font-bold" : "hover:bg-column/50"
                          )}
                        >
                          {renderItemContent(item, isActive)}
                        </div>

                        {/* Root Item Quick Actions */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/rootitem:opacity-100 flex items-center gap-0.5 transition-opacity">
                          {onEditItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditItem(item);
                              }}
                              className="p-1 text-text-muted hover:text-accent rounded hover:bg-sidebar transition-colors cursor-pointer"
                              title={`Edit ${item.name}`}
                            >
                              <Icon name="edit" size={12} />
                            </button>
                          )}
                          {tabFolders.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToMove(item);
                              }}
                              className="p-1 text-text-muted hover:text-accent rounded hover:bg-sidebar transition-colors cursor-pointer"
                              title="Move into a folder..."
                            >
                              <FolderInput size={12} />
                            </button>
                          )}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteItem(item.id);
                              }}
                              className="p-1 text-text-muted hover:text-rose-500 rounded hover:bg-sidebar transition-colors cursor-pointer"
                              title={`Delete ${item.name}`}
                            >
                              <Icon name="delete" size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </SortableNavItem>
                );
              })}
            </SortableContext>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragItem ? (
            <div className="p-2 rounded-xl bg-white shadow-xl border border-indigo-200 text-xs font-bold text-slate-800 opacity-90 flex items-center gap-2">
              <MoveRight size={14} className="text-indigo-500" />
              <span>{activeDragItem.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* --- Modals & Dialogs --- */}

      {/* 1. New Folder Modal */}
      <AnimatePresence>
        {isNewFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-slate-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderPlus size={20} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">New Folder</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submitCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Folder Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Work, Certifications, Q3 Goals"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewFolderModalOpen(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Rename Folder Modal */}
      <AnimatePresence>
        {folderToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-slate-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Rename Folder</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submitRenameFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Folder Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Folder name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFolderToRename(null)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!renameValue.trim()}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    Save Name
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Safe Delete Folder Confirmation Modal */}
      <AnimatePresence>
        {folderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 text-slate-900"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Folder</h3>
                  <p className="text-xs text-slate-500">"{folderToDelete.folder.name}"</p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 my-4 space-y-1 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <span>Safe Deletion:</span>
                </p>
                <p className="leading-relaxed">
                  Deleting this folder will <strong>never</strong> delete your {itemTypeName.toLowerCase()}s.
                  {folderToDelete.count > 0 ? (
                    <> The <strong>{folderToDelete.count} {itemTypeName.toLowerCase()}(s)</strong> currently inside will safely be moved back to the root level.</>
                  ) : (
                    <> This folder is currently empty.</>
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteFolder}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-600/20"
                >
                  Delete Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Move Item to Folder Dialog */}
      <AnimatePresence>
        {itemToMove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-slate-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderInput size={18} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Move {itemTypeName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setItemToMove(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Choose a destination folder for <strong className="text-slate-800">"{itemToMove.name}"</strong>:
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    onMoveItemToFolder(itemToMove.id, null);
                    setItemToMove(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer",
                    !itemToMove.folderId
                      ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                      : "hover:bg-slate-100 text-slate-700 border border-transparent"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span>Root (No Folder / Unfiled)</span>
                </button>

                {tabFolders.map(folder => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      onMoveItemToFolder(itemToMove.id, folder.id);
                      setItemToMove(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer",
                      itemToMove.folderId === folder.id
                        ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                        : "hover:bg-slate-100 text-slate-700 border border-transparent"
                    )}
                  >
                    <Folder size={14} className="text-amber-500 shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setItemToMove(null)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
