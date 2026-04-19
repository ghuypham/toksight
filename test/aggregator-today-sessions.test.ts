import { describe, it, expect } from 'vitest';
import { buildTodaySessions } from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

function msg(sessionId: string, tsISO: string, model = 'claude-opus-4-6', outputTokens = 10_000): ParsedMessage {
  return {
    uuid: `${sessionId}-${tsISO}`,
    parentUuid: null,
    type: 'assistant',
    timestamp: tsISO,
    sessionId,
    model,
    usage: { inputTokens: 0, outputTokens, cacheCreationTokens: 0, cacheReadTokens: 0 },
  };
}

describe('buildTodaySessions', () => {
  it('returns empty when no messages today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = buildTodaySessions([], today);
    expect(result).toEqual([]);
  });

  it('groups by sessionId and computes start/end/duration', () => {
    const today = '2026-04-17';
    const messages = [
      msg('a', '2026-04-17T09:00:00Z'),
      msg('a', '2026-04-17T09:30:00Z'),
      msg('b', '2026-04-17T14:00:00Z'),
      msg('b', '2026-04-17T14:10:00Z'),
      msg('c', '2026-04-16T23:59:00Z'),
    ];
    const result = buildTodaySessions(messages, today);
    expect(result).toHaveLength(2);
    const a = result.find(s => s.sessionId === 'a')!;
    expect(a.startTs).toBe('2026-04-17T09:00:00Z');
    expect(a.endTs).toBe('2026-04-17T09:30:00Z');
    expect(a.durationMinutes).toBe(30);
  });

  it('sorts sessions by start time ascending', () => {
    const today = '2026-04-17';
    const messages = [
      msg('late', '2026-04-17T15:00:00Z'),
      msg('early', '2026-04-17T09:00:00Z'),
    ];
    const result = buildTodaySessions(messages, today);
    expect(result[0].sessionId).toBe('early');
    expect(result[1].sessionId).toBe('late');
  });

  it('picks dominant model by cost', () => {
    const today = '2026-04-17';
    const messages = [
      msg('s', '2026-04-17T09:00:00Z', 'claude-opus-4-6', 10_000),
      msg('s', '2026-04-17T09:01:00Z', 'claude-sonnet-4-6', 100_000),
    ];
    const result = buildTodaySessions(messages, today);
    expect(result[0].dominantModel).toBe('claude-sonnet-4-6');
  });
});
