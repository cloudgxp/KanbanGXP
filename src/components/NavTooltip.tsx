import React from 'react';
import { cn } from '../lib/utils';

export interface NavTooltipProps {
  label: string;
  badge?: number | string;
  shortcut?: string;
  side?: 'right' | 'top' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}

export const NavTooltip: React.FC<NavTooltipProps> = ({
  label,
  badge,
  shortcut,
  side = 'right',
  children,
  className,
}) => {
  return (
    <div className={cn("group/nav-tooltip relative inline-flex items-center justify-center", className)}>
      {children}
      
      {/* Floating Aesthetic Label Tooltip */}
      <div
        role="tooltip"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-50 flex items-center gap-2 px-2.5 py-1.5 rounded-xl",
          "bg-slate-900/95 text-white text-xs font-semibold shadow-2xl shadow-slate-950/40 border border-slate-700/60 backdrop-blur-md",
          "opacity-0 transition-all duration-150 ease-out whitespace-nowrap",
          side === 'right' && "left-full ml-3 top-1/2 -translate-y-1/2 -translate-x-1 group-hover/nav-tooltip:opacity-100 group-hover/nav-tooltip:translate-x-0",
          side === 'top' && "bottom-full mb-2 left-1/2 -translate-x-1/2 translate-y-1 group-hover/nav-tooltip:opacity-100 group-hover/nav-tooltip:translate-y-0",
          side === 'bottom' && "top-full mt-2 left-1/2 -translate-x-1/2 -translate-y-1 group-hover/nav-tooltip:opacity-100 group-hover/nav-tooltip:translate-y-0",
          side === 'left' && "right-full mr-3 top-1/2 -translate-y-1/2 translate-x-1 group-hover/nav-tooltip:opacity-100 group-hover/nav-tooltip:translate-x-0"
        )}
      >
        <span className="text-[11px] font-bold tracking-wide">{label}</span>

        {badge !== undefined && badge !== null && (
          <span className="px-1.5 py-0.2 rounded-md bg-accent/90 text-[10px] font-extrabold text-white">
            {badge}
          </span>
        )}

        {shortcut && (
          <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-mono border border-slate-700">
            {shortcut}
          </kbd>
        )}

        {/* Pointer Arrow Caret */}
        {side === 'right' && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95" />
        )}
        {side === 'left' && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
        )}
        {side === 'top' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
        )}
        {side === 'bottom' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
        )}
      </div>
    </div>
  );
};

export default NavTooltip;
