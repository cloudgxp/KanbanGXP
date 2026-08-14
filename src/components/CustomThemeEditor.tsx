import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, BuiltInThemeName, themes, getDefaultCustomTheme } from '../theme';
import { getWCAGStatus, improveContrast, isValidHex, normalizeHex } from '../lib/colorUtils';
import { Icon } from './Icon';
import { cn } from '../lib/utils';

interface CustomThemeEditorProps {
  editThemeId?: string | null;
  onClose: () => void;
}

export function CustomThemeEditor({ editThemeId, onClose }: CustomThemeEditorProps) {
  const { allThemes, saveCustomTheme, setPreviewColors } = useTheme();

  const existingTheme = editThemeId ? allThemes[editThemeId] : null;

  const [name, setName] = useState(existingTheme?.name || 'My Custom Theme');
  const [colors, setColors] = useState<ThemeColors>(() => {
    if (existingTheme) {
      return { ...existingTheme.colors };
    }
    return getDefaultCustomTheme('dark').colors;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showContrastDetails, setShowContrastDetails] = useState(false);
  const [activeHexKey, setActiveHexKey] = useState<keyof ThemeColors | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync live preview to document CSS variables in real-time
  useEffect(() => {
    setPreviewColors(colors);
    return () => {
      setPreviewColors(null);
    };
  }, [colors, setPreviewColors]);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => {
      const next = { ...prev, [key]: value };
      
      // Keep primary text aliases synced
      if (key === 'textPrimary') {
        next.text = value;
      } else if (key === 'text') {
        next.textPrimary = value;
      }
      // Keep accent text aliases synced
      if (key === 'accentText') {
        next.textOnAccent = value;
      } else if (key === 'textOnAccent') {
        next.accentText = value;
      }
      return next;
    });
  };

  const handleApplyPreset = (presetKey: BuiltInThemeName) => {
    const preset = themes[presetKey];
    if (preset) {
      setColors({ ...preset.colors });
      if (!editThemeId) {
        setName(`Custom ${preset.name}`);
      }
    }
  };

  const handleImproveContrast = (fgKey: keyof ThemeColors, bgKey: keyof ThemeColors) => {
    const currentFg = colors[fgKey];
    const currentBg = colors[bgKey];
    if (isValidHex(currentFg) && isValidHex(currentBg)) {
      const improved = improveContrast(currentFg, currentBg, 4.5);
      handleColorChange(fgKey, improved);
    }
  };

  const handleAutoFixAll = () => {
    let next = { ...colors };
    if (!getWCAGStatus(next.textPrimary, next.card).passAA) {
      next.textPrimary = improveContrast(next.textPrimary, next.card, 4.5);
      next.text = next.textPrimary;
    }
    if (!getWCAGStatus(next.textSecondary, next.card).passAA) {
      next.textSecondary = improveContrast(next.textSecondary, next.card, 4.5);
    }
    if (!getWCAGStatus(next.textMuted, next.card).passAA) {
      next.textMuted = improveContrast(next.textMuted, next.card, 4.5);
    }
    if (!getWCAGStatus(next.accentText, next.accent).passAA) {
      next.accentText = improveContrast(next.accentText, next.accent, 4.5);
      next.textOnAccent = next.accentText;
    }
    if (!getWCAGStatus(next.textPrimary, next.bg).passAA) {
      next.textPrimary = improveContrast(next.textPrimary, next.bg, 4.5);
      next.text = next.textPrimary;
    }
    setColors(next);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a theme name');
      return;
    }

    for (const [k, val] of Object.entries(colors)) {
      if (!isValidHex(val as string)) {
        setErrorMsg(`Invalid color for ${k}`);
        return;
      }
    }

    saveCustomTheme(
      {
        name: name.trim(),
        description: 'User-created custom theme',
        isCustom: true,
        colors,
      },
      editThemeId || undefined
    );

    onClose();
  };

  // WCAG Contrast Checks
  const primaryOnCard = getWCAGStatus(colors.textPrimary, colors.card);
  const secondaryOnCard = getWCAGStatus(colors.textSecondary, colors.card);
  const mutedOnCard = getWCAGStatus(colors.textMuted, colors.card);
  const textOnAccent = getWCAGStatus(colors.accentText, colors.accent);
  const textOnBg = getWCAGStatus(colors.textPrimary, colors.bg);

  const failCount = [
    primaryOnCard.passAA,
    secondaryOnCard.passAA,
    mutedOnCard.passAA,
    textOnAccent.passAA,
    textOnBg.passAA,
  ].filter((pass) => !pass).length;

  return (
    <div className="relative flex flex-col h-full space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-column"
        >
          <Icon name="arrow_back" size={16} />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold text-text-primary">
          {editThemeId ? 'Edit Theme' : 'New Custom Theme'}
        </span>
      </div>

      {/* Theme Name & Presets */}
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Theme name..."
          className="w-full text-base font-bold bg-transparent text-text-primary placeholder:text-text-muted border-b border-border/80 pb-1.5 outline-none focus:border-accent transition-colors"
        />

        {/* Quick starting presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted shrink-0 mr-1">
            Preset:
          </span>
          {(['light', 'dark', 'midnight', 'grove', 'cyber', 'sakura'] as BuiltInThemeName[]).map(
            (pKey) => (
              <button
                key={pKey}
                type="button"
                onClick={() => handleApplyPreset(pKey)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full border border-border bg-card/60 hover:bg-column hover:border-accent/40 text-text-secondary hover:text-text-primary transition-all shrink-0 cursor-pointer"
              >
                {themes[pKey].name}
              </button>
            )
          )}
        </div>
      </div>

      {/* Prominent Live UI Preview Card */}
      <div className="space-y-2">
        <div
          className="rounded-2xl p-4 shadow-sm border transition-all space-y-3.5"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
          }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
              <span
                className="text-xs font-bold tracking-tight"
                style={{ color: colors.textPrimary }}
              >
                Project Board
              </span>
            </div>
            <div className="flex gap-1">
              <div
                className="w-3.5 h-3.5 rounded-full shadow-2xs"
                style={{ backgroundColor: colors.bg }}
              />
              <div
                className="w-3.5 h-3.5 rounded-full shadow-2xs"
                style={{ backgroundColor: colors.accent }}
              />
              <div
                className="w-3.5 h-3.5 rounded-full shadow-2xs"
                style={{ backgroundColor: colors.textPrimary }}
              />
            </div>
          </div>

          {/* Representative Kanban Card */}
          <div
            className="rounded-xl p-3.5 border shadow-xs space-y-2.5 transition-all"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h4
                className="text-xs font-bold leading-snug"
                style={{ color: colors.textPrimary }}
              >
                Design System & Theme Tokens
              </h4>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${colors.accent} 15%, transparent)`,
                  color: colors.accent,
                  borderColor: `color-mix(in srgb, ${colors.accent} 30%, transparent)`,
                }}
              >
                Active
              </span>
            </div>

            <p
              className="text-[11px] leading-relaxed line-clamp-2"
              style={{ color: colors.textSecondary }}
            >
              Craft elegant color palettes with high-contrast text and responsive layout surfaces.
            </p>

            <div
              className="flex items-center justify-between text-[10px] pt-1"
              style={{ color: colors.textMuted }}
            >
              <span>#18 · Due Friday</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold border"
                  style={{
                    backgroundColor: colors.sprintBg,
                    color: colors.sprintText,
                    borderColor: colors.sprintBorder,
                  }}
                >
                  Sprint 1
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold border"
                  style={{
                    backgroundColor: colors.epicBg,
                    color: colors.epicText,
                    borderColor: colors.epicBorder,
                  }}
                >
                  Core
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Inputs Preview */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-default flex items-center justify-center gap-1.5 transition-all"
              style={{
                backgroundColor: colors.accent,
                color: colors.accentText,
              }}
            >
              <Icon name="add" size={14} />
              <span>New Goal</span>
            </button>
            <div
              className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-medium border truncate"
              style={{
                backgroundColor: colors.input || colors.card,
                borderColor: colors.border,
                color: colors.textMuted,
              }}
            >
              Search goals...
            </div>
          </div>
        </div>

        {/* Compact Accessibility Health Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs">
          <div className="flex items-center gap-2">
            <Icon
              name={failCount === 0 ? 'check_circle' : 'info'}
              size={16}
              className={failCount === 0 ? 'text-emerald-500' : 'text-amber-500'}
            />
            <span className="font-semibold text-text-primary">
              {failCount === 0 ? 'WCAG AA Compliant' : `${failCount} Contrast Warning${failCount > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {failCount > 0 && (
              <button
                type="button"
                onClick={handleAutoFixAll}
                className="text-[11px] font-bold text-accent hover:underline cursor-pointer"
              >
                Auto-Fix All
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowContrastDetails(!showContrastDetails)}
              className="text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              {showContrastDetails ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>

        {/* Expanded Contrast Details */}
        {showContrastDetails && (
          <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2 text-xs animate-in fade-in duration-150">
            <ContrastRow
              label="Primary Text on Card"
              status={primaryOnCard}
              onFix={() => handleImproveContrast('textPrimary', 'card')}
            />
            <ContrastRow
              label="Description on Card"
              status={secondaryOnCard}
              onFix={() => handleImproveContrast('textSecondary', 'card')}
            />
            <ContrastRow
              label="Muted Text on Card"
              status={mutedOnCard}
              onFix={() => handleImproveContrast('textMuted', 'card')}
            />
            <ContrastRow
              label="Button Font on Accent"
              status={textOnAccent}
              onFix={() => handleImproveContrast('accentText', 'accent')}
            />
            <ContrastRow
              label="Text on Page Background"
              status={textOnBg}
              onFix={() => handleImproveContrast('textPrimary', 'bg')}
            />
          </div>
        )}
      </div>

      {/* Color Groups - Clean Swatch Grid */}
      <div className="space-y-5">
        {/* 1. Surfaces */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Surfaces
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ColorSwatchItem
              label="Background"
              colorKey="bg"
              value={colors.bg}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Cards"
              colorKey="card"
              value={colors.card}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Columns"
              colorKey="column"
              value={colors.column}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Borders"
              colorKey="border"
              value={colors.border}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
          </div>
        </div>

        {/* 2. Text */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Text Colors
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ColorSwatchItem
              label="Primary Text"
              colorKey="textPrimary"
              value={colors.textPrimary}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Descriptions"
              colorKey="textSecondary"
              value={colors.textSecondary}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Muted Details"
              colorKey="textMuted"
              value={colors.textMuted}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Sidebar Panel"
              colorKey="sidebar"
              value={colors.sidebar}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
          </div>
        </div>

        {/* 3. Accents & Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Accents & Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ColorSwatchItem
              label="Primary Accent"
              colorKey="accent"
              value={colors.accent}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Button Text"
              colorKey="accentText"
              value={colors.accentText}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
          </div>
        </div>

        {/* 4. Status & Badges */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Status & Badges
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ColorSwatchItem
              label="Sprint Text"
              colorKey="sprintText"
              value={colors.sprintText}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Sprint Tint"
              colorKey="sprintBg"
              value={colors.sprintBg}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Epic Text"
              colorKey="epicText"
              value={colors.epicText}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
            <ColorSwatchItem
              label="Epic Tint"
              colorKey="epicBg"
              value={colors.epicBg}
              onChange={handleColorChange}
              activeHexKey={activeHexKey}
              setActiveHexKey={setActiveHexKey}
            />
          </div>
        </div>

        {/* 5. Advanced Collapsible */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full py-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer border-t border-border/60"
          >
            <span>Advanced Tokens</span>
            <Icon
              name={showAdvanced ? 'expand_less' : 'expand_more'}
              size={18}
            />
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-150">
              <ColorSwatchItem
                label="Disabled Text"
                colorKey="textDisabled"
                value={colors.textDisabled}
                onChange={handleColorChange}
                activeHexKey={activeHexKey}
                setActiveHexKey={setActiveHexKey}
              />
              <ColorSwatchItem
                label="Input Background"
                colorKey="input"
                value={colors.input}
                onChange={handleColorChange}
                activeHexKey={activeHexKey}
                setActiveHexKey={setActiveHexKey}
              />
              <ColorSwatchItem
                label="Sprint Border"
                colorKey="sprintBorder"
                value={colors.sprintBorder}
                onChange={handleColorChange}
                activeHexKey={activeHexKey}
                setActiveHexKey={setActiveHexKey}
              />
              <ColorSwatchItem
                label="Epic Border"
                colorKey="epicBorder"
                value={colors.epicBorder}
                onChange={handleColorChange}
                activeHexKey={activeHexKey}
                setActiveHexKey={setActiveHexKey}
              />
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center gap-2">
          <Icon name="error" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sticky Bottom Actions Footer */}
      <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-end gap-2 z-20">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-column transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-accent text-accent-text hover:brightness-105 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Icon name="check" size={15} />
          <span>{editThemeId ? 'Save Changes' : 'Save Theme'}</span>
        </button>
      </div>
    </div>
  );
}

interface ColorSwatchItemProps {
  label: string;
  colorKey: keyof ThemeColors;
  value: string;
  onChange: (key: keyof ThemeColors, value: string) => void;
  activeHexKey: keyof ThemeColors | null;
  setActiveHexKey: (key: keyof ThemeColors | null) => void;
}

function ColorSwatchItem({
  label,
  colorKey,
  value,
  onChange,
  activeHexKey,
  setActiveHexKey,
}: ColorSwatchItemProps) {
  const isHexOpen = activeHexKey === colorKey;
  const normalized = isValidHex(value) ? normalizeHex(value) : value;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 hover:border-border transition-colors">
        <span className="text-xs font-semibold text-text-secondary truncate pr-2">
          {label}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Visual Color Swatch Button */}
          <div className="relative w-6 h-6 rounded-lg border border-border/90 overflow-hidden cursor-pointer shadow-2xs hover:scale-105 transition-transform">
            <input
              type="color"
              value={isValidHex(normalized) ? normalized : '#000000'}
              onChange={(e) => onChange(colorKey, e.target.value)}
              className="absolute -top-3 -left-3 w-12 h-12 cursor-pointer opacity-0"
              title={`Choose ${label} color`}
            />
            <div
              className="w-full h-full pointer-events-none"
              style={{ backgroundColor: normalized }}
            />
          </div>

          {/* Toggle Hex Input Button */}
          <button
            type="button"
            onClick={() => setActiveHexKey(isHexOpen ? null : colorKey)}
            className="p-1 text-text-muted hover:text-text-primary rounded-md transition-colors cursor-pointer"
            title="Edit hex code"
          >
            <Icon name="edit" size={12} />
          </button>
        </div>
      </div>

      {/* Hex Popover */}
      {isHexOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 p-2 rounded-xl bg-card border border-border shadow-lg space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={value}
              maxLength={7}
              onChange={(e) => onChange(colorKey, e.target.value)}
              placeholder="#000000"
              className={cn(
                'w-full px-2 py-1 text-xs font-mono font-bold rounded-lg border bg-column/60 outline-none uppercase',
                isValidHex(value)
                  ? 'border-border text-text-primary focus:border-accent'
                  : 'border-rose-500 text-rose-500'
              )}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setActiveHexKey(null)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ContrastRowProps {
  label: string;
  status: { ratio: number; passAA: boolean; badgeClass: string; badgeLabel: string };
  onFix: () => void;
}

function ContrastRow({ label, status, onFix }: ContrastRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-text-secondary truncate pr-2">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn('px-1.5 py-0.2 rounded text-[9px] font-bold border', status.badgeClass)}>
          {status.badgeLabel}
        </span>
        {!status.passAA && (
          <button
            type="button"
            onClick={onFix}
            className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
}
