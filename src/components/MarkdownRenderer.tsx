import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onToggleTask?: (taskIndex: number, completed: boolean) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  onToggleTask,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (!content || !content.trim()) {
    return <p className="text-slate-400 italic text-sm">No description provided.</p>;
  }

  // Parse markdown content into structured blocks
  const renderBlocks = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let taskCounter = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code Block (```)
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        const codeText = codeLines.join('\n');
        const codeId = `code-${i}-${Math.random().toString(36).slice(2, 6)}`;

        elements.push(
          <div key={`code-block-${i}`} className="my-3 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono shadow-sm">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold">{lang || 'code'}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, codeId)}
                className="flex items-center gap-1 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
                title="Copy code"
              >
                {copiedCodeId === codeId ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto leading-relaxed whitespace-pre font-mono">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">
            {renderInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-800 mt-3.5 mb-1.5 pb-1 border-b border-slate-200">
            {renderInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-slate-800 mt-3 mb-1">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="text-sm font-bold text-slate-800 mt-2.5 mb-1">
            {renderInline(line.slice(5))}
          </h4>
        );
        i++;
        continue;
      }

      // Horizontal Rule
      if (/^(\*\*\*|---|___)$/.test(line.trim())) {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200" />);
        i++;
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        elements.push(
          <blockquote key={`quote-${i}`} className="my-2.5 pl-3.5 border-l-4 border-indigo-400 text-slate-600 bg-slate-50/70 py-1.5 pr-3 rounded-r-lg italic text-sm">
            {quoteLines.map((q, qIndex) => (
              <p key={qIndex} className="my-0.5">{renderInline(q)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Task list item (- [ ] or - [x])
      const taskMatch = line.match(/^(\s*[-*+]\s*\[([ xX])\]\s+)(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3];
        const currentTaskIndex = taskCounter++;

        elements.push(
          <div key={`task-${i}`} className="flex items-start gap-2.5 my-1 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                if (onToggleTask) {
                  onToggleTask(currentTaskIndex, e.target.checked);
                }
              }}
              className="checkbox checkbox-xs checkbox-primary mt-0.5 rounded"
            />
            <span className={cn(isChecked && "line-through text-slate-400")}>
              {renderInline(taskText)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Unordered list (* or - or +)
      if (/^(\s*[-*+]\s+)(.*)$/.test(line)) {
        const listItems: string[] = [];
        while (i < lines.length && /^(\s*[-*+]\s+)(.*)$/.test(lines[i]) && !lines[i].match(/^(\s*[-*+]\s*\[[ xX]\])/)) {
          const match = lines[i].match(/^(\s*[-*+]\s+)(.*)$/);
          if (match) listItems.push(match[2]);
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="my-2 ml-5 list-disc space-y-1 text-sm text-slate-700">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list (1. item)
      if (/^(\s*\d+\.\s+)(.*)$/.test(line)) {
        const listItems: string[] = [];
        while (i < lines.length && /^(\s*\d+\.\s+)(.*)$/.test(lines[i])) {
          const match = lines[i].match(/^(\s*\d+\.\s+)(.*)$/);
          if (match) listItems.push(match[2]);
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="my-2 ml-5 list-decimal space-y-1 text-sm text-slate-700">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Table (| col | col |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
          const isDivider = tableLines[1].replace(/[\s|:-]/g, '').length === 0;
          const bodyLines = isDivider ? tableLines.slice(2) : tableLines.slice(1);

          elements.push(
            <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    {headerCells.map((header, hIdx) => (
                      <th key={hIdx} className="px-3 py-2">
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {bodyLines.map((row, rIdx) => {
                    const rowCells = row.slice(1, -1).split('|').map(c => c.trim());
                    return (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        {rowCells.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      // Regular paragraph
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('> ') &&
        !lines[i].match(/^(\s*[-*+]\s+)/) &&
        !lines[i].match(/^(\s*\d+\.\s+)/) &&
        !lines[i].trim().startsWith('|') &&
        !/^(\*\*\*|---|___)$/.test(lines[i].trim())
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }

      if (paragraphLines.length > 0) {
        elements.push(
          <p key={`p-${i}`} className="my-2 text-sm leading-relaxed text-slate-700">
            {renderInline(paragraphLines.join(' '))}
          </p>
        );
      }
    }

    return elements;
  };

  // Helper for inline formatting (bold, italic, code, links, strikethrough)
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Tokenize inline markdown patterns
    // Regex matches: links [text](url), inline code `code`, bold **text**, italic *text*, strikethrough ~~text~~
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Link [label](url)
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const closeBracket = part.indexOf('](');
        const label = part.slice(1, closeBracket);
        const url = part.slice(closeBracket + 2, -1);
        const isExternal = url.startsWith('http://') || url.startsWith('https://');

        return (
          <a
            key={index}
            href={url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
          >
            {label}
            {isExternal && <ExternalLink size={10} className="inline opacity-70 ml-0.5" />}
          </a>
        );
      }

      // Inline Code `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 bg-slate-100 text-indigo-600 rounded text-[13px] font-mono border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Strikethrough ~~text~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={index} className="line-through text-slate-400">
            {part.slice(2, -2)}
          </del>
        );
      }

      // Italic *italic*
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic text-slate-700">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  return (
    <div className={cn("markdown-body text-slate-800 break-words", className)}>
      {renderBlocks()}
    </div>
  );
};
