import { themes } from '../src/theme';
import { getContrastRatio, getWCAGStatus } from '../src/lib/colorUtils';

console.log('=== AUDITING BUILT-IN THEMES CONTRAST ===\n');

let totalChecks = 0;
let failCount = 0;

for (const [themeKey, theme] of Object.entries(themes)) {
  console.log(`\n--- Theme: ${theme.name} (${themeKey}) ---`);
  const c = theme.colors;

  const checks = [
    { name: 'Primary Text on Card', fg: c.textPrimary, bg: c.card, minRatio: 4.5 },
    { name: 'Secondary Text on Card', fg: c.textSecondary, bg: c.card, minRatio: 4.5 },
    { name: 'Muted Text on Card', fg: c.textMuted, bg: c.card, minRatio: 4.5 },
    { name: 'Primary Text on Page Bg', fg: c.textPrimary, bg: c.bg, minRatio: 4.5 },
    { name: 'Secondary Text on Page Bg', fg: c.textSecondary, bg: c.bg, minRatio: 4.5 },
    { name: 'Primary Text on Sidebar', fg: c.textPrimary, bg: c.sidebar, minRatio: 4.5 },
    { name: 'Secondary Text on Sidebar', fg: c.textSecondary, bg: c.sidebar, minRatio: 4.5 },
    { name: 'Primary Text on Column', fg: c.textPrimary, bg: c.column, minRatio: 4.5 },
    { name: 'Button Text on Primary Accent', fg: c.accentText, bg: c.accent, minRatio: 4.5 },
    { name: 'Sprint Text on Sprint Bg', fg: c.sprintText, bg: c.sprintBg, minRatio: 4.5 },
    { name: 'Epic Text on Epic Bg', fg: c.epicText, bg: c.epicBg, minRatio: 4.5 },
    { name: 'Primary Text on Input', fg: c.textPrimary, bg: c.input, minRatio: 4.5 },
  ];

  for (const check of checks) {
    totalChecks++;
    const ratio = getContrastRatio(check.fg, check.bg);
    const pass = ratio >= check.minRatio;
    if (!pass) {
      failCount++;
      console.log(`❌ FAIL: ${check.name.padEnd(30)} ${check.fg} on ${check.bg} -> ${ratio}:1 (required: ${check.minRatio}:1)`);
    } else {
      console.log(`✅ PASS: ${check.name.padEnd(30)} ${check.fg} on ${check.bg} -> ${ratio}:1`);
    }
  }
}

console.log(`\n========================================`);
console.log(`Total checks: ${totalChecks}, Failures: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('All preset themes pass WCAG AA contrast requirements!');
  process.exit(0);
}
