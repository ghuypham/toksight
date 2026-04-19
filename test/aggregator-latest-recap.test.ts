import { describe, it, expect } from 'vitest';
import { selectLatestRecap } from '../src/data-aggregator';

describe('selectLatestRecap', () => {
  it('returns null when no completed sessions', () => {
    expect(selectLatestRecap({ sessions: [], facets: {}, meta: {} })).toBeNull();
  });

  it('returns latest completed session with recap + meta', () => {
    const sessions = [
      { sessionId: 'a', lastActivityTime: '2026-04-18T08:00:00Z', isActive: false },
      { sessionId: 'b', lastActivityTime: '2026-04-18T10:00:00Z', isActive: false },
      { sessionId: 'c', lastActivityTime: '2026-04-18T12:00:00Z', isActive: true },
    ];
    const facets = { b: { briefSummary: 'did stuff', outcome: 'fully_achieved', claudeHelpfulness: 'very_helpful', frictionCounts: {} } };
    const meta = { b: { linesAdded: 100, linesRemoved: 5, gitCommits: 2, filesModified: 3 } };
    const r = selectLatestRecap({ sessions: sessions as any, facets: facets as any, meta: meta as any });
    expect(r?.sessionId).toBe('b');
    expect(r?.recap?.briefSummary).toBe('did stuff');
    expect(r?.meta?.linesAdded).toBe(100);
  });

  it('returns session with null recap when facets not ready yet', () => {
    const sessions = [{ sessionId: 'x', lastActivityTime: '2026-04-18T08:00:00Z', isActive: false }];
    const r = selectLatestRecap({ sessions: sessions as any, facets: {}, meta: {} });
    expect(r?.sessionId).toBe('x');
    expect(r?.recap).toBeNull();
    expect(r?.meta).toBeNull();
  });
});
