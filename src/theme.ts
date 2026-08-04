export type ThemeName = 'light' | 'dark' | 'sakura' | 'midnight';

export interface ThemeColors {
  bg: string;
  sidebar: string;
  column: string;
  card: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
  input: string;
}

export const themes: Record<ThemeName, { name: string; description: string; colors: ThemeColors }> = {
  light: {
    name: 'Light',
    description: 'Clean, bright interface for daytime use',
    colors: {
      bg: '#f8fafc',
      sidebar: '#ffffff',
      column: '#f1f5f9',
      card: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      accent: '#4f46e5',
      border: '#e2e8f0',
      input: '#ffffff',
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
      textMuted: '#94a3b8',
      accent: '#818cf8',
      border: '#334155',
      input: '#1e293b',
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
      textMuted: '#be123c',
      accent: '#f43f5e',
      border: '#fecdd3',
      input: '#fff1f3',
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
      text: '#e2e8f0',
      textMuted: '#64748b',
      accent: '#22d3ee',
      border: '#1e293b',
      input: '#0f172a',
    },
  },
};
