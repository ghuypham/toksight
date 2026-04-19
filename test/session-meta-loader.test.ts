import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadSessionMeta, clearSessionMetaCache } from '../src/session-meta-loader';

describe('session-meta-loader', () => {
  const tmpDir = path.join(os.tmpdir(), `toksight-sessmeta-test-${Date.now()}`);
  const metaDir = path.join(tmpDir, 'usage-data', 'session-meta');

  beforeEach(() => {
    clearSessionMetaCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(metaDir, { recursive: true });
  });

  it('returns null when missing', () => {
    expect(loadSessionMeta('absent', tmpDir)).toBeNull();
  });

  it('parses and maps snake_case to camelCase', () => {
    const sessionId = 'abc-123';
    const raw = {
      session_id: sessionId,
      project_path: '/repo',
      start_time: '2026-03-26T07:43:55Z',
      duration_minutes: 71,
      tool_counts: { Read: 14, Edit: 4 },
      git_commits: 0,
      lines_added: 294,
      lines_removed: 20,
      files_modified: 5,
      tool_errors: 5,
      tool_error_categories: { Other: 4 },
      user_interruptions: 0,
      uses_mcp: false,
      uses_task_agent: true,
      message_hours: [14, 15],
    };
    fs.writeFileSync(path.join(metaDir, `${sessionId}.json`), JSON.stringify(raw));

    const result = loadSessionMeta(sessionId, tmpDir);
    expect(result).toEqual({
      sessionId,
      projectPath: '/repo',
      startTime: '2026-03-26T07:43:55Z',
      durationMinutes: 71,
      toolCounts: { Read: 14, Edit: 4 },
      gitCommits: 0,
      linesAdded: 294,
      linesRemoved: 20,
      filesModified: 5,
      toolErrors: 5,
      toolErrorCategories: { Other: 4 },
      userInterruptions: 0,
      usesMcp: false,
      usesTaskAgent: true,
      messageHours: [14, 15],
    });
  });

  it('returns null on malformed JSON', () => {
    const sessionId = 'bad';
    fs.writeFileSync(path.join(metaDir, `${sessionId}.json`), '{{');
    expect(loadSessionMeta(sessionId, tmpDir)).toBeNull();
  });

  it('caches result', () => {
    const sessionId = 'cache-id';
    const raw = { session_id: sessionId, project_path: '/x', start_time: 't',
      duration_minutes: 1, tool_counts: {}, git_commits: 0, lines_added: 0, lines_removed: 0,
      files_modified: 0, tool_errors: 0, tool_error_categories: {}, user_interruptions: 0,
      uses_mcp: false, uses_task_agent: false, message_hours: [] };
    const fp = path.join(metaDir, `${sessionId}.json`);
    fs.writeFileSync(fp, JSON.stringify(raw));
    const first = loadSessionMeta(sessionId, tmpDir);
    fs.unlinkSync(fp);
    const second = loadSessionMeta(sessionId, tmpDir);
    expect(second).toEqual(first);
  });
});
