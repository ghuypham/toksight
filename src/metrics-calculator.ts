import type { ParsedMessage, MetricsData, TokenBreakdown } from './types';
import { calculateCost, calculateCacheSavings } from './pricing-table';

/** Public API: compute MetricsData from current + optional previous period messages */
export function calculateMetrics(
  currentMessages: ParsedMessage[],
  previousMessages: ParsedMessage[],
  overrides?: Record<string, unknown>,
): MetricsData {
  const current = computeRawMetrics(currentMessages, overrides);
  const previous = computeRawMetrics(previousMessages, overrides);

  const totalAllTokens = current.totalInputTokens + current.totalOutputTokens + current.totalCacheTokens;
  const tokenBreakdown: TokenBreakdown = {
    output: current.totalOutputTokens,
    input: current.totalInputTokens,
    cache: current.totalCacheReadTokens,
    cacheCreation: current.totalCacheCreationTokens,
    outputPct: totalAllTokens > 0 ? current.totalOutputTokens / totalAllTokens : 0,
    inputPct: totalAllTokens > 0 ? current.totalInputTokens / totalAllTokens : 0,
    cachePct: totalAllTokens > 0 ? current.totalCacheReadTokens / totalAllTokens : 0,
    cacheCreationPct: totalAllTokens > 0 ? current.totalCacheCreationTokens / totalAllTokens : 0,
  };

  return {
    outputRatio: current.outputRatio,
    cacheRate: current.cacheRate,
    totalSpend: current.totalSpend,
    costPerOutputToken: current.totalOutputTokens > 0
      ? current.totalSpend / current.totalOutputTokens
      : 0,
    modelMix: current.modelMix,
    sessionCount: current.sessionCount,
    cacheSavings: current.cacheSavings,
    trend: {
      outputRatio: current.outputRatio - previous.outputRatio,
      cacheRate: current.cacheRate - previous.cacheRate,
      spend: current.totalSpend - previous.totalSpend,
    },
    estimatedWindowSpend: 0,
    todaySpend: 0,
    isLive: false,
    tokenBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Internal types & helpers
// ---------------------------------------------------------------------------

interface RawMetrics {
  outputRatio: number;
  cacheRate: number;
  totalSpend: number;
  totalOutputTokens: number;
  totalInputTokens: number;
  totalCacheTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  sessionCount: number;
  /** $ saved via cache reads vs full input price */
  cacheSavings: number;
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
}

type PricingOverrides = Record<string, Partial<import('./types').ModelPricing>>;

/** Aggregate raw token/cost metrics from a set of messages */
function computeRawMetrics(messages: ParsedMessage[], overrides?: Record<string, unknown>): RawMetrics {
  if (messages.length === 0) {
    return {
      outputRatio: 0,
      cacheRate: 0,
      totalSpend: 0,
      totalOutputTokens: 0,
      totalInputTokens: 0,
      totalCacheTokens: 0,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      sessionCount: 0,
      cacheSavings: 0,
      modelMix: [],
    };
  }

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  let totalSpend = 0;
  let cacheSavings = 0;

  const modelCosts = new Map<string, number>();
  const sessions = new Set<string>();

  for (const msg of messages) {
    // Only assistant messages carry token usage
    if (msg.type !== 'assistant' || !msg.usage) continue;

    const { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens } = msg.usage;
    totalInput += inputTokens;
    totalOutput += outputTokens;
    totalCacheCreation += cacheCreationTokens;
    totalCacheRead += cacheReadTokens;

    const model = msg.model ?? 'claude-sonnet-4-6';
    const cost = calculateCost(msg.usage, model, overrides as PricingOverrides | undefined);
    totalSpend += cost;
    cacheSavings += calculateCacheSavings(msg.usage, model, overrides as PricingOverrides | undefined);
    modelCosts.set(model, (modelCosts.get(model) ?? 0) + cost);

    sessions.add(msg.sessionId);
  }

  // outputRatio = output / (input + output) — measures how "productive" tokens are
  const totalInputForRatio = totalInput + totalOutput;

  // cacheRate = cache reads / (input + cacheRead + cacheCreation) — excludes output
  const totalInputForCache = totalInput + totalCacheRead + totalCacheCreation;

  const modelMix = Array.from(modelCosts.entries())
    .map(([model, cost]) => ({
      model,
      percentage: totalSpend > 0 ? (cost / totalSpend) * 100 : 0,
      cost,
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    outputRatio: totalInputForRatio > 0 ? totalOutput / totalInputForRatio : 0,
    cacheRate: totalInputForCache > 0 ? totalCacheRead / totalInputForCache : 0,
    totalSpend,
    totalOutputTokens: totalOutput,
    totalInputTokens: totalInput,
    totalCacheTokens: totalCacheCreation + totalCacheRead,
    totalCacheCreationTokens: totalCacheCreation,
    totalCacheReadTokens: totalCacheRead,
    sessionCount: sessions.size,
    cacheSavings,
    modelMix,
  };
}

