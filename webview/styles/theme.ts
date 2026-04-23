import { CLAUDE_LIGHT, CLAUDE_DARK } from './tokens';

/** Emit `--tok-*` CSS vars from a palette record (camelCase → kebab-case). */
function toCssVars(palette: Record<string, string>): string {
  return Object.entries(palette)
    .map(([k, v]) => `--tok-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
    .join('\n  ');
}

/** DESIGN.md token CSS — injected into every webview via getHtml(). */
export const CLAUDE_THEME_CSS = `
.vscode-light {
  ${toCssVars(CLAUDE_LIGHT)}
}
.vscode-dark, .vscode-high-contrast {
  ${toCssVars(CLAUDE_DARK)}
}
body {
  background: var(--tok-bg-base);
  color: var(--tok-text-primary);
}

/* ── Motion layer — first-paint entrance + live value transitions ── */
@keyframes tokFadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tokFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* Fullpage sections cascade on first paint */
.fp-section {
  animation: tokFadeUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.fp-section:nth-child(1) { animation-delay: 0.00s; }
.fp-section:nth-child(2) { animation-delay: 0.06s; }
.fp-section:nth-child(3) { animation-delay: 0.12s; }
.fp-section:nth-child(4) { animation-delay: 0.18s; }
.fp-section:nth-child(5) { animation-delay: 0.24s; }
.fp-section:nth-child(n+6) { animation-delay: 0.30s; }

/* Stat cards: subtle stagger inside a section */
.fp-stat { animation: tokFadeUp 0.4s ease-out both; }
.fp-stats .fp-stat:nth-child(1) { animation-delay: 0.00s; }
.fp-stats .fp-stat:nth-child(2) { animation-delay: 0.05s; }
.fp-stats .fp-stat:nth-child(3) { animation-delay: 0.10s; }
.fp-stats .fp-stat:nth-child(4) { animation-delay: 0.15s; }

/* Bar fills + hero bar: smooth width transitions when values update */
.fp-bar-fill,
.fp-hero-bar > div {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.3s ease;
}

/* 7-day spend bars: smooth height transitions */
.spend7-big .b {
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.15s ease;
}

/* KPI numbers: color transitions (severity changes) */
.fp-stat-v { transition: color 0.3s ease; }

/* Sidebar group cards: soft entrance */
.sidebar-group { animation: tokFadeUp 0.4s ease-out both; }

/* Explorer widget: entrance fade for slide content */
.explorer-slide { animation: tokFadeIn 0.35s ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .fp-section, .fp-stat, .sidebar-group, .explorer-slide { animation: none; }
  .fp-bar-fill, .fp-hero-bar > div, .spend7-big .b, .fp-stat-v { transition: none; }
}
`;

/** Theme using VS Code CSS variables for backgrounds/text, Claude accents for highlights */
export const theme = {
  // VS Code variables — resolved at runtime by the webview
  pageBg: 'var(--vscode-sideBar-background)',
  cardBg: 'var(--vscode-editorWidget-background)',
  cardBgElevated: 'var(--vscode-editorWidget-background)',
  foreground: 'var(--vscode-foreground)',
  descriptionForeground: 'var(--vscode-descriptionForeground)',
  disabledForeground: 'var(--vscode-disabledForeground)',
  widgetBorder: 'var(--vscode-widget-border)',
  inputBg: 'var(--vscode-input-background)',

  // Claude accents — kept as constants
  coral: '#D97757',
  activeGreen: '#4CAF50',
  sonnetBlue: '#5B9BD5',
  haikuGray: '#999999',

  // Fonts — inherit from VS Code so the extension never ships a webfont.
  // Fallbacks are system stacks that exist on every platform (no network).
  serif: "Georgia, 'Times New Roman', serif",
  sans: "var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
  mono: "var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Consolas, monospace)",

  // Layout
  ring: '0px 0px 0px 1px var(--vscode-widget-border)',
  radius: '6px',
} as const;

/** Legacy alias — keeps existing imports working during migration */
export const claude = {
  primary: theme.coral,
  primaryHover: '#C4684A',
  live: theme.activeGreen,
  liveGlow: 'rgba(76, 175, 80, 0.4)',
  trendUp: theme.activeGreen,
  trendDown: '#e57373',
  trendFlat: '#FF9800',
  opus: theme.coral,
  sonnet: theme.sonnetBlue,
  haiku: theme.haikuGray,
} as const;
