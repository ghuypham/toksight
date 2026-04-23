/**
 * DESIGN.md token layer — single source of truth for colors.
 *
 * Two palettes: claude-light and claude-dark. VS Code sets `.vscode-light`
 * / `.vscode-dark` / `.vscode-high-contrast` on body; `theme.ts` emits CSS
 * vars scoped to those classes.
 *
 * Background & text tokens defer to VS Code's own theme vars so the
 * extension blends with the user's chosen theme (Dark Modern, One Dark Pro,
 * Solarized, custom, etc.). Claude warm hex stays as a defensive fallback.
 *
 * Accent + semantic + overlay tokens keep claude-warm hex per DESIGN.md:
 * "Don't use cool blue-grays anywhere" applies to brand moments, not to
 * user-controlled chrome that we must respect.
 */
export const CLAUDE_LIGHT = {
  // Surfaces — VS Code chrome (blends with sidebar/editor)
  bgBase:        'var(--vscode-sideBar-background, #f5f4ed)',
  bgSurface:     'var(--vscode-editorWidget-background, #ffffff)',
  bgSunken:      'var(--vscode-editor-background, #eceae0)',
  // Text — VS Code chrome
  textPrimary:   'var(--vscode-foreground, #2d2a22)',
  textSecondary: 'var(--vscode-descriptionForeground, #5e5d59)',
  textMuted:     'var(--vscode-disabledForeground, #8a8982)',
  // Accents — stay warm (Claude brand identity)
  accentPrimary: '#c96442', // Terracotta
  accentHover:   '#d97757', // Coral
  // Semantic — stay warm per DESIGN.md
  success:       '#4a7c5e',
  warning:       '#c99142',
  danger:        '#b25242',
  // Rings use VS Code border with warm rgba fallback
  ringShadow:       '0 0 0 1px var(--vscode-widget-border, rgba(45,42,34,0.08))',
  ringShadowStrong: '0 0 0 1px var(--vscode-widget-border, rgba(45,42,34,0.16))',
  // Chrome tints — MUST follow VS Code so tracks/dividers stay visible on any
  // theme (Dark Modern, Solarized, custom). Warm rgba is last-resort fallback.
  ring:         '0 0 0 1px var(--vscode-widget-border, rgba(45,42,34,0.08))',
  // scrollbarSlider-background has better contrast than input-background on
  // many dark themes where input-bg matches widget bg exactly.
  barEmpty:     'var(--vscode-scrollbarSlider-background, rgba(45,42,34,0.18))',
  divider:      'var(--vscode-widget-border, rgba(45,42,34,0.08))',
  // Safe Green — severity <50%, aligned with model-mix palette entry #3
  severitySafe: '#34D399',
};

export const CLAUDE_DARK = {
  // Surfaces — VS Code chrome
  bgBase:        'var(--vscode-sideBar-background, #1f1d18)',
  bgSurface:     'var(--vscode-editorWidget-background, #2a2822)',
  bgSunken:      'var(--vscode-editor-background, #161411)',
  // Text — VS Code chrome
  textPrimary:   'var(--vscode-foreground, #ebe9df)',
  textSecondary: 'var(--vscode-descriptionForeground, #b1afa5)',
  textMuted:     'var(--vscode-disabledForeground, #8a8780)',
  // Accents — stay warm
  accentPrimary: '#d97757',
  accentHover:   '#e4876a',
  // Semantic — stay warm
  success:       '#6ea587',
  warning:       '#e0a75e',
  danger:        '#d17460',
  // Rings — inset preserves dark-surface halo, fallback keeps warm rgba
  ringShadow:       'inset 0 0 0 1px var(--vscode-widget-border, rgba(235,233,223,0.08))',
  ringShadowStrong: 'inset 0 0 0 1px var(--vscode-widget-border, rgba(235,233,223,0.16))',
  // Chrome tints — follow VS Code vars so tracks/dividers have visible
  // contrast on the user's chosen theme; warm rgba stays as defensive fallback.
  ring:         'inset 0 0 0 1px var(--vscode-widget-border, rgba(235,233,223,0.08))',
  barEmpty:     'var(--vscode-scrollbarSlider-background, rgba(235,233,223,0.22))',
  divider:      'var(--vscode-widget-border, rgba(235,233,223,0.08))',
  // Safe Green — severity <50%, aligned with model-mix palette entry #3
  severitySafe: '#34D399',
};
