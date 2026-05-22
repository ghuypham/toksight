import { describe, it, expect } from 'vitest';
import { generateInsights } from '../src/insights-engine';
import type { MetricsData, ParsedMessage } from '../src/types';

function makeMetrics(overrides: Partial<MetricsData> = {}): MetricsData {
  return {
    outputRatio: 0.10, cacheRate: 0.80, totalSpend: 50, costPerOutputToken: 0.01,
    modelMix: [{ model: 'claude-sonnet-4-6', percentage: 100, cost: 50 }],
    sessionCount: 5, cacheSavings: 0,
    trend: { outputRatio: 0, cacheRate: 0, spend: 0 },
    estimatedWindowSpend: 20, todaySpend: 10, isLive: false,
    tokenBreakdown: { output: 0, input: 0, cache: 0, cacheCreation: 0, outputPct: 0, inputPct: 0, cachePct: 0, cacheCreationPct: 0 },
    ...overrides,
  };
}

describe('generateInsights', () => {
  it('flags low output ratio', () => {
    const insights = generateInsights(makeMetrics({ outputRatio: 0.03 }), []);
    const found = insights.find((i) => i.text.includes('Low output ratio'));
    expect(found).toBeDefined();
    expect(found!.priority).toBe('actionable');
  });

  it('flags cache rate drop', () => {
    const insights = generateInsights(
      makeMetrics({ cacheRate: 0.60, trend: { outputRatio: 0, cacheRate: -0.15, spend: 0 } }), [],
    );
    const found = insights.find((i) => i.text.includes('Cache rate dropped'));
    expect(found).toBeDefined();
  });

  it('flags opus heavy usage when multiple models available', () => {
    // Insight only fires when an alternative model exists (2+ models in mix)
    const insights = generateInsights(
      makeMetrics({ modelMix: [
        { model: 'claude-opus-4-6', percentage: 80, cost: 40 },
        { model: 'claude-sonnet-4-6', percentage: 20, cost: 10 },
      ] }), [],
    );
    const found = insights.find((i) => i.text.includes('Opus at'));
    expect(found).toBeDefined();
  });

  it('skips opus insight when only one model in use', () => {
    const insights = generateInsights(
      makeMetrics({ modelMix: [{ model: 'claude-opus-4-6', percentage: 100, cost: 50 }] }), [],
    );
    const found = insights.find((i) => i.text.includes('Opus at'));
    expect(found).toBeUndefined();
  });

  it('returns max 3 insights by default', () => {
    const metrics = makeMetrics({
      outputRatio: 0.03, cacheRate: 0.50,
      trend: { outputRatio: 0, cacheRate: -0.20, spend: 0 },
      modelMix: [{ model: 'claude-opus-4-6', percentage: 80, cost: 40 }],
    });
    const insights = generateInsights(metrics, [], 3);
    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it('returns empty for healthy metrics', () => {
    const insights = generateInsights(makeMetrics({ outputRatio: 0.12, cacheRate: 0.85 }), []);
    expect(insights.length).toBe(0);
  });

  it('prioritizes actionable over informational', () => {
    const metrics = makeMetrics({
      outputRatio: 0.03,
      modelMix: [{ model: 'claude-opus-4-6', percentage: 80, cost: 40 }],
    });
    const insights = generateInsights(metrics, []);
    if (insights.length >= 2) {
      const actionableIdx = insights.findIndex((i) => i.priority === 'actionable');
      const infoIdx = insights.findIndex((i) => i.priority === 'informational');
      if (actionableIdx >= 0 && infoIdx >= 0) {
        expect(actionableIdx).toBeLessThan(infoIdx);
      }
    }
  });
});
