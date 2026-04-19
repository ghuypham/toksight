import { describe, it, expect } from 'vitest';
import { buildTodayProjectBreakdown } from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

const mk = (ts: string, sessionId: string, project: string, cost: number): ParsedMessage => ({
  uuid: Math.random().toString(),
  parentUuid: null,
  type: 'assistant',
  timestamp: ts,
  sessionId,
  model: 'sonnet',
  usage: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 },
  // @ts-ignore — test fixture carries cost as sidecar
  _cost: cost,
  // @ts-ignore
  _project: project,
});

describe('buildTodayProjectBreakdown', () => {
  const today = new Date('2026-04-18T10:00:00Z');

  it('returns empty array when no today messages', () => {
    const r = buildTodayProjectBreakdown([], today);
    expect(r).toEqual([]);
  });

  it('groups messages by project and sums cost', () => {
    const msgs = [
      mk('2026-04-18T09:00:00Z', 's1', 'tok-sight', 2.8),
      mk('2026-04-18T09:30:00Z', 's2', 'tok-sight', 0.4),
      mk('2026-04-18T10:00:00Z', 's3', 'saas-api', 1.4),
    ];
    const r = buildTodayProjectBreakdown(msgs, today);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ name: 'tok-sight', cost: 3.2, pct: expect.closeTo(0.696, 2) });
    expect(r[1].name).toBe('saas-api');
  });

  it('sorts by cost desc and returns top 3 max', () => {
    const msgs = [
      mk('2026-04-18T09:00:00Z', 's1', 'a', 1),
      mk('2026-04-18T09:00:00Z', 's2', 'b', 3),
      mk('2026-04-18T09:00:00Z', 's3', 'c', 2),
      mk('2026-04-18T09:00:00Z', 's4', 'd', 0.5),
    ];
    const r = buildTodayProjectBreakdown(msgs, today);
    expect(r.map(p => p.name)).toEqual(['b', 'c', 'a']);
  });

  it('excludes non-today messages', () => {
    const msgs = [
      mk('2026-04-17T09:00:00Z', 's1', 'a', 5), // yesterday
      mk('2026-04-18T09:00:00Z', 's2', 'b', 1),
    ];
    const r = buildTodayProjectBreakdown(msgs, today);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('b');
  });
});
