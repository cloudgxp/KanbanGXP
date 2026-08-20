import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  CircleDot, 
  RotateCcw, 
  Archive, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  Tag, 
  Zap, 
  Layers, 
  Link2, 
  Check, 
  Plus, 
  Target, 
  ListTodo, 
  Flag, 
  Folder, 
  Briefcase, 
  Sun,
  AlertCircle,
  ListTree,
  CornerDownRight,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { 
  Goal, 
  Project, 
  WorkflowColumn, 
  Label, 
  Sprint, 
  Epic, 
  Priority, 
  GoalLifecycleStatus,
  SuccessMetricType,
  ActivityEvent,
  Comment
} from '../types';
import { 
  buildUnifiedTimeline, 
  calculateGoalProgress, 
  createActivityEvent, 
  createComment, 
  formatDateString, 
  formatRelativeTime,
  generateId 
} from '../lib/timeline';
import { 
  getSubgoals, 
  calculateSubgoalProgress, 
  getValidParentGoals 
} from '../lib/subgoals';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownEditor } from './MarkdownEditor';
import { GoalTimeline } from './GoalTimeline';
import { cn } from '../lib/utils';

interface GoalDetailModalProps {
  goal: Goal;
  allGoals: Goal[];
  projects: Project[];
  workflowColumns: WorkflowColumn[];
  labels: Label[];
  sprints: Sprint[];
  epics: Epic[];
  onUpdateGoal: (updatedGoal: Goal, newActivity?: ActivityEvent) => void;
  onDeleteGoal: (goalId: string) => void;
  onCreateLabel?: (name: string, color: string) => Label;
  onSelectGoal?: (goal: Goal) => void;
  onAddSubgoal?: (parentGoal: Goal) => void;
  onClose: () => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  allGoals,
  projects,
  workflowColumns,
  labels,
  sprints,
  epics,
  onUpdateGoal,
  onDeleteGoal,
  onCreateLabel,
  onSelectGoal,
  onAddSubgoal,
  onClose,
}) => {
  // Description edit state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(goal.description || '');

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title || '');

  // Comment composer state
  const [commentDraft, setCommentDraft] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Link copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);

  // New label inline input
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('bg-indigo-500');

  // Sync draft states when goal changes
  useEffect(() => {
    setDescriptionDraft(goal.description || '');
    setTitleDraft(goal.title || '');
  }, [goal.id, goal.description, goal.title]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingDescription && !isEditingTitle) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingDescription, isEditingTitle]);

  const timelineItems = buildUnifiedTimeline(goal);
  const currentProgress = calculateGoalProgress(goal);

  const subgoals = getSubgoals(allGoals, goal.id);
  const subgoalProgress = calculateSubgoalProgress(allGoals, goal.id);
  const isSubgoal = Boolean(goal.parentId);
  const parentGoal = goal.parentId ? allGoals.find(g => g.id === goal.parentId) : undefined;
  const validParents = getValidParentGoals(allGoals, goal.id, goal.projectId);

  const currentProject = projects.find(p => p.id === goal.projectId);
  const currentSprint = sprints.find(s => s.id === goal.sprintId);
  const currentEpic = epics.find(e => e.id === goal.epicId);
  const currentColumn = workflowColumns.find(c => c.id === goal.status);

  // Helper to apply property updates with append-only activity logging
  const handlePropertyChange = (
    updates: Partial<Goal>,
    activityType: ActivityEvent['type'],
    details: { from?: any; to?: any; message?: string }
  ) => {
    const event = createActivityEvent(goal.id, activityType, details);
    const existingActivities = goal.activities || [];
    const updatedGoal: Goal = {
      ...goal,
      ...updates,
      activities: [...existingActivities, event],
    };
    onUpdateGoal(updatedGoal, event);
  };

  // Title Save
  const handleSaveTitle = () => {
    if (!titleDraft.trim() || titleDraft.trim() === goal.title) {
      setIsEditingTitle(false);
      setTitleDraft(goal.title);
      return;
    }
    const oldTitle = goal.title;
    const newTitle = titleDraft.trim();
    handlePropertyChange(
      { title: newTitle },
      'title_changed',
      { from: oldTitle, to: newTitle }
    );
    setIsEditingTitle(false);
  };

  // Description Save
  const handleSaveDescription = () => {
    if (descriptionDraft === goal.description) {
      setIsEditingDescription(false);
      return;
    }
    handlePropertyChange(
      { description: descriptionDraft },
      'description_changed',
      { to: 'updated description' }
    );
    setIsEditingDescription(false);
  };

  // Status / Column Change
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === goal.status) return;
    const oldCol = workflowColumns.find(c => c.id === goal.status)?.title || goal.status;
    const newCol = workflowColumns.find(c => c.id === newStatus)?.title || newStatus;
    
    // Auto-update lifecycleStatus if moved to last column or moved out of last column
    let newLifecycle = goal.lifecycleStatus;
    const lastColId = workflowColumns[workflowColumns.length - 1]?.id;
    if (newStatus === lastColId && goal.lifecycleStatus === 'active') {
      newLifecycle = 'completed';
    } else if (newStatus !== lastColId && goal.lifecycleStatus === 'completed') {
      newLifecycle = 'active';
    }

    handlePropertyChange(
      { status: newStatus, lifecycleStatus: newLifecycle },
      'status_changed',
      { from: oldCol, to: newCol }
    );
  };

  // Priority Change
  const handlePriorityChange = (newPriority: Priority) => {
    if (newPriority === goal.priority) return;
    handlePropertyChange(
      { priority: newPriority },
      'priority_changed',
      { from: goal.priority, to: newPriority }
    );
  };

  // Lifecycle Toggle (Close / Reopen / Archive)
  const handleLifecycleChange = (newLifecycle: GoalLifecycleStatus) => {
    if (newLifecycle === goal.lifecycleStatus) return;
    let newStatus = goal.status;
    if (newLifecycle === 'completed') {
      newStatus = workflowColumns[workflowColumns.length - 1]?.id || goal.status;
    } else if (newLifecycle === 'active' && goal.lifecycleStatus === 'completed') {
      newStatus = workflowColumns[0]?.id || goal.status;
    }

    handlePropertyChange(
      { lifecycleStatus: newLifecycle, status: newStatus },
      'lifecycle_changed',
      { from: goal.lifecycleStatus, to: newLifecycle }
    );
  };

  // Due Date Change
  const handleDueDateChange = (newDateStr: string) => {
    const newTimestamp = newDateStr ? new Date(newDateStr).getTime() : undefined;
    if (newTimestamp === goal.dueDate) return;
    handlePropertyChange(
      { dueDate: newTimestamp },
      'due_date_changed',
      { from: goal.dueDate, to: newTimestamp }
    );
  };

  // Start Date Change
  const handleStartDateChange = (newDateStr: string) => {
    const newTimestamp = newDateStr ? new Date(newDateStr).getTime() : undefined;
    if (newTimestamp === goal.startDate) return;
    handlePropertyChange(
      { startDate: newTimestamp },
      'start_date_changed',
      { from: goal.startDate, to: newTimestamp }
    );
  };

  // Sprint Change
  const handleSprintChange = (newSprintId: string) => {
    const cleanId = newSprintId || undefined;
    if (cleanId === goal.sprintId) return;
    const oldSprintName = sprints.find(s => s.id === goal.sprintId)?.name;
    const newSprintName = sprints.find(s => s.id === cleanId)?.name;
    handlePropertyChange(
      { sprintId: cleanId },
      'sprint_changed',
      { from: oldSprintName, to: newSprintName }
    );
  };

  // Epic Change
  const handleEpicChange = (newEpicId: string) => {
    const cleanId = newEpicId || undefined;
    if (cleanId === goal.epicId) return;
    const oldEpicName = epics.find(e => e.id === goal.epicId)?.name;
    const newEpicName = epics.find(e => e.id === cleanId)?.name;
    handlePropertyChange(
      { epicId: cleanId },
      'epic_changed',
      { from: oldEpicName, to: newEpicName }
    );
  };

  // Project Change
  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === goal.projectId) return;
    const oldProj = projects.find(p => p.id === goal.projectId)?.name || 'Unknown Project';
    const newProj = projects.find(p => p.id === newProjectId)?.name || 'Unknown Project';
    handlePropertyChange(
      { projectId: newProjectId, sprintId: undefined, epicId: undefined },
      'category_changed',
      { from: oldProj, to: newProj }
    );
  };

  // Parent Goal Change
  const handleParentGoalChange = (newParentId: string) => {
    const cleanId = newParentId || undefined;
    if (cleanId === goal.parentId) return;
    const oldParentTitle = allGoals.find(g => g.id === goal.parentId)?.title;
    const newParentTitle = allGoals.find(g => g.id === cleanId)?.title;
    handlePropertyChange(
      { parentId: cleanId },
      'parent_changed',
      { from: oldParentTitle, to: newParentTitle }
    );
  };

  // Toggle Subgoal Completion
  const handleToggleSubgoalCompletion = (subgoal: Goal) => {
    const isNowCompleted = subgoal.lifecycleStatus !== 'completed';
    const newLifecycle: GoalLifecycleStatus = isNowCompleted ? 'completed' : 'active';
    let newStatus = subgoal.status;
    if (isNowCompleted) {
      newStatus = workflowColumns[workflowColumns.length - 1]?.id || subgoal.status;
    } else {
      newStatus = workflowColumns[0]?.id || subgoal.status;
    }
    const event = createActivityEvent(subgoal.id, 'lifecycle_changed', { from: subgoal.lifecycleStatus, to: newLifecycle });
    const updatedSubgoal: Goal = {
      ...subgoal,
      lifecycleStatus: newLifecycle,
      status: newStatus,
      activities: [...(subgoal.activities || []), event],
    };
    onUpdateGoal(updatedSubgoal, event);
  };


  // Planned for Today Toggle
  const handleTogglePlannedToday = () => {
    const nextVal = !goal.plannedForToday;
    handlePropertyChange(
      { plannedForToday: nextVal },
      'progress_changed',
      { message: nextVal ? 'marked goal as Planned for Today' : 'removed goal from Planned for Today' }
    );
  };

  // Toggle Label
  const handleToggleLabel = (labelId: string) => {
    const currentLabelIds = goal.labelIds || [];
    const nextLabelIds = currentLabelIds.includes(labelId)
      ? currentLabelIds.filter(id => id !== labelId)
      : [...currentLabelIds, labelId];

    const labelName = labels.find(l => l.id === labelId)?.name || 'label';
    const isAdded = nextLabelIds.includes(labelId);

    handlePropertyChange(
      { labelIds: nextLabelIds },
      'labels_changed',
      { message: isAdded ? `added label "${labelName}"` : `removed label "${labelName}"` }
    );
  };

  // Create & Assign Label
  const handleCreateAndAssignLabel = () => {
    if (!newLabelName.trim() || !onCreateLabel) return;
    const created = onCreateLabel(newLabelName.trim(), newLabelColor);
    if (created) {
      handleToggleLabel(created.id);
    }
    setNewLabelName('');
    setIsAddingLabel(false);
  };

  // Toggle Checklist Item
  const handleToggleChecklistItem = (itemId: string) => {
    if (!goal.successMetric || (goal.successMetric.type !== 'checklist' && goal.successMetric.type !== 'milestones')) return;
    const oldProgress = calculateGoalProgress(goal);
    const updatedItems = (goal.successMetric.items || []).map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const nextMetric = {
      ...goal.successMetric,
      items: updatedItems,
    };

    const tempGoal = { ...goal, successMetric: nextMetric };
    const newProgress = calculateGoalProgress(tempGoal);

    handlePropertyChange(
      { successMetric: nextMetric },
      'progress_changed',
      { from: oldProgress, to: newProgress }
    );
  };

  // Update Numeric Target Metric
  const handleUpdateNumericMetric = (delta: number) => {
    if (!goal.successMetric || goal.successMetric.type !== 'numeric') return;
    const oldProgress = calculateGoalProgress(goal);
    const target = goal.successMetric.target || 1;
    const current = goal.successMetric.current || 0;
    const newCurrent = Math.max(0, Math.min(target, current + delta));

    const nextMetric = {
      ...goal.successMetric,
      current: newCurrent,
    };

    const tempGoal = { ...goal, successMetric: nextMetric };
    const newProgress = calculateGoalProgress(tempGoal);

    handlePropertyChange(
      { successMetric: nextMetric },
      'progress_changed',
      { from: oldProgress, to: newProgress }
    );
  };

  // Add Comment
  const handleAddComment = () => {
    if (!commentDraft.trim()) return;
    setIsSubmittingComment(true);

    const { comment, event } = createComment(goal.id, commentDraft.trim(), 'You');
    const existingComments = goal.comments || [];
    const existingActivities = goal.activities || [];

    const updatedGoal: Goal = {
      ...goal,
      comments: [...existingComments, comment],
      activities: [...existingActivities, event],
    };

    onUpdateGoal(updatedGoal, event);
    setCommentDraft('');
    setIsSubmittingComment(false);
  };

  // Edit Comment
  const handleEditComment = (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;
    const updatedComments = (goal.comments || []).map(c =>
      c.id === commentId ? { ...c, content: newContent, updatedAt: Date.now() } : c
    );

    const updatedGoal: Goal = {
      ...goal,
      comments: updatedComments,
    };

    onUpdateGoal(updatedGoal);
  };

  // Delete Comment
  const handleDeleteComment = (commentId: string) => {
    const updatedComments = (goal.comments || []).filter(c => c.id !== commentId);
    const updatedActivities = (goal.activities || []).filter(a => a.commentId !== commentId);

    const updatedGoal: Goal = {
      ...goal,
      comments: updatedComments,
      activities: updatedActivities,
    };

    onUpdateGoal(updatedGoal);
  };

  // Copy Link to Goal
  const handleCopyLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/goals/${goal.number || goal.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getPriorityBadgeClass = (p: Priority) => {
    switch (p) {
      case 'high': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  const commentCount = (goal.comments || []).length;
  const issueNumber = goal.number || 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Main Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl my-4 text-slate-900 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        {/* Modal Top Navigation & Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Issue Number */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                {/* State Badge */}
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  goal.lifecycleStatus === 'completed'
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : goal.lifecycleStatus === 'archived'
                    ? "bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                )}>
                  {goal.lifecycleStatus === 'completed' ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Done</span>
                    </>
                  ) : goal.lifecycleStatus === 'archived' ? (
                    <>
                      <Archive size={14} />
                      <span>Archived</span>
                    </>
                  ) : (
                    <>
                      <CircleDot size={14} />
                      <span>Open</span>
                    </>
                  )}
                </div>

                {/* Stable Issue Number Badge */}
                <span className="text-xl font-bold text-slate-400">
                  #{issueNumber}
                </span>

                {/* Title Display or Edit */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setTitleDraft(goal.title);
                        }
                      }}
                      className="input input-sm input-bordered font-bold text-lg text-slate-900 bg-white rounded-xl flex-1 focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveTitle}
                      className="btn btn-sm btn-primary rounded-xl font-bold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTitle(false);
                        setTitleDraft(goal.title);
                      }}
                      className="btn btn-sm btn-ghost rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                      {goal.title}
                    </h2>
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-200/60 transition-all"
                      title="Edit title"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Subtitle / Metadata */}
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                <span>Opened by <strong className="text-slate-700 font-semibold">You</strong></span>
                <span>·</span>
                <span>{formatDateString(goal.createdAt)}</span>
                <span>·</span>
                <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
                {goal.plannedForToday && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Sun size={11} className="text-amber-500" />
                      Planned for Today
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions & Close Button */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Copy Link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn btn-sm btn-ghost gap-1 text-slate-600 hover:text-slate-900 rounded-xl"
                title="Copy link to goal"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-emerald-600 text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    <span className="text-xs">Copy link</span>
                  </>
                )}
              </button>

              {/* Close/Reopen Lifecycle button */}
              {goal.lifecycleStatus === 'active' ? (
                <button
                  type="button"
                  onClick={() => handleLifecycleChange('completed')}
                  className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 rounded-xl gap-1.5 font-bold"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Close goal</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLifecycleChange('active')}
                  className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl gap-1.5 font-bold"
                >
                  <RotateCcw size={14} className="text-indigo-500" />
                  <span>Reopen goal</span>
                </button>
              )}

              {/* Close Modal X */}
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content: 2-Column Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* MAIN AREA (Left 8 Cols) */}
            <div className="lg:col-span-8 space-y-8 min-w-0">
              
              {/* Parent Goal Reference Banner (if this is a subgoal) */}
              {isSubgoal && parentGoal && (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CornerDownRight size={16} className="text-indigo-600 shrink-0" />
                    <span className="text-indigo-700 font-bold shrink-0">Subgoal of:</span>
                    <span className="text-indigo-950 font-bold truncate">
                      {parentGoal.number ? `#${parentGoal.number} ` : ''}{parentGoal.title}
                    </span>
                  </div>
                  {onSelectGoal && (
                    <button
                      type="button"
                      onClick={() => onSelectGoal(parentGoal)}
                      className="btn btn-xs btn-outline border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl font-bold gap-1 shrink-0 ml-2"
                    >
                      <span>View Parent</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* 1. Initial Description Card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                      Y
                    </div>
                    <span className="font-bold text-slate-900">You</span>
                    <span className="text-slate-400">opened this on {formatDateString(goal.createdAt)}</span>
                  </div>
                  {!isEditingDescription && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="p-5">
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <MarkdownEditor
                        value={descriptionDraft}
                        onChange={setDescriptionDraft}
                        placeholder="Add a detailed markdown description..."
                        minRows={4}
                        onSubmit={handleSaveDescription}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDescription(false);
                            setDescriptionDraft(goal.description || '');
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDescription}
                          className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MarkdownRenderer content={goal.description} />
                  )}
                </div>
              </div>

              {/* 2. Success Metrics Progress Card (if configured) */}
              {goal.successMetric && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {goal.successMetric.type === 'checklist' && <ListTodo size={16} className="text-indigo-600" />}
                      {goal.successMetric.type === 'milestones' && <Flag size={16} className="text-indigo-600" />}
                      {goal.successMetric.type === 'numeric' && <Target size={16} className="text-indigo-600" />}
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Success Metric ({goal.successMetric.type})
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600">
                      {currentProgress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>

                  {/* Metric Interactive Items */}
                  {(goal.successMetric.type === 'checklist' || goal.successMetric.type === 'milestones') && (
                    <div className="space-y-2 pt-1">
                      {(goal.successMetric.items || []).map((item) => (
                        <label 
                          key={item.id} 
                          className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 cursor-pointer transition-all text-sm font-medium text-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklistItem(item.id)}
                            className="checkbox checkbox-xs checkbox-primary rounded"
                          />
                          <span className={cn(item.completed && "line-through text-slate-400 font-normal")}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {goal.successMetric.type === 'numeric' && (
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-sm font-semibold text-slate-700">
                        Current: <strong className="text-slate-900">{goal.successMetric.current || 0}</strong> / {goal.successMetric.target} {goal.successMetric.unit}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateNumericMetric(-1)}
                          className="btn btn-xs btn-circle btn-ghost text-slate-600 hover:bg-slate-100"
                          title="Decrease"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateNumericMetric(1)}
                          className="btn btn-xs btn-circle btn-primary text-white"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Subgoals Section (for top-level goals) */}
              {!isSubgoal && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <ListTree size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Subgoals
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {subgoalProgress.completed} of {subgoalProgress.total} completed
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Break down this goal into smaller, manageable milestones.
                        </p>
                      </div>
                    </div>

                    {onAddSubgoal && (
                      <button
                        type="button"
                        onClick={() => onAddSubgoal(goal)}
                        className="btn btn-xs sm:btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-sm text-xs"
                      >
                        <Plus size={14} />
                        <span>Add subgoal</span>
                      </button>
                    )}
                  </div>

                  {/* Compact Progress Bar */}
                  {subgoals.length > 0 && (
                    <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Subgoal Progress</span>
                        <span className="font-extrabold text-indigo-600">{subgoalProgress.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${subgoalProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subgoal List */}
                  {subgoals.length > 0 ? (
                    <div className="space-y-2">
                      {subgoals.map(subgoal => {
                        const isCompleted = subgoal.lifecycleStatus === 'completed';
                        const col = workflowColumns.find(c => c.id === subgoal.status);
                        return (
                          <div
                            key={subgoal.id}
                            className={cn(
                              "group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-sm",
                              isCompleted
                                ? "bg-slate-50/70 border-slate-200/80 text-slate-500"
                                : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xs text-slate-800"
                            )}
                          >
                            {/* Checkbox toggle & Title */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSubgoalCompletion(subgoal);
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer",
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                                    : "border-slate-300 hover:border-indigo-500 bg-white text-transparent hover:text-indigo-400"
                                )}
                                title={isCompleted ? "Mark incomplete" : "Mark complete"}
                                aria-label={`Toggle completion for ${subgoal.title}`}
                              >
                                <Check size={12} strokeWidth={3} className={isCompleted ? "text-white" : "opacity-0 hover:opacity-100"} />
                              </button>

                              <div
                                onClick={() => onSelectGoal && onSelectGoal(subgoal)}
                                className="min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  {subgoal.number && (
                                    <span className="text-xs font-bold text-slate-400">
                                      #{subgoal.number}
                                    </span>
                                  )}
                                  <span className={cn(
                                    "font-semibold text-sm leading-tight transition-colors group-hover:text-indigo-600 truncate",
                                    isCompleted && "line-through text-slate-400 font-normal"
                                  )}>
                                    {subgoal.title}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Subgoal Meta & Open action */}
                            <div className="flex items-center gap-2 shrink-0">
                              {col && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {col.title}
                                </span>
                              )}
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                getPriorityBadgeClass(subgoal.priority)
                              )}>
                                {subgoal.priority}
                              </span>
                              <button
                                type="button"
                                onClick={() => onSelectGoal && onSelectGoal(subgoal)}
                                className="btn btn-xs btn-ghost text-slate-400 group-hover:text-indigo-600 rounded-lg"
                                title="Open subgoal details"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs border border-indigo-100">
                        <ListTree size={20} />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          No subgoals yet
                        </h4>
                        <p className="text-xs text-slate-500">
                          Break down this goal into focused, measurable subgoals to track incremental progress.
                        </p>
                      </div>
                      {onAddSubgoal && (
                        <button
                          type="button"
                          onClick={() => onAddSubgoal(goal)}
                          className="btn btn-xs btn-primary rounded-xl font-bold gap-1 text-xs shadow-xs"
                        >
                          <Plus size={12} />
                          <span>Add a subgoal</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Unified Activity & Comment Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  Activity Timeline
                </h3>
                <GoalTimeline
                  items={timelineItems}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                />
              </div>

              {/* 4. Multiline Comment Composer at Bottom */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                    Y
                  </div>
                  <span>Add a comment</span>
                </div>

                <MarkdownEditor
                  value={commentDraft}
                  onChange={setCommentDraft}
                  placeholder="Write a comment with markdown, code snippets, or task lists... (Ctrl+Enter to send)"
                  minRows={3}
                  onSubmit={handleAddComment}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Styling with Markdown is supported
                  </span>
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!commentDraft.trim() || isSubmittingComment}
                    className="btn btn-sm btn-primary rounded-xl font-bold shadow-md text-xs px-5 ml-auto"
                  >
                    Comment
                  </button>
                </div>
              </div>

            </div>

            {/* PROPERTIES SIDEBAR (Right 4 Cols) */}
            <div className="lg:col-span-4 space-y-6 bg-slate-50/60 p-5 rounded-3xl border border-slate-200">
              
              {/* Status / Workflow Column */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Status
                </label>
                <select
                  value={goal.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                >
                  {workflowColumns.map(column => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Priority
                </label>
                <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 border border-slate-200">
                  {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePriorityChange(p)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        goal.priority === p 
                          ? cn("bg-white shadow-sm ring-1 ring-slate-200", getPriorityBadgeClass(p)) 
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Classification */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Project
                  </label>
                  <select
                    value={goal.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parent Goal Hierarchy */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Parent Goal
                  </label>
                  {isSubgoal && (
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      Subgoal
                    </span>
                  )}
                </div>
                {subgoals.length > 0 ? (
                  <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 font-medium flex items-center gap-1.5">
                    <ListTree size={14} className="text-indigo-600 shrink-0" />
                    <span>Parent to {subgoals.length} {subgoals.length === 1 ? 'subgoal' : 'subgoals'}</span>
                  </div>
                ) : (
                  <select
                    value={goal.parentId || ''}
                    onChange={(e) => handleParentGoalChange(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  >
                    <option value="">None (Top-level goal)</option>
                    {validParents.map(parentCandidate => (
                      <option key={parentCandidate.id} value={parentCandidate.id}>
                        {parentCandidate.number ? `#${parentCandidate.number} ` : ''}{parentCandidate.title}
                      </option>
                    ))}
                  </select>
                )}
                {isSubgoal && parentGoal && (
                  <p className="text-[10px] text-slate-500">
                    Nested under <strong className="text-slate-700">{parentGoal.title}</strong>
                  </p>
                )}
              </div>

              {/* Dates: Start & Due */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Start Date
                    </label>
                    {goal.startDate && (
                      <button
                        type="button"
                        onClick={() => handleStartDateChange('')}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={goal.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Due Date
                    </label>
                    {goal.dueDate && (
                      <button
                        type="button"
                        onClick={() => handleDueDateChange('')}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={goal.dueDate ? new Date(goal.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Labels / Tags */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Labels
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingLabel(!isAddingLabel)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider flex items-center gap-0.5"
                  >
                    <Plus size={12} />
                    <span>Manage</span>
                  </button>
                </div>

                {/* Active Labels Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(goal.labelIds || []).map(id => {
                    const label = labels.find(l => l.id === id);
                    if (!label) return null;
                    return (
                      <span
                        key={label.id}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wider shadow-sm",
                          label.color
                        )}
                      >
                        {label.name}
                        <button
                          type="button"
                          onClick={() => handleToggleLabel(label.id)}
                          className="hover:bg-white/20 p-0.5 rounded-full"
                          title="Remove label"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                  {(!goal.labelIds || goal.labelIds.length === 0) && (
                    <span className="text-xs text-slate-400 italic">None yet</span>
                  )}
                </div>

                {/* Label Manager Popover */}
                {isAddingLabel && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-lg space-y-3 mt-2 text-xs">
                    <div className="font-bold text-slate-700">Toggle Labels:</div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {labels.map(label => {
                        const isSelected = (goal.labelIds || []).includes(label.id);
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => handleToggleLabel(label.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1",
                              isSelected
                                ? cn(label.color, "text-white border-transparent shadow-sm")
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {isSelected && <Check size={11} />}
                            {label.name}
                          </button>
                        );
                      })}
                    </div>

                    {onCreateLabel && (
                      <div className="pt-2 border-t border-slate-100 flex gap-1">
                        <input
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="New label..."
                          className="input input-xs input-bordered rounded-lg flex-1"
                        />
                        <select
                          value={newLabelColor}
                          onChange={(e) => setNewLabelColor(e.target.value)}
                          className="select select-xs select-bordered rounded-lg"
                        >
                          <option value="bg-indigo-500">Indigo</option>
                          <option value="bg-blue-500">Blue</option>
                          <option value="bg-emerald-500">Emerald</option>
                          <option value="bg-amber-500">Amber</option>
                          <option value="bg-rose-500">Rose</option>
                          <option value="bg-purple-500">Purple</option>
                          <option value="bg-slate-500">Slate</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleCreateAndAssignLabel}
                          disabled={!newLabelName.trim()}
                          className="btn btn-xs btn-primary rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sprint & Epic Assigners */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Sprint
                  </label>
                  <select
                    value={goal.sprintId || ''}
                    onChange={(e) => handleSprintChange(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                  >
                    <option value="">No Sprint</option>
                    {sprints.filter(s => s.projectId === goal.projectId).map(sprint => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name} ({sprint.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Epic
                  </label>
                  <select
                    value={goal.epicId || ''}
                    onChange={(e) => handleEpicChange(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-violet-500/20 shadow-sm"
                  >
                    <option value="">No Epic</option>
                    {epics.filter(e => e.projectId === goal.projectId).map(epic => (
                      <option key={epic.id} value={epic.id}>
                        {epic.name} ({epic.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Planned for Today Toggle */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center justify-between cursor-pointer p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sun size={15} className={cn(goal.plannedForToday ? "text-amber-500" : "text-slate-400")} />
                    <span className="text-xs font-bold text-slate-800">Planned for Today</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!goal.plannedForToday}
                    onChange={handleTogglePlannedToday}
                    className="toggle toggle-warning toggle-sm"
                  />
                </label>
              </div>

              {/* Danger Zone & Deletion */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this goal?')) {
                      onDeleteGoal(goal.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete Goal</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </motion.div>
    </div>
  );
};
