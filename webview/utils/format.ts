/** Shared formatting utilities for webview components */

/** Format a token count with K/M/B suffix */
export function formatTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

/** Format a USD cost value with appropriate precision */
export function fmtCost(n: number): string {
  if (n < 0.005) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}
