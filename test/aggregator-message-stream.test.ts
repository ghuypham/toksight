import { describe, it, expect } from 'vitest';
import { buildMessageStream } from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

function msg(overrides: Partial<ParsedMessage> = {}): ParsedMessage {
  return {
    uuid: 'u',
    parentUuid: null,
    type: 'assistant',
    timestamp: '2026-04-18T10:00:00Z',
    sessionId: 's',
    model: 'claude-sonnet-4-6-20251015',
    usage: { inputTokens: 100, outputTokens: 50, cacheCreationTokens: 0, cacheReadTokens: 0 },
    toolUses: [],
    ...overrides,
  };
}

describe('buildMessageStream', () => {
  it('returns last N assistant messages, newest-first, with cost computed', () => {
    const msgs = Array.from({ length: 30 }, (_, i) => msg({
      uuid: `m${i}`,
      timestamp: new Date(Date.UTC(2026, 3, 18, 10, i)).toISOString(),
    }));
    const stream = buildMessageStream(msgs, 20);
    expect(stream).toHaveLength(20);
    expect(stream[0].ts).toBe(msgs[29].timestamp);    // newest first
    expect(stream[19].ts).toBe(msgs[10].timestamp);
    expect(stream[0].model).toBe('claude-sonnet-4-6-20251015');
    expect(stream[0].costUsd).toBeGreaterThan(0);
  });

  it('skips user messages', () => {
    const msgs = [msg({ type: 'user', uuid: 'u1' }), msg({ uuid: 'a1' })];
    const stream = buildMessageStream(msgs, 10);
    expect(stream).toHaveLength(1);
    expect(stream[0].ts).toBe(msgs[1].timestamp);
  });

  it('includes first tool name when present', () => {
    const m = msg({ toolUses: [{ name: 'Read', path: '/x' }, { name: 'Edit' }] });
    const stream = buildMessageStream([m], 10);
    expect(stream[0].tool).toBe('Read');
  });

  it('truncates preview to 60 chars', () => {
    const long = 'x'.repeat(120);
    const stream = buildMessageStream([msg({})], 10, () => long);
    expect(stream[0].preview.length).toBeLessThanOrEqual(60);
  });

  it('handles empty input', () => {
    expect(buildMessageStream([], 20)).toEqual([]);
  });
});
