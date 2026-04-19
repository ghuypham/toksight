import { describe, it, expect } from 'vitest';
import { buildBurnRate } from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

function makeMsg(tsOffsetMin: number, outputTokens: number, model = 'claude-sonnet-4-6'): ParsedMessage {
  const ts = new Date(Date.now() - tsOffsetMin * 60_000).toISOString();
  return {
    uuid: `u-${tsOffsetMin}`,
    parentUuid: null,
    type: 'assistant',
    timestamp: ts,
    sessionId: 's1',
    model,
    usage: { inputTokens: 0, outputTokens, cacheCreationTokens: 0, cacheReadTokens: 0 },
  };
}

describe('buildBurnRate', () => {
  it('returns empty bars when no messages', () => {
    const data = buildBurnRate([], 's1', 30);
    expect(data.bars).toHaveLength(30);
    expect(data.bars.every(b => b.costUsd === 0)).toBe(true);
    expect(data.peakCostUsd).toBe(0);
  });

  it('buckets messages by minute offset from now', () => {
    const messages = [
      makeMsg(0, 1_000_000),
      makeMsg(5, 500_000),
      makeMsg(29, 100_000),
    ];
    const data = buildBurnRate(messages, 's1', 30);
    expect(data.bars[0].costUsd).toBeCloseTo(15, 1);
    expect(data.bars[5].costUsd).toBeCloseTo(7.5, 1);
    expect(data.bars[29].costUsd).toBeCloseTo(1.5, 1);
    expect(data.peakCostUsd).toBeCloseTo(15, 1);
    expect(data.peakMinutesAgo).toBe(0);
  });

  it('computes trend rising when now > 1.5x avg', () => {
    const messages = [
      makeMsg(0, 2_000_000),
      makeMsg(10, 100_000),
      makeMsg(20, 100_000),
    ];
    const data = buildBurnRate(messages, 's1', 30);
    expect(data.trend).toBe('rising');
  });

  it('ignores messages outside session', () => {
    const messages = [makeMsg(0, 1_000_000), { ...makeMsg(0, 1_000_000), sessionId: 'other' }];
    const data = buildBurnRate(messages, 's1', 30);
    expect(data.bars[0].costUsd).toBeCloseTo(15, 1);
  });
});
