import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { themes, ThemeName } from '../theme';
import { cn } from '../lib/utils';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(themes).map(([key, t]) => (
        <button
          key={key}
          onClick={() => setTheme(key as ThemeName)}
          className={cn(
            "p-3 rounded-xl border-2 transition-all text-left space-y-2",
            theme === key 
              ? "border-indigo-500 bg-indigo-50" 
              : "border-slate-200 hover:border-slate-300 bg-white"
          )}
        >
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.bg }} />
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.accent }} />
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.text }} />
          </div>
          <div className="text-xs font-bold text-slate-900">{t.name}</div>
        </button>
      ))}
    </div>
  );
}
