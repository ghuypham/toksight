import { describe, it, expect } from 'vitest';
import { getModelPricing, calculateCost, DEFAULT_PRICING } from '../src/pricing-table';

describe('pricing-table', () => {
  it('returns default pricing for known models', () => {
    const pricing = getModelPricing('claude-sonnet-4-6');
    expect(pricing.inputPerMillion).toBe(3);
    expect(pricing.outputPerMillion).toBe(15);
  });

  it('returns opus pricing', () => {
    const pricing = getModelPricing('claude-opus-4-6');
    expect(pricing.inputPerMillion).toBe(5);
    expect(pricing.outputPerMillion).toBe(25);
  });

  it('returns haiku pricing', () => {
    const pricing = getModelPricing('claude-haiku-4-5-20251001');
    expect(pricing.inputPerMillion).toBe(1);
    expect(pricing.outputPerMillion).toBe(5);
  });

  it('falls back to sonnet pricing for unknown model', () => {
    const pricing = getModelPricing('claude-unknown-99');
    expect(pricing).toEqual(DEFAULT_PRICING['claude-sonnet-4-6']);
  });

  it('calculates cost correctly', () => {
    const cost = calculateCost({
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    }, 'claude-sonnet-4-6');
    expect(cost).toBeCloseTo(0.0105, 4);
  });

  it('includes cache costs', () => {
    const cost = calculateCost({
      inputTokens: 100,
      outputTokens: 100,
      cacheCreationTokens: 1000,
      cacheReadTokens: 5000,
    }, 'claude-sonnet-4-6');
    const expected = 0.0003 + 0.0015 + 0.00375 + 0.0015;
    expect(cost).toBeCloseTo(expected, 4);
  });

  it('applies user overrides', () => {
    const pricing = getModelPricing('claude-sonnet-4-6', {
      'claude-sonnet-4-6': { inputPerMillion: 10 },
    });
    expect(pricing.inputPerMillion).toBe(10);
    expect(pricing.outputPerMillion).toBe(15);
  });
});
