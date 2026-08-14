export type BuiltInThemeName = 'light' | 'dark' | 'sakura' | 'midnight' | 'grove' | 'cyber';
export type ThemeName = BuiltInThemeName | string;

export interface ThemeColors {
  bg: string;
  sidebar: string;
  column: string;
  card: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  accent: string;
  accentText: string;
  textOnAccent: string;
  border: string;
  input: string;
  sprintBg: string;
  sprintText: string;
  sprintBorder: string;
  epicBg: string;
  epicText: string;
  epicBorder: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  isCustom: true;
  colors: ThemeColors;
  createdAt: number;
  updatedAt: number;
}

export interface ThemeDefinition {
  name: string;
  description?: string;
  colors: ThemeColors;
  isCustom?: boolean;
  id?: string;
}

export function getDefaultCustomTheme(baseTheme: BuiltInThemeName = 'dark'): Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'> {
  const base = themes[baseTheme] || themes.dark;
  return {
    name: 'My Custom Theme',
    description: 'User-created custom color theme',
    isCustom: true,
    colors: { ...base.colors },
  };
}

export const themes: Record<BuiltInThemeName, ThemeDefinition> = {
  light: {
    name: 'Light',
    description: 'Clean, bright interface for daytime use',
    colors: {
      bg: '#f8fafc',
      sidebar: '#ffffff',
      column: '#f1f5f9',
      card: '#ffffff',
      text: '#0f172a',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      textDisabled: '#94a3b8',
      accent: '#4f46e5',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#e2e8f0',
      input: '#ffffff',
      sprintBg: '#eef2ff',
      sprintText: '#4338ca',
      sprintBorder: '#c7d2fe',
      epicBg: '#f5f3ff',
      epicText: '#6d28d9',
      epicBorder: '#ddd6fe',
    },
  },
  dark: {
    name: 'Dark',
    description: 'Standard dark interface for low-light environments',
    colors: {
      bg: '#0f172a',
      sidebar: '#1e293b',
      column: '#1e293b',
      card: '#334155',
      text: '#f8fafc',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#9bb0c8',
      textDisabled: '#64748b',
      accent: '#5850ec',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#475569',
      input: '#1e293b',
      sprintBg: '#1e1b4b',
      sprintText: '#a5b4fc',
      sprintBorder: '#3730a3',
      epicBg: '#2e1065',
      epicText: '#c4b5fd',
      epicBorder: '#5b21b6',
    },
  },
  sakura: {
    name: 'Sakura',
    description: 'Soft pink and pastel tones inspired by cherry blossoms',
    colors: {
      bg: '#fff5f7',
      sidebar: '#fff1f3',
      column: '#ffe4e6',
      card: '#ffffff',
      text: '#881337',
      textPrimary: '#881337',
      textSecondary: '#9f1239',
      textMuted: '#be123c',
      textDisabled: '#fda4af',
      accent: '#e11d48',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#fecdd3',
      input: '#fff1f3',
      sprintBg: '#fff1f2',
      sprintText: '#be123c',
      sprintBorder: '#fecdd3',
      epicBg: '#fdf2f8',
      epicText: '#9d174d',
      epicBorder: '#fbcfe8',
    },
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep dark blue theme with subtle neon accents',
    colors: {
      bg: '#020617',
      sidebar: '#0f172a',
      column: '#0f172a',
      card: '#1e293b',
      text: '#f8fafc',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textDisabled: '#475569',
      accent: '#0277bd',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#334155',
      input: '#0f172a',
      sprintBg: '#082f49',
      sprintText: '#38bdf8',
      sprintBorder: '#0369a1',
      epicBg: '#1e1b4b',
      epicText: '#a5b4fc',
      epicBorder: '#3730a3',
    },
  },
  grove: {
    name: 'Grove',
    description: 'Warm, earthy theme with autumn and forest-inspired tones',
    colors: {
      bg: '#f4efe6',
      sidebar: '#ebe2d2',
      column: '#dfd4c0',
      card: '#fdfbf7',
      text: '#2d2f1e',
      textPrimary: '#2d2f1e',
      textSecondary: '#4d4d33',
      textMuted: '#66684b',
      textDisabled: '#9c9c84',
      accent: '#5a7c3e',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#c8baa1',
      input: '#fdfbf7',
      sprintBg: '#f7ece3',
      sprintText: '#934e20',
      sprintBorder: '#e4c2a8',
      epicBg: '#edf3e4',
      epicText: '#4a6830',
      epicBorder: '#c1d6a6',
    },
  },
  cyber: {
    name: 'Cyber',
    description: 'Dark synthwave theme with electric blue and neon magenta accents',
    colors: {
      bg: '#171038',
      sidebar: '#1e1546',
      column: '#21174b',
      card: '#2c225a',
      text: '#f5f0ff',
      textPrimary: '#f5f0ff',
      textSecondary: '#d6c8f5',
      textMuted: '#a89bd4',
      textDisabled: '#63578c',
      accent: '#0066dc',
      accentText: '#ffffff',
      textOnAccent: '#ffffff',
      border: '#45377d',
      input: '#1e1546',
      sprintBg: '#3d152a',
      sprintText: '#f48ea9',
      sprintBorder: '#7a2846',
      epicBg: '#3b1642',
      epicText: '#f096f4',
      epicBorder: '#7e2b88',
    },
  },
};
