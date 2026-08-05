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
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { getLocalStorageItemWithMigration, isLocalStorageAvailable, PREVIOUS_STORAGE_KEYS, setLocalStorageItem, STORAGE_KEYS } from './lib/storage';
import { Goal, GoalStatus, BoardType, DEFAULT_WORKFLOW_COLUMNS, WorkflowColumn, Project, Priority, SuccessMetricType, SuccessMetric, Sprint, SprintLength, GoalLifecycleStatus, SprintStatus, Label } from './types';
import { JsonGuide } from './components/JsonGuide';
import { AboutModal } from './components/AboutModal';
import { ThemePicker } from './components/ThemePicker';

// --- Components ---

interface GoalCardProps {
  goal: Goal;
  labels: Label[];
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}

interface SortableGoalCardProps {
  goal: Goal;
  labels: Label[];
  sprints: Sprint[];
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
  onAssignSprint: (goalId: string, sprintId: string | null) => void;
}

const SortableGoalCard = ({ goal, labels, sprints, onDelete, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday, onAssignSprint }: SortableGoalCardProps) => {
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false);
  const sprintMenuRef = useRef<HTMLDivElement>(null);
  const sprintButtonRef = useRef<HTMLButtonElement>(null);
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
      case 'high': return 'text-rose-500 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
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
              "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
              getPriorityColor(goal.priority)
            )}>
              {goal.priority}
            </div>
            {goal.plannedForToday && (
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-600 border-amber-100">
                <Zap size={8} className="mr-1 fill-amber-500" />
                Today
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {goal.lifecycleStatus === 'completed' && (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            )}
            <h4 className={cn(
              "font-semibold text-slate-800 leading-tight",
              goal.lifecycleStatus === 'completed' && "text-slate-400 line-through"
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
          isSprintMenuOpen && "z-30 opacity-100"
        )}>
          <div 
            {...attributes} 
            {...listeners}
            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </div>
          <div ref={sprintMenuRef} className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              ref={sprintButtonRef}
              type="button"
              disabled={!goal.projectId}
              onClick={() => setIsSprintMenuOpen(open => !open)}
              className={cn(
                "rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                currentSprint ? "text-indigo-500 hover:text-indigo-700" : "text-slate-300 hover:text-indigo-500",
                "disabled:cursor-not-allowed disabled:opacity-30"
              )}
              aria-label={sprintActionLabel}
              aria-haspopup="menu"
              aria-expanded={isSprintMenuOpen}
              title={sprintActionLabel}
            >
              <Zap size={14} className={currentSprint ? "fill-indigo-100" : ""} aria-hidden="true" />
            </button>

            {isSprintMenuOpen && (
              <div
                role="menu"
                aria-label="Sprint assignment"
                className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl"
              >
                <div className="px-2 py-2">
                  <p className="text-xs font-bold text-slate-800">{sprintActionLabel}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
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
                          "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          selected && "bg-indigo-50"
                        )}
                      >
                        <span className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 text-transparent"
                        )}>
                          <Check size={11} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-800">{sprint.name}</span>
                          <span className="block text-[9px] font-medium capitalize text-slate-400">{sprint.status}</span>
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="px-2.5 py-3 text-xs text-slate-500">No active or upcoming sprints.</p>
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
                    className="mt-1 w-full border-t border-slate-100 px-2.5 py-2.5 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    Remove from sprint
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal.id);
            }}
            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          {goal.lifecycleStatus !== 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'completed');
              }}
              className="p-1 text-slate-300 hover:text-emerald-500 transition-colors"
              title="Mark Complete"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          {goal.lifecycleStatus === 'archived' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'active');
              }}
              className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"
              title="Restore"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateLifecycle(goal.id, 'archived');
              }}
              className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
              title="Archive"
            >
              <Archive size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlannedForToday(goal.id);
            }}
            className={cn(
              "p-1 transition-colors",
              goal.plannedForToday ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
            )}
            title={goal.plannedForToday ? "Remove from Today" : "Plan for Today"}
          >
            <Zap size={14} className={goal.plannedForToday ? "fill-amber-500" : ""} />
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{goal.description}</p>
      
      {goal.successMetric && (
        <div className="mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1">
              {goal.successMetric.type === 'checklist' && <ListTodo size={10} />}
              {goal.successMetric.type === 'milestones' && <Flag size={10} />}
              {goal.successMetric.type === 'numeric' && <Target size={10} />}
              <span>Progress</span>
            </div>
            <span>
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
                  className="w-full flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-700 transition-colors text-left group/item"
                >
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center transition-colors",
                    item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 group-hover/item:border-slate-300"
                  )}>
                    {item.completed && <Check size={8} strokeWidth={4} />}
                  </div>
                  <span className={cn(item.completed && "line-through text-slate-300")}>{item.text}</span>
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
                  className="w-full flex items-start gap-3 text-[10px] text-slate-500 hover:text-slate-700 transition-colors text-left group/milestone relative"
                >
                  {/* Vertical line between milestones */}
                  {idx < (goal.successMetric.items?.length || 0) - 1 && (
                    <div className={cn(
                      "absolute left-[5px] top-[14px] w-[1px] h-[calc(100%+4px)]",
                      item.completed ? "bg-emerald-500" : "bg-slate-200"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-[11px] h-[11px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10 transition-all",
                    item.completed 
                      ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                      : "bg-white border-slate-200 group-hover/milestone:border-slate-300"
                  )} />
                  <span className={cn(
                    "font-medium leading-tight pt-0.5",
                    item.completed ? "text-emerald-600" : "text-slate-500"
                  )}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'numeric' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <Minus size={10} />
                </button>
                <button 
                  onClick={() => onUpdateNumeric(goal.id, 1)}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
          <Calendar size={10} />
          <span>{new Date(goal.createdAt).toLocaleDateString()}</span>
        </div>
        {goal.dueDate && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
            goal.dueDate < Date.now() ? "text-rose-500" : "text-slate-400"
          )}>
            <Clock size={10} />
            <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StaticGoalCard = ({ goal, labels }: { goal: Goal, labels: Label[] }) => {
  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-rose-500 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 w-full max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1.5 pr-6">
          <div className="flex flex-wrap gap-1">
            <div className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
              getPriorityColor(goal.priority)
            )}>
              {goal.priority}
            </div>
            {goal.plannedForToday && (
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-600 border-amber-100">
                <Zap size={8} className="mr-1 fill-amber-500" />
                Today
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {goal.lifecycleStatus === 'completed' && (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            )}
            <h4 className={cn(
              "font-semibold text-slate-800 leading-tight",
              goal.lifecycleStatus === 'completed' && "text-slate-400 line-through"
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
      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{goal.description}</p>
      
      {goal.successMetric && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1">
              {goal.successMetric.type === 'checklist' && <ListTodo size={10} />}
              {goal.successMetric.type === 'milestones' && <Flag size={10} />}
              {goal.successMetric.type === 'numeric' && <Target size={10} />}
              <span>Progress</span>
            </div>
            <span>
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
                  className="w-full flex items-center gap-2 text-[10px] text-slate-500 text-left"
                >
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center",
                    item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200"
                  )}>
                    {item.completed && <Check size={8} strokeWidth={4} />}
                  </div>
                  <span className={cn(item.completed && "line-through text-slate-300")}>{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'milestones' && (
            <div className="space-y-3 pl-1">
              {goal.successMetric.items?.map((item, idx) => (
                <div
                  key={item.id}
                  className="w-full flex items-start gap-3 text-[10px] text-slate-500 text-left relative"
                >
                  {/* Vertical line between milestones */}
                  {idx < (goal.successMetric.items?.length || 0) - 1 && (
                    <div className={cn(
                      "absolute left-[5px] top-[14px] w-[1px] h-[calc(100%+4px)]",
                      item.completed ? "bg-emerald-500" : "bg-slate-200"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-[11px] h-[11px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10",
                    item.completed ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-200"
                  )} />
                  <span className={cn(
                    "font-medium leading-tight pt-0.5",
                    item.completed ? "text-emerald-600" : "text-slate-500"
                  )}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {goal.successMetric.type === 'numeric' && (
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
          <Calendar size={10} />
          <span>{new Date(goal.createdAt).toLocaleDateString()}</span>
        </div>
        {goal.dueDate && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
            goal.dueDate < Date.now() ? "text-rose-500" : "text-slate-400"
          )}>
            <Clock size={10} />
            <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  id: GoalStatus;
  title: string;
  goals: Goal[];
  labels: Label[];
  sprints: Sprint[];
  onDelete: (id: string) => void;
  onAdd: (status: GoalStatus) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
  onAssignSprint: (goalId: string, sprintId: string | null) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, goals, labels, sprints, onDelete, onAdd, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday, onAssignSprint }) => {
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
        {goals.length > 0 && (
          <button
            type="button"
            onClick={() => onAdd(id)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-muted opacity-100 transition-all hover:border-border hover:bg-card hover:text-accent focus-visible:border-border focus-visible:bg-card focus-visible:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:pointer-events-none sm:opacity-0 sm:group-hover/column:pointer-events-auto sm:group-hover/column:opacity-100 sm:focus-visible:pointer-events-auto"
            aria-label={`Add goal to ${title}`}
            title={`Add goal to ${title}`}
          >
            <Plus size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="kanban-column__body">
        <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
          {goals.length === 0 ? (
            <div className="kanban-empty-state">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-text-muted">
                <Target size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-text">No goals in this stage</p>
                <button
                  type="button"
                  onClick={() => onAdd(id)}
                  className="mt-1 rounded-sm text-sm font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  aria-label={`Create a goal in ${title}`}
                >
                  Create a goal
                </button>
              </div>
            </div>
          ) : (
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
                    labels={labels}
                    sprints={sprints}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onToggleChecklist={onToggleChecklist}
                    onUpdateNumeric={onUpdateNumeric}
                    onUpdateLifecycle={onUpdateLifecycle}
                    onTogglePlannedForToday={onTogglePlannedForToday}
                    onAssignSprint={onAssignSprint}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
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
    className={cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all",
      active
        ? activeTone === 'amber'
          ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200"
          : "bg-indigo-50 text-indigo-700"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      className
    )}
  >
    {icon}
    <span className="min-w-0 flex-1">
      <span className="block truncate">{label}</span>
      {description && <span className="block truncate text-[9px] font-normal text-slate-400">{description}</span>}
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
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

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
    newLabels: number;
    skippedProjects: number;
    skippedGoals: number;
    skippedSprints: number;
    skippedLabels: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    const savedGoals = getLocalStorageItemWithMigration(STORAGE_KEYS.goals, PREVIOUS_STORAGE_KEYS.goals);
    const savedProjects = getLocalStorageItemWithMigration(STORAGE_KEYS.projects, PREVIOUS_STORAGE_KEYS.projects);
    const savedSprints = getLocalStorageItemWithMigration(STORAGE_KEYS.sprints, PREVIOUS_STORAGE_KEYS.sprints);
    const savedLabels = getLocalStorageItemWithMigration(STORAGE_KEYS.labels, PREVIOUS_STORAGE_KEYS.labels);
    const savedWorkflowColumns = getLocalStorageItemWithMigration(STORAGE_KEYS.workflowColumns, PREVIOUS_STORAGE_KEYS.workflowColumns);

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
        loadedGoals = Array.isArray(parsedGoals) ? parsedGoals : [];
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
      setLocalStorageItem(STORAGE_KEYS.labels, JSON.stringify(labels)),
      setLocalStorageItem(STORAGE_KEYS.workflowColumns, JSON.stringify(activeWorkflowForLegacy)),
    ].every(Boolean);
    if (!saved) setStorageAvailable(false);
  }, [goals, projects, sprints, labels, activeProjectId, hasLoadedStorage]);

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

    setGoals(currentGoals => currentGoals.map(item => item.id === goalId ? { ...item, sprintId: sprintId || undefined } : item));
    setSprints(currentSprints => currentSprints.map(sprint => ({
      ...sprint,
      goalIds: sprint.id === sprintId
        ? Array.from(new Set([...(sprint.goalIds ?? []), goalId]))
        : (sprint.goalIds ?? []).filter(id => id !== goalId),
    })));
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
      setActiveGoal(event.active.data.current.goal);
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
      setGoals(goals.map(g => g.id === editingGoalId ? {
        ...g,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        sprintId: sprintId || undefined,
        status: newGoalStatus,
        lifecycleStatus,
        successMetric,
        plannedForToday,
        labelIds
      } : g));
      setEditingGoalId(null);
    } else {
      const newGoal: Goal = {
        id: Math.random().toString(36).substring(2, 9),
        projectId: activeProjectId,
        sprintId: sprintId || undefined,
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
        createdAt: Date.now(),
      };
      setGoals([...goals, newGoal]);
    }

    resetGoalForm();
    setIsModalOpen(false);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setDescription(goal.description);
    setPriority(goal.priority);
    setDueDate(goal.dueDate ? new Date(goal.dueDate).toISOString().split('T')[0] : '');
    setSprintId(goal.sprintId || '');
    setNewGoalStatus(goal.status);
    setLifecycleStatus(goal.lifecycleStatus);
    setPlannedForToday(goal.plannedForToday || false);
    setLabelIds(goal.labelIds || []);
    setEditingLabelId(null);
    setNewLabelName('');
    setNewLabelColor('bg-indigo-500');
    if (goal.successMetric) {
      setMetricType(goal.successMetric.type);
      if (goal.successMetric.type === 'numeric') {
        setTargetValue(goal.successMetric.target?.toString() || '');
        setUnit(goal.successMetric.unit || '');
      } else if (goal.successMetric.type === 'checklist' || goal.successMetric.type === 'milestones') {
        setChecklistItems(goal.successMetric.items?.map(i => i.text) || ['']);
      }
    } else {
      setMetricType('checklist');
      setChecklistItems(['']);
    }
    setIsModalOpen(true);
  };

  const toggleChecklistItem = (goalId: string, itemId: string) => {
    setGoals(goals.map(g => {
      if (g.id === goalId && (g.successMetric?.type === 'checklist' || g.successMetric?.type === 'milestones')) {
        return {
          ...g,
          successMetric: {
            ...g.successMetric,
            items: g.successMetric.items?.map(item => 
              item.id === itemId ? { ...item, completed: !item.completed } : item
            )
          }
        };
      }
      return g;
    }));
  };

  const updateNumericProgress = (goalId: string, delta: number) => {
    setGoals(goals.map(g => {
      if (g.id === goalId && g.successMetric?.type === 'numeric') {
        const current = g.successMetric.current || 0;
        const target = g.successMetric.target || 1;
        return {
          ...g,
          successMetric: {
            ...g.successMetric,
            current: Math.max(0, Math.min(target, current + delta))
          }
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
        return { ...g, lifecycleStatus: status, status: newStatus };
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
    setGoals(goals.map(g => g.id === id ? { ...g, plannedForToday: !g.plannedForToday } : g));
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

  const exportData = () => {
    const data = {
      projects,
      goals,
      sprints,
      labels,
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
        const existingLabelIds = new Set(labels.map(l => l.id));

        const newProjects = parsed.projects.filter((p: Project) => !existingProjectIds.has(p.id));
        const newGoals = parsed.goals.filter((g: Goal) => !existingGoalIds.has(g.id));
        const newSprints = parsed.sprints.filter((s: Sprint) => !existingSprintIds.has(s.id));
        const newLabels = (parsed.labels || []).filter((l: Label) => !existingLabelIds.has(l.id));

        setImportSummary({
          newProjects: newProjects.length,
          newGoals: newGoals.length,
          newSprints: newSprints.length,
          newLabels: newLabels.length,
          skippedProjects: parsed.projects.length - newProjects.length,
          skippedGoals: parsed.goals.length - newGoals.length,
          skippedSprints: parsed.sprints.length - newSprints.length,
          skippedLabels: (parsed.labels || []).length - newLabels.length,
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
        const existingLabelIds = new Set(labels.map(l => l.id));
        const newProjects = importedProjects.filter((p: Project) => !existingProjectIds.has(p.id));
        const newGoals = importedGoals.filter((g: Goal) => !existingGoalIds.has(g.id));
        const newSprints = importedSprints.filter((s: Sprint) => !existingSprintIds.has(s.id));
        const newLabels = (parsed.labels || []).filter((l: Label) => !existingLabelIds.has(l.id));
        setProjects([...projects, ...newProjects]);
        setGoals([...goals, ...newGoals]);
        setSprints([...sprints, ...newSprints]);
        setLabels([...labels, ...newLabels]);

        setImportResult(`Import complete: ${newProjects.length} projects, ${newGoals.length} goals, ${newSprints.length} sprints, ${newLabels.length} labels added.`);
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

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <CheckCircle2 size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-text">KanbanGXP</h1>
        </div>

        <div className="border-b border-border p-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p id="goal-context-label" className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Goal context</p>
            <span className="text-[9px] font-semibold text-text-muted">{activeBoard}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-column p-1" role="radiogroup" aria-labelledby="goal-context-label">
            <button
              type="button"
              role="radio"
              aria-checked={activeBoard === 'Work'}
              aria-label="Show work goals"
              title="Show goals in the Work context"
              onClick={() => setActiveBoard('Work')}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
                activeBoard === 'Work'
                  ? "bg-card text-accent shadow-sm"
                  : "text-text-muted hover:bg-card/70 hover:text-text"
              )}
            >
              <Briefcase size={14} aria-hidden="true" />
              Work goals
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={activeBoard === 'Life'}
              aria-label="Show life goals"
              title="Show goals in the Life context"
              onClick={() => setActiveBoard('Life')}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
                activeBoard === 'Life'
                  ? "bg-card text-accent shadow-sm"
                  : "text-text-muted hover:bg-card/70 hover:text-text"
              )}
            >
              <Heart size={14} aria-hidden="true" />
              Life goals
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</h2>
              <button 
                onClick={openCreateProjectModal}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                aria-label="Create project"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {projects.map(project => (
                <div key={project.id} className="group relative">
                  <SidebarItem
                    onClick={() => setActiveProjectId(project.id)}
                    active={activeProjectId === project.id}
                    icon={<Folder size={16} className={activeProjectId === project.id ? "text-indigo-600" : "text-slate-400"} />}
                    label={project.name}
                    className="pr-14"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditProjectModal(project);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      aria-label={`Edit ${project.name}`}
                    >
                      <Edit2 size={12} />
                    </button>
                    {projects.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board-level views */}
          <div>
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Views</h2>
            </div>
            <div className="space-y-1">
              <SidebarItem
                onClick={() => {
                  setActiveSprintId(null);
                  setIsFocusMode(false);
                }}
                active={activeSprintId === null && !isFocusMode && !showArchived}
                icon={<LayoutGrid size={16} className={activeSprintId === null && !isFocusMode && !showArchived ? "text-indigo-600" : "text-slate-400"} />}
                label="All Goals"
              />
              <div className="relative">
                <SidebarItem
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  active={isFocusMode}
                  activeTone="amber"
                  icon={<Zap size={16} className={isFocusMode ? "fill-amber-500 text-amber-500" : "text-slate-400"} />}
                  label="Focus Mode"
                  className="pr-12"
                />
                {goals.filter(g => g.plannedForToday && g.lifecycleStatus !== 'completed').length > 0 && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {goals.filter(g => g.plannedForToday && g.lifecycleStatus !== 'completed').length}
                  </span>
                )}
              </div>
              {showArchived ? (
                <SidebarItem
                  onClick={() => setShowArchived(false)}
                  active
                  activeTone="amber"
                  icon={<ArrowLeft size={16} className="text-amber-600" />}
                  label="Exit archive"
                  ariaLabel="Exit archive and view active goals and sprints"
                  title="Return to active goals and sprints"
                />
              ) : (
                <SidebarItem
                  onClick={() => setShowArchived(true)}
                  icon={<Archive size={16} className="text-slate-400" />}
                  label="Archived goals"
                  ariaLabel="View archived goals and sprints"
                  title="Show archived goals and sprints"
                />
              )}
            </div>
          </div>

          {/* Sprints Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sprints</h2>
              <button 
                onClick={openCreateSprintModal}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                aria-label={`Create sprint for ${activeProject?.name ?? 'current project'}`}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {sprints
                .filter(s => s.projectId === activeProjectId && (showArchived ? s.status === 'archived' : s.status !== 'archived'))
                .map(sprint => (
                <div key={sprint.id} className="group relative">
                  <SidebarItem
                    onClick={() => setActiveSprintId(sprint.id)}
                    active={activeSprintId === sprint.id}
                    icon={<Zap size={16} className={activeSprintId === sprint.id ? "text-indigo-600" : "text-slate-400"} />}
                    label={sprint.name}
                    description={`${new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSprintModal(sprint);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      aria-label={`Edit ${sprint.name}`}
                    >
                      <Edit2 size={12} />
                    </button>
                    {sprint.status === 'archived' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSprintStatus(sprint.id, 'completed');
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Restore"
                      >
                        <RotateCcw size={12} />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSprintStatus(sprint.id, 'archived');
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                        title="Archive"
                      >
                        <Archive size={12} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSprint(sprint.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Labels</h2>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Filters</span>
            </div>
            <div className="space-y-1">
              <SidebarItem
                onClick={() => setActiveLabelFilter(null)}
                active={activeLabelFilter === null}
                icon={<Tag size={16} className={activeLabelFilter === null ? "text-indigo-600" : "text-slate-400"} />}
                label="All Labels"
              />
              {labels.map(label => (
                <SidebarItem
                  key={label.id}
                  onClick={() => setActiveLabelFilter(label.id)}
                  active={activeLabelFilter === label.id}
                  icon={<span className={cn("h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10", label.color)} aria-hidden="true" />}
                  label={label.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center justify-between p-4 bg-sidebar rounded-2xl hover:bg-sidebar/80 transition-colors border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Settings size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-text">Settings</p>
                <p className="text-[10px] text-text-muted">Local Storage Only</p>
              </div>
            </div>
            {isSettingsOpen ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
          </button>
          {isSettingsOpen && (
            <div className="space-y-2 mt-2 p-2">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={15} className={cn(
                    "mt-0.5 shrink-0",
                    storageAvailable === false ? "text-rose-500" : storagePersistence === 'persistent' ? "text-emerald-500" : "text-amber-500"
                  )} />
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
                        ? 'This browser is blocking local storage. Changes may be lost; allow site data in browser settings.'
                        : storagePersistence === 'persistent'
                          ? 'The browser will retain this origin’s data unless you explicitly clear it.'
                          : 'Data stays in this browser profile and may be cleared by browser privacy or storage policies.'}
                    </p>
                    {storageAvailable && (storagePersistence === 'available' || storagePersistence === 'denied') && (
                      <button
                        type="button"
                        onClick={requestPersistentStorage}
                        className="mt-2 w-full rounded-lg bg-accent px-2 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                      >
                        Protect local data
                      </button>
                    )}
                    {storagePersistence === 'denied' && (
                      <p className="mt-1 text-[9px] leading-relaxed text-amber-600">The browser did not grant persistent storage. Export regular backups.</p>
                    )}
                    {storagePersistence === 'unsupported' && storageAvailable && (
                      <p className="mt-1 text-[9px] leading-relaxed text-text-muted">Persistent-storage requests are not supported here. Export regular backups.</p>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={exportData}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors"
              >
                <Download size={14} />
                <span>Export Data</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors"
              >
                <Upload size={14} />
                <span>Import Data</span>
              </button>
              <button 
                onClick={() => setIsJsonGuideOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors"
              >
                <FileJson size={14} />
                <span>JSON Guide</span>
              </button>
              <button 
                onClick={() => setIsAboutModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-text hover:bg-border/50 transition-colors"
              >
                <Info size={14} />
                <span>About</span>
              </button>
              <div className="pt-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Themes</p>
                <ThemePicker />
              </div>
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {isJsonGuideOpen ? (
          <JsonGuide onClose={() => setIsJsonGuideOpen(false)} />
        ) : isFocusMode ? (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
            <header className="px-8 py-12 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 shadow-xl shadow-amber-100/50">
                <Zap size={32} className="fill-amber-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Focus Mode</h2>
                <p className="text-slate-500 font-medium">Concentrate on what matters right now.</p>
              </div>
              <button 
                onClick={() => setIsFocusMode(false)}
                className="px-6 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                Exit Focus Mode
              </button>
            </header>

            <main className="px-8 pb-20 max-w-4xl mx-auto w-full space-y-12">
              {focusGoals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                    <Target size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Nothing planned for today</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Go back to your board and mark some goals as "Planned for Today" to see them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {focusGoals.map(goal => (
                    <div key={goal.id} className="group relative">
                      <StaticGoalCard goal={goal} labels={labels} />
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(goal)}
                          className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit Goal"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => updateGoalLifecycle(goal.id, 'completed')}
                          className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
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
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeProject?.name || 'Loading...'}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <LayoutGrid size={10} />
                <span>Kanban Board</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => openNewGoalModal()}
              className="order-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200/60 transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Plus size={17} aria-hidden="true" />
              New goal
            </button>
            <div className="relative order-2 w-full sm:order-1 sm:w-auto">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search goals..."
                aria-label="Search goals by title, description, or label"
                className="w-full sm:w-48 lg:w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all sm:focus:w-64 lg:focus:w-72 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear goal search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
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
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900">{activeSprint.name}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      activeSprint.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      activeSprint.status === 'planned' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                      "bg-slate-50 text-slate-600 border-slate-100"
                    )}>
                      {activeSprint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Folder size={14} className="text-slate-400" aria-hidden="true" />
                      <span>{activeSprintProject?.name ?? 'Unknown project'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sprint Progress</span>
                    <span className="text-xs font-bold text-slate-900">{completedGoalsCount} / {totalGoalsCount} goals completed</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{completedGoalsCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{remainingGoalsCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining</p>
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
                    labels={labels}
                    sprints={sprints}
                    onDelete={deleteGoal}
                    onAdd={openNewGoalModal}
                    onEdit={openEditModal}
                    onToggleChecklist={toggleChecklistItem}
                    onUpdateNumeric={updateNumericProgress}
                    onUpdateLifecycle={updateGoalLifecycle}
                    onTogglePlannedForToday={togglePlannedForToday}
                    onAssignSprint={assignGoalToSprint}
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
                {activeGoal ? <StaticGoalCard goal={activeGoal} labels={labels} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
          </>
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{editingSprintId ? 'Edit Sprint' : 'New Sprint'}</h2>
                    <p className="text-sm text-slate-500 mt-1">Define the project and execution window.</p>
                  </div>
                  <button 
                    onClick={closeSprintModal}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                      className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
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
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
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
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 my-8 text-slate-900"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingGoalId ? 'Edit' : 'New'} {activeBoard} Goal
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
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
                      className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some context or details..."
                      rows={2}
                      className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm font-medium"
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
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {editingGoalId ? 'Save Changes' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
                      <p>{importSummary.newLabels} new labels will be added</p>
                      <p className="text-slate-400 mt-2">{importSummary.skippedProjects + importSummary.skippedGoals + importSummary.skippedSprints + importSummary.skippedLabels} items will be skipped</p>
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
