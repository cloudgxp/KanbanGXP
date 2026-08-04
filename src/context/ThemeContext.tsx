import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName, themes } from '../theme';
import { getLocalStorageItem, setLocalStorageItem, STORAGE_KEYS } from '../lib/storage';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = getLocalStorageItem(STORAGE_KEYS.theme) || getLocalStorageItem(STORAGE_KEYS.legacyTheme);
    return (saved as ThemeName) || 'light';
  });

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    setLocalStorageItem(STORAGE_KEYS.theme, newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const colors = themes[theme].colors;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value as string);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
