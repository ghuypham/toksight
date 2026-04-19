import type { ModelPricing, TokenUsage } from './types';

/** Default pricing per million tokens (as of April 2026) */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6': {
    inputPerMillion: 5,
    outputPerMillion: 25,
    cacheReadPerMillion: 0.50,
    cacheCreationPerMillion: 6.25,
  },
  'claude-sonnet-4-6': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheReadPerMillion: 0.30,
    cacheCreationPerMillion: 3.75,
  },
  'claude-haiku-4-5-20251001': {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheReadPerMillion: 0.10,
    cacheCreationPerMillion: 1.25,
  },
};

const FALLBACK_MODEL = 'claude-sonnet-4-6';

type PricingOverrides = Record<string, Partial<ModelPricing>>;

export function getModelPricing(model: string, overrides?: PricingOverrides): ModelPricing {
  let basePricing = DEFAULT_PRICING[model];
  if (!basePricing) {
    const match = Object.keys(DEFAULT_PRICING).find((key) => model.startsWith(key.replace(/-\d+$/, '')));
    basePricing = match ? DEFAULT_PRICING[match] : DEFAULT_PRICING[FALLBACK_MODEL];
  }

  const override = overrides?.[model];
  if (override) {
    return { ...basePricing, ...override };
  }
  return basePricing;
}

export function calculateCost(usage: TokenUsage, model: string, overrides?: PricingOverrides): number {
  const pricing = getModelPricing(model, overrides);
  return (
    (usage.inputTokens * pricing.inputPerMillion) / 1_000_000 +
    (usage.outputTokens * pricing.outputPerMillion) / 1_000_000 +
    (usage.cacheCreationTokens * pricing.cacheCreationPerMillion) / 1_000_000 +
    (usage.cacheReadTokens * pricing.cacheReadPerMillion) / 1_000_000
  );
}

/**
 * Money saved by cache reads vs charging full input price.
 * Cache reads typically cost ~10% of input price → 90% savings per cached token.
 */
export function calculateCacheSavings(usage: TokenUsage, model: string, overrides?: PricingOverrides): number {
  const pricing = getModelPricing(model, overrides);
  const fullInputCost = (usage.cacheReadTokens * pricing.inputPerMillion) / 1_000_000;
  const actualCacheCost = (usage.cacheReadTokens * pricing.cacheReadPerMillion) / 1_000_000;
  return fullInputCost - actualCacheCost;
}
