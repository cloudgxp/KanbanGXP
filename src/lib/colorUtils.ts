/**
 * Color and WCAG contrast utilities for theme customization.
 */

export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const clean = hex.trim();
  if (!isValidHex(clean)) return '#000000';
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toLowerCase();
  }
  return clean.toLowerCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG 2.1 relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG contrast ratio between two colors (ranging from 1 to 21).
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const lum1 = getLuminance(fgHex);
  const lum2 = getLuminance(bgHex);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export interface WCAGStatus {
  ratio: number;
  passAA: boolean; // Normal text (4.5:1)
  passAALarge: boolean; // Large/bold text (3:1)
  passAAA: boolean; // Enhanced text (7:1)
  badgeLabel: string;
  badgeClass: string;
}

export function getWCAGStatus(fgHex: string, bgHex: string): WCAGStatus {
  const ratio = getContrastRatio(fgHex, bgHex);
  const passAA = ratio >= 4.5;
  const passAALarge = ratio >= 3.0;
  const passAAA = ratio >= 7.0;

  let badgeLabel = 'Fail';
  let badgeClass = 'bg-rose-500/15 text-rose-600 border-rose-500/30';

  if (passAAA) {
    badgeLabel = `${ratio}:1 · AAA`;
    badgeClass = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  } else if (passAA) {
    badgeLabel = `${ratio}:1 · AA Pass`;
    badgeClass = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  } else if (passAALarge) {
    badgeLabel = `${ratio}:1 · Large Text Only`;
    badgeClass = 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  } else {
    badgeLabel = `${ratio}:1 · Low Contrast`;
    badgeClass = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
  }

  return { ratio, passAA, passAALarge, passAAA, badgeLabel, badgeClass };
}

/**
 * HSL / RGB conversions for contrast improvements
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hNorm = (h % 360 + 360) % 360 / 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tAdj = t;
      if (tAdj < 0) tAdj += 1;
      if (tAdj > 1) tAdj -= 1;
      if (tAdj < 1 / 6) return p + (q - p) * 6 * tAdj;
      if (tAdj < 1 / 2) return q;
      if (tAdj < 2 / 3) return p + (q - p) * (2 / 3 - tAdj) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Intelligently shifts foreground color lightness to achieve >= targetRatio contrast against background.
 */
export function improveContrast(fgHex: string, bgHex: string, targetRatio = 4.5): string {
  const currentRatio = getContrastRatio(fgHex, bgHex);
  if (currentRatio >= targetRatio) return normalizeHex(fgHex);

  const bgLum = getLuminance(bgHex);
  const { r, g, b } = hexToRgb(fgHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // If background is dark (luminance < 0.35), make foreground lighter; otherwise darker
  const makeLighter = bgLum < 0.35;
  let adjustedL = l;
  let bestHex = normalizeHex(fgHex);
  const step = 0.03;

  for (let i = 0; i < 30; i++) {
    adjustedL = makeLighter ? Math.min(1, adjustedL + step) : Math.max(0, adjustedL - step);
    const rgb = hslToRgb(h, s, adjustedL);
    const candidateHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const ratio = getContrastRatio(candidateHex, bgHex);
    bestHex = candidateHex;
    if (ratio >= targetRatio) {
      break;
    }
  }

  // Fallback to pure white or pure black if needed
  if (getContrastRatio(bestHex, bgHex) < targetRatio) {
    const whiteRatio = getContrastRatio('#ffffff', bgHex);
    const blackRatio = getContrastRatio('#000000', bgHex);
    return whiteRatio >= blackRatio ? '#ffffff' : '#000000';
  }

  return bestHex;
}
