/**
 * DESIGN.md token layer — single source of truth for colors.
 *
 * Two palettes: claude-light (parchment bg) and claude-dark (muted olive bg).
 * VS Code sets `.vscode-light` / `.vscode-dark` / `.vscode-high-contrast` on body;
 * `theme.ts` emits CSS vars scoped to those classes.
 */
export const CLAUDE_LIGHT = {
  bgBase:        '#f5f4ed', // Parchment
  bgSurface:     '#ffffff',
  bgSunken:      '#eceae0',
  textPrimary:   '#2d2a22',
  textSecondary: '#5e5d59', // Olive Gray
  textMuted:     '#8a8982',
  accentPrimary: '#c96442', // Terracotta
  accentHover:   '#d97757', // Coral
  success:       '#4a7c5e',
  warning:       '#c99142',
  danger:        '#b25242',
  ringShadow:       '0 0 0 1px rgba(45,42,34,0.08)',
  ringShadowStrong: '0 0 0 1px rgba(45,42,34,0.16)',
  // Derived tokens used by fullpage dashboard
  ring:      '0 0 0 1px rgba(45,42,34,0.08)',
  barEmpty:  'rgba(45,42,34,0.08)',
  divider:   'rgba(45,42,34,0.08)',
};

export const CLAUDE_DARK = {
  bgBase:        '#1f1d18',
  bgSurface:     '#2a2822',
  bgSunken:      '#161411',
  textPrimary:   '#ebe9df',
  textSecondary: '#b1afa5',
  textMuted:     '#8a8780',
  accentPrimary: '#d97757',
  accentHover:   '#e4876a',
  success:       '#6ea587',
  warning:       '#e0a75e',
  danger:        '#d17460',
  ringShadow:       'inset 0 0 0 1px rgba(235,233,223,0.08)',
  ringShadowStrong: 'inset 0 0 0 1px rgba(235,233,223,0.16)',
  // Derived tokens used by fullpage dashboard
  ring:      'inset 0 0 0 1px rgba(235,233,223,0.08)',
  barEmpty:  'rgba(235,233,223,0.08)',
  divider:   'rgba(235,233,223,0.08)',
};
