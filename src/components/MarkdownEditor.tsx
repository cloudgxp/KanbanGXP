import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Heading, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  ListTodo, 
  Link as LinkIcon, 
  Eye, 
  Edit3 
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '../lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Leave a comment (Markdown supported)...',
  minRows = 3,
  onSubmit,
  className,
  autoFocus = false,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const insertFormat = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) {
        onSubmit();
      }
      return;
    }

    // Tab key inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={cn("border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10", className)}>
      {/* Editor Header: Tabs & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200">
        {/* Write / Preview Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all",
              activeTab === 'write'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Edit3 size={13} />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all",
              activeTab === 'preview'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>

        {/* Formatting Toolbar (Only enabled in Write mode) */}
        {activeTab === 'write' && (
          <div className="flex items-center gap-0.5 text-slate-500">
            <button
              type="button"
              onClick={() => insertFormat('**', '**', 'bold text')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('*', '*', 'italic text')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('### ', '', 'Heading')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Heading"
            >
              <Heading size={14} />
            </button>
            <span className="w-px h-4 bg-slate-300 mx-0.5" />
            <button
              type="button"
              onClick={() => insertFormat('`', '`', 'code')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Inline Code"
            >
              <Code size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('> ', '', 'Quote')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Quote"
            >
              <Quote size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('- ', '', 'List item')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Bullet List"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('1. ', '', 'Numbered item')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Numbered List"
            >
              <ListOrdered size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('- [ ] ', '', 'Task item')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Task List"
            >
              <ListTodo size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('[', '](https://)', 'link text')}
              className="p-1.5 hover:bg-slate-200 rounded-lg hover:text-slate-800 transition-colors"
              title="Insert Link"
            >
              <LinkIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Editor Content Area */}
      <div className="p-3">
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={minRows}
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-0 outline-none resize-y font-normal leading-relaxed min-h-[80px]"
          />
        ) : (
          <div className="min-h-[80px] py-1 px-1 text-sm overflow-y-auto max-h-[350px]">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-slate-400 italic text-sm">Nothing to preview</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
