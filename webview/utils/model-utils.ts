/**
 * Centralized model identification — keeps display logic future-proof
 * for new versions (4.6, 4.7, ...) and entirely new model families.
 *
 * Anthropic model ID convention:
 *   claude-{family}-{major}-{minor}[-{date}]
 *   e.g. claude-opus-4-6, claude-sonnet-4-5, claude-haiku-4-5-20251001
 */

/**
 * Ordered palette — assigned positionally to distinct model IDs so every
 * row in a list (modelMix, today mix, etc.) gets a visually distinct color.
 * Brand colors first (terracotta=opus, blue=sonnet, gray=haiku) for muscle
 * memory, then a deterministic spread of accent hues.
 */
const PALETTE = [
  '#D97757', // terracotta (opus brand)
  '#5B9BD5', // blue (sonnet brand)
  '#A78BFA', // purple
  '#34D399', // green
  '#FBBF24', // amber
  '#F472B6', // pink
  '#60A5FA', // sky blue
  '#FB923C', // orange
  '#999999', // gray (haiku brand / fallback)
];

/**
 * Build a stable model→color map. Distinct color per unique model ID,
 * assigned in input order (palette wraps after PALETTE.length entries).
 * Pass the model list you intend to render so each row in that list is
 * visually distinct, including same-family variants (opus-4-5 vs opus-4-6).
 */
export function buildModelColorMap(models: Array<string | null | undefined>): Record<string, string> {
  const map: Record<string, string> = {};
  let i = 0;
  for (const m of models) {
    if (!m || map[m] !== undefined) continue;
    map[m] = PALETTE[i % PALETTE.length];
    i += 1;
  }
  return map;
}

// Re-export shared family detection so extension (src/) and webview agree
export { getModelFamily } from '../../src/model-utils';
import { getModelFamily } from '../../src/model-utils';

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extract version from model ID, e.g. "claude-opus-4-6" -> "4.6" */
export function getModelVersion(model: string | null | undefined): string {
  if (!model) return '';
  // Match digits after the family name: claude-opus-4-6, claude-sonnet-4-5-20251001
  const match = model.match(/claude[-_][a-z]+[-_](\d+)[-_](\d+)/i);
  if (match) return `${match[1]}.${match[2]}`;
  return '';
}

/**
 * Get color for a single model — used for solo contexts (active model dot,
 * per-message badge) where there's no list to derive position from.
 * Deterministic palette pick keyed on the full model ID string.
 */
export function getModelColor(model: string | null | undefined): string {
  if (!model) return PALETTE[PALETTE.length - 1]; // gray fallback
  let h = 0;
  for (let i = 0; i < model.length; i++) h = (h * 31 + model.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Short display name: "Opus 4.6", "Sonnet 4.5", or just family/raw fallback */
export function getModelDisplayName(model: string | null | undefined): string {
  if (!model) return '';
  const family = getModelFamily(model);
  if (!family) return model;                           // truly unknown -> show raw
  const version = getModelVersion(model);
  return version ? `${capitalize(family)} ${version}` : capitalize(family);
}

/** Family-only short name: "Opus", "Sonnet" — for compact contexts */
export function getModelFamilyName(model: string | null | undefined): string {
  const family = getModelFamily(model);
  return family ? capitalize(family) : (model ?? '');
}
