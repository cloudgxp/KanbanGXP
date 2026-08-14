import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Icon } from './Icon';
import { Project, Sprint, Epic, Goal, Label, BoardType, SprintStatus, EpicStatus, NavFolder } from '../types';
import { ThemePicker } from './ThemePicker';
import { NavFolderView } from './NavFolderView';
import { NavTooltip } from './NavTooltip';

export type MinibarTab = 'views' | 'projects' | 'sprints' | 'epics' | 'labels' | 'settings' | 'themes' | null;

export interface MinibarNavProps {
  activeBoard: BoardType;
  setActiveBoard: (board: BoardType) => void;
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  openCreateProjectModal: () => void;
  openEditProjectModal: (project: Project) => void;
  deleteProject: (id: string) => void;
  sprints: Sprint[];
  activeSprintId: string | null;
  setActiveSprintId: (id: string | null) => void;
  openCreateSprintModal: () => void;
  openEditSprintModal: (sprint: Sprint) => void;
  updateSprintStatus: (id: string, status: SprintStatus) => void;
  deleteSprint: (id: string) => void;
  epics: Epic[];
  activeEpicId: string | null;
  setActiveEpicId: (id: string | null) => void;
  openCreateEpicModal: () => void;
  openEditEpicModal: (epic: Epic) => void;
  updateEpicStatus: (id: string, status: EpicStatus) => void;
  deleteEpic: (id: string) => void;
  goals: Goal[];
  labels: Label[];
  activeLabelFilter: string | null;
  setActiveLabelFilter: (id: string | null) => void;
  isFocusMode: boolean;
  setIsFocusMode: (focus: boolean) => void;
  isStatsMode?: boolean;
  setIsStatsMode?: (stats: boolean) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  folders: NavFolder[];
  onCreateFolder: (name: string, tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all') => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFolderCollapse: (folderId: string) => void;
  onMoveProjectToFolder: (projectId: string, folderId: string | null) => void;
  onMoveSprintToFolder: (sprintId: string, folderId: string | null) => void;
  onMoveEpicToFolder: (epicId: string, folderId: string | null) => void;
  onMoveLabelToFolder: (labelId: string, folderId: string | null) => void;
  onCreateLabel?: (name: string, color: string, folderId?: string) => void;
  onDeleteLabel?: (id: string) => void;
  storageAvailable: boolean | null;
  storagePersistence: 'checking' | 'available' | 'persistent' | 'unsupported' | 'denied' | 'error';
  requestPersistentStorage: () => Promise<void>;
  exportData: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setIsJsonGuideOpen: (open: boolean) => void;
  setIsAboutModalOpen: (open: boolean) => void;
}

export const MinibarNav: React.FC<MinibarNavProps> = ({
  activeBoard,
  setActiveBoard,
  projects,
  activeProjectId,
  setActiveProjectId,
  openCreateProjectModal,
  openEditProjectModal,
  deleteProject,
  sprints,
  activeSprintId,
  setActiveSprintId,
  openCreateSprintModal,
  openEditSprintModal,
  updateSprintStatus,
  deleteSprint,
  epics,
  activeEpicId,
  setActiveEpicId,
  openCreateEpicModal,
  openEditEpicModal,
  updateEpicStatus,
  deleteEpic,
  goals,
  labels,
  activeLabelFilter,
  setActiveLabelFilter,
  isFocusMode,
  setIsFocusMode,
  isStatsMode = false,
  setIsStatsMode,
  showArchived,
  setShowArchived,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderCollapse,
  onMoveProjectToFolder,
  onMoveSprintToFolder,
  onMoveEpicToFolder,
  onMoveLabelToFolder,
  onCreateLabel,
  onDeleteLabel,
  storageAvailable,
  storagePersistence,
  requestPersistentStorage,
  exportData,
  handleImportFile,
  fileInputRef,
  setIsJsonGuideOpen,
  setIsAboutModalOpen,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanbangxp_minibar_expanded');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<MinibarTab>(() => {
    try {
      const saved = localStorage.getItem('kanbangxp_minibar_tab');
      return (saved as MinibarTab) || 'projects';
    } catch {
      return 'projects';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kanbangxp_minibar_expanded', JSON.stringify(isExpanded));
    } catch {
      // ignore
    }
  }, [isExpanded]);

  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('kanbangxp_minibar_tab', activeTab);
      }
    } catch {
      // ignore
    }
  }, [activeTab]);

  const toggleTab = (tab: MinibarTab) => {
    if (activeTab === tab && isExpanded) {
      setIsExpanded(false);
    } else {
      setActiveTab(tab);
      setIsExpanded(true);
    }
  };

  const todayCount = goals.filter(g => g.plannedForToday && g.lifecycleStatus !== 'completed').length;
  const projectSprints = sprints.filter(s => s.projectId === activeProjectId && (showArchived ? s.status === 'archived' : s.status !== 'archived'));
  const projectEpics = epics.filter(e => e.projectId === activeProjectId && (showArchived ? e.status === 'archived' : e.status !== 'archived'));

  return (
    <aside className="flex h-screen sticky top-0 z-30 select-none bg-sidebar border-r border-border shrink-0">
      {/* Slim 64px Minibar Rail */}
      <div className="w-16 flex flex-col items-center justify-between py-3 px-2 h-full border-r border-border/60 bg-sidebar">
        {/* Top Group */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Logo */}
          <NavTooltip label="Kanban Board" side="right">
            <button
              type="button"
              onClick={() => {
                setActiveSprintId(null);
                setActiveEpicId(null);
                setIsFocusMode(false);
                setIsStatsMode?.(false);
                setShowArchived(false);
              }}
              aria-label="Kanban Board"
              className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-md shadow-accent/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Icon name="view_kanban" size={20} className="text-white" />
            </button>
          </NavTooltip>

          {/* Goal Context Switcher (Work / Life) */}
          <div className="flex flex-col gap-1 p-1 bg-column rounded-xl border border-border/50 w-full items-center">
            <NavTooltip label="Work Goals Board" side="right">
              <button
                type="button"
                role="radio"
                aria-checked={activeBoard === 'Work'}
                aria-label="Work goals"
                onClick={() => setActiveBoard('Work')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                  activeBoard === 'Work'
                    ? "bg-card text-accent shadow-xs font-bold ring-1 ring-border/50"
                    : "text-text-muted hover:text-text hover:bg-card/50"
                )}
              >
                <Icon name="business_center" size={16} />
              </button>
            </NavTooltip>
            <NavTooltip label="Life Goals Board" side="right">
              <button
                type="button"
                role="radio"
                aria-checked={activeBoard === 'Life'}
                aria-label="Life goals"
                onClick={() => setActiveBoard('Life')}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                  activeBoard === 'Life'
                    ? "bg-card text-accent shadow-xs font-bold ring-1 ring-border/50"
                    : "text-text-muted hover:text-text hover:bg-card/50"
                )}
              >
                <Icon name="favorite" size={16} filled={activeBoard === 'Life'} />
              </button>
            </NavTooltip>
          </div>

          <div className="w-8 h-[1px] bg-border/80" />

          {/* Primary Navigation Icons */}
          <div className="flex flex-col gap-2 w-full items-center">
            {/* Views / All Goals */}
            <NavTooltip label="Views & Focus" badge={todayCount > 0 ? todayCount : undefined} side="right">
              <button
                type="button"
                onClick={() => toggleTab('views')}
                aria-label="Views and Focus"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  (isExpanded && activeTab === 'views') || (activeSprintId === null && activeEpicId === null && !isFocusMode && !showArchived && !isStatsMode)
                    ? "bg-column text-accent font-bold"
                    : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="grid_view" size={18} />
                {todayCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {todayCount}
                  </span>
                )}
              </button>
            </NavTooltip>

            {/* Projects */}
            <NavTooltip label="Projects" badge={projects.length > 0 ? projects.length : undefined} side="right">
              <button
                type="button"
                onClick={() => toggleTab('projects')}
                aria-label="Projects"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  isExpanded && activeTab === 'projects'
                    ? "bg-column text-accent font-bold"
                    : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="folder_open" size={18} />
                {projects.length > 0 && (
                  <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            </NavTooltip>

            {/* Sprints */}
            <NavTooltip label="Sprints" badge={projectSprints.length > 0 ? projectSprints.length : undefined} side="right">
              <button
                type="button"
                onClick={() => toggleTab('sprints')}
                aria-label="Sprints"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  isExpanded && activeTab === 'sprints'
                    ? "bg-column text-accent font-bold"
                    : activeSprintId !== null
                      ? "text-accent bg-column/40"
                      : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="bolt" size={18} />
                {activeSprintId !== null && (
                  <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            </NavTooltip>

            {/* Epics */}
            <NavTooltip label="Epics" badge={projectEpics.length > 0 ? projectEpics.length : undefined} side="right">
              <button
                type="button"
                onClick={() => toggleTab('epics')}
                aria-label="Epics"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  isExpanded && activeTab === 'epics'
                    ? "bg-column text-accent font-bold"
                    : activeEpicId !== null
                      ? "text-accent bg-column/40"
                      : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="diamond" size={18} />
                {activeEpicId !== null && (
                  <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            </NavTooltip>

            {/* Labels Filter */}
            <NavTooltip label="Labels & Tags" badge={labels.length > 0 ? labels.length : undefined} side="right">
              <button
                type="button"
                onClick={() => toggleTab('labels')}
                aria-label="Labels and Tags"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  isExpanded && activeTab === 'labels'
                    ? "bg-column text-accent font-bold"
                    : activeLabelFilter !== null
                      ? "text-accent bg-column/40"
                      : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="sell" size={18} />
                {activeLabelFilter !== null && (
                  <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </NavTooltip>

            {/* Statistics & Analytics Dashboard */}
            <NavTooltip label="Statistics & Analytics" side="right">
              <button
                type="button"
                onClick={() => {
                  if (isStatsMode) {
                    setIsStatsMode?.(false);
                  } else {
                    setIsStatsMode?.(true);
                    setIsFocusMode(false);
                    setShowArchived(false);
                  }
                }}
                aria-label="Statistics and Analytics"
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group",
                  isStatsMode
                    ? "bg-column text-accent font-bold"
                    : "text-text-muted hover:bg-column/60 hover:text-text"
                )}
              >
                <Icon name="insights" size={18} />
              </button>
            </NavTooltip>
          </div>
        </div>

        {/* Bottom Utility Icons */}
        <div className="flex flex-col items-center gap-2 w-full pt-4 border-t border-border/60">
          {/* Themes */}
          <NavTooltip label="Themes & Colors" side="right">
            <button
              type="button"
              onClick={() => toggleTab('themes')}
              aria-label="Theme Palette"
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                isExpanded && activeTab === 'themes'
                  ? "bg-column text-accent font-bold"
                  : "text-text-muted hover:bg-column/60 hover:text-text"
              )}
            >
              <Icon name="palette" size={18} />
            </button>
          </NavTooltip>

          {/* Settings & Data */}
          <NavTooltip label="Settings & Storage" side="right">
            <button
              type="button"
              onClick={() => toggleTab('settings')}
              aria-label="Settings and Storage"
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                isExpanded && activeTab === 'settings'
                  ? "bg-column text-accent font-bold"
                  : "text-text-muted hover:bg-column/60 hover:text-text"
              )}
            >
              <Icon name="settings" size={18} />
            </button>
          </NavTooltip>

          {/* About Dialog */}
          <NavTooltip label="About KanbanGXP" side="right">
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              aria-label="About KanbanGXP"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-column/60 hover:text-text transition-all cursor-pointer"
            >
              <Icon name="info" size={18} />
            </button>
          </NavTooltip>

          {/* Expand / Collapse Drawer Pin Button */}
          <NavTooltip label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"} side="right">
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-column/80 text-text-muted hover:bg-column hover:text-accent transition-all cursor-pointer border border-border/40 mt-1"
            >
              <Icon name={isExpanded ? "chevron_left" : "chevron_right"} size={18} />
            </button>
          </NavTooltip>
        </div>
      </div>

      {/* Expandable Secondary Drawer Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full bg-sidebar overflow-hidden flex flex-col border-r border-border shadow-lg"
          >
            <div className="w-[280px] flex flex-col h-full">
              {/* Drawer Header */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-2 bg-sidebar">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-text">
                    {activeTab === 'views' && 'Views & Focus'}
                    {activeTab === 'projects' && 'Projects'}
                    {activeTab === 'sprints' && 'Sprints'}
                    {activeTab === 'epics' && 'Epics'}
                    {activeTab === 'labels' && 'Label Filters'}
                    {activeTab === 'themes' && 'Themes'}
                    {activeTab === 'settings' && 'Settings & Backup'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {activeTab === 'projects' && (
                    <NavTooltip label="Add New Project" side="bottom">
                      <button
                        type="button"
                        onClick={openCreateProjectModal}
                        className="p-1 rounded-lg hover:bg-column text-text-muted hover:text-accent transition-colors cursor-pointer"
                        aria-label="Add project"
                      >
                        <Icon name="add" size={16} />
                      </button>
                    </NavTooltip>
                  )}
                  {activeTab === 'sprints' && (
                    <NavTooltip label="Add New Sprint" side="bottom">
                      <button
                        type="button"
                        onClick={openCreateSprintModal}
                        className="p-1 rounded-lg hover:bg-column text-text-muted hover:text-accent transition-colors cursor-pointer"
                        aria-label="Add sprint"
                      >
                        <Icon name="add" size={16} />
                      </button>
                    </NavTooltip>
                  )}
                  {activeTab === 'epics' && (
                    <NavTooltip label="Add New Epic" side="bottom">
                      <button
                        type="button"
                        onClick={openCreateEpicModal}
                        className="p-1 rounded-lg hover:bg-column text-text-muted hover:text-accent transition-colors cursor-pointer"
                        aria-label="Add epic"
                      >
                        <Icon name="add" size={16} />
                      </button>
                    </NavTooltip>
                  )}
                  <NavTooltip label="Collapse Drawer" side="bottom">
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="p-1 rounded-lg hover:bg-column text-text-muted hover:text-text transition-colors cursor-pointer"
                      aria-label="Collapse Drawer"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </NavTooltip>
                </div>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* 1. Views & Focus */}
                {activeTab === 'views' && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSprintId(null);
                        setActiveEpicId(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                        setShowArchived(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer",
                        activeSprintId === null && activeEpicId === null && !isFocusMode && !showArchived && !isStatsMode
                          ? "bg-column text-accent font-bold shadow-xs"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <Icon name="grid_view" size={18} />
                      <span className="flex-1">All Goals Board</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isFocusMode) {
                          setIsFocusMode(false);
                        } else {
                          setIsFocusMode(true);
                          setIsStatsMode?.(false);
                          setShowArchived(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer",
                        isFocusMode && !isStatsMode
                          ? "bg-amber-50 text-amber-700 font-bold shadow-xs ring-1 ring-amber-200"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="wb_sunny" size={18} filled={isFocusMode && !isStatsMode} className={isFocusMode && !isStatsMode ? "text-amber-500" : ""} />
                        <span>Daily Focus Mode</span>
                      </div>
                      {todayCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                          {todayCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isStatsMode) {
                          setIsStatsMode?.(false);
                        } else {
                          setIsStatsMode?.(true);
                          setIsFocusMode(false);
                          setShowArchived(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer",
                        isStatsMode
                          ? "bg-indigo-50 text-indigo-700 font-bold shadow-xs ring-1 ring-indigo-200"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="insights" size={18} className={isStatsMode ? "text-indigo-500" : ""} />
                        <span>Statistics & Insights</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (showArchived) {
                          setShowArchived(false);
                        } else {
                          setShowArchived(true);
                          setIsStatsMode?.(false);
                          setIsFocusMode(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer",
                        showArchived && !isStatsMode && !isFocusMode
                          ? "bg-amber-50 text-amber-700 font-bold shadow-xs ring-1 ring-amber-200"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="archive" size={18} className={showArchived && !isStatsMode && !isFocusMode ? "text-amber-500" : ""} />
                        <span>Archived Goals & Sprints</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* 2. Projects List */}
                {activeTab === 'projects' && (
                  <NavFolderView<Project>
                    tab="projects"
                    itemTypeName="Project"
                    items={projects}
                    folders={folders}
                    activeItemId={activeProjectId}
                    onSelectItem={(id) => {
                      setActiveProjectId(id);
                      setActiveSprintId(null);
                      setActiveEpicId(null);
                      setIsFocusMode(false);
                      setIsStatsMode?.(false);
                      setShowArchived(false);
                    }}
                    onEditItem={openEditProjectModal}
                    onDeleteItem={projects.length > 1 ? deleteProject : undefined}
                    onCreateItem={() => openCreateProjectModal()}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    onToggleCollapse={onToggleFolderCollapse}
                    onMoveItemToFolder={onMoveProjectToFolder}
                    renderItemContent={(project, isActive) => (
                      <div className="flex items-center gap-2 py-1 px-1.5 min-w-0">
                        <Icon name="folder" size={16} className={isActive ? "text-accent shrink-0" : "text-slate-400 shrink-0"} />
                        <span className="truncate text-xs font-semibold text-text">{project.name}</span>
                      </div>
                    )}
                  />
                )}

                {/* 3. Sprints List */}
                {activeTab === 'sprints' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSprintId(null);
                        setActiveEpicId(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                        setShowArchived(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer",
                        activeSprintId === null && !isFocusMode && !isStatsMode
                          ? "bg-column text-accent font-bold shadow-xs"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <Icon name="bolt" size={16} />
                      <span>All Sprints (Unfiltered)</span>
                    </button>

                    <NavFolderView<Sprint>
                      tab="sprints"
                      itemTypeName="Sprint"
                      items={projectSprints}
                      folders={folders}
                      activeItemId={activeSprintId}
                      onSelectItem={(id) => {
                        setActiveSprintId(id);
                        setActiveEpicId(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                        setShowArchived(false);
                      }}
                      onEditItem={openEditSprintModal}
                      onDeleteItem={deleteSprint}
                      onCreateItem={() => openCreateSprintModal()}
                      onCreateFolder={onCreateFolder}
                      onRenameFolder={onRenameFolder}
                      onDeleteFolder={onDeleteFolder}
                      onToggleCollapse={onToggleFolderCollapse}
                      onMoveItemToFolder={onMoveSprintToFolder}
                      renderItemContent={(sprint, isActive) => (
                        <div className="flex items-center gap-2 py-1 px-1.5 min-w-0">
                          <Icon name="bolt" size={15} className={isActive ? "text-accent shrink-0" : "text-slate-400 shrink-0"} />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-text">{sprint.name}</span>
                            <span className="block text-[9px] font-normal text-text-muted opacity-70">
                              {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}

                {/* 4. Epics List */}
                {activeTab === 'epics' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEpicId(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                        setShowArchived(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer",
                        activeEpicId === null && !isFocusMode && !isStatsMode
                          ? "bg-column text-accent font-bold shadow-xs"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <Icon name="diamond" size={16} />
                      <span>All Epics (Unfiltered)</span>
                    </button>

                    <NavFolderView<Epic>
                      tab="epics"
                      itemTypeName="Epic"
                      items={projectEpics}
                      folders={folders}
                      activeItemId={activeEpicId}
                      onSelectItem={(id) => {
                        setActiveEpicId(id);
                        setActiveSprintId(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                        setShowArchived(false);
                      }}
                      onEditItem={openEditEpicModal}
                      onDeleteItem={deleteEpic}
                      onCreateItem={() => openCreateEpicModal()}
                      onCreateFolder={onCreateFolder}
                      onRenameFolder={onRenameFolder}
                      onDeleteFolder={onDeleteFolder}
                      onToggleCollapse={onToggleFolderCollapse}
                      onMoveItemToFolder={onMoveEpicToFolder}
                      renderItemContent={(epic, isActive) => {
                        const epicGoals = goals.filter(goal => goal.epicId === epic.id);
                        const completed = epicGoals.filter(goal => goal.lifecycleStatus === 'completed').length;
                        const progress = epicGoals.length ? Math.round((completed / epicGoals.length) * 100) : 0;

                        return (
                          <div className="flex items-center gap-2 py-1 px-1.5 min-w-0">
                            <Icon name="diamond" size={15} className={isActive ? "text-accent shrink-0" : "text-slate-400 shrink-0"} />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-text">{epic.name}</span>
                              <span className="block text-[9px] font-normal text-text-muted opacity-70">
                                {progress}% · {epic.status}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                )}

                {/* 5. Labels Filter */}
                {activeTab === 'labels' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLabelFilter(null);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer",
                        activeLabelFilter === null && !isFocusMode && !isStatsMode
                          ? "bg-column text-accent font-bold shadow-xs"
                          : "text-text-muted hover:bg-column/60 hover:text-text"
                      )}
                    >
                      <Icon name="sell" size={16} />
                      <span>All Labels (Unfiltered)</span>
                    </button>

                    <NavFolderView<Label>
                      tab="labels"
                      itemTypeName="Label"
                      items={labels}
                      folders={folders}
                      activeItemId={activeLabelFilter}
                      onSelectItem={(id) => {
                        setActiveLabelFilter(activeLabelFilter === id ? null : id);
                        setIsFocusMode(false);
                        setIsStatsMode?.(false);
                      }}
                      onDeleteItem={onDeleteLabel}
                      onCreateItem={(folderId) => {
                        const name = window.prompt('Enter new label name:');
                        if (name?.trim()) {
                          onCreateLabel?.(name.trim(), 'bg-indigo-500', folderId);
                        }
                      }}
                      onCreateFolder={onCreateFolder}
                      onRenameFolder={onRenameFolder}
                      onDeleteFolder={onDeleteFolder}
                      onToggleCollapse={onToggleFolderCollapse}
                      onMoveItemToFolder={onMoveLabelToFolder}
                      renderItemContent={(label, isActive) => (
                        <div className="flex items-center gap-2.5 py-1 px-1.5 min-w-0">
                          <span className={cn("h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10", label.color)} aria-hidden="true" />
                          <span className="truncate text-xs font-semibold text-text">{label.name}</span>
                        </div>
                      )}
                    />
                  </div>
                )}

                {/* 6. Themes Palette */}
                {activeTab === 'themes' && (
                  <div className="space-y-3">
                    <p className="text-xs text-text-muted leading-relaxed">
                      Choose an interface theme. All colors, buttons, and badges will adapt instantly.
                    </p>
                    <ThemePicker />
                  </div>
                )}

                {/* 7. Settings & Storage */}
                {activeTab === 'settings' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                      <div className="flex items-start gap-2">
                        <Icon
                          name="shield"
                          size={16}
                          filled
                          className={cn(
                            "mt-0.5 shrink-0",
                            storageAvailable === false ? "text-rose-500" : storagePersistence === 'persistent' ? "text-emerald-500" : "text-amber-500"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-text">
                            {storageAvailable === false
                              ? 'Storage blocked'
                              : storagePersistence === 'persistent'
                                ? 'Local data protected'
                                : 'Browser-local data'}
                          </p>
                          <p className="mt-1 break-words text-[9px] leading-relaxed text-text-muted">
                            {storageAvailable === false
                              ? 'This browser is blocking local storage. Allow site data in browser settings.'
                              : storagePersistence === 'persistent'
                                ? 'Browser will retain this data unless explicitly cleared.'
                                : 'Data stays in browser profile.'}
                          </p>
                          {storageAvailable && (storagePersistence === 'available' || storagePersistence === 'denied') && (
                            <button
                              type="button"
                              onClick={requestPersistentStorage}
                              className="mt-2 w-full rounded-lg bg-accent px-2 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
                            >
                              Protect local data
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={exportData}
                      className="w-full flex items-center gap-2.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors cursor-pointer"
                    >
                      <Icon name="download" size={16} />
                      <span>Export JSON Backup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors cursor-pointer"
                    >
                      <Icon name="upload" size={16} />
                      <span>Import JSON Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsJsonGuideOpen(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors cursor-pointer"
                    >
                      <Icon name="data_object" size={16} />
                      <span>JSON Schema Guide</span>
                    </button>

                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default MinibarNav;
