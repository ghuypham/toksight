import type { Insight, MetricsData, ParsedMessage } from './types';
import { isModelFamily } from './model-utils';

type InsightRule = (metrics: MetricsData, messages: ParsedMessage[]) => Insight | null;

const rules: InsightRule[] = [
  // Low output ratio — actionable
  (metrics) => {
    if (metrics.outputRatio < 0.05 && metrics.sessionCount > 0) {
      return { icon: '📝', text: 'Low output ratio', sub: 'Claude reading more than writing — check prompts', priority: 'actionable' };
    }
    return null;
  },

  // Cache rate dropped — actionable
  (metrics) => {
    if (metrics.trend.cacheRate < -0.10) {
      const drop = Math.abs(Math.round(metrics.trend.cacheRate * 100));
      return { icon: '💡', text: `Cache rate dropped ${drop}%`, sub: 'Check CLAUDE.md freshness and workflow design', priority: 'actionable' };
    }
    return null;
  },

  // Opus heavy — actionable (works for any opus version: 4-6, 4-7, etc.)
  // Skip when only one model is in use — no alternative to suggest
  (metrics) => {
    const activeModels = metrics.modelMix.filter((m) => m.percentage > 0 && m.model !== '<synthetic>');
    if (activeModels.length < 2) return null;
    const opus = metrics.modelMix.find((m) => isModelFamily(m.model, 'opus'));
    if (opus && opus.percentage > 70) {
      return { icon: '💰', text: `Opus at ${Math.round(opus.percentage)}% of spend`, sub: 'Consider Sonnet for routine coding — saves ~5x per token', priority: 'actionable' };
    }
    return null;
  },

  // Hot file — informational
  (_metrics, messages) => {
    const fileCounts = new Map<string, number>();
    for (const msg of messages) {
      if (msg.toolUses) {
        for (const tool of msg.toolUses) {
          if (tool.path) fileCounts.set(tool.path, (fileCounts.get(tool.path) ?? 0) + 1);
        }
      }
    }
    const hotFile = Array.from(fileCounts.entries()).sort((a, b) => b[1] - a[1]).find(([, count]) => count > 30);
    if (hotFile) {
      const shortPath = hotFile[0].split('/').slice(-2).join('/');
      return { icon: '📁', text: `Hot file: ${shortPath} (${hotFile[1]} edits)`, sub: 'Consider splitting into smaller modules', priority: 'informational' };
    }
    return null;
  },

  // Long session — informational
  // Uses active message timestamps (wall-clock spans include idle gaps so we use
  // per-message time spread as a proxy for active duration — matches aggregator logic).
  (_metrics, messages) => {
    // Group messages by session and compute active span (first → last assistant message)
    const sessionTimes = new Map<string, { start: number; end: number }>();
    for (const msg of messages) {
      if (!msg.timestamp || msg.type !== 'assistant') continue;
      const time = new Date(msg.timestamp).getTime();
      const existing = sessionTimes.get(msg.sessionId);
      if (existing) {
        if (time < existing.start) existing.start = time;
        if (time > existing.end) existing.end = time;
      } else {
        sessionTimes.set(msg.sessionId, { start: time, end: time });
      }
    }
    // Find the longest active session in the window
    let maxHours = 0;
    for (const [, times] of sessionTimes) {
      const hours = (times.end - times.start) / (1000 * 60 * 60);
      if (hours > maxHours) maxHours = hours;
    }
    if (maxHours > 2) {
      return { icon: '⏱️', text: `Long session (${Math.round(maxHours)}h active)`, sub: 'Efficiency usually drops after 2h — consider starting fresh', priority: 'informational' };
    }
    return null;
  },
];

const PRIORITY_ORDER: Record<string, number> = { actionable: 0, informational: 1, motivational: 2 };

export function generateInsights(metrics: MetricsData, messages: ParsedMessage[], maxInsights = 3): Insight[] {
  const insights: Insight[] = [];
  for (const rule of rules) {
    const insight = rule(metrics, messages);
    if (insight) insights.push(insight);
  }
  return insights
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, maxInsights);
}
