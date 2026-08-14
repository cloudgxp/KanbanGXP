import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeName, themes, CustomTheme, ThemeColors, ThemeDefinition, BuiltInThemeName } from '../theme';
import { getLocalStorageItem, setLocalStorageItem, STORAGE_KEYS } from '../lib/storage';
import { getLuminance, normalizeHex } from '../lib/colorUtils';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  customThemes: CustomTheme[];
  allThemes: Record<string, ThemeDefinition>;
  saveCustomTheme: (themeData: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => string;
  deleteCustomTheme: (id: string) => void;
  duplicateTheme: (themeId: string) => string;
  previewColors: ThemeColors | null;
  setPreviewColors: (colors: ThemeColors | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = getLocalStorageItem(STORAGE_KEYS.customThemes);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && item.id && item.name && item.colors);
    }
    return [];
  } catch (err) {
    console.error('Failed to parse custom themes from storage:', err);
    return [];
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => loadCustomThemes());
  const [previewColors, setPreviewColors] = useState<ThemeColors | null>(null);

  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = getLocalStorageItem(STORAGE_KEYS.theme) || getLocalStorageItem(STORAGE_KEYS.legacyTheme);
    return (saved as ThemeName) || 'light';
  });

  // Save custom themes whenever list changes
  useEffect(() => {
    setLocalStorageItem(STORAGE_KEYS.customThemes, JSON.stringify(customThemes));
  }, [customThemes]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    setLocalStorageItem(STORAGE_KEYS.theme, newTheme);
    setPreviewColors(null);
  };

  const allThemes = useMemo<Record<string, ThemeDefinition>>(() => {
    const combined: Record<string, ThemeDefinition> = { ...themes };
    customThemes.forEach((ct) => {
      combined[ct.id] = {
        id: ct.id,
        name: ct.name,
        description: ct.description || 'User-created custom theme',
        colors: ct.colors,
        isCustom: true,
      };
    });
    return combined;
  }, [customThemes]);

  const activeColors = useMemo<ThemeColors>(() => {
    if (previewColors) return previewColors;
    const currentThemeDef = allThemes[theme];
    if (currentThemeDef) return currentThemeDef.colors;
    return themes.light.colors;
  }, [previewColors, allThemes, theme]);

  const saveCustomTheme = (themeData: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): string => {
    const now = Date.now();
    const id = existingId || `custom-${now}`;
    
    // Normalize and sanitize all color tokens
    const sanitizedColors: ThemeColors = { ...themeData.colors };
    Object.keys(sanitizedColors).forEach((k) => {
      const key = k as keyof ThemeColors;
      if (typeof sanitizedColors[key] === 'string') {
        sanitizedColors[key] = normalizeHex(sanitizedColors[key]);
      }
    });

    const newCustomTheme: CustomTheme = {
      id,
      name: themeData.name.trim() || 'Untitled Theme',
      description: themeData.description?.trim() || 'User-created custom theme',
      isCustom: true,
      colors: sanitizedColors,
      createdAt: now,
      updatedAt: now,
    };

    setCustomThemes((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered, newCustomTheme];
    });

    setTheme(id);
    setPreviewColors(null);
    return id;
  };

  const deleteCustomTheme = (id: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
    if (theme === id) {
      setTheme('light');
    }
  };

  const duplicateTheme = (sourceThemeId: string): string => {
    const source = allThemes[sourceThemeId];
    if (!source) return '';

    const newName = `${source.name} (Copy)`;
    return saveCustomTheme({
      name: newName,
      description: `Copy of ${source.name}`,
      isCustom: true,
      colors: { ...source.colors },
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Determine dark vs light mode
    let isDark = false;
    if (theme === 'dark' || theme === 'midnight' || theme === 'cyber') {
      isDark = true;
    } else {
      isDark = getLuminance(activeColors.bg) < 0.25;
    }

    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-name', previewColors ? 'preview' : theme);
    
    Object.entries(activeColors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--${key}`, value);
        const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        root.style.setProperty(`--${kebabKey}`, value);
      }
    });
  }, [theme, activeColors, previewColors]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        customThemes,
        allThemes,
        saveCustomTheme,
        deleteCustomTheme,
        duplicateTheme,
        previewColors,
        setPreviewColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

