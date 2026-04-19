import { describe, it, expect, vi } from 'vitest';
import { buildSessionMetadata } from '../src/data-aggregator';
import type { SessionMeta } from '../src/types';

const meta: SessionMeta = {
  sessionId: 'x',
  projectPath: '/p',
  startTime: '2026-04-18T10:00:00Z',
  durationMinutes: 30,
  toolCounts: { Read: 4 },
  gitCommits: 1,
  linesAdded: 50,
  linesRemoved: 2,
  filesModified: 3,
  toolErrors: 1,
  toolErrorCategories: { Other: 1 },
  userInterruptions: 0,
  usesMcp: false,
  usesTaskAgent: true,
  messageHours: [10],
};

describe('buildSessionMetadata', () => {
  it('projects UI-relevant fields keyed by sessionId', () => {
    const load = vi.fn((id: string) => id === 'x' ? meta : null);
    const out = buildSessionMetadata(['x', 'y'], load);
    expect(out.x).toEqual({
      gitCommits: 1,
      linesAdded: 50,
      linesRemoved: 2,
      filesModified: 3,
      toolErrors: 1,
      toolErrorCategories: { Other: 1 },
      toolCounts: { Read: 4 },
      userInterruptions: 0,
      usesMcp: false,
      usesTaskAgent: true,
    });
    expect(out.y).toBeUndefined();
  });
});
