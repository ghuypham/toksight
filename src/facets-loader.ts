import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SessionFacets } from './types';

const cache = new Map<string, SessionFacets | null>();

/** Default root: ~/.claude (override for tests) */
function defaultRoot(): string {
  return path.join(os.homedir(), '.claude');
}

/**
 * Load + normalize facets for a session. Returns null if missing or malformed.
 * Results are cached by sessionId. Call clearFacetsCache() after FS changes.
 */
export function loadFacets(sessionId: string, rootOverride?: string): SessionFacets | null {
  if (cache.has(sessionId)) return cache.get(sessionId) ?? null;

  const root = rootOverride ?? defaultRoot();
  const filePath = path.join(root, 'usage-data', 'facets', `${sessionId}.json`);

  let parsed: SessionFacets | null = null;
  try {
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      parsed = {
        sessionId: raw.session_id ?? sessionId,
        briefSummary: raw.brief_summary ?? '',
        outcome: raw.outcome ?? 'partially_achieved',
        claudeHelpfulness: raw.claude_helpfulness ?? 'somewhat_helpful',
        frictionCounts: raw.friction_counts ?? {},
        frictionDetail: raw.friction_detail,
      };
    }
  } catch {
    parsed = null;
  }

  cache.set(sessionId, parsed);
  return parsed;
}

export function clearFacetsCache(): void {
  cache.clear();
}
