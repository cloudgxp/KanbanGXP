import { themes, BuiltInThemeName } from '../theme';
import { getContrastRatio } from '../lib/colorUtils';

/**
 * Automated test suite to audit contrast ratios across all built-in themes.
 * Prevents regressions in WCAG AA accessibility compliance.
 */
describeThemeContrast();

function describeThemeContrast() {
  const themeKeys = Object.keys(themes) as BuiltInThemeName[];
  let failures = 0;

  console.log('Running Theme Contrast Accessibility Tests...');

  for (const key of themeKeys) {
    const theme = themes[key];
    const c = theme.colors;

    const testPairs = [
      { name: 'Primary Text on Card', fg: c.textPrimary, bg: c.card, min: 4.5 },
      { name: 'Secondary Text on Card', fg: c.textSecondary, bg: c.card, min: 4.5 },
      { name: 'Muted Text on Card', fg: c.textMuted, bg: c.card, min: 4.5 },
      { name: 'Primary Text on Page Bg', fg: c.textPrimary, bg: c.bg, min: 4.5 },
      { name: 'Secondary Text on Page Bg', fg: c.textSecondary, bg: c.bg, min: 4.5 },
      { name: 'Primary Text on Sidebar', fg: c.textPrimary, bg: c.sidebar, min: 4.5 },
      { name: 'Secondary Text on Sidebar', fg: c.textSecondary, bg: c.sidebar, min: 4.5 },
      { name: 'Primary Text on Column', fg: c.textPrimary, bg: c.column, min: 4.5 },
      { name: 'Button Text on Primary Accent', fg: c.accentText, bg: c.accent, min: 4.5 },
      { name: 'Sprint Text on Sprint Bg', fg: c.sprintText, bg: c.sprintBg, min: 4.5 },
      { name: 'Epic Text on Epic Bg', fg: c.epicText, bg: c.epicBg, min: 4.5 },
      { name: 'Primary Text on Input', fg: c.textPrimary, bg: c.input, min: 4.5 },
    ];

    for (const test of testPairs) {
      const ratio = getContrastRatio(test.fg, test.bg);
      if (ratio < test.min) {
        console.error(`[FAIL] ${theme.name}: ${test.name} ratio ${ratio}:1 < ${test.min}:1`);
        failures++;
      }
    }
  }

  if (failures > 0) {
    console.error(`\nTest Failed: ${failures} contrast violations found in preset themes.`);
    process.exit(1);
  } else {
    console.log(`\nTest Passed: All ${themeKeys.length} built-in themes pass WCAG AA contrast standards.`);
  }
}
