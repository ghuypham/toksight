/**
 * Centralized model identification used by both extension (src/) and webview/.
 *
 * Anthropic model ID convention:
 *   claude-{family}-{major}-{minor}[-{date}]
 *   e.g. claude-opus-4-6, claude-sonnet-4-5, claude-haiku-4-5-20251001
 *
 * NOTE: webview/utils/model-utils.ts mirrors this for color/display in the UI.
 * Keep that and this file in sync if family logic changes.
 */

/** Extract family token (opus/sonnet/haiku/etc) from model ID, or null if undetectable */
export function getModelFamily(model: string | null | undefined): string | null {
  if (!model) return null;
  const lower = model.toLowerCase();
  // Known families take priority — match anywhere in the ID
  for (const family of ['opus', 'sonnet', 'haiku']) {
    if (lower.includes(family)) return family;
  }
  // Try to detect a new family from claude-{family}-... pattern
  const match = lower.match(/claude[-_]([a-z]+)/);
  return match ? match[1] : null;
}

/** Check whether a model belongs to a given family (case-insensitive) */
export function isModelFamily(model: string | null | undefined, family: string): boolean {
  return getModelFamily(model) === family.toLowerCase();
}
