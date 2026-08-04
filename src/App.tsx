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
  ArrowRight,
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
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
}

const SortableGoalCard = ({ goal, labels, onDelete, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday }: SortableGoalCardProps) => {
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
          <div 
            {...attributes} 
            {...listeners}
            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
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
  onDelete: (id: string) => void;
  onAdd: (status: GoalStatus) => void;
  onEdit: (goal: Goal) => void;
  onToggleChecklist: (goalId: string, itemId: string) => void;
  onUpdateNumeric: (goalId: string, delta: number) => void;
  onUpdateLifecycle: (id: string, status: GoalLifecycleStatus) => void;
  onTogglePlannedForToday: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, goals, labels, onDelete, onAdd, onEdit, onToggleChecklist, onUpdateNumeric, onUpdateLifecycle, onTogglePlannedForToday }) => {
  const { setNodeRef } = useSortable({
    id: id,
    data: {
      type: 'Column',
      status: id,
    },
  });

  return (
    <div className="flex flex-col gap-4 w-[320px] shrink-0">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Circle size={16} className="text-indigo-400" />
          <h3 className="font-bold text-slate-700 uppercase tracking-tight text-sm">{title}</h3>
          <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {goals.length}
          </span>
        </div>
        <button 
          onClick={() => onAdd(id)}
          className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div ref={setNodeRef} className="kanban-column">
        <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
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
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggleChecklist={onToggleChecklist}
                  onUpdateNumeric={onUpdateNumeric}
                  onUpdateLifecycle={onUpdateLifecycle}
                  onTogglePlannedForToday={onTogglePlannedForToday}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeBoard, setActiveBoard] = useState<BoardType>('Work');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workflowColumns, setWorkflowColumns] = useState<WorkflowColumn[]>(DEFAULT_WORKFLOW_COLUMNS);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newGoalStatus, setNewGoalStatus] = useState<GoalStatus>(DEFAULT_WORKFLOW_COLUMNS[0].id);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnPendingDeletion, setColumnPendingDeletion] = useState<string | null>(null);
  const [columnMoveDestination, setColumnMoveDestination] = useState<string>('');
  
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
  const [sprintLength, setSprintLength] = useState<SprintLength>('2-weeks');
  const [sprintStartDate, setSprintStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sprintEndDate, setSprintEndDate] = useState<string>('');

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
    
    let loadedProjects: Project[] = [];
    if (savedProjects) {
      try {
        loadedProjects = JSON.parse(savedProjects);
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
      };
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    } else {
      setActiveProjectId(loadedProjects[0].id);
    }

    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch (e) {
        console.error('Failed to parse goals', e);
      }
    }

    if (savedWorkflowColumns) {
      try {
        const parsedColumns = JSON.parse(savedWorkflowColumns);
        if (Array.isArray(parsedColumns) && parsedColumns.length > 0) {
          setWorkflowColumns(parsedColumns);
        }
      } catch (e) {
        console.error('Failed to parse workflow columns', e);
      }
    }

    if (savedSprints) {
      try {
        setSprints(JSON.parse(savedSprints));
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
    if (projects.length > 0) {
      if (!setLocalStorageItem(STORAGE_KEYS.projects, JSON.stringify(projects))) setStorageAvailable(false);
    }
    const saved = [
      setLocalStorageItem(STORAGE_KEYS.goals, JSON.stringify(goals)),
      setLocalStorageItem(STORAGE_KEYS.sprints, JSON.stringify(sprints)),
      setLocalStorageItem(STORAGE_KEYS.labels, JSON.stringify(labels)),
      setLocalStorageItem(STORAGE_KEYS.workflowColumns, JSON.stringify(workflowColumns)),
    ].every(Boolean);
    if (!saved) setStorageAvailable(false);
  }, [goals, projects, sprints, labels, workflowColumns, hasLoadedStorage]);

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

  const activeProject = projects.find(p => p.id === activeProjectId);

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    if (editingProjectId) {
      setProjects(projects.map(p => p.id === editingProjectId ? { ...p, name: projectName } : p));
      setEditingProjectId(null);
    } else {
      const newProject: Project = {
        id: Math.random().toString(36).substring(2, 9),
        name: projectName,
        createdAt: Date.now(),
      };
      setProjects([...projects, newProject]);
      setActiveProjectId(newProject.id);
    }
    
    setProjectName('');
    setIsProjectModalOpen(false);
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return; // Keep at least one
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    setGoals(goals.filter(g => g.projectId !== id));
    setSprints(sprints.filter(s => s.projectId !== id));
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0].id);
    }
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

  const addSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim() || !activeProjectId) return;

    if (editingSprintId) {
      setSprints(sprints.map(s => s.id === editingSprintId ? {
        ...s,
        name: sprintName,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        length: sprintLength,
      } : s));
      setEditingSprintId(null);
    } else {
      const newSprint: Sprint = {
        id: Math.random().toString(36).substring(2, 9),
        projectId: activeProjectId,
        name: sprintName,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        length: sprintLength,
        status: 'planned',
        goalIds: [],
        createdAt: Date.now()
      };
      setSprints([...sprints, newSprint]);
    }

    setSprintName('');
    setIsSprintModalOpen(false);
  };

  const assignGoalToSprint = (goalId: string, sprintId: string | null) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, sprintId: sprintId || undefined } : g));
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

  const createWorkflowColumn = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newColumnName.trim();
    if (!title || workflowColumns.some(column => column.title.toLocaleLowerCase() === title.toLocaleLowerCase())) return;

    const newColumn: WorkflowColumn = {
      id: `column-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title,
    };
    setWorkflowColumns(columns => [...columns, newColumn]);
    setNewColumnName('');
  };

  const renameWorkflowColumn = (id: string, title: string) => {
    setWorkflowColumns(columns => columns.map(column => column.id === id ? { ...column, title } : column));
  };

  const normalizeWorkflowColumnName = (id: string) => {
    setWorkflowColumns(columns => columns.map(column =>
      column.id === id ? { ...column, title: column.title.trim() || 'Untitled' } : column
    ));
  };

  const moveWorkflowColumn = (id: string, direction: -1 | 1) => {
    setWorkflowColumns(columns => {
      const index = columns.findIndex(column => column.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= columns.length) return columns;
      return arrayMove(columns, index, destination);
    });
  };

  const requestWorkflowColumnDeletion = (id: string) => {
    if (workflowColumns.length <= 1) return;
    const destination = workflowColumns.find(column => column.id !== id)?.id ?? '';
    if (!goals.some(goal => goal.status === id)) {
      setWorkflowColumns(columns => columns.filter(column => column.id !== id));
      if (newGoalStatus === id) setNewGoalStatus(destination);
      return;
    }
    setColumnPendingDeletion(id);
    setColumnMoveDestination(destination);
  };

  const confirmWorkflowColumnDeletion = () => {
    if (!columnPendingDeletion || !columnMoveDestination) return;
    setGoals(currentGoals => currentGoals.map(goal =>
      goal.status === columnPendingDeletion ? { ...goal, status: columnMoveDestination } : goal
    ));
    setWorkflowColumns(columns => columns.filter(column => column.id !== columnPendingDeletion));
    if (newGoalStatus === columnPendingDeletion) setNewGoalStatus(columnMoveDestination);
    setColumnPendingDeletion(null);
    setColumnMoveDestination('');
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
      
      if (importMode === 'replace') {
        setProjects(parsed.projects);
        setGoals(parsed.goals);
        setSprints(parsed.sprints);
        if (parsed.labels) setLabels(parsed.labels);
        setWorkflowColumns(importedWorkflowColumns);
        setNewGoalStatus(importedWorkflowColumns[0].id);
        if (parsed.projects.length > 0) {
          setActiveProjectId(parsed.projects[0].id);
        }
        setActiveSprintId(null);
        setImportResult('Data replaced successfully.');
      } else {
        // Add missing items
        const existingProjectIds = new Set(projects.map(p => p.id));
        const existingGoalIds = new Set(goals.map(g => g.id));
        const existingSprintIds = new Set(sprints.map(s => s.id));
        const existingLabelIds = new Set(labels.map(l => l.id));
        const existingWorkflowColumnIds = new Set(workflowColumns.map(column => column.id));

        const newProjects = parsed.projects.filter((p: Project) => !existingProjectIds.has(p.id));
        const newGoals = parsed.goals.filter((g: Goal) => !existingGoalIds.has(g.id));
        const newSprints = parsed.sprints.filter((s: Sprint) => !existingSprintIds.has(s.id));
        const newLabels = (parsed.labels || []).filter((l: Label) => !existingLabelIds.has(l.id));
        const newWorkflowColumns = importedWorkflowColumns.filter(column => !existingWorkflowColumnIds.has(column.id));

        setProjects([...projects, ...newProjects]);
        setGoals([...goals, ...newGoals]);
        setSprints([...sprints, ...newSprints]);
        setLabels([...labels, ...newLabels]);
        setWorkflowColumns([...workflowColumns, ...newWorkflowColumns]);
        
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

  const activeSprint = sprints.find(s => s.id === activeSprintId);
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

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Focus</h2>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                  isFocusMode 
                    ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <Zap size={16} className={isFocusMode ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                <span className="truncate flex-1">Focus Mode</span>
                {goals.filter(g => g.plannedForToday && g.lifecycleStatus !== 'completed').length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {goals.filter(g => g.plannedForToday && g.lifecycleStatus !== 'completed').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</h2>
              <button 
                onClick={() => {
                  setEditingProjectId(null);
                  setProjectName('');
                  setIsProjectModalOpen(true);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {projects.map(project => (
                <div key={project.id} className="group relative">
                  <button
                    onClick={() => setActiveProjectId(project.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                      activeProjectId === project.id 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <Folder size={16} className={activeProjectId === project.id ? "text-indigo-600" : "text-slate-400"} />
                    <span className="truncate flex-1">{project.name}</span>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProjectId(project.id);
                        setProjectName(project.name);
                        setIsProjectModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
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

          {/* Sprints Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sprints</h2>
              <button 
                onClick={() => {
                  setEditingSprintId(null);
                  setSprintName('');
                  setSprintLength('2-weeks');
                  setSprintStartDate(new Date().toISOString().split('T')[0]);
                  setIsSprintModalOpen(true);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveSprintId(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                  activeSprintId === null 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <LayoutGrid size={16} className={activeSprintId === null ? "text-indigo-600" : "text-slate-400"} />
                <span className="truncate flex-1">All Goals</span>
              </button>
              {sprints
                .filter(s => s.projectId === activeProjectId && (showArchived ? s.status === 'archived' : s.status !== 'archived'))
                .map(sprint => (
                <div key={sprint.id} className="group relative">
                  <button
                    onClick={() => setActiveSprintId(sprint.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left pr-12",
                      activeSprintId === sprint.id 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <Zap size={16} className={activeSprintId === sprint.id ? "text-indigo-600" : "text-slate-400"} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{sprint.name}</span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSprintId(sprint.id);
                        setSprintName(sprint.name);
                        setSprintLength(sprint.length);
                        setSprintStartDate(sprint.startDate);
                        setSprintEndDate(sprint.endDate);
                        setIsSprintModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
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

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Labels</h2>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveLabelFilter(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                  activeLabelFilter === null 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <Tag size={16} className={activeLabelFilter === null ? "text-indigo-600" : "text-slate-400"} />
                <span className="truncate flex-1">All Labels</span>
              </button>
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => setActiveLabelFilter(label.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                    activeLabelFilter === label.id 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full", label.color)} />
                  <span className="truncate flex-1">{label.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Archive Toggle */}
          <div className="mt-auto pt-6">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                showArchived 
                  ? "bg-amber-50 text-amber-700" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Archive size={16} className={showArchived ? "text-amber-600" : "text-slate-400"} />
              <span className="truncate flex-1">{showArchived ? "Back to Active" : "View Archive"}</span>
            </button>
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

            <div className="order-1 flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveBoard('Work')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeBoard === 'Work' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Briefcase size={16} />
                Work
              </button>
              <button
                onClick={() => setActiveBoard('Life')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeBoard === 'Life' 
                    ? "bg-white text-rose-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Heart size={16} />
                Life
              </button>
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
        <main className="flex-1 p-8 overflow-x-auto bg-bg">
          <div className="h-full">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-text-muted">
                {workflowColumns.length} workflow {workflowColumns.length === 1 ? 'stage' : 'stages'}
              </p>
              <button
                type="button"
                onClick={() => setIsWorkflowModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-text shadow-sm transition-colors hover:bg-column"
              >
                <Settings size={14} />
                Customize workflow
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-8 h-full min-w-max">
                {workflowColumns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    goals={filteredGoals.filter(g => g.status === col.id)}
                    labels={labels}
                    onDelete={deleteGoal}
                    onAdd={(status) => {
                      setEditingGoalId(null);
                      resetGoalForm();
                      setNewGoalStatus(status);
                      setIsModalOpen(true);
                    }}
                    onEdit={openEditModal}
                    onToggleChecklist={toggleChecklistItem}
                    onUpdateNumeric={updateNumericProgress}
                    onUpdateLifecycle={updateGoalLifecycle}
                    onTogglePlannedForToday={togglePlannedForToday}
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
              onClick={() => setIsSprintModalOpen(false)}
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
                    <h2 className="text-2xl font-bold text-slate-900">New Sprint</h2>
                    <p className="text-sm text-slate-500 mt-1">Define your focused execution window.</p>
                  </div>
                  <button 
                    onClick={() => setIsSprintModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={addSprint} className="space-y-6">
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

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsSprintModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                    >
                      Create Sprint
                    </button>
                  </div>
                </form>
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
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-slate-900"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editingProjectId ? 'Rename Project' : 'New Project'}
              </h2>
              <form onSubmit={addProject} className="space-y-4">
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
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {editingProjectId ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workflow Columns Modal */}
      <AnimatePresence>
        {isWorkflowModalOpen && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWorkflowModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-slate-900 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Customize workflow</h2>
                  <p className="mt-1 text-sm text-slate-500">Rename stages or move them into the order your team uses.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWorkflowModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close workflow settings"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {workflowColumns.map((column, index) => (
                  <div key={column.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <GripVertical size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
                    <input
                      type="text"
                      value={column.title}
                      onChange={(event) => renameWorkflowColumn(column.id, event.target.value)}
                      onBlur={() => normalizeWorkflowColumnName(column.id)}
                      aria-label={`Rename ${column.title || 'workflow'} stage`}
                      className="min-w-0 flex-1 rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => moveWorkflowColumn(column.id, -1)}
                      disabled={index === 0}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-25"
                      aria-label={`Move ${column.title} left`}
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWorkflowColumn(column.id, 1)}
                      disabled={index === workflowColumns.length - 1}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-25"
                      aria-label={`Move ${column.title} right`}
                    >
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestWorkflowColumnDeletion(column.id)}
                      disabled={workflowColumns.length <= 1}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-25"
                      aria-label={`Delete ${column.title} stage`}
                      title={workflowColumns.length <= 1 ? 'A workflow needs at least one stage' : 'Delete stage'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={createWorkflowColumn} className="mt-6 flex gap-2 border-t border-slate-100 pt-6">
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(event) => setNewColumnName(event.target.value)}
                  placeholder="New stage, e.g. Under Review"
                  aria-label="New workflow stage name"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
                <button
                  type="submit"
                  disabled={!newColumnName.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={16} />
                  Add stage
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Workflow Column Confirmation */}
      <AnimatePresence>
        {columnPendingDeletion && (
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
              className="relative w-full max-w-md rounded-3xl bg-white p-8 text-slate-900 shadow-2xl"
            >
              <h2 className="text-xl font-bold">Move goals before deleting</h2>
              <p className="mt-2 text-sm text-slate-500">
                Choose where goals in “{workflowColumns.find(column => column.id === columnPendingDeletion)?.title}” should move.
              </p>
              <select
                value={columnMoveDestination}
                onChange={(event) => setColumnMoveDestination(event.target.value)}
                className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                {workflowColumns.filter(column => column.id !== columnPendingDeletion).map(column => (
                  <option key={column.id} value={column.id}>{column.title}</option>
                ))}
              </select>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setColumnPendingDeletion(null);
                    setColumnMoveDestination('');
                  }}
                  className="flex-1 rounded-xl px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmWorkflowColumnDeletion}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-bold text-white transition-colors hover:bg-rose-700"
                >
                  Move and delete
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
