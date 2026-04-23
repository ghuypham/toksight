/**
 * Shared quota severity thresholds — single source of truth for the colors
 * shown on progress bars, percent labels, and tile values across widget,
 * sidebar, and full-page dashboard.
 *
 * Thresholds per DESIGN.md §0:
 *   safe    (< 50%)  → Safe Green (#34D399) — var(--tok-severity-safe)
 *   warning (50–79%) → Warning Amber        — var(--tok-warning)
 *   danger  (≥ 80%)  → Danger Red           — var(--tok-danger)
 *
 * Keep this helper tiny and dependency-free so both DOM and SSR callers
 * (tests, tab-quota className derivation) can use it.
 */
export const QUOTA_WARN_PCT = 50;
export const QUOTA_DANGER_PCT = 80;

/** Severity bucket for a 0–100 utilization value. */
export type QuotaSeverity = 'safe' | 'warn' | 'danger';

export function quotaSeverity(pct: number): QuotaSeverity {
  if (pct >= QUOTA_DANGER_PCT) return 'danger';
  if (pct >= QUOTA_WARN_PCT) return 'warn';
  return 'safe';
}

/**
 * Resolve color for a progress bar / percent label.
 * All severity tiers now have explicit colors — no brandAccent fallback needed.
 */
export function quotaSeverityColor(pct: number): string {
  const s = quotaSeverity(pct);
  if (s === 'danger') return 'var(--tok-danger)';
  if (s === 'warn') return 'var(--tok-warning)';
  return 'var(--tok-severity-safe)';
}

/** className suffix for dashboard fp-bar-fill variants. */
export function quotaBarClass(pct: number): string {
  const s = quotaSeverity(pct);
  if (s === 'danger') return 'fp-bar-fill danger';
  if (s === 'warn') return 'fp-bar-fill warn';
  return 'fp-bar-fill safe';
}
