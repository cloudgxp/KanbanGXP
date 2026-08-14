import React, { useState, useEffect, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  Heart, 
  MoreVertical,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Folder,
  Settings,
  ChevronRight,
  LayoutGrid,
  Edit2,
  Target,
  ListTodo,
  BarChart3,
  AlertCircle,
  ChevronDown,
  X,
  GripVertical,
  Check,
  Minus,
  Zap,
  Archive,
  RotateCcw,
  Flag,
  Download,
  Upload,
  Tag,
  FileJson,
  Info,
  Search,
  ShieldCheck,
  Layers,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { getLocalStorageItemWithMigration, isLocalStorageAvailable, PREVIOUS_STORAGE_KEYS, setLocalStorageItem, STORAGE_KEYS } from './lib/storage';
import { Goal, GoalStatus, BoardType, DEFAULT_WORKFLOW_COLUMNS, WorkflowColumn, Project, Priority, SuccessMetricType, SuccessMetric, Sprint, SprintLength, GoalLifecycleStatus, SprintStatus, Label, Epic, EpicStatus, NavFolder } from './types';
import { JsonGuide } from './components/JsonGuide';
import { AboutModal } from './components/AboutModal';
import { ThemePicker } from './components/ThemePicker';
import { Icon } from './components/Icon';
import { MinibarNav } from './components/MinibarNav';
import { GoalDetailModal } from './components/GoalDetailModal';
import { MarkdownEditor } from './components/MarkdownEditor';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { SparkleWrapper } from './components/SparkleWrapper';
import { StatsDashboard } from './components/StatsDashboard';
import { 
  generateStableGoalNumber, 
  createActivityEvent, 
  calculateGoalProgress, 
  resolveGoalByQuery,
  generateId 
} from './lib/timeline';
import {
  createNavFolder,
  deleteNavFolder,
  moveItemToNavFolder,
  toggleNavFolderCollapse,
  renameNavFolder,
} from './lib/folders';

// --- Components ---

interface GoalCardProps {
  goal: Goal;
  allGoals: Goal[];
  labels: Label[];
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}

interface SortableGoalCardProps {
  goal: Goal;
  allGoals: Goal[];
  labels: Label[];
  sprints: Sprint[];
  epics: Epic[];
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
  onAssignSprint: (goalId: string, sprintId: string | null) => void;
  onAssignEpic: (goalId: string, epicId: string | null) => void;
}

const SortableGoalCard = ({ goal, allGoals, labels, sprints, epics, onDelete, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday, onAssignSprint, onAssignEpic }: SortableGoalCardProps) => {
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const [isEpicMenuOpen, setIsEpicMenuOpen] = useState(false);
  const sprintMenuRef = useRef<HTMLDivElement>(null);
  const sprintButtonRef = useRef<HTMLButtonElement>(null);
  const epicMenuRef = useRef<HTMLDivElement>(null);
  const epicButtonRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: goal.id,
    data: {
      type: 'Goal',
      goal,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const availableSprints = sprints.filter(sprint =>
    sprint.projectId === goal.projectId && (sprint.status === 'active' || sprint.status === 'planned')
  );
  const currentSprint = goal.sprintId ? sprints.find(sprint => sprint.id === goal.sprintId) : undefined;
  const sprintActionLabel = currentSprint ? 'Change sprint' : 'Add to sprint';
  const availableEpics = epics.filter(epic => epic.projectId === goal.projectId && epic.status !== 'archived');
  const currentEpic = goal.epicId ? epics.find(epic => epic.id === goal.epicId) : undefined;
  const epicActionLabel = currentEpic ? 'Change epic' : 'Add to epic';
  const currentEpicGoals = currentEpic ? allGoals.filter(item => item.epicId === currentEpic.id) : [];
  const currentEpicCompleted = currentEpicGoals.filter(item => item.lifecycleStatus === 'completed').length;
  const currentEpicProgress = currentEpicGoals.length ? Math.round((currentEpicCompleted / currentEpicGoals.length) * 100) : 0;

  useEffect(() => {
    if (!isSprintMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!sprintMenuRef.current?.contains(event.target as Node)) setIsSprintMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSprintMenuOpen(false);
        sprintButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSprintMenuOpen]);

  useEffect(() => {
    if (!isEpicMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!epicMenuRef.current?.contains(event.target as Node)) setIsEpicMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEpicMenuOpen(false);
        epicButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEpicMenuOpen]);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="goal-card opacity-30 border-dashed border-2 border-indigo-300 h-[100px]"
      />
    );
  }

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-200 badge-priority-high';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200 badge-priority-medium';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200 badge-priority-low';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="goal-card group relative cursor-default"
      onClick={() => onEdit(goal)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1.5 pr-6">
          <div className="flex flex-wrap gap-1">
            <div className={cn(
              "badge badge-xs font-bold uppercase tracking-wider border gap-0.5",
              getPriorityColor(goal.priority)
            )}>
              {goal.priority === 'high' && <Icon name="priority_high" size={10} weight={700} />}
              {goal.priority === 'medium' && <Icon name="remove" size={10} weight={700} />}
              {goal.priority === 'low' && <Icon name="keyboard_arrow_down" size={10} weight={700} />}
              {goal.priority}
            </div>
            {goal.plannedForToday && (
              <div className="badge badge-xs font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200 badge-today gap-1">
                <Icon name="wb_sunny" size={10} filled className="text-amber-500" />
                Today
              </div>
            )}
            {currentEpic && (
              <div className="badge badge-xs gap-1 border border-violet-200 bg-violet-50 font-bold text-violet-700 badge-epic-tag">
                <Icon name="diamond" size={10} aria-hidden="true" />
                <span className="max-w-28 truncate">{currentEpic.name}</span>
                <span aria-hidden="true">· {currentEpicProgress}%</span>
                <span className="sr-only">Epic</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {goal.number && (
              <span className="text-xs font-bold text-text-muted shrink-0">
                #{goal.number}
              </span>
            )}
            {goal.lifecycleStatus === 'completed' && (
              <Icon name="check_circle" size={16} filled className="text-emerald-500 shrink-0" />
            )}
            <h4 className={cn(
              "font-semibold text-text-primary leading-tight",
              goal.lifecycleStatus === 'completed' && "text-text-disabled line-through"
            )}>
              {goal.title}
            </h4>
          </div>
          {goal.labelIds && goal.labelIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {goal.labelIds.map(id => {
                const label = labels.find(l => l.id === id);
                if (!label) return null;
                return (
                  <span key={label.id} className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider", label.color)}>
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className={cn(
          "absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          (isSprintMenuOpen || isEpicMenuOpen) && "z-30 opacity-100"
        )}>
          <div 
            {...attributes} 
            {...listeners}
            className="p-1 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </div>
          <div ref={epicMenuRef} className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              ref={epicButtonRef}
              type="button"
              disabled={!goal.projectId}
              onClick={() => setIsEpicMenuOpen(open => !open)}
              className={cn(
                "rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer",
                currentEpic ? "text-violet-500 hover:text-violet-400" : "text-text-muted hover:text-violet-400"
              )}
              aria-label={epicActionLabel}
              aria-haspopup="menu"
              aria-expanded={isEpicMenuOpen}
              title={epicActionLabel}
            >
              <Icon name="diamond" size={14} aria-hidden="true" />
            </button>
            {isEpicMenuOpen && (
              <div role="menu" aria-label="Epic assignment" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-card p-2 text-left shadow-xl">
                <div className="px-2 py-2">
                  <p className="text-xs font-bold text-text-primary">{epicActionLabel}</p>
                  <p className="mt-0.5 truncate text-[10px] text-text-muted">{currentEpic ? `Current: ${currentEpic.name}` : 'Group this goal in an epic'}</p>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {availableEpics.length ? availableEpics.map(epic => {
                    const selected = epic.id === goal.epicId;
                    return (
                      <button key={epic.id} type="button" role="menuitemradio" aria-checked={selected}
                        onClick={() => { onAssignEpic(goal.id, epic.id); setIsEpicMenuOpen(false); }}
                        className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-column focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer", selected && "bg-violet-500/15 text-violet-400")}
                      >
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-violet-500 bg-violet-500 text-white" : "border-border text-transparent")}><Check size={11} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text-primary">{epic.name}</span><span className="block text-[9px] font-medium capitalize text-text-muted">{epic.status}</span></span>
                      </button>
                    );
                  }) : <p className="px-2.5 py-3 text-xs text-text-muted">No available epics for this project.</p>}
                </div>
                {currentEpic && <button type="button" role="menuitem" onClick={() => { onAssignEpic(goal.id, null); setIsEpicMenuOpen(false); }} className="mt-1 w-full border-t border-border px-2.5 py-2.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer">Remove from epic</button>}
              </div>
            )}
          </div>
          <div ref={sprintMenuRef} className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              ref={sprintButtonRef}
              type="button"
              disabled={!goal.projectId}
              onClick={() => setIsSprintMenuOpen(open => !open)}
              className={cn(
                "rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer",
                currentSprint ? "text-indigo-500 hover:text-indigo-400" : "text-text-muted hover:text-indigo-400",
                "disabled:cursor-not-allowed disabled:opacity-30"
              )}
              aria-label={sprintActionLabel}
              aria-haspopup="menu"
              aria-expanded={isSprintMenuOpen}
              title={sprintActionLabel}
            >
              <Icon name="bolt" size={14} className={currentSprint ? "text-indigo-500" : ""} aria-hidden="true" />
            </button>

            {isSprintMenuOpen && (
              <div
                role="menu"
                aria-label="Sprint assignment"
                className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-card p-2 text-left shadow-xl"
              >
                <div className="px-2 py-2">
                  <p className="text-xs font-bold text-text-primary">{sprintActionLabel}</p>
                  <p className="mt-0.5 truncate text-[10px] text-text-muted">
                    {currentSprint ? `Current: ${currentSprint.name}` : 'Choose an active or upcoming sprint'}
                  </p>
                </div>

                <div className="max-h-52 overflow-y-auto">
                  {availableSprints.length > 0 ? availableSprints.map(sprint => {
                    const selected = sprint.id === goal.sprintId;
                    return (
                      <button
                        key={sprint.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => {
                          onAssignSprint(goal.id, sprint.id);
                          setIsSprintMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-column focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer",
                          selected && "bg-indigo-500/15 text-indigo-400"
                        )}
                      >
                        <span className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-border text-transparent"
                        )}>
                          <Check size={11} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-text-primary">{sprint.name}</span>
                          <span className="block text-[9px] font-medium capitalize text-text-muted">{sprint.status}</span>
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="px-2.5 py-3 text-xs text-text-muted">No active or upcoming sprints.</p>
                  )}
                </div>

                {currentSprint && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAssignSprint(goal.id, null);
                      setIsSprintMenuOpen(false);
                    }}
                    className="mt-1 w-full border-t border-border px-2.5 py-2.5 text-left text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
                  >
                    Remove from sprint
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal.id);
            }}
            className="p-1 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
            title="Delete"
            aria-label="Delete goal"
          >
            <Icon name="delete" size={14} />
          </button>
          {goal.lifecycleStatus !== 'completed' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'completed');
              }}
              className="p-1 text-text-muted hover:text-emerald-500 transition-colors cursor-pointer"
              title="Mark Complete"
              aria-label="Mark goal complete"
            >
              <Icon name="check_circle" size={14} />
            </button>
          )}
          {goal.lifecycleStatus === 'archived' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'active');
              }}
              className="p-1 text-text-muted hover:text-indigo-500 transition-colors cursor-pointer"
              title="Restore"
              aria-label="Restore goal"
            >
              <Icon name="history" size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'archived');
              }}
              className="p-1 text-text-muted hover:text-amber-500 transition-colors cursor-pointer"
              title="Archive"
              aria-label="Archive goal"
            >
              <Icon name="archive" size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlannedForToday(goal.id);
            }}
            className={cn(
              "p-1 transition-colors cursor-pointer rounded",
              goal.plannedForToday ? "text-amber-500 hover:text-amber-600" : "text-text-muted hover:text-amber-500"
            )}
            title={goal.plannedForToday ? "Remove from Today" : "Plan for Today"}
            aria-label={goal.plannedForToday ? "Remove from Today" : "Plan for Today"}
          >
            <Icon 
              name="wb_sunny" 
              size={15} 
              filled={goal.plannedForToday} 
              className={goal.plannedForToday ? "text-amber-500" : ""} 
              aria-hidden="true" 
            />
          </button>
        </div>
      </div>
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">{goal.description}</p>
      
      {goal.successMetric && (
        <div className="mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
            <div className="flex items-center gap-1">
              {goal.successMetric.type === 'checklist' && <ListTodo size={10} />}
              {goal.successMetric.type === 'milestones' && <Flag size={10} />}
              {goal.successMetric.type === 'numeric' && <Target size={10} />}
              <span>Progress</span>
            </div>
            <span className="text-text-secondary font-semibold">
              {goal.successMetric.type === 'numeric' 
                ? `${goal.successMetric.current || 0}/${goal.successMetric.target} ${goal.successMetric.unit || ''}`
                : (goal.successMetric.type === 'checklist' || goal.successMetric.type === 'milestones')
                  ? `${goal.successMetric.items?.filter(i => i.completed).length || 0}/${goal.successMetric.items?.length || 0}`
                  : '0%'
              }
            </span>
          </div>
          
          {goal.successMetric.type === 'checklist' && (
            <div className="space-y-1">
              {goal.successMetric.items?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onToggleChecklist(goal.id, item.id)}
                  className="w-full flex items-center gap-2 text-[10px] text-text-secondary hover:text-text-primary transition-colors text-left group/item cursor-pointer"
                >
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center transition-colors",
                    item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border group-hover/item:border-text-muted"
                  )}>
                    {item.completed && <Check size={8} strokeWidth={4} />}
                  </div>
                  <span className={cn(item.completed ? "line-through text-text-disabled" : "text-text-secondary")}>{item.text}</span>
                </button>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'milestones' && (
            <div className="space-y-3 pl-1">
              {goal.successMetric.items?.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => onToggleChecklist(goal.id, item.id)}
                  className="w-full flex items-start gap-3 text-[10px] text-text-secondary hover:text-text-primary transition-colors text-left group/milestone relative cursor-pointer"
                >
                  {/* Vertical line between milestones */}
                  {idx < (goal.successMetric.items?.length || 0) - 1 && (
                    <div className={cn(
                      "absolute left-[5px] top-[14px] w-[1px] h-[calc(100%+4px)]",
                      item.completed ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-[11px] h-[11px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10 transition-all",
                    item.completed 
                      ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                      : "bg-card border-border group-hover/milestone:border-text-muted"
                  )} />
                  <span className={cn(
                    "font-medium leading-tight pt-0.5",
                    item.completed ? "text-emerald-500 font-semibold" : "text-text-secondary"
                  )}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'numeric' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-column rounded-full overflow-hidden border border-border/30">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, ((goal.successMetric.current || 0) / (goal.successMetric.target || 1)) * 100)}%` 
                  }}
                />
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => onUpdateNumeric(goal.id, -1)}
                  className="w-5 h-5 flex items-center justify-center rounded bg-column text-text-secondary hover:text-text-primary hover:bg-card border border-border/40 transition-colors cursor-pointer"
                >
                  <Minus size={10} />
                </button>
                <button 
                  onClick={() => onUpdateNumeric(goal.id, 1)}
                  className="w-5 h-5 flex items-center justify-center rounded bg-column text-text-secondary hover:text-text-primary hover:bg-card border border-border/40 transition-colors cursor-pointer"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-text-muted">
          <Calendar size={10} />
          <span>{new Date(goal.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {goal.comments && goal.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted" title={`${goal.comments.length} comments`}>
              <MessageSquare size={11} />
              <span>{goal.comments.length}</span>
            </div>
          )}
          {goal.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
              goal.dueDate < Date.now() ? "text-rose-500" : "text-text-muted"
            )}>
              <Clock size={10} />
              <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StaticGoalCard = ({ goal, allGoals = [], labels, epics = [], onEdit }: { goal: Goal, allGoals?: Goal[], labels: Label[], epics?: Epic[], onEdit?: (goal: Goal) => void }) => {
  const currentEpic = goal.epicId ? epics.find(epic => epic.id === goal.epicId) : undefined;
  const currentEpicGoals = currentEpic ? allGoals.filter(item => item.epicId === currentEpic.id) : [];
  const currentEpicProgress = currentEpicGoals.length ? Math.round((currentEpicGoals.filter(item => item.lifecycleStatus === 'completed').length / currentEpicGoals.length) * 100) : 0;
  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-200 badge-priority-high';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200 badge-priority-medium';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200 badge-priority-low';
    }
  };

  return (
    <div 
      onClick={() => onEdit && onEdit(goal)}
      className={cn(
        "goal-card rounded-2xl p-4 shadow-sm border border-border w-full max-w-sm transition-all",
        onEdit && "cursor-pointer hover:border-slate-400 hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1.5 pr-6">
          <div className="flex flex-wrap gap-1">
            <div className={cn(
              "badge badge-xs font-bold uppercase tracking-wider border gap-0.5",
              getPriorityColor(goal.priority)
            )}>
              {goal.priority === 'high' && <Icon name="priority_high" size={10} weight={700} />}
              {goal.priority === 'medium' && <Icon name="remove" size={10} weight={700} />}
              {goal.priority === 'low' && <Icon name="keyboard_arrow_down" size={10} weight={700} />}
              {goal.priority}
            </div>
            {goal.plannedForToday && (
              <div className="badge badge-xs font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200 badge-today gap-1">
                <Icon name="wb_sunny" size={10} filled className="text-amber-500" />
                Today
              </div>
            )}
            {currentEpic && (
              <div className="badge badge-xs gap-1 border border-violet-200 bg-violet-50 font-bold text-violet-700 badge-epic-tag">
                <Icon name="diamond" size={10} aria-hidden="true" />
                <span className="max-w-28 truncate">{currentEpic.name}</span>
                <span aria-hidden="true">· {currentEpicProgress}%</span>
                <span className="sr-only">Epic</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {goal.number && (
              <span className="text-xs font-bold text-text-muted shrink-0">
                #{goal.number}
              </span>
            )}
            {goal.lifecycleStatus === 'completed' && (
              <Icon name="check_circle" size={16} filled className="text-emerald-500 shrink-0" />
            )}
            <h4 className={cn(
              "font-semibold text-text-primary leading-tight",
              goal.lifecycleStatus === 'completed' && "text-text-disabled line-through"
            )}>
              {goal.title}
            </h4>
          </div>
          {goal.labelIds && goal.labelIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {goal.labelIds.map(id => {
                const label = labels.find(l => l.id === id);
                if (!label) return null;
                return (
                  <span key={label.id} className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider", label.color)}>
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">{goal.description}</p>
      
      {goal.successMetric && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
            <div className="flex items-center gap-1">
              {goal.successMetric.type === 'checklist' && <ListTodo size={10} />}
              {goal.successMetric.type === 'milestones' && <Flag size={10} />}
              {goal.successMetric.type === 'numeric' && <Target size={10} />}
              <span>Progress</span>
            </div>
            <span className="text-text-secondary font-semibold">
              {goal.successMetric.type === 'numeric' 
                ? `${goal.successMetric.current || 0}/${goal.successMetric.target} ${goal.successMetric.unit || ''}`
                : (goal.successMetric.type === 'checklist' || goal.successMetric.type === 'milestones')
                  ? `${goal.successMetric.items?.filter(i => i.completed).length || 0}/${goal.successMetric.items?.length || 0}`
                  : '0%'
              }
            </span>
          </div>
          
          {goal.successMetric.type === 'checklist' && (
            <div className="space-y-1">
              {goal.successMetric.items?.map((item) => (
                <div
                  key={item.id}
                  className="w-full flex items-center gap-2 text-[10px] text-text-secondary text-left"
                >
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center",
                    item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border"
                  )}>
                    {item.completed && <Check size={8} strokeWidth={4} />}
                  </div>
                  <span className={cn(item.completed ? "line-through text-text-disabled" : "text-text-secondary")}>{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'milestones' && (
            <div className="space-y-3 pl-1">
              {goal.successMetric.items?.map((item, idx) => (
                <div
                  key={item.id}
                  className="w-full flex items-start gap-3 text-[10px] text-text-secondary text-left relative"
                >
                  {/* Vertical line between milestones */}
                  {idx < (goal.successMetric.items?.length || 0) - 1 && (
                    <div className={cn(
                      "absolute left-[5px] top-[14px] w-[1px] h-[calc(100%+4px)]",
                      item.completed ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-[11px] h-[11px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10",
                    item.completed ? "bg-emerald-500 border-emerald-500" : "bg-card border-border"
                  )} />
                  <span className={cn(
                    "font-medium leading-tight pt-0.5",
                    item.completed ? "text-emerald-500 font-semibold" : "text-text-secondary"
                  )}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'numeric' && (
            <div className="h-1.5 bg-column rounded-full overflow-hidden border border-border/30">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((goal.successMetric.current || 0) / (goal.successMetric.target || 1)) * 100)}%` 
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-text-muted">
          <Calendar size={10} />
          <span>{new Date(goal.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {goal.comments && goal.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted" title={`${goal.comments.length} comments`}>
              <MessageSquare size={11} />
              <span>{goal.comments.length}</span>
            </div>
          )}
          {goal.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
              goal.dueDate < Date.now() ? "text-rose-500" : "text-text-muted"
            )}>
              <Clock size={10} />
              <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  id: GoalStatus;
  title: string;
  goals: Goal[];
  allGoals: Goal[];
  labels: Label[];
  sprints: Sprint[];
  epics: Epic[];
  onDelete: (id: string) => void;
  onAdd: (status: GoalStatus) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
  onAssignSprint: (goalId: string, sprintId: string | null) => void;
  onAssignEpic: (goalId: string, epicId: string | null) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, goals, allGoals, labels, sprints, epics, onDelete, onAdd, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday, onAssignSprint, onAssignEpic }) => {
  const { setNodeRef } = useSortable({
    id: id,
    data: {
      type: 'Column',
      status: id,
    },
  });

  return (
    <section ref={setNodeRef} className="kanban-column group/column" aria-labelledby={`column-${id}-title`}>
      <div className="kanban-column__header">
        <div className="flex min-w-0 items-center gap-2">
          <Circle size={16} className="shrink-0 text-accent" aria-hidden="true" />
          <h3 id={`column-${id}-title`} className="truncate text-sm font-bold uppercase tracking-tight text-text">
            {title}
          </h3>
          <span
            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card px-2 py-0.5 text-xs font-bold text-text-muted"
            aria-label={`${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}`}
          >
            {goals.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(id)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-muted opacity-80 transition-all hover:border-border hover:bg-card hover:text-accent hover:opacity-100 focus-visible:border-border focus-visible:bg-card focus-visible:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
          aria-label={`Add goal to ${title}`}
          title={`Add goal to ${title}`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="kanban-column__body">
        <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
          {goals.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {goals.map((goal) => (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <SortableGoalCard 
                    goal={goal} 
                    allGoals={allGoals}
                    labels={labels}
                    sprints={sprints}
                    epics={epics}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onToggleChecklist={onToggleChecklist}
                    onUpdateNumeric={onUpdateNumeric}
                    onUpdateLifecycle={onUpdateLifecycle}
                    onTogglePlannedForToday={onTogglePlannedForToday}
                    onAssignSprint={onAssignSprint}
                    onAssignEpic={onAssignEpic}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div 
              className="flex-1 min-h-[160px] rounded-2xl border-2 border-dashed border-border/40 bg-column/20 transition-colors flex items-center justify-center pointer-events-none select-none"
              aria-label={`Empty ${title} drop zone`}
            />
          )}
        </SortableContext>
      </div>
    </section>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  ariaLabel?: string;
  title?: string;
  active?: boolean;
  activeTone?: 'indigo' | 'amber';
  className?: string;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, description, ariaLabel, title, active = false, activeTone = 'indigo', className, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={ariaLabel ?? label}
    title={title}
    style={active && activeTone !== 'amber' ? { backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' } : undefined}
    className={cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all cursor-pointer",
      active
        ? activeTone === 'amber'
          ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200"
          : "font-bold shadow-xs"
        : "text-text-muted hover:bg-column/60 hover:text-text",
      className
    )}
  >
    {icon}
    <span className="min-w-0 flex-1">
      <span className="block truncate">{label}</span>
      {description && <span className="block truncate text-[9px] font-normal text-text-muted opacity-80">{description}</span>}
    </span>
  </button>
);

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stages: string[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'A lightweight flow for straightforward work.',
    stages: ['To Do', 'In Progress', 'Done'],
  },
  {
    id: 'agile',
    name: 'Agile',
    description: 'A delivery workflow with preparation and review.',
    stages: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Move ideas from planning through publication.',
    stages: ['Ideas', 'Planned', 'Creating', 'Review', 'Published'],
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'A focused flow for personal priorities.',
    stages: ['Someday', 'Next', 'Doing', 'Done'],
  },
];

const workflowMatchesStages = (columns: WorkflowColumn[], stages: string[]) =>
  columns.length === stages.length && columns.every((column, index) => column.title.trim().toLocaleLowerCase() === stages[index].toLocaleLowerCase());

const buildWorkflowFromTemplate = (baseColumns: WorkflowColumn[], template: WorkflowTemplate): WorkflowColumn[] => {
  const usedIds = new Set<string>();
  return template.stages.map((stage, index) => {
    const matchingColumn = baseColumns.find(column =>
      !usedIds.has(column.id) && column.title.trim().toLocaleLowerCase() === stage.toLocaleLowerCase()
    );
    if (matchingColumn) {
      usedIds.add(matchingColumn.id);
      return { ...matchingColumn, title: stage };
    }

    const baseId = `template-${template.id}-${stage.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id) || baseColumns.some(column => column.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return { id, title: stage };
  });
};

const getWorkflowValidationError = (columns: WorkflowColumn[]) => {
  const titles = columns.map(column => column.title.trim());
  if (titles.length === 0 || titles.some(title => !title)) return 'Every workflow needs at least one named stage.';
  if (new Set(titles.map(title => title.toLocaleLowerCase())).size !== titles.length) return 'Stage names must be unique.';
  return null;
};

interface SortableWorkflowStageProps {
  column: WorkflowColumn;
  canDelete: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const SortableWorkflowStage: React.FC<SortableWorkflowStageProps> = ({ column, canDelete, onRename, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2",
        isDragging && "z-10 border-indigo-300 bg-indigo-50 shadow-lg"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing"
        aria-label={`Reorder ${column.title || 'unnamed'} stage`}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <input
        type="text"
        value={column.title}
        onChange={(event) => onRename(column.id, event.target.value)}
        aria-label={`Rename ${column.title || 'workflow'} stage`}
        className="min-w-0 flex-1 rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
      />
      <button
        type="button"
        onClick={() => onDelete(column.id)}
        disabled={!canDelete}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-25"
        aria-label={`Delete ${column.title || 'unnamed'} stage`}
        title={canDelete ? 'Delete stage' : 'A workflow needs at least one stage'}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  );
};

interface WorkflowConfiguratorProps {
  columns: WorkflowColumn[];
  baseColumns: WorkflowColumn[];
  error: string | null;
  onChange: (columns: WorkflowColumn[]) => void;
  onError: (error: string | null) => void;
}

const WorkflowConfigurator: React.FC<WorkflowConfiguratorProps> = ({ columns, baseColumns, error, onChange, onError }) => {
  const matchingTemplate = WORKFLOW_TEMPLATES.find(template => workflowMatchesStages(columns, template.stages));
  const [tab, setTab] = useState<'templates' | 'custom'>(matchingTemplate ? 'templates' : 'custom');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(matchingTemplate?.id ?? null);
  const [newStageName, setNewStageName] = useState('');
  const workflowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplateId(template.id);
    onChange(buildWorkflowFromTemplate(baseColumns, template));
    onError(null);
  };

  const addStage = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newStageName.trim();
    if (!title) return;
    if (columns.some(column => column.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase())) {
      onError('Stage names must be unique.');
      return;
    }
    onChange([...columns, { id: `column-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title }]);
    setNewStageName('');
    onError(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIndex = columns.findIndex(column => column.id === active.id);
    const overIndex = columns.findIndex(column => column.id === over.id);
    if (activeIndex >= 0 && overIndex >= 0) onChange(arrayMove(columns, activeIndex, overIndex));
  };

  return (
    <section aria-labelledby="project-workflow-heading" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div>
        <h3 id="project-workflow-heading" className="text-sm font-bold text-slate-900">Workflow</h3>
        <p className="mt-1 text-xs text-slate-500">Choose a template or create stages for this project.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1" role="tablist" aria-label="Workflow configuration mode">
        {(['templates', 'custom'] as const).map(option => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => setTab(option)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-bold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              tab === option ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Workflow templates">
          {WORKFLOW_TEMPLATES.map(template => {
            const selected = selectedTemplateId === template.id && workflowMatchesStages(columns, template.stages);
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectTemplate(template)}
                className={cn(
                  "rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{template.name}</span>
                  {selected && <CheckCircle2 size={16} className="shrink-0 text-indigo-600" aria-label="Selected" />}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{template.stages.join(' → ')}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">Drag stages to reorder them.</p>
          <DndContext sensors={workflowSensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map(column => column.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {columns.map(column => (
                  <SortableWorkflowStage
                    key={column.id}
                    column={column}
                    canDelete={columns.length > 1}
                    onRename={(id, title) => {
                      onChange(columns.map(item => item.id === id ? { ...item, title } : item));
                      onError(null);
                    }}
                    onDelete={(id) => {
                      if (columns.length > 1) onChange(columns.filter(item => item.id !== id));
                      onError(null);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <form onSubmit={addStage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newStageName}
              onChange={(event) => setNewStageName(event.target.value)}
              placeholder="New stage, e.g. Review"
              aria-label="New workflow stage name"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
            <button
              type="submit"
              disabled={!newStageName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} aria-hidden="true" />
              Add stage
            </button>
          </form>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
    </section>
  );
};

// --- Main App ---

export default function App() {
  const [activeBoard, setActiveBoard] = useState<BoardType>('Work');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const dragInitialGoalRef = useRef<{ id: string; status: GoalStatus } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newGoalStatus, setNewGoalStatus] = useState<GoalStatus>(DEFAULT_WORKFLOW_COLUMNS[0].id);
  const [projectWorkflowColumns, setProjectWorkflowColumns] = useState<WorkflowColumn[]>(DEFAULT_WORKFLOW_COLUMNS);
  const [projectWorkflowBaseColumns, setProjectWorkflowBaseColumns] = useState<WorkflowColumn[]>(DEFAULT_WORKFLOW_COLUMNS);
  const [projectWorkflowError, setProjectWorkflowError] = useState<string | null>(null);
  const [pendingWorkflowColumns, setPendingWorkflowColumns] = useState<WorkflowColumn[] | null>(null);
  const [workflowGoalMigrations, setWorkflowGoalMigrations] = useState<Record<string, GoalStatus>>({});
  
  // Form state for goals
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('');
  const [lifecycleStatus, setLifecycleStatus] = useState<GoalLifecycleStatus>('active');
  const [metricType, setMetricType] = useState<SuccessMetricType>('checklist');
  const [targetValue, setTargetValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [plannedForToday, setPlannedForToday] = useState(false);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('bg-indigo-500');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  // Form state for projects
  const [projectName, setProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [folders, setFolders] = useState<NavFolder[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isStatsMode, setIsStatsMode] = useState(false);

  // Form state for sprints
  const [sprintName, setSprintName] = useState('');
  const [sprintProjectId, setSprintProjectId] = useState('');
  const [sprintLength, setSprintLength] = useState<SprintLength>('2-weeks');
  const [sprintStartDate, setSprintStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sprintEndDate, setSprintEndDate] = useState<string>('');
  const [sprintFormError, setSprintFormError] = useState<string | null>(null);
  const [pendingSprintMove, setPendingSprintMove] = useState<{ sprint: Sprint; goalsToMove: Goal[]; goalsNeedingStage: Goal[] } | null>(null);
  const [sprintMoveGoalStageId, setSprintMoveGoalStageId] = useState('');
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<string | null>(null);

  // Form state for epics
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [epicName, setEpicName] = useState('');
  const [epicDescription, setEpicDescription] = useState('');
  const [epicStatus, setEpicStatus] = useState<EpicStatus>('planned');
  const [epicFormError, setEpicFormError] = useState<string | null>(null);

  // Import/Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isJsonGuideOpen, setIsJsonGuideOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [storagePersistence, setStoragePersistence] = useState<'checking' | 'available' | 'persistent' | 'unsupported' | 'denied' | 'error'>('checking');
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'add'>('replace');
  const [importSummary, setImportSummary] = useState<{
    newProjects: number;
    newGoals: number;
    newSprints: number;
    newEpics: number;
    newLabels: number;
    newFolders: number;
    skippedProjects: number;
    skippedGoals: number;
    skippedSprints: number;
    skippedEpics: number;
    skippedLabels: number;
    skippedFolders: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    const savedGoals = getLocalStorageItemWithMigration(STORAGE_KEYS.goals, PREVIOUS_STORAGE_KEYS.goals);
    const savedProjects = getLocalStorageItemWithMigration(STORAGE_KEYS.projects, PREVIOUS_STORAGE_KEYS.projects);
    const savedSprints = getLocalStorageItemWithMigration(STORAGE_KEYS.sprints, PREVIOUS_STORAGE_KEYS.sprints);
    const savedEpics = getLocalStorageItemWithMigration(STORAGE_KEYS.epics, PREVIOUS_STORAGE_KEYS.epics);
    const savedLabels = getLocalStorageItemWithMigration(STORAGE_KEYS.labels, PREVIOUS_STORAGE_KEYS.labels);
    const savedFolders = getLocalStorageItemWithMigration(STORAGE_KEYS.folders, PREVIOUS_STORAGE_KEYS.folders);
    const savedWorkflowColumns = getLocalStorageItemWithMigration(STORAGE_KEYS.workflowColumns, PREVIOUS_STORAGE_KEYS.workflowColumns);

    if (savedFolders) {
      try {
        const parsedFolders = JSON.parse(savedFolders);
        if (Array.isArray(parsedFolders)) {
          setFolders(parsedFolders);
        }
      } catch (e) {
        console.error('Failed to parse folders', e);
      }
    }

    let legacyWorkflowColumns: WorkflowColumn[] = DEFAULT_WORKFLOW_COLUMNS.map(column => ({ ...column }));
    if (savedWorkflowColumns) {
      try {
        const parsedColumns = JSON.parse(savedWorkflowColumns);
        if (Array.isArray(parsedColumns) && parsedColumns.length > 0) legacyWorkflowColumns = parsedColumns;
      } catch (e) {
        console.error('Failed to parse workflow columns', e);
      }
    }
    
    let loadedProjects: Project[] = [];
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        loadedProjects = Array.isArray(parsedProjects) ? parsedProjects.map((project: Partial<Project>) => ({
          ...project,
          workflowColumns: Array.isArray(project.workflowColumns) && project.workflowColumns.length > 0
            ? project.workflowColumns
            : legacyWorkflowColumns.map(column => ({ ...column })),
        })) as Project[] : [];
        setProjects(loadedProjects);
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }

    // Ensure at least one project exists
    if (loadedProjects.length === 0) {
      const defaultProject: Project = {
        id: 'default',
        name: 'My First Project',
        createdAt: Date.now(),
        workflowColumns: legacyWorkflowColumns.map(column => ({ ...column })),
      };
      loadedProjects = [defaultProject];
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    } else {
      setActiveProjectId(loadedProjects[0].id);
    }

    let loadedGoals: Goal[] = [];
    if (savedGoals) {
      try {
        const parsedGoals = JSON.parse(savedGoals);
        if (Array.isArray(parsedGoals)) {
          let nextNumber = 1;
          loadedGoals = parsedGoals.map((g: Partial<Goal>, idx: number) => {
            const num = typeof g.number === 'number' && g.number > 0 ? g.number : nextNumber++;
            if (num >= nextNumber) nextNumber = num + 1;

            const existingActivities = Array.isArray(g.activities) && g.activities.length > 0
              ? g.activities
              : [
                  {
                    id: `init-${g.id || idx}`,
                    goalId: g.id || '',
                    type: 'created' as const,
                    actor: 'You',
                    timestamp: g.createdAt || Date.now(),
                    message: 'Created this goal',
                  },
                ];

            return {
              ...g,
              number: num,
              activities: existingActivities,
              comments: Array.isArray(g.comments) ? g.comments : [],
            } as Goal;
          });
        }
        setGoals(loadedGoals);
      } catch (e) {
        console.error('Failed to parse goals', e);
      }
    }

    if (savedSprints) {
      try {
        const parsedSprints = JSON.parse(savedSprints);
        const fallbackProjectId = loadedProjects[0]?.id ?? '';
        const migratedSprints: Sprint[] = Array.isArray(parsedSprints) ? parsedSprints.map((sprint: Partial<Sprint>) => {
          const inferredProjectId = loadedGoals.find(goal => goal.sprintId === sprint.id)?.projectId;
          const projectId = sprint.projectId && loadedProjects.some(project => project.id === sprint.projectId)
            ? sprint.projectId
            : inferredProjectId && loadedProjects.some(project => project.id === inferredProjectId)
              ? inferredProjectId
              : fallbackProjectId;
          return { ...sprint, projectId } as Sprint;
        }) : [];
        setSprints(migratedSprints);
      } catch (e) {
        console.error('Failed to parse sprints', e);
      }
    }

    if (savedEpics) {
      try {
        const parsedEpics = JSON.parse(savedEpics);
        const validProjectIds = new Set(loadedProjects.map(project => project.id));
        setEpics(Array.isArray(parsedEpics) ? parsedEpics.filter((epic: Partial<Epic>) => epic.projectId && validProjectIds.has(epic.projectId)) : []);
      } catch (e) {
        console.error('Failed to parse epics', e);
      }
    }

    if (savedLabels) {
      try {
        setLabels(JSON.parse(savedLabels));
      } catch (e) {
        console.error('Failed to parse labels', e);
      }
    } else {
      setLabels([
        { id: 'label-feature', name: 'Feature', color: 'bg-blue-500' },
        { id: 'label-task', name: 'Task', color: 'bg-gray-500' },
        { id: 'label-improvement', name: 'Improvement', color: 'bg-green-500' },
        { id: 'label-bug', name: 'Bug', color: 'bg-red-500' },
      ]);
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    const available = isLocalStorageAvailable();
    setStorageAvailable(available);
    if (!available) {
      setStoragePersistence('error');
      return;
    }

    if (!navigator.storage?.persisted) {
      setStoragePersistence('unsupported');
      return;
    }

    navigator.storage.persisted()
      .then(persisted => setStoragePersistence(persisted ? 'persistent' : 'available'))
      .catch(error => {
        console.error('Unable to check persistent storage status', error);
        setStoragePersistence('error');
      });
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!hasLoadedStorage) return;
    const activeWorkflowForLegacy = projects.find(project => project.id === activeProjectId)?.workflowColumns ?? DEFAULT_WORKFLOW_COLUMNS;
    if (projects.length > 0) {
      if (!setLocalStorageItem(STORAGE_KEYS.projects, JSON.stringify(projects))) setStorageAvailable(false);
    }
    const saved = [
      setLocalStorageItem(STORAGE_KEYS.goals, JSON.stringify(goals)),
      setLocalStorageItem(STORAGE_KEYS.sprints, JSON.stringify(sprints)),
      setLocalStorageItem(STORAGE_KEYS.epics, JSON.stringify(epics)),
      setLocalStorageItem(STORAGE_KEYS.labels, JSON.stringify(labels)),
      setLocalStorageItem(STORAGE_KEYS.folders, JSON.stringify(folders)),
      setLocalStorageItem(STORAGE_KEYS.workflowColumns, JSON.stringify(activeWorkflowForLegacy)),
    ].every(Boolean);
    if (!saved) setStorageAvailable(false);
  }, [goals, projects, sprints, epics, labels, folders, activeProjectId, hasLoadedStorage]);

  const requestPersistentStorage = async () => {
    if (!navigator.storage?.persist) {
      setStoragePersistence('unsupported');
      return;
    }

    try {
      const persisted = await navigator.storage.persist();
      setStoragePersistence(persisted ? 'persistent' : 'denied');
    } catch (error) {
      console.error('Persistent storage request failed', error);
      setStoragePersistence('error');
    }
  };

  // Sprint Status Automation
  useEffect(() => {
    const now = new Date().toISOString().split('T')[0];
    const updatedSprints = sprints.map(sprint => {
      if (sprint.status === 'archived') return sprint;

      if (sprint.status === 'planned' && now >= sprint.startDate) {
        return { ...sprint, status: 'active' as SprintStatus };
      }
      if (sprint.status === 'active' && now > sprint.endDate) {
        return { ...sprint, status: 'completed' as SprintStatus };
      }
      return sprint;
    });

    // Only update if there's a change to avoid infinite loops
    if (JSON.stringify(updatedSprints) !== JSON.stringify(sprints)) {
      setSprints(updatedSprints);
    }
  }, [sprints]);

  useEffect(() => {
    if (activeSprintId && !sprints.some(sprint => sprint.id === activeSprintId && sprint.projectId === activeProjectId)) {
      setActiveSprintId(null);
    }
  }, [activeProjectId, activeSprintId, sprints]);

  useEffect(() => {
    if (activeEpicId && !epics.some(epic => epic.id === activeEpicId && epic.projectId === activeProjectId)) {
      setActiveEpicId(null);
    }
  }, [activeProjectId, activeEpicId, epics]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    setGoals(currentGoals => {
      let changed = false;
      const nextGoals = currentGoals.map(goal => {
        if (!goal.epicId) return goal;
        const epicIsValid = epics.some(epic => epic.id === goal.epicId && epic.projectId === goal.projectId);
        if (epicIsValid) return goal;
        changed = true;
        return { ...goal, epicId: undefined };
      });
      return changed ? nextGoals : currentGoals;
    });
  }, [epics, hasLoadedStorage]);

  // URL route synchronization and details view openers
  const openGoalDetails = (goal: Goal) => {
    setSelectedGoalId(goal.id);
    const targetPath = `/goals/${goal.number || goal.id}`;
    if (window.location.pathname !== targetPath) {
      try {
        window.history.pushState({ goalId: goal.id }, '', targetPath);
      } catch {
        window.location.hash = `/goals/${goal.number || goal.id}`;
      }
    }
  };

  const closeGoalDetails = () => {
    setSelectedGoalId(null);
    if (window.location.pathname.startsWith('/goals')) {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        window.location.hash = '';
      }
    } else if (window.location.hash.includes('goals/')) {
      window.location.hash = '';
    }
  };

  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      let goalQuery: string | null = null;

      const pathMatch = path.match(/^\/goals\/(.+)$/);
      if (pathMatch) {
        goalQuery = decodeURIComponent(pathMatch[1]);
      } else if (hash.startsWith('#/goals/') || hash.startsWith('#goals/')) {
        goalQuery = decodeURIComponent(hash.replace(/^#\/?goals\//, ''));
      } else {
        const params = new URLSearchParams(search);
        if (params.has('goal')) {
          goalQuery = params.get('goal');
        }
      }

      if (goalQuery) {
        const found = resolveGoalByQuery(goals, goalQuery);
        if (found) {
          setSelectedGoalId(found.id);
        }
      }
    };

    if (hasLoadedStorage && goals.length > 0) {
      handleUrlRoute();
    }

    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, [hasLoadedStorage, goals]);

  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) || null : null;
  const activeProject = projects.find(p => p.id === activeProjectId);
  const workflowColumns = activeProject?.workflowColumns ?? DEFAULT_WORKFLOW_COLUMNS;


  const openCreateProjectModal = () => {
    const defaultWorkflow = DEFAULT_WORKFLOW_COLUMNS.map(column => ({ ...column }));
    setEditingProjectId(null);
    setProjectName('');
    setProjectWorkflowColumns(defaultWorkflow);
    setProjectWorkflowBaseColumns(defaultWorkflow);
    setProjectWorkflowError(null);
    setPendingWorkflowColumns(null);
    setWorkflowGoalMigrations({});
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    const projectWorkflow = project.workflowColumns.map(column => ({ ...column }));
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectWorkflowColumns(projectWorkflow);
    setProjectWorkflowBaseColumns(projectWorkflow);
    setProjectWorkflowError(null);
    setPendingWorkflowColumns(null);
    setWorkflowGoalMigrations({});
    setIsProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
    setPendingWorkflowColumns(null);
    setWorkflowGoalMigrations({});
    setProjectWorkflowError(null);
  };

  const commitProject = (columns: WorkflowColumn[], migrations: Record<string, GoalStatus> = {}) => {
    const normalizedColumns = columns.map(column => ({ ...column, title: column.title.trim() }));
    if (editingProjectId) {
      setProjects(currentProjects => currentProjects.map(project => project.id === editingProjectId
        ? { ...project, name: projectName.trim(), workflowColumns: normalizedColumns }
        : project
      ));
      setGoals(currentGoals => currentGoals.map(goal =>
        goal.projectId === editingProjectId && migrations[goal.status] ? { ...goal, status: migrations[goal.status] } : goal
      ));
      if (editingProjectId === activeProjectId && !normalizedColumns.some(column => column.id === newGoalStatus)) {
        setNewGoalStatus(migrations[newGoalStatus] ?? normalizedColumns[0].id);
      }
    } else {
      const newProject: Project = {
        id: Math.random().toString(36).substring(2, 9),
        name: projectName.trim(),
        createdAt: Date.now(),
        workflowColumns: normalizedColumns,
      };
      setProjects(currentProjects => [...currentProjects, newProject]);
      setActiveProjectId(newProject.id);
      setNewGoalStatus(normalizedColumns[0].id);
    }

    setProjectName('');
    setEditingProjectId(null);
    closeProjectModal();
  };

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    const validationError = getWorkflowValidationError(projectWorkflowColumns);
    if (validationError) {
      setProjectWorkflowError(validationError);
      return;
    }

    if (editingProjectId) {
      const savedProject = projects.find(project => project.id === editingProjectId);
      const removedColumnsWithGoals = (savedProject?.workflowColumns ?? []).filter(column =>
        !projectWorkflowColumns.some(candidate => candidate.id === column.id) &&
        goals.some(goal => goal.projectId === editingProjectId && goal.status === column.id)
      );
      if (removedColumnsWithGoals.length > 0) {
        setPendingWorkflowColumns(projectWorkflowColumns.map(column => ({ ...column, title: column.title.trim() })));
        setWorkflowGoalMigrations({});
        return;
      }
    }

    commitProject(projectWorkflowColumns);
  };

  const performDeleteProject = (id: string) => {
    if (projects.length <= 1) return; // Keep at least one
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    setGoals(goals.filter(g => g.projectId !== id));
    setSprints(sprints.filter(s => s.projectId !== id));
    setEpics(epics.filter(epic => epic.projectId !== id));
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0].id);
    }
    setProjectPendingDeletion(null);
  };

  const deleteProject = (id: string) => {
    if (sprints.some(sprint => sprint.projectId === id && sprint.status === 'active')) {
      setProjectPendingDeletion(id);
      return;
    }
    performDeleteProject(id);
  };

  const calculateEndDate = (start: string, length: SprintLength): string => {
    const startDate = new Date(start);
    let endDate = new Date(start);

    switch (length) {
      case '1-week':
        endDate.setDate(startDate.getDate() + 7);
        break;
      case '2-weeks':
        endDate.setDate(startDate.getDate() + 14);
        break;
      case '1-month':
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      case 'custom':
        // If custom, we might want a separate input or just default to 2 weeks
        endDate.setDate(startDate.getDate() + 14);
        break;
    }

    return endDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (sprintStartDate && sprintLength !== 'custom') {
      setSprintEndDate(calculateEndDate(sprintStartDate, sprintLength));
    }
  }, [sprintStartDate, sprintLength]);

  const openCreateSprintModal = () => {
    setEditingSprintId(null);
    setSprintName('');
    setSprintProjectId(activeProjectId);
    setSprintLength('2-weeks');
    setSprintStartDate(new Date().toISOString().split('T')[0]);
    setSprintFormError(null);
    setPendingSprintMove(null);
    setSprintMoveGoalStageId('');
    setIsSprintModalOpen(true);
  };

  const openEditSprintModal = (sprint: Sprint) => {
    setEditingSprintId(sprint.id);
    setSprintName(sprint.name);
    setSprintProjectId(sprint.projectId);
    setSprintLength(sprint.length);
    setSprintStartDate(sprint.startDate);
    setSprintEndDate(sprint.endDate);
    setSprintFormError(null);
    setPendingSprintMove(null);
    setSprintMoveGoalStageId('');
    setIsSprintModalOpen(true);
  };

  const closeSprintModal = () => {
    setIsSprintModalOpen(false);
    setPendingSprintMove(null);
    setSprintMoveGoalStageId('');
    setSprintFormError(null);
  };

  const commitSprint = (sprint: Sprint, goalsToMove: Goal[] = [], destinationStageId = '') => {
    if (editingSprintId) {
      setSprints(currentSprints => currentSprints.map(current => current.id === editingSprintId ? sprint : current));
      if (goalsToMove.length > 0) {
        const goalIdsToMove = new Set(goalsToMove.map(goal => goal.id));
        const destinationWorkflow = projects.find(project => project.id === sprint.projectId)?.workflowColumns ?? [];
        setGoals(currentGoals => currentGoals.map(goal => {
          if (!goalIdsToMove.has(goal.id)) return goal;
          const statusIsValid = destinationWorkflow.some(column => column.id === goal.status);
          return {
            ...goal,
            projectId: sprint.projectId,
            status: statusIsValid ? goal.status : destinationStageId,
            epicId: goal.epicId && epics.some(epic => epic.id === goal.epicId && epic.projectId === sprint.projectId) ? goal.epicId : undefined,
          };
        }));
      }
    } else {
      setSprints(currentSprints => [...currentSprints, sprint]);
    }
    setSprintName('');
    setEditingSprintId(null);
    closeSprintModal();
  };

  const addSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) {
      setSprintFormError('Sprint name is required.');
      return;
    }
    if (!sprintProjectId || !projects.some(project => project.id === sprintProjectId)) {
      setSprintFormError('Choose a project for this sprint.');
      return;
    }

    const existingSprint = editingSprintId ? sprints.find(sprint => sprint.id === editingSprintId) : null;
    const nextSprint: Sprint = existingSprint ? {
      ...existingSprint,
      projectId: sprintProjectId,
      name: sprintName.trim(),
      startDate: sprintStartDate,
      endDate: sprintEndDate,
      length: sprintLength,
    } : {
      id: Math.random().toString(36).substring(2, 9),
      projectId: sprintProjectId,
      name: sprintName.trim(),
      startDate: sprintStartDate,
      endDate: sprintEndDate,
      length: sprintLength,
      status: 'planned',
      goalIds: [],
      createdAt: Date.now(),
    };

    if (existingSprint && existingSprint.projectId !== sprintProjectId) {
      const goalsToMove = goals.filter(goal => goal.sprintId === existingSprint.id && goal.projectId !== sprintProjectId);
      if (goalsToMove.length > 0) {
        const destinationWorkflow = projects.find(project => project.id === sprintProjectId)?.workflowColumns ?? [];
        const goalsNeedingStage = goalsToMove.filter(goal => !destinationWorkflow.some(column => column.id === goal.status));
        setPendingSprintMove({ sprint: nextSprint, goalsToMove, goalsNeedingStage });
        setSprintMoveGoalStageId('');
        return;
      }
    }

    commitSprint(nextSprint);
  };

  const assignGoalToSprint = (goalId: string, sprintId: string | null) => {
    const goal = goals.find(item => item.id === goalId);
    if (!goal?.projectId) return;
    if (sprintId) {
      const destinationSprint = sprints.find(sprint =>
        sprint.id === sprintId && sprint.projectId === goal.projectId && (sprint.status === 'active' || sprint.status === 'planned')
      );
      if (!destinationSprint) return;
    }

    const oldSprintName = sprints.find(s => s.id === goal.sprintId)?.name;
    const newSprintName = sprintId ? sprints.find(s => s.id === sprintId)?.name : undefined;
    const activityEvent = createActivityEvent(
      goalId,
      'sprint_changed',
      { from: oldSprintName, to: newSprintName }
    );

    setGoals(currentGoals => currentGoals.map(item => item.id === goalId ? {
      ...item,
      sprintId: sprintId || undefined,
      activities: [...(item.activities || []), activityEvent],
    } : item));

    setSprints(currentSprints => currentSprints.map(sprint => ({
      ...sprint,
      goalIds: sprint.id === sprintId
        ? Array.from(new Set([...(sprint.goalIds ?? []), goalId]))
        : (sprint.goalIds ?? []).filter(id => id !== goalId),
    })));
  };

  const openCreateEpicModal = () => {
    setEditingEpicId(null);
    setEpicName('');
    setEpicDescription('');
    setEpicStatus('planned');
    setEpicFormError(null);
    setIsEpicModalOpen(true);
  };

  const openEditEpicModal = (epic: Epic) => {
    setEditingEpicId(epic.id);
    setEpicName(epic.name);
    setEpicDescription(epic.description);
    setEpicStatus(epic.status);
    setEpicFormError(null);
    setIsEpicModalOpen(true);
  };

  const closeEpicModal = () => {
    setIsEpicModalOpen(false);
    setEditingEpicId(null);
    setEpicFormError(null);
  };

  const saveEpic = (event: React.FormEvent) => {
    event.preventDefault();
    if (!epicName.trim()) {
      setEpicFormError('Epic name is required.');
      return;
    }
    if (!activeProjectId) {
      setEpicFormError('Choose a project before creating an epic.');
      return;
    }
    if (editingEpicId) {
      setEpics(current => current.map(epic => epic.id === editingEpicId ? {
        ...epic,
        name: epicName.trim(),
        description: epicDescription.trim(),
        status: epicStatus,
      } : epic));
      if (epicStatus === 'archived') {
        setGoals(current => current.map(goal => goal.epicId === editingEpicId ? { ...goal, epicId: undefined } : goal));
        if (activeEpicId === editingEpicId) setActiveEpicId(null);
      }
    } else {
      const newEpic: Epic = {
        id: Math.random().toString(36).substring(2, 9),
        projectId: activeProjectId,
        name: epicName.trim(),
        description: epicDescription.trim(),
        status: epicStatus,
        createdAt: Date.now(),
      };
      setEpics(current => [...current, newEpic]);
      setActiveEpicId(newEpic.id);
      setActiveSprintId(null);
    }
    closeEpicModal();
  };

  const updateEpicStatus = (id: string, status: EpicStatus) => {
    setEpics(current => current.map(epic => epic.id === id ? { ...epic, status } : epic));
    if (status === 'archived') {
      setGoals(current => current.map(goal => goal.epicId === id ? { ...goal, epicId: undefined } : goal));
      if (activeEpicId === id) setActiveEpicId(null);
    }
  };

  const deleteEpic = (id: string) => {
    setEpics(current => current.filter(epic => epic.id !== id));
    setGoals(current => current.map(goal => goal.epicId === id ? { ...goal, epicId: undefined } : goal));
    if (activeEpicId === id) setActiveEpicId(null);
  };

  const assignGoalToEpic = (goalId: string, epicId: string | null) => {
    const goal = goals.find(item => item.id === goalId);
    if (!goal?.projectId) return;
    if (epicId && !epics.some(epic => epic.id === epicId && epic.projectId === goal.projectId && epic.status !== 'archived')) return;
    const oldEpicName = epics.find(e => e.id === goal.epicId)?.name;
    const newEpicName = epicId ? epics.find(e => e.id === epicId)?.name : undefined;
    const activityEvent = createActivityEvent(
      goalId,
      'epic_changed',
      { from: oldEpicName, to: newEpicName }
    );
    setGoals(current => current.map(item => item.id === goalId ? {
      ...item,
      epicId: epicId || undefined,
      activities: [...(item.activities || []), activityEvent],
    } : item));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Goal') {
      const g = event.active.data.current.goal as Goal;
      setActiveGoal(g);
      dragInitialGoalRef.current = { id: g.id, status: g.status };
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAGoal = active.data.current?.type === 'Goal';
    const isOverAGoal = over.data.current?.type === 'Goal';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveAGoal) return;

    // Dropping a goal over another goal
    if (isActiveAGoal && isOverAGoal) {
      setGoals((goals) => {
        const activeIndex = goals.findIndex((g) => g.id === activeId);
        const overIndex = goals.findIndex((g) => g.id === overId);
        if (activeIndex < 0 || overIndex < 0) return goals;

        if (goals[activeIndex].status !== goals[overIndex].status) {
          const newStatus = goals[overIndex].status;
          const updatedGoals = goals.map((goal, index) => index === activeIndex ? { ...goal, status: newStatus } : goal);
          return arrayMove(updatedGoals, activeIndex, Math.max(0, overIndex - 1));
        }

        return arrayMove(goals, activeIndex, overIndex);
      });
    }

    // Dropping a goal over a column
    if (isActiveAGoal && isOverAColumn) {
      setGoals((goals) => {
        const activeIndex = goals.findIndex((g) => g.id === activeId);
        const newStatus = over.data.current?.status as GoalStatus | undefined;
        if (activeIndex < 0 || !newStatus) return goals;
        return goals.map((goal, index) => index === activeIndex ? { ...goal, status: newStatus } : goal);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const initial = dragInitialGoalRef.current;
    if (initial) {
      const currentGoal = goals.find(g => g.id === initial.id);
      if (currentGoal && currentGoal.status !== initial.status) {
        const oldColName = workflowColumns.find(c => c.id === initial.status)?.title || initial.status;
        const newColName = workflowColumns.find(c => c.id === currentGoal.status)?.title || currentGoal.status;
        
        const activityEvent = createActivityEvent(
          currentGoal.id,
          'status_changed',
          { from: oldColName, to: newColName }
        );

        setGoals(prevGoals =>
          prevGoals.map(g =>
            g.id === currentGoal.id
              ? { ...g, activities: [...(g.activities || []), activityEvent] }
              : g
          )
        );
      }
    }
    dragInitialGoalRef.current = null;
    setActiveGoal(null);
  };

  const createLabel = () => {
    if (!newLabelName.trim()) return;
    
    if (editingLabelId) {
      setLabels(labels.map(l => l.id === editingLabelId ? { ...l, name: newLabelName.trim(), color: newLabelColor } : l));
      setEditingLabelId(null);
    } else {
      const newLabel: Label = {
        id: Math.random().toString(36).substring(2, 9),
        name: newLabelName.trim(),
        color: newLabelColor,
      };
      setLabels([...labels, newLabel]);
      setLabelIds([...labelIds, newLabel.id]);
    }
    setNewLabelName('');
    setNewLabelColor('bg-indigo-500');
  };

  const deleteLabel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLabels(labels.filter(l => l.id !== id));
    setLabelIds(labelIds.filter(lId => lId !== id));
    setGoals(goals.map(g => ({
      ...g,
      labelIds: g.labelIds?.filter(lId => lId !== id)
    })));
    if (activeLabelFilter === id) {
      setActiveLabelFilter(null);
    }
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeProjectId) return;

    let successMetric: SuccessMetric | undefined;
    if (metricType === 'numeric' && targetValue) {
      successMetric = {
        type: 'numeric',
        target: parseFloat(targetValue),
        current: editingGoalId ? goals.find(g => g.id === editingGoalId)?.successMetric?.current || 0 : 0,
        unit: unit
      };
    } else if (metricType === 'checklist' || metricType === 'milestones') {
      const items = checklistItems.filter(i => i.trim()).map(text => {
        // Try to find existing item to preserve completion state if editing
        const existingItem = editingGoalId 
          ? goals.find(g => g.id === editingGoalId)?.successMetric?.items?.find(i => i.text === text)
          : null;
        
        return {
          id: existingItem?.id || Math.random().toString(36).substring(2, 9),
          text,
          completed: existingItem?.completed || false
        };
      });
      if (items.length > 0) {
        successMetric = {
          type: metricType,
          items
        };
      }
    }

    if (editingGoalId) {
      const existing = goals.find(g => g.id === editingGoalId);
      const changes: string[] = [];
      if (existing && existing.title !== title) changes.push(`title to "${title}"`);
      if (existing && existing.status !== newGoalStatus) changes.push(`status to "${newGoalStatus}"`);
      if (existing && existing.priority !== priority) changes.push(`priority to "${priority}"`);
      
      const updateActivity = createActivityEvent(
        editingGoalId,
        'title_changed',
        { message: changes.length ? `Updated ${changes.join(', ')}` : 'Updated goal properties' }
      );

      setGoals(goals.map(g => g.id === editingGoalId ? {
        ...g,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        sprintId: sprintId || undefined,
        epicId: epicId && epics.some(epic => epic.id === epicId && epic.projectId === g.projectId) ? epicId : undefined,
        status: newGoalStatus,
        lifecycleStatus,
        successMetric,
        plannedForToday,
        labelIds,
        activities: [...(g.activities || []), updateActivity],
      } : g));
      setEditingGoalId(null);
    } else {
      const newGoalId = generateId();
      const newNumber = generateStableGoalNumber(goals);
      const createdActivity = createActivityEvent(
        newGoalId,
        'created',
        { message: 'Created this goal' },
        'You'
      );

      const newGoal: Goal = {
        id: newGoalId,
        number: newNumber,
        projectId: activeProjectId,
        sprintId: sprintId || undefined,
        epicId: epicId && epics.some(epic => epic.id === epicId && epic.projectId === activeProjectId) ? epicId : undefined,
        title,
        description,
        status: newGoalStatus,
        lifecycleStatus: 'active',
        board: activeBoard,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        successMetric,
        plannedForToday,
        labelIds,
        activities: [createdActivity],
        comments: [],
        createdAt: Date.now(),
      };
      setGoals([...goals, newGoal]);
    }

    resetGoalForm();
    setIsModalOpen(false);
  };

  const openEditModal = (goal: Goal) => {
    openGoalDetails(goal);
  };

  const toggleChecklistItem = (goalId: string, itemId: string) => {
    setGoals(goals.map(g => {
      if (g.id === goalId && (g.successMetric?.type === 'checklist' || g.successMetric?.type === 'milestones')) {
        const oldProgress = calculateGoalProgress(g);
        const updatedItems = g.successMetric.items?.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const updatedMetric = {
          ...g.successMetric,
          items: updatedItems,
        };
        const tempGoal = { ...g, successMetric: updatedMetric };
        const newProgress = calculateGoalProgress(tempGoal);
        const activityEvent = createActivityEvent(
          goalId,
          'progress_changed',
          { from: oldProgress, to: newProgress }
        );

        return {
          ...g,
          successMetric: updatedMetric,
          activities: [...(g.activities || []), activityEvent],
        };
      }
      return g;
    }));
  };

  const updateNumericProgress = (goalId: string, delta: number) => {
    setGoals(goals.map(g => {
      if (g.id === goalId && g.successMetric?.type === 'numeric') {
        const oldProgress = calculateGoalProgress(g);
        const current = g.successMetric.current || 0;
        const target = g.successMetric.target || 1;
        const newCurrent = Math.max(0, Math.min(target, current + delta));
        const updatedMetric = {
          ...g.successMetric,
          current: newCurrent,
        };
        const tempGoal = { ...g, successMetric: updatedMetric };
        const newProgress = calculateGoalProgress(tempGoal);
        const activityEvent = createActivityEvent(
          goalId,
          'progress_changed',
          { from: oldProgress, to: newProgress }
        );

        return {
          ...g,
          successMetric: updatedMetric,
          activities: [...(g.activities || []), activityEvent],
        };
      }
      return g;
    }));
  };

  const resetGoalForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setSprintId('');
    setEpicId('');
    setLifecycleStatus('active');
    setMetricType('checklist');
    setTargetValue('');
    setUnit('');
    setChecklistItems(['']);
    setPlannedForToday(false);
    setLabelIds([]);
    setNewGoalStatus(workflowColumns[0]?.id ?? DEFAULT_WORKFLOW_COLUMNS[0].id);
    setEditingLabelId(null);
    setNewLabelName('');
    setNewLabelColor('bg-indigo-500');
  };

  const openNewGoalModal = (status: GoalStatus = workflowColumns[0]?.id ?? DEFAULT_WORKFLOW_COLUMNS[0].id) => {
    setEditingGoalId(null);
    resetGoalForm();
    setNewGoalStatus(status);
    setIsModalOpen(true);
  };

  const updateGoalLifecycle = (id: string, status: GoalLifecycleStatus) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        let newStatus = g.status;
        if (status === 'completed') {
          newStatus = workflowColumns[workflowColumns.length - 1]?.id ?? g.status;
        } else if (status === 'active' && g.lifecycleStatus === 'completed') {
          newStatus = workflowColumns[0]?.id ?? g.status;
        }
        const activityEvent = createActivityEvent(
          id,
          'lifecycle_changed',
          { from: g.lifecycleStatus, to: status }
        );
        return { 
          ...g, 
          lifecycleStatus: status, 
          status: newStatus,
          activities: [...(g.activities || []), activityEvent],
        };
      }
      return g;
    }));
  };

  const updateSprintStatus = (id: string, status: SprintStatus) => {
    setSprints(sprints.map(s => s.id === id ? { ...s, status } : s));
  };

  const deleteSprint = (id: string) => {
    setSprints(sprints.filter(s => s.id !== id));
    setGoals(goals.map(g => g.sprintId === id ? { ...g, sprintId: undefined } : g));
    if (activeSprintId === id) setActiveSprintId(null);
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const togglePlannedForToday = (id: string) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const nextPlanned = !g.plannedForToday;
        const activityEvent = createActivityEvent(
          id,
          'progress_changed',
          { message: nextPlanned ? 'marked goal as Planned for Today' : 'removed goal from Planned for Today' }
        );
        return { 
          ...g, 
          plannedForToday: nextPlanned,
          activities: [...(g.activities || []), activityEvent],
        };
      }
      return g;
    }));
  };


  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, '']);
  };

  const updateChecklistItem = (index: number, value: string) => {
    const newItems = [...checklistItems];
    newItems[index] = value;
    setChecklistItems(newItems);
  };

  const removeChecklistItem = (index: number) => {
    if (checklistItems.length <= 1) return;
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  // Folder Handlers
  const handleCreateFolder = (name: string, tab: 'projects' | 'sprints' | 'epics' | 'labels' | 'views' | 'all') => {
    const newFolder = createNavFolder(name, tab, folders);
    setFolders(prev => [...prev, newFolder]);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    setFolders(prev => renameNavFolder(folderId, newName, prev));
  };

  const handleDeleteFolder = (folderId: string) => {
    const { updatedFolders, updatedItems: updatedProjects } = deleteNavFolder(folderId, folders, projects);
    const { updatedItems: updatedSprints } = deleteNavFolder(folderId, folders, sprints);
    const { updatedItems: updatedEpics } = deleteNavFolder(folderId, folders, epics);
    const { updatedItems: updatedLabels } = deleteNavFolder(folderId, folders, labels);

    setFolders(updatedFolders);
    setProjects(updatedProjects);
    setSprints(updatedSprints);
    setEpics(updatedEpics);
    setLabels(updatedLabels);
  };

  const handleToggleFolderCollapse = (folderId: string) => {
    setFolders(prev => toggleNavFolderCollapse(folderId, prev));
  };

  const handleMoveProjectToFolder = (projectId: string, folderId: string | null) => {
    setProjects(prev => moveItemToNavFolder(projectId, folderId, prev));
  };

  const handleMoveSprintToFolder = (sprintId: string, folderId: string | null) => {
    setSprints(prev => moveItemToNavFolder(sprintId, folderId, prev));
  };

  const handleMoveEpicToFolder = (epicId: string, folderId: string | null) => {
    setEpics(prev => moveItemToNavFolder(epicId, folderId, prev));
  };

  const handleMoveLabelToFolder = (labelId: string, folderId: string | null) => {
    setLabels(prev => moveItemToNavFolder(labelId, folderId, prev));
  };

  const handleCreateLabelWithFolder = (name: string, color: string = 'bg-indigo-500', folderId?: string) => {
    const newLabel: Label = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      color,
      folderId,
    };
    setLabels(prev => [...prev, newLabel]);
  };

  const exportData = () => {
    const data = {
      projects,
      goals,
      sprints,
      epics,
      labels,
      folders,
      workflowColumns
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanbangxp-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Basic validation
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON structure');
        if (!Array.isArray(parsed.projects)) throw new Error('Missing or invalid projects array');
        if (!Array.isArray(parsed.goals)) throw new Error('Missing or invalid goals array');
        if (!Array.isArray(parsed.sprints)) throw new Error('Missing or invalid sprints array');

        // Calculate summary
        const existingProjectIds = new Set(projects.map(p => p.id));
        const existingGoalIds = new Set(goals.map(g => g.id));
        const existingSprintIds = new Set(sprints.map(s => s.id));
        const existingEpicIds = new Set(epics.map(epic => epic.id));
        const existingLabelIds = new Set(labels.map(l => l.id));
        const existingFolderIds = new Set(folders.map(f => f.id));

        const newProjects = parsed.projects.filter((p: Project) => !existingProjectIds.has(p.id));
        const newGoals = parsed.goals.filter((g: Goal) => !existingGoalIds.has(g.id));
        const newSprints = parsed.sprints.filter((s: Sprint) => !existingSprintIds.has(s.id));
        const parsedEpics: Epic[] = Array.isArray(parsed.epics) ? parsed.epics : [];
        const newEpics = parsedEpics.filter(epic => !existingEpicIds.has(epic.id));
        const newLabels = (parsed.labels || []).filter((l: Label) => !existingLabelIds.has(l.id));
        const parsedFolders: NavFolder[] = Array.isArray(parsed.folders) ? parsed.folders : [];
        const newFolders = parsedFolders.filter((f: NavFolder) => !existingFolderIds.has(f.id));

        setImportSummary({
          newProjects: newProjects.length,
          newGoals: newGoals.length,
          newSprints: newSprints.length,
          newEpics: newEpics.length,
          newLabels: newLabels.length,
          newFolders: newFolders.length,
          skippedProjects: parsed.projects.length - newProjects.length,
          skippedGoals: parsed.goals.length - newGoals.length,
          skippedSprints: parsed.sprints.length - newSprints.length,
          skippedEpics: parsedEpics.length - newEpics.length,
          skippedLabels: (parsed.labels || []).length - newLabels.length,
          skippedFolders: parsedFolders.length - newFolders.length,
        });

        setImportData(content);
        setImportError(null);
        setIsImportModalOpen(true);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
        setIsImportModalOpen(true);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    if (!importData) return;
    try {
      const parsed = JSON.parse(importData);
      const importedWorkflowColumns: WorkflowColumn[] = Array.isArray(parsed.workflowColumns) && parsed.workflowColumns.length > 0
        ? parsed.workflowColumns
        : DEFAULT_WORKFLOW_COLUMNS;
      const importedProjects: Project[] = Array.isArray(parsed.projects) ? parsed.projects.map((project: Partial<Project>) => ({
        ...project,
        workflowColumns: Array.isArray(project.workflowColumns) && project.workflowColumns.length > 0
          ? project.workflowColumns
          : importedWorkflowColumns.map(column => ({ ...column })),
      })) as Project[] : [];
      const importedGoals: Goal[] = Array.isArray(parsed.goals) ? parsed.goals : [];
      const importedEpics: Epic[] = Array.isArray(parsed.epics)
        ? parsed.epics.filter((epic: Partial<Epic>) => epic.projectId && importedProjects.some(project => project.id === epic.projectId))
        : [];
      const importedFolders: NavFolder[] = Array.isArray(parsed.folders) ? parsed.folders : [];
      const importedSprints: Sprint[] = Array.isArray(parsed.sprints) ? parsed.sprints.map((sprint: Partial<Sprint>) => {
        const inferredProjectId = importedGoals.find(goal => goal.sprintId === sprint.id)?.projectId;
        const projectId = sprint.projectId && importedProjects.some(project => project.id === sprint.projectId)
          ? sprint.projectId
          : inferredProjectId && importedProjects.some(project => project.id === inferredProjectId)
            ? inferredProjectId
            : importedProjects[0]?.id ?? '';
        return { ...sprint, projectId } as Sprint;
      }) : [];
      
      if (importMode === 'replace') {
        setProjects(importedProjects);
        setGoals(importedGoals);
        setSprints(importedSprints);
        setEpics(importedEpics);
        setFolders(importedFolders);
        if (parsed.labels) setLabels(parsed.labels);
        if (importedProjects.length > 0) {
          setNewGoalStatus(importedProjects[0].workflowColumns[0].id);
          setActiveProjectId(importedProjects[0].id);
        }
        setActiveSprintId(null);
        setImportResult('Data replaced successfully.');
      } else {
        // Add missing items
        const existingProjectIds = new Set(projects.map(p => p.id));
        const existingGoalIds = new Set(goals.map(g => g.id));
        const existingSprintIds = new Set(sprints.map(s => s.id));
        const existingEpicIds = new Set(epics.map(epic => epic.id));
        const existingLabelIds = new Set(labels.map(l => l.id));
        const existingFolderIds = new Set(folders.map(f => f.id));
        const newProjects = importedProjects.filter((p: Project) => !existingProjectIds.has(p.id));
        const newGoals = importedGoals.filter((g: Goal) => !existingGoalIds.has(g.id));
        const newSprints = importedSprints.filter((s: Sprint) => !existingSprintIds.has(s.id));
        const newEpics = importedEpics.filter(epic => !existingEpicIds.has(epic.id));
        const newLabels = (parsed.labels || []).filter((l: Label) => !existingLabelIds.has(l.id));
        const newFolders = importedFolders.filter(f => !existingFolderIds.has(f.id));
        setProjects([...projects, ...newProjects]);
        setGoals([...goals, ...newGoals]);
        setSprints([...sprints, ...newSprints]);
        setEpics([...epics, ...newEpics]);
        setLabels([...labels, ...newLabels]);
        setFolders([...folders, ...newFolders]);

        setImportResult(`Import complete: ${newProjects.length} projects, ${newGoals.length} goals, ${newSprints.length} sprints, ${newEpics.length} epics, ${newFolders.length} folders added.`);
      }
      
      setImportData(null);
      setImportSummary(null);
    } catch (err) {
      console.error("Failed to apply import data", err);
      setImportError('Failed to apply import data');
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredGoals = goals.filter(g => {
    const matchesSearch = !normalizedSearchQuery || [
      g.title,
      g.description,
      ...(g.labelIds ?? []).map(labelId => labels.find(label => label.id === labelId)?.name ?? '')
    ].some(value => value.toLocaleLowerCase().includes(normalizedSearchQuery));

    return g.projectId === activeProjectId &&
      g.board === activeBoard &&
      (activeSprintId ? g.sprintId === activeSprintId : true) &&
      (activeEpicId ? g.epicId === activeEpicId : true) &&
      (showArchived ? g.lifecycleStatus === 'archived' : g.lifecycleStatus !== 'archived') &&
      (activeLabelFilter ? g.labelIds?.includes(activeLabelFilter) : true) &&
      matchesSearch;
  });

  const activeSprint = sprints.find(s => s.id === activeSprintId && s.projectId === activeProjectId);
  const activeSprintProject = activeSprint ? projects.find(project => project.id === activeSprint.projectId) : null;
  const sprintGoals = goals.filter(g => g.sprintId === activeSprintId);
  const completedGoalsCount = sprintGoals.filter(g => g.lifecycleStatus === 'completed').length;
  const totalGoalsCount = sprintGoals.length;
  const remainingGoalsCount = totalGoalsCount - completedGoalsCount;
  const progressPercentage = totalGoalsCount > 0 ? (completedGoalsCount / totalGoalsCount) * 100 : 0;
  const activeEpic = epics.find(epic => epic.id === activeEpicId && epic.projectId === activeProjectId);
  const activeEpicGoals = activeEpic ? goals.filter(goal => goal.epicId === activeEpic.id) : [];
  const activeEpicCompletedGoals = activeEpicGoals.filter(goal => goal.lifecycleStatus === 'completed').length;
  const activeEpicProgress = activeEpicGoals.length ? Math.round((activeEpicCompletedGoals / activeEpicGoals.length) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const focusGoals = goals.filter(g => 
    g.lifecycleStatus !== 'completed' && 
    g.lifecycleStatus !== 'archived' &&
    (
      g.plannedForToday || 
      g.status === workflowColumns[1]?.id || 
      (g.dueDate && g.dueDate >= today.getTime() && g.dueDate < tomorrow.getTime())
    )
  );

  const projectBeingEdited = editingProjectId ? projects.find(project => project.id === editingProjectId) : null;
  const pendingRemovedWorkflowColumns = pendingWorkflowColumns
    ? (projectBeingEdited?.workflowColumns ?? []).filter(column =>
        !pendingWorkflowColumns.some(candidate => candidate.id === column.id) &&
        goals.some(goal => goal.projectId === editingProjectId && goal.status === column.id)
      )
    : [];
  const workflowMigrationsComplete = pendingRemovedWorkflowColumns.every(column => Boolean(workflowGoalMigrations[column.id]));

  const hasEmptyColumn = workflowColumns.some(column => {
    return filteredGoals.filter(goal => goal.status === column.id).length === 0;
  });

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Minibar Navigation */}
      <MinibarNav
        activeBoard={activeBoard}
        setActiveBoard={setActiveBoard}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        openCreateProjectModal={openCreateProjectModal}
        openEditProjectModal={openEditProjectModal}
        deleteProject={deleteProject}
        sprints={sprints}
        activeSprintId={activeSprintId}
        setActiveSprintId={setActiveSprintId}
        openCreateSprintModal={openCreateSprintModal}
        openEditSprintModal={openEditSprintModal}
        updateSprintStatus={updateSprintStatus}
        deleteSprint={deleteSprint}
        epics={epics}
        activeEpicId={activeEpicId}
        setActiveEpicId={setActiveEpicId}
        openCreateEpicModal={openCreateEpicModal}
        openEditEpicModal={openEditEpicModal}
        updateEpicStatus={updateEpicStatus}
        deleteEpic={deleteEpic}
        goals={goals}
        labels={labels}
        activeLabelFilter={activeLabelFilter}
        setActiveLabelFilter={setActiveLabelFilter}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        isStatsMode={isStatsMode}
        setIsStatsMode={setIsStatsMode}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onToggleFolderCollapse={handleToggleFolderCollapse}
        onMoveProjectToFolder={handleMoveProjectToFolder}
        onMoveSprintToFolder={handleMoveSprintToFolder}
        onMoveEpicToFolder={handleMoveEpicToFolder}
        onMoveLabelToFolder={handleMoveLabelToFolder}
        onCreateLabel={handleCreateLabelWithFolder}
        onDeleteLabel={(id) => {
          setLabels(prev => prev.filter(l => l.id !== id));
          setLabelIds(prev => prev.filter(lId => lId !== id));
          setGoals(prev => prev.map(g => ({
            ...g,
            labelIds: g.labelIds?.filter(lId => lId !== id)
          })));
          if (activeLabelFilter === id) {
            setActiveLabelFilter(null);
          }
        }}
        storageAvailable={storageAvailable}
        storagePersistence={storagePersistence}
        requestPersistentStorage={requestPersistentStorage}
        exportData={exportData}
        handleImportFile={handleImportFile}
        fileInputRef={fileInputRef}
        setIsJsonGuideOpen={setIsJsonGuideOpen}
        setIsAboutModalOpen={setIsAboutModalOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {isJsonGuideOpen ? (
          <JsonGuide onClose={() => setIsJsonGuideOpen(false)} />
        ) : isStatsMode ? (
          <StatsDashboard
            goals={goals}
            projects={projects}
            sprints={sprints}
            epics={epics}
            workflowColumns={workflowColumns}
            activeBoard={activeBoard}
            onExit={() => setIsStatsMode(false)}
            onSelectGoal={(goal) => openGoalDetails(goal)}
          />
        ) : isFocusMode ? (
          <div className="flex-1 flex flex-col bg-bg overflow-y-auto">
            <header className="px-8 py-12 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/15 rounded-3xl flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10 border border-amber-500/20">
                <Zap size={32} className="fill-amber-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-text-primary tracking-tight">Focus Mode</h2>
                <p className="text-text-muted font-medium">Concentrate on what matters right now.</p>
              </div>
              <button 
                onClick={() => setIsFocusMode(false)}
                className="px-6 py-2 bg-card border border-border rounded-full text-xs font-bold text-text-secondary hover:bg-column hover:text-text-primary transition-all shadow-sm cursor-pointer"
              >
                Exit Focus Mode
              </button>
            </header>

            <main className="px-8 pb-20 max-w-4xl mx-auto w-full space-y-12">
              {focusGoals.length === 0 ? (
                <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-sm">
                  <div className="w-12 h-12 bg-column rounded-2xl flex items-center justify-center text-text-muted mx-auto mb-4 border border-border/40">
                    <Target size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">Nothing planned for today</h3>
                  <p className="text-sm text-text-muted max-w-xs mx-auto">
                    Go back to your board and mark some goals as "Planned for Today" to see them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {focusGoals.map(goal => (
                    <div key={goal.id} className="group relative">
                      <StaticGoalCard goal={goal} allGoals={goals} labels={labels} epics={epics} onEdit={openGoalDetails} />
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openGoalDetails(goal)}
                          className="p-2 bg-card rounded-xl shadow-lg border border-border text-text-muted hover:text-accent transition-colors cursor-pointer"
                          title="Edit Goal"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => updateGoalLifecycle(goal.id, 'completed')}
                          className="p-2 bg-card rounded-xl shadow-lg border border-border text-text-muted hover:text-emerald-500 transition-colors cursor-pointer"
                          title="Mark Complete"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        ) : (
          <>
            {/* Header */}
        <header className="bg-card border-b border-border px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-8 w-[1px] bg-border hidden md:block" />
            <div>
              <h2 className="text-xl font-bold text-text-primary">{activeProject?.name || 'Loading...'}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <LayoutGrid size={10} />
                <span>Kanban Board</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <div className="relative w-full sm:order-1 sm:w-auto">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search goals..."
                aria-label="Search goals by title, description, or label"
                className="w-full sm:w-48 lg:w-64 rounded-xl border border-border bg-column py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all sm:focus:w-64 lg:focus:w-72 focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear goal search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:bg-column hover:text-text-primary cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

          </div>
        </header>

        {/* Sprint Dashboard */}
        {activeSprint && (
          <div className="px-8 pt-8">
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-indigo-500" />
                    <h3 className="text-lg font-bold text-text-primary">{activeSprint.name}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      activeSprint.status === 'active' ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      activeSprint.status === 'planned' ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" :
                      "bg-column text-text-muted border-border"
                    )}>
                      {activeSprint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted font-medium">
                    <div className="flex items-center gap-1.5">
                      <Folder size={14} className="text-text-muted" aria-hidden="true" />
                      <span>{activeSprintProject?.name ?? 'Unknown project'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-text-muted" />
                      <span>{new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Sprint Progress</span>
                    <span className="text-xs font-bold text-text-primary">{completedGoalsCount} / {totalGoalsCount} goals completed</span>
                  </div>
                  <div className="h-2 bg-column rounded-full overflow-hidden border border-border/30">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{completedGoalsCount}</p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{remainingGoalsCount}</p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Remaining</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeEpic && (
          <div className="px-4 pt-6 sm:px-8 sm:pt-8">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Layers size={18} className="text-violet-500" aria-hidden="true" />
                    <h3 className="truncate text-lg font-bold text-text-primary">{activeEpic.name}</h3>
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">{activeEpic.status}</span>
                  </div>
                  {activeEpic.description && <p className="mt-2 max-w-2xl text-sm text-text-secondary">{activeEpic.description}</p>}
                </div>
                <div className="w-full max-w-md">
                  <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold">
                    <span className="uppercase tracking-wider text-text-muted">Epic progress</span>
                    <span className="text-text-primary">{activeEpicCompletedGoals} / {activeEpicGoals.length} goals completed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-column border border-border/30" role="progressbar" aria-label={`${activeEpic.name} progress`} aria-valuenow={activeEpicProgress} aria-valuemin={0} aria-valuemax={100}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${activeEpicProgress}%` }} className="h-full rounded-full bg-violet-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <main className="flex-1 overflow-x-auto bg-bg px-4 py-6 sm:p-8">
          <div className="h-full">
            <div className="mb-3">
              <p className="text-xs font-medium text-text-muted">
                {workflowColumns.length} workflow {workflowColumns.length === 1 ? 'stage' : 'stages'}
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div
                className="kanban-board-grid"
                style={{
                  gridTemplateColumns: `repeat(${workflowColumns.length}, minmax(18rem, 1fr))`,
                  minWidth: `calc(${workflowColumns.length} * 18rem + ${Math.max(0, workflowColumns.length - 1)} * 1.25rem)`,
                }}
              >
                {workflowColumns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    goals={filteredGoals.filter(g => g.status === col.id)}
                    allGoals={goals}
                    labels={labels}
                    sprints={sprints}
                    epics={epics}
                    onDelete={deleteGoal}
                    onAdd={openNewGoalModal}
                    onEdit={openGoalDetails}
                    onToggleChecklist={toggleChecklistItem}
                    onUpdateNumeric={updateNumericProgress}
                    onUpdateLifecycle={updateGoalLifecycle}
                    onTogglePlannedForToday={togglePlannedForToday}
                    onAssignSprint={assignGoalToSprint}
                    onAssignEpic={assignGoalToEpic}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.5',
                    },
                  },
                }),
              }}>
                {activeGoal ? <StaticGoalCard goal={activeGoal} allGoals={goals} labels={labels} epics={epics} onEdit={openGoalDetails} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
          </>
        )}

        {/* Floating Quick Action Bar in Bottom-Right Corner */}
        {!isJsonGuideOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--card) 85%, transparent)',
              borderColor: 'var(--border)',
            }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border p-2 shadow-2xl backdrop-blur-md"
            role="region"
            aria-label="Quick actions"
          >
            <button
              type="button"
              onClick={openCreateSprintModal}
              style={{
                backgroundColor: 'var(--sprint-bg)',
                color: 'var(--sprint-text)',
                borderColor: 'var(--sprint-border)',
              }}
              className="btn btn-sm border font-bold gap-1.5 shadow-xs transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 cursor-pointer"
              aria-label={`Add sprint for ${activeProject?.name ?? 'current project'}`}
              title="Create a new sprint"
            >
              <Icon name="bolt" size={15} style={{ color: 'var(--sprint-text)' }} />
              <span className="hidden sm:inline">Add Sprint</span>
              <span className="sm:hidden">Sprint</span>
            </button>
            <button
              type="button"
              onClick={openCreateEpicModal}
              style={{
                backgroundColor: 'var(--epic-bg)',
                color: 'var(--epic-text)',
                borderColor: 'var(--epic-border)',
              }}
              className="btn btn-sm border font-bold gap-1.5 shadow-xs transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 cursor-pointer"
              aria-label={`Add epic for ${activeProject?.name ?? 'current project'}`}
              title="Create a new epic"
            >
              <Icon name="diamond" size={15} style={{ color: 'var(--epic-text)' }} />
              <span className="hidden sm:inline">Add Epic</span>
              <span className="sm:hidden">Epic</span>
            </button>
            <SparkleWrapper 
              isSparkling={hasEmptyColumn}
              tooltip={hasEmptyColumn ? "Some stages have no goals — click to create a new goal!" : "Create a new goal"}
            >
              <button
                type="button"
                onClick={() => openNewGoalModal()}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
                className={cn(
                  "btn btn-sm sm:btn-md font-bold gap-1.5 border-none shadow-md shadow-accent/25 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 cursor-pointer relative",
                  hasEmptyColumn && "ring-2 ring-amber-300/80 shadow-lg shadow-indigo-500/30"
                )}
                aria-label={hasEmptyColumn ? "Create a new goal (some stages are empty)" : "Create a new goal"}
                title={hasEmptyColumn ? "Some stages have no goals — click to create a new goal!" : "Create a new goal"}
              >
                {hasEmptyColumn ? (
                  <Sparkles size={17} className="text-amber-300 fill-amber-300 animate-pulse shrink-0" />
                ) : (
                  <Icon name="add" size={18} className="transition-transform duration-200 group-hover:rotate-90 shrink-0" />
                )}
                <span>New Goal</span>
              </button>
            </SparkleWrapper>
          </motion.div>
        )}
      </div>

      {/* Sprint Modal */}
      <AnimatePresence>
        {isSprintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSprintModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-box relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-0 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{editingSprintId ? 'Edit Sprint' : 'New Sprint'}</h2>
                    <p className="text-sm text-slate-500 mt-1">Define the project and execution window.</p>
                  </div>
                  <button 
                    onClick={closeSprintModal}
                    className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-600"
                    aria-label="Close sprint form"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={addSprint} className="space-y-6">
                  <div>
                    <label htmlFor="sprint-project" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Project
                    </label>
                    <select
                      id="sprint-project"
                      required
                      value={sprintProjectId}
                      onChange={(event) => {
                        setSprintProjectId(event.target.value);
                        setSprintFormError(null);
                      }}
                      className="select select-bordered w-full rounded-2xl font-semibold text-slate-900 bg-slate-50"
                    >
                      <option value="" disabled>Choose a project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                    {!editingSprintId && sprintProjectId === activeProjectId && (
                      <p className="mt-1.5 text-xs text-slate-400">Preselected from the current project.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Sprint Name
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={sprintName}
                      onChange={(e) => setSprintName(e.target.value)}
                      placeholder="e.g. Q1 Growth Sprint"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Length
                      </label>
                      <select
                        value={sprintLength}
                        onChange={(e) => setSprintLength(e.target.value as SprintLength)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="1-week">1 Week</option>
                        <option value="2-weeks">2 Weeks</option>
                        <option value="1-month">1 Month</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={sprintStartDate}
                        onChange={(e) => setSprintStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      End Date {sprintLength !== 'custom' && '(Auto-calculated)'}
                    </label>
                    <input
                      type="date"
                      value={sprintEndDate}
                      onChange={(e) => setSprintEndDate(e.target.value)}
                      readOnly={sprintLength !== 'custom'}
                      className={cn(
                        "w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all",
                        sprintLength === 'custom' 
                          ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                          : "bg-slate-100 border-transparent text-slate-500 cursor-not-allowed"
                      )}
                    />
                  </div>

                  {sprintFormError && <p role="alert" className="text-sm font-semibold text-rose-600">{sprintFormError}</p>}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeSprintModal}
                      className="btn btn-ghost flex-1 rounded-2xl text-sm font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'var(--accent-text)',
                      }}
                      className="btn flex-2 rounded-2xl text-sm font-bold border-none shadow-lg shadow-accent/25 transition-all hover:brightness-110"
                    >
                      {editingSprintId ? 'Save Sprint' : 'Create Sprint'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Epic Modal */}
      <AnimatePresence>
        {isEpicModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEpicModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} role="dialog" aria-modal="true" aria-labelledby="epic-modal-title" className="modal-box relative w-full max-w-lg rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <h2 id="epic-modal-title" className="text-2xl font-bold">{editingEpicId ? 'Edit Epic' : 'New Epic'}</h2>
                  <p className="mt-1 text-sm text-slate-500">Group related goals across stages and sprints in {activeProject?.name}.</p>
                </div>
                <button type="button" onClick={closeEpicModal} className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-600" aria-label="Close epic form"><X size={20} /></button>
              </div>
              <form onSubmit={saveEpic} className="space-y-5">
                <div>
                  <label htmlFor="epic-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Epic name</label>
                  <input id="epic-name" autoFocus required value={epicName} onChange={(event) => { setEpicName(event.target.value); setEpicFormError(null); }} placeholder="e.g. Customer onboarding" className="input input-bordered w-full rounded-2xl font-medium" />
                </div>
                <div>
                  <label htmlFor="epic-description" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Description</label>
                  <textarea id="epic-description" value={epicDescription} onChange={(event) => setEpicDescription(event.target.value)} rows={3} placeholder="What outcome does this epic deliver?" className="textarea textarea-bordered w-full rounded-2xl text-sm font-medium" />
                </div>
                <div>
                  <label htmlFor="epic-status" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Status</label>
                  <select id="epic-status" value={epicStatus} onChange={(event) => setEpicStatus(event.target.value as EpicStatus)} className="select select-bordered w-full rounded-2xl font-semibold bg-slate-50">
                    <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
                  </select>
                </div>
                {epicFormError && <p role="alert" className="text-sm font-semibold text-rose-600">{epicFormError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeEpicModal} className="btn btn-ghost flex-1 rounded-xl text-sm font-bold text-slate-600">Cancel</button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                    className="btn flex-1 rounded-xl text-sm font-bold border-none shadow-lg shadow-accent/25 transition-all hover:brightness-110"
                  >
                    {editingEpicId ? 'Save Epic' : 'Create Epic'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sprint project move confirmation */}
      <AnimatePresence>
        {pendingSprintMove && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="sprint-move-title"
              className="relative w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
              <h2 id="sprint-move-title" className="text-xl font-bold">Move sprint and its goals?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                “{pendingSprintMove.sprint.name}” has {pendingSprintMove.goalsToMove.length} {pendingSprintMove.goalsToMove.length === 1 ? 'goal' : 'goals'} that must move to {projects.find(project => project.id === pendingSprintMove.sprint.projectId)?.name} with the sprint.
              </p>

              {pendingSprintMove.goalsNeedingStage.length > 0 && (
                <div className="mt-5">
                  <label htmlFor="sprint-move-stage" className="block text-sm font-bold text-slate-800">
                    Destination stage for {pendingSprintMove.goalsNeedingStage.length} unmatched {pendingSprintMove.goalsNeedingStage.length === 1 ? 'goal' : 'goals'}
                  </label>
                  <select
                    id="sprint-move-stage"
                    value={sprintMoveGoalStageId}
                    onChange={(event) => setSprintMoveGoalStageId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="">Choose a destination stage</option>
                    {projects.find(project => project.id === pendingSprintMove.sprint.projectId)?.workflowColumns.map(column => (
                      <option key={column.id} value={column.id}>{column.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setPendingSprintMove(null);
                    setSprintMoveGoalStageId('');
                  }}
                  className="flex-1 rounded-xl px-4 py-3 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={pendingSprintMove.goalsNeedingStage.length > 0 && !sprintMoveGoalStageId}
                  onClick={() => commitSprint(pendingSprintMove.sprint, pendingSprintMove.goalsToMove, sprintMoveGoalStageId)}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Move sprint and goals
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProjectModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-form-title"
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
              <h2 id="project-form-title" className="mb-6 text-2xl font-bold text-slate-900">
                {editingProjectId ? 'Edit Project' : 'Create Project'}
              </h2>
              <form onSubmit={addProject} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Project Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Personal Growth, Q1 Goals"
                    className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <WorkflowConfigurator
                  columns={projectWorkflowColumns}
                  baseColumns={projectWorkflowBaseColumns}
                  error={projectWorkflowError}
                  onChange={setProjectWorkflowColumns}
                  onError={setProjectWorkflowError}
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeProjectModal}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                    className="btn flex-1 rounded-xl font-semibold border-none shadow-lg shadow-accent/25 transition-all hover:brightness-110"
                  >
                    {editingProjectId ? 'Save Project' : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project deletion confirmation */}
      <AnimatePresence>
        {projectPendingDeletion && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-project-title"
              className="relative w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
              <h2 id="delete-project-title" className="text-xl font-bold">Delete project with active sprints?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                “{projects.find(project => project.id === projectPendingDeletion)?.name}” has {sprints.filter(sprint => sprint.projectId === projectPendingDeletion && sprint.status === 'active').length} active {sprints.filter(sprint => sprint.projectId === projectPendingDeletion && sprint.status === 'active').length === 1 ? 'sprint' : 'sprints'}. Deleting the project also deletes its sprints and goals. This cannot be undone.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setProjectPendingDeletion(null)}
                  className="flex-1 rounded-xl px-4 py-3 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => performDeleteProject(projectPendingDeletion)}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-bold text-white hover:bg-rose-700"
                >
                  Delete project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workflow goal migration confirmation */}
      <AnimatePresence>
        {pendingWorkflowColumns && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="workflow-migration-title"
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
              <h2 id="workflow-migration-title" className="text-xl font-bold">Move goals before saving</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                This project workflow removes stages that contain goals. Choose a destination for each affected stage; the project and goal moves will be saved together.
              </p>

              <div className="mt-5 space-y-4">
                {pendingRemovedWorkflowColumns.map(column => {
                  const goalCount = goals.filter(goal => goal.projectId === editingProjectId && goal.status === column.id).length;
                  return (
                    <div key={column.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label htmlFor={`migration-${column.id}`} className="block text-sm font-bold text-slate-800">
                        {column.title} <span className="font-medium text-slate-500">({goalCount} {goalCount === 1 ? 'goal' : 'goals'})</span>
                      </label>
                      <select
                        id={`migration-${column.id}`}
                        value={workflowGoalMigrations[column.id] ?? ''}
                        onChange={(event) => setWorkflowGoalMigrations(current => ({ ...current, [column.id]: event.target.value }))}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                      >
                        <option value="">Choose a destination stage</option>
                        {pendingWorkflowColumns.map(destination => (
                          <option key={destination.id} value={destination.id}>{destination.title}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setPendingWorkflowColumns(null);
                    setWorkflowGoalMigrations({});
                  }}
                  className="flex-1 rounded-xl px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!workflowMigrationsComplete}
                  onClick={() => commitProject(pendingWorkflowColumns, workflowGoalMigrations)}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save project and move goals
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-box relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 my-8 text-slate-900"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingGoalId ? 'Edit' : 'New'} {activeBoard} Goal
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={addGoal} className="space-y-6">
                {/* Primary Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Title</label>
                    <input
                      autoFocus
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What do you want to achieve?"
                      className="input input-bordered w-full rounded-2xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description (Markdown Supported)</label>
                    <MarkdownEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Add some context, checklist, or details with Markdown..."
                      minRows={2}
                    />
                  </div>
                </div>

                {/* Tracking & Timeline */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Priority</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                            priority === p 
                              ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Due Date</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Workflow Status
                  </label>
                  <select
                    value={newGoalStatus}
                    onChange={(e) => setNewGoalStatus(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {workflowColumns.map(column => (
                      <option key={column.id} value={column.id} className="text-slate-900 bg-white">
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="goal-epic" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Epic (Optional)
                  </label>
                  <select
                    id="goal-epic"
                    value={epicId}
                    onChange={(event) => setEpicId(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="">No Epic</option>
                    {epics.filter(epic => epic.projectId === activeProjectId && (epic.status !== 'archived' || epic.id === epicId)).map(epic => (
                      <option key={epic.id} value={epic.id}>{epic.name} ({epic.status})</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Epics can group goals across workflow stages and sprints.</p>
                </div>

                {/* Sprint Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Sprint (Optional)
                    </label>
                    <select
                      value={sprintId}
                      onChange={(e) => setSprintId(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="" className="text-slate-900 bg-white">No Sprint</option>
                      {sprints.filter(s => s.projectId === activeProjectId).map(sprint => (
                        <option key={sprint.id} value={sprint.id} className="text-slate-900 bg-white">
                          {sprint.name} ({new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={plannedForToday}
                          onChange={(e) => setPlannedForToday(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-10 h-6 rounded-full transition-colors duration-200",
                          plannedForToday ? "bg-amber-500" : "bg-slate-200"
                        )} />
                        <div className={cn(
                          "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200",
                          plannedForToday ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">Planned for Today</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Focus on this goal today</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Labels */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map(label => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => {
                          if (labelIds.includes(label.id)) {
                            setLabelIds(labelIds.filter(id => id !== label.id));
                          } else {
                            setLabelIds([...labelIds, label.id]);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 group",
                          labelIds.includes(label.id)
                            ? cn(label.color, "text-white border-transparent")
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {label.name}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLabelId(label.id);
                              setNewLabelName(label.name);
                              setNewLabelColor(label.color);
                            }}
                            className={cn(
                              "p-0.5 rounded-full",
                              labelIds.includes(label.id) ? "hover:bg-white/20" : "hover:bg-slate-200 text-slate-600"
                            )}
                          >
                            <Edit2 size={10} />
                          </div>
                          <div 
                            onClick={(e) => deleteLabel(label.id, e)}
                            className={cn(
                              "p-0.5 rounded-full",
                              labelIds.includes(label.id) ? "hover:bg-white/20" : "hover:bg-slate-200 text-slate-600"
                            )}
                          >
                            <X size={12} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="New label name..."
                      className="flex-1 px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          createLabel();
                        }
                      }}
                    />
                    <select
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="bg-indigo-500" className="text-slate-900 bg-white">Indigo</option>
                      <option value="bg-blue-500" className="text-slate-900 bg-white">Blue</option>
                      <option value="bg-emerald-500" className="text-slate-900 bg-white">Emerald</option>
                      <option value="bg-amber-500" className="text-slate-900 bg-white">Amber</option>
                      <option value="bg-rose-500" className="text-slate-900 bg-white">Rose</option>
                      <option value="bg-purple-500" className="text-slate-900 bg-white">Purple</option>
                      <option value="bg-slate-500" className="text-slate-900 bg-white">Slate</option>
                    </select>
                    <button
                      type="button"
                      onClick={createLabel}
                      disabled={!newLabelName.trim()}
                      className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-sm font-bold hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingLabelId ? 'Save' : 'Add'}
                    </button>
                    {editingLabelId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLabelId(null);
                          setNewLabelName('');
                          setNewLabelColor('bg-indigo-500');
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Success Measurement */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Success Measurement</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMetricType('checklist')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          metricType === 'checklist' ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                        )}
                        title="Checklist"
                      >
                        <ListTodo size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricType('milestones')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          metricType === 'milestones' ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                        )}
                        title="Milestones"
                      >
                        <Flag size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricType('numeric')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          metricType === 'numeric' ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                        )}
                        title="Numeric Target"
                      >
                        <Target size={16} />
                      </button>
                    </div>
                  </div>

                  {metricType === 'numeric' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          placeholder="Target Value"
                          className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder="Unit (e.g. km, %)"
                          className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {checklistItems.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateChecklistItem(index, e.target.value)}
                            placeholder={metricType === 'milestones' ? `Milestone ${index + 1}` : `Task ${index + 1}`}
                            className="flex-1 px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 mt-1"
                      >
                        <Plus size={12} />
                        {metricType === 'milestones' ? 'Add Milestone' : 'Add Task'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-ghost flex-1 rounded-xl font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                    className="btn flex-1 rounded-xl font-bold border-none shadow-lg shadow-accent/25 transition-all hover:brightness-110"
                  >
                    {editingGoalId ? 'Save Changes' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GitHub-Issue Goal Details Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <GoalDetailModal
            goal={selectedGoal}
            allGoals={goals}
            projects={projects}
            workflowColumns={workflowColumns}
            labels={labels}
            sprints={sprints}
            epics={epics}
            onUpdateGoal={(updatedGoal) => {
              setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
            }}
            onDeleteGoal={(id) => {
              deleteGoal(id);
              closeGoalDetails();
            }}
            onCreateLabel={(name, color) => {
              const newLabel: Label = {
                id: Math.random().toString(36).substring(2, 9),
                name,
                color,
              };
              setLabels(prev => [...prev, newLabel]);
              return newLabel;
            }}
            onClose={closeGoalDetails}
          />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Import Data</h2>
                <button 
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError(null);
                    setImportData(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {importResult ? (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700">
                  <Check size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm mb-1">Import Successful</h3>
                    <p className="text-xs">{importResult}</p>
                  </div>
                </div>
              ) : importError ? (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm mb-1">Invalid Backup File</h3>
                    <p className="text-xs">{importError}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 space-y-3">
                    <label className={cn("block p-4 rounded-2xl border-2 cursor-pointer transition-all", importMode === 'replace' ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300")}>
                      <input type="radio" className="hidden" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                      <h3 className="font-bold text-sm text-slate-900">Replace All Data</h3>
                      <p className="text-xs text-slate-500">Completely replace your current workspace with the imported data.</p>
                    </label>
                    <label className={cn("block p-4 rounded-2xl border-2 cursor-pointer transition-all", importMode === 'add' ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300")}>
                      <input type="radio" className="hidden" checked={importMode === 'add'} onChange={() => setImportMode('add')} />
                      <h3 className="font-bold text-sm text-slate-900">Add Missing Items</h3>
                      <p className="text-xs text-slate-500">Only add new projects, goals, and sprints. Existing data will be kept.</p>
                    </label>
                  </div>
                  
                  {importMode === 'add' && importSummary && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-900 mb-2">Preview Summary:</p>
                      <p>{importSummary.newProjects} new projects will be added</p>
                      <p>{importSummary.newGoals} new goals will be added</p>
                      <p>{importSummary.newSprints} new sprints will be added</p>
                      <p>{importSummary.newEpics} new epics will be added</p>
                      <p>{importSummary.newLabels} new labels will be added</p>
                      <p className="text-slate-400 mt-2">{importSummary.skippedProjects + importSummary.skippedGoals + importSummary.skippedSprints + importSummary.skippedEpics + importSummary.skippedLabels} items will be skipped</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError(null);
                    setImportData(null);
                    setImportResult(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {importResult ? 'Close' : 'Cancel'}
                </button>
                {!importError && !importResult && (
                  <button
                    onClick={confirmImport}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {importMode === 'replace' ? 'Replace Data' : 'Add Missing Items'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {isAboutModalOpen && (
          <AboutModal onClose={() => setIsAboutModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
