import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeName, ThemeDefinition } from '../theme';
import { cn } from '../lib/utils';
import { CustomThemeEditor } from './CustomThemeEditor';
import { Icon } from './Icon';

export function ThemePicker() {
  const { theme, setTheme, allThemes, duplicateTheme, deleteCustomTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isEditing) {
    return (
      <CustomThemeEditor
        editThemeId={editingThemeId}
        onClose={() => {
          setIsEditing(false);
          setEditingThemeId(null);
        }}
      />
    );
  }

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingThemeId(id);
    setIsEditing(true);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const newId = duplicateTheme(id);
    if (newId) {
      setEditingThemeId(newId);
      setIsEditing(true);
    }
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (window.confirm(`Are you sure you want to delete the custom theme "${name}"?`)) {
      deleteCustomTheme(id);
    }
  };

  const handleCreateNew = () => {
    setEditingThemeId(null);
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3" ref={menuRef}>
        {(Object.entries(allThemes) as [string, ThemeDefinition][]).map(([key, t]) => {
          const isActive = theme === key;
          const isCustom = t.isCustom === true;
          const isMenuOpen = openMenuId === key;

          return (
            <div
              key={key}
              onClick={() => setTheme(key as ThemeName)}
              style={
                isActive
                  ? {
                      borderColor: t.colors.accent,
                      backgroundColor: `color-mix(in srgb, ${t.colors.accent} 15%, transparent)`,
                    }
                  : undefined
              }
              className={cn(
                'group relative card card-border cursor-pointer p-3.5 transition-all text-left space-y-2 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 border',
                isActive
                  ? 'border-2 ring-2 ring-accent/25 bg-card'
                  : 'border-border hover:border-text-muted/50 bg-card/90'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full border border-border/80 shadow-xs"
                    style={{ backgroundColor: t.colors.bg }}
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-xs"
                    style={{ backgroundColor: t.colors.accent }}
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-xs"
                    style={{ backgroundColor: t.colors.textPrimary || t.colors.text }}
                  />
                </div>

                <div className="flex items-center gap-1">
                  {isActive && (
                    <span
                      style={{ backgroundColor: t.colors.accent, color: t.colors.accentText }}
                      className="badge badge-xs font-bold border-none"
                    >
                      Active
                    </span>
                  )}

                  {/* 3-dots Context Menu Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : key);
                    }}
                    className={cn(
                      'p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-column/80 transition-colors cursor-pointer',
                      isMenuOpen ? 'opacity-100 bg-column' : 'opacity-0 group-hover:opacity-100'
                    )}
                    title="Theme options"
                  >
                    <Icon name="more_vert" size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <div className="text-xs font-bold text-text-primary truncate">{t.name}</div>
                {isCustom && (
                  <span className="text-[9px] font-semibold text-text-muted bg-column px-1.5 py-0.2 rounded border border-border/60 shrink-0">
                    Custom
                  </span>
                )}
              </div>

              {/* Context Dropdown Popover */}
              {isMenuOpen && (
                <div
                  className="absolute right-2 top-8 z-30 min-w-[130px] rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleEdit(key, e)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-column hover:text-text-primary transition-colors cursor-pointer text-left"
                    >
                      <Icon name="edit" size={13} />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(key, e)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-column hover:text-text-primary transition-colors cursor-pointer text-left"
                  >
                    <Icon name="content_copy" size={13} />
                    <span>Duplicate</span>
                  </button>

                  {isCustom && (
                    <>
                      <div className="my-1 border-t border-border/60" />
                      <button
                        type="button"
                        onClick={(e) => handleDelete(key, t.name, e)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                      >
                        <Icon name="delete" size={13} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* + Create Theme Card */}
        <button
          type="button"
          onClick={handleCreateNew}
          className="card card-border cursor-pointer p-3.5 transition-all text-left space-y-2 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 border-2 border-dashed border-border hover:border-accent/60 bg-card/50 hover:bg-card flex flex-col justify-center items-center text-center min-h-[92px] group"
        >
          <div className="w-8 h-8 rounded-full bg-column flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors">
            <Icon name="add" size={18} />
          </div>
          <div className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">
            Create Theme
          </div>
        </button>
      </div>
    </div>
  );
}
