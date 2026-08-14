import React, { useState } from 'react';
import { 
  CircleDot, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  Flag, 
  BarChart3, 
  Calendar, 
  Clock, 
  Zap, 
  Tag, 
  Edit2, 
  Trash2, 
  MoreHorizontal, 
  MessageSquare, 
  Layers, 
  PlusCircle, 
  Archive,
  Check
} from 'lucide-react';
import { ActivityEventType, TimelineItem } from '../types';
import { formatRelativeTime, formatFullDate, formatTimelineEventMessage } from '../lib/timeline';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownEditor } from './MarkdownEditor';
import { cn } from '../lib/utils';

interface GoalTimelineProps {
  items: TimelineItem[];
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export const GoalTimeline: React.FC<GoalTimelineProps> = ({
  items,
  onEditComment,
  onDeleteComment,
}) => {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const startEditComment = (commentId: string, initialContent: string) => {
    setEditingCommentId(commentId);
    setEditCommentText(initialContent);
    setActiveMenuId(null);
  };

  const handleSaveEditedComment = (commentId: string) => {
    if (!editCommentText.trim()) return;
    if (onEditComment) {
      onEditComment(commentId, editCommentText.trim());
    }
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const renderEventIcon = (type: ActivityEventType, to?: any) => {
    switch (type) {
      case 'created':
        return (
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 border-2 border-white shadow-sm flex items-center justify-center">
            <PlusCircle size={14} />
          </div>
        );
      case 'status_changed':
      case 'column_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 border-2 border-white shadow-sm flex items-center justify-center">
            <ArrowRight size={13} />
          </div>
        );
      case 'lifecycle_changed':
        if (to === 'completed') {
          return (
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 border-2 border-white shadow-sm flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          );
        }
        if (to === 'archived') {
          return (
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 border-2 border-white shadow-sm flex items-center justify-center">
              <Archive size={13} />
            </div>
          );
        }
        return (
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 border-2 border-white shadow-sm flex items-center justify-center">
            <RotateCcw size={13} />
          </div>
        );
      case 'priority_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Flag size={13} />
          </div>
        );
      case 'progress_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 border-2 border-white shadow-sm flex items-center justify-center">
            <BarChart3 size={13} />
          </div>
        );
      case 'due_date_changed':
      case 'start_date_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Calendar size={13} />
          </div>
        );
      case 'sprint_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Zap size={13} />
          </div>
        );
      case 'epic_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Layers size={13} />
          </div>
        );
      case 'labels_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Tag size={13} />
          </div>
        );
      case 'title_changed':
      case 'description_changed':
        return (
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 border-2 border-white shadow-sm flex items-center justify-center">
            <Edit2 size={13} />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 border-2 border-white shadow-sm flex items-center justify-center">
            <CircleDot size={13} />
          </div>
        );
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {items.map((item) => {
        // Render prominent Comment card
        if (item.kind === 'comment' && item.comment) {
          const comment = item.comment;
          const isEditing = editingCommentId === comment.id;

          return (
            <div key={item.id} className="relative group">
              {/* Timeline dot/avatar */}
              <div className="absolute -left-6 top-1 transform -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-md z-10">
                {(comment.actor || 'Y').charAt(0).toUpperCase()}
              </div>

              {/* Comment Card */}
              <div className="ml-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300">
                {/* Comment Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-bold text-slate-900">{comment.actor || 'You'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                      Author
                    </span>
                    <span className="text-slate-400">commented</span>
                    <span 
                      className="text-slate-500 hover:text-slate-700 cursor-help"
                      title={formatFullDate(comment.createdAt)}
                    >
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {comment.updatedAt && (
                      <span 
                        className="text-slate-400 text-[11px] italic"
                        title={formatFullDate(comment.updatedAt)}
                      >
                        (edited)
                      </span>
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  {(onEditComment || onDeleteComment) && !isEditing && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                        title="Comment actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {activeMenuId === comment.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 text-xs">
                          {onEditComment && (
                            <button
                              type="button"
                              onClick={() => startEditComment(comment.id, comment.content)}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                          )}
                          {onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteComment(comment.id);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="p-4 text-sm">
                  {isEditing ? (
                    <div className="space-y-3">
                      <MarkdownEditor
                        value={editCommentText}
                        onChange={setEditCommentText}
                        minRows={3}
                        onSubmit={() => handleSaveEditedComment(comment.id)}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditCommentText('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedComment(comment.id)}
                          disabled={!editCommentText.trim()}
                          className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                        >
                          Update comment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MarkdownRenderer content={comment.content} />
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Render Compact System Activity Row
        return (
          <div key={item.id} className="relative flex items-center gap-3 text-xs text-slate-600">
            {/* Event Icon badge on the vertical line */}
            <div className="absolute -left-6 transform -translate-x-1/2 z-10">
              {renderEventIcon(item.type, item.to)}
            </div>

            {/* Event text & timestamp */}
            <div className="ml-4 flex items-center gap-1.5 flex-wrap py-1">
              <span className="font-semibold text-slate-900">{item.actor || 'You'}</span>
              <span className="text-slate-600 font-medium">
                {formatTimelineEventMessage(item)}
              </span>
              <span className="text-slate-400">·</span>
              <span 
                className="text-slate-400 hover:text-slate-600 cursor-help"
                title={formatFullDate(item.timestamp)}
              >
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
