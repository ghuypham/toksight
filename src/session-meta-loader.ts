import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SessionMeta } from './types';

const cache = new Map<string, SessionMeta | null>();

function defaultRoot(): string {
  return path.join(os.homedir(), '.claude');
}

/** Load + normalize session metadata. Returns null if missing or malformed. */
export function loadSessionMeta(sessionId: string, rootOverride?: string): SessionMeta | null {
  if (cache.has(sessionId)) return cache.get(sessionId) ?? null;

  const root = rootOverride ?? defaultRoot();
  const filePath = path.join(root, 'usage-data', 'session-meta', `${sessionId}.json`);

  let parsed: SessionMeta | null = null;
  try {
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      parsed = {
        sessionId: raw.session_id ?? sessionId,
        projectPath: raw.project_path ?? '',
        startTime: raw.start_time ?? '',
        durationMinutes: raw.duration_minutes ?? 0,
        toolCounts: raw.tool_counts ?? {},
        gitCommits: raw.git_commits ?? 0,
        linesAdded: raw.lines_added ?? 0,
        linesRemoved: raw.lines_removed ?? 0,
        filesModified: raw.files_modified ?? 0,
        toolErrors: raw.tool_errors ?? 0,
        toolErrorCategories: raw.tool_error_categories ?? {},
        userInterruptions: raw.user_interruptions ?? 0,
        usesMcp: raw.uses_mcp ?? false,
        usesTaskAgent: raw.uses_task_agent ?? false,
        messageHours: raw.message_hours ?? [],
      };
    }
  } catch {
    parsed = null;
  }

  cache.set(sessionId, parsed);
  return parsed;
}

export function clearSessionMetaCache(): void {
  cache.clear();
}
