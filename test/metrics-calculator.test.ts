import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '../src/metrics-calculator';
import type { ParsedMessage } from '../src/types';

function makeMessages(overrides: Partial<ParsedMessage>[] = []): ParsedMessage[] {
  const base: ParsedMessage = {
    uuid: 'msg-1',
    parentUuid: 'parent-1',
    type: 'assistant',
    timestamp: '2026-04-10T10:00:00.000Z',
    model: 'claude-sonnet-4-6',
    usage: { inputTokens: 1000, outputTokens: 200, cacheCreationTokens: 100, cacheReadTokens: 3000 },
    sessionId: 'session-1',
  };
  if (overrides.length === 0) return [base];
  return overrides.map((o, i) => ({ ...base, uuid: `msg-${i}`, ...o }));
}

describe('calculateMetrics', () => {
  it('calculates output ratio', () => {
    const messages = makeMessages([{
      usage: { inputTokens: 900, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 },
    }]);
    const metrics = calculateMetrics(messages, []);
    expect(metrics.outputRatio).toBeCloseTo(0.10, 2);
  });

  it('calculates cache rate', () => {
    const messages = makeMessages([{
      usage: { inputTokens: 100, outputTokens: 50, cacheCreationTokens: 100, cacheReadTokens: 800 },
    }]);
    const metrics = calculateMetrics(messages, []);
    expect(metrics.cacheRate).toBeCloseTo(0.80, 2);
  });

  it('calculates cache savings (real $ saved via cache reads)', () => {
    const messages = makeMessages([{
      model: 'claude-opus-4-6',
      usage: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 1_000_000 },
    }]);
    const metrics = calculateMetrics(messages, []);
    // Opus: input $5/M, cache read $0.50/M → savings = (5 - 0.50) × 1M = $4.50
    expect(metrics.cacheSavings).toBeCloseTo(4.50, 2);
  });

  it('returns zero metrics for empty messages', () => {
    const metrics = calculateMetrics([], []);
    expect(metrics.outputRatio).toBe(0);
    expect(metrics.cacheRate).toBe(0);
    expect(metrics.totalSpend).toBe(0);
    expect(metrics.cacheSavings).toBe(0);
  });

  it('calculates model mix percentages', () => {
    const messages = makeMessages([
      { model: 'claude-opus-4-6', usage: { inputTokens: 100, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 } },
      { model: 'claude-sonnet-4-6', usage: { inputTokens: 100, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 } },
    ]);
    const metrics = calculateMetrics(messages, []);
    expect(metrics.modelMix.length).toBe(2);
    const totalPct = metrics.modelMix.reduce((sum, m) => sum + m.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('calculates trend from previous period', () => {
    const current = makeMessages([{
      usage: { inputTokens: 800, outputTokens: 200, cacheCreationTokens: 0, cacheReadTokens: 0 },
    }]);
    const previous = makeMessages([{
      usage: { inputTokens: 900, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 },
    }]);
    const metrics = calculateMetrics(current, previous);
    expect(metrics.trend.outputRatio).toBeCloseTo(0.10, 2);
  });

  it('counts unique sessions', () => {
    const messages = makeMessages([
      { sessionId: 'session-1' },
      { sessionId: 'session-1' },
      { sessionId: 'session-2' },
    ]);
    const metrics = calculateMetrics(messages, []);
    expect(metrics.sessionCount).toBe(2);
  });

  it('returns token breakdown with totals and percentages', () => {
    const messages = makeMessages([{
      usage: { inputTokens: 500, outputTokens: 100, cacheCreationTokens: 50, cacheReadTokens: 350 },
    }]);
    const metrics = calculateMetrics(messages, []);
    expect(metrics.tokenBreakdown).toBeDefined();
    expect(metrics.tokenBreakdown.output).toBe(100);
    expect(metrics.tokenBreakdown.input).toBe(500);
    expect(metrics.tokenBreakdown.cache).toBe(350);        // cache-read only
    expect(metrics.tokenBreakdown.cacheCreation).toBe(50); // cache-create separate
    // total = input + output + cacheRead + cacheCreate = 1000
    const total = 500 + 100 + 350 + 50;
    expect(metrics.tokenBreakdown.outputPct).toBeCloseTo(100 / total, 2);
    expect(metrics.tokenBreakdown.inputPct).toBeCloseTo(500 / total, 2);
    expect(metrics.tokenBreakdown.cachePct).toBeCloseTo(350 / total, 2);
    expect(metrics.tokenBreakdown.cacheCreationPct).toBeCloseTo(50 / total, 2);
  });

  it('returns zero token breakdown for empty messages', () => {
    const metrics = calculateMetrics([], []);
    expect(metrics.tokenBreakdown).toEqual({
      output: 0, input: 0, cache: 0, cacheCreation: 0,
      outputPct: 0, inputPct: 0, cachePct: 0, cacheCreationPct: 0,
    });
  });
});
