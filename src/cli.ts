/**
 * TokSight CLI — terminal snapshot of Claude Code usage metrics.
 *
 * Usage:
 *   npx toksight             # one-shot snapshot, then exit
 *   npx toksight --json      # raw JSON output (pipe-friendly)
 *   npx toksight --path DIR  # custom JSONL directory
 *   npx toksight --help
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { JsonlWatcher } from './jsonl-watcher';
import { calculateMetrics } from './metrics-calculator';
import { aggregateData, buildTodayProjectBreakdown } from './data-aggregator';
import { generateInsights } from './insights-engine';
import { fetchUsageLimits } from './anthropic-usage-api';

import {
  renderHeader,
  renderToday,
  renderWeek,
  renderQuota,
  renderSessions,
  renderProjects,
  renderModels,
  renderInsights,
  renderScore,
  renderCacheSavings,
  renderFooter,
} from './cli-renderer';

import type { ParsedMessage } from './types';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TokSight — Claude Code usage metrics in your terminal

Usage:
  npx toksight             Snapshot and exit
  npx toksight --json      JSON output (pipe-friendly)
  npx toksight --path DIR  Custom JSONL directory

Examples:
  npx toksight
  npx toksight --json | jq '.today.spend'
  npx toksight --path ~/work/.claude/projects
`);
  process.exit(0);
}

const jsonMode = args.includes('--json');
const pathIdx  = args.findIndex(a => a === '--path' || a === '-p');
const jsonlPath = pathIdx !== -1 && args[pathIdx + 1]
  ? args[pathIdx + 1]
  : process.env.TOKSIGHT_PATH
    ?? (process.env.CLAUDE_CONFIG_DIR
      ? path.join(process.env.CLAUDE_CONFIG_DIR, 'projects')
      : path.join(os.homedir(), '.claude', 'projects'));

// ─── Version ──────────────────────────────────────────────────────────────────

function getVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../package.json') as { version: string }).version ?? '?';
  } catch {
    return '?';
  }
}

const VERSION = getVersion();

// ─── Snapshot builder ─────────────────────────────────────────────────────────

interface SnapshotInput {
  messages: ParsedMessage[];
  isLive: boolean;
  sessionProjectMap: Record<string, string>;
  activeSessions: Set<string>;
}

export async function buildSnapshot(input: SnapshotInput): Promise<string> {
  const { messages, isLive, sessionProjectMap, activeSessions } = input;

  const now          = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Local midnight — same logic as extension to avoid timezone drift
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekMsgs  = messages.filter(m => m.timestamp && new Date(m.timestamp) >= sevenDaysAgo);
  const prevMsgs  = messages.filter(m => {
    if (!m.timestamp) return false;
    const t = new Date(m.timestamp);
    return t >= prevWeekStart && t < sevenDaysAgo;
  });

  const metrics    = calculateMetrics(weekMsgs, prevMsgs);
  // Use all-time messages for sessions/projects list (same as extension)
  const aggregated = aggregateData(messages, sessionProjectMap, activeSessions);

  // Filter today using local midnight — consistent with extension
  const todayMsgs   = messages.filter(m => m.timestamp && new Date(m.timestamp) >= todayStart);
  const todayMetrics= calculateMetrics(todayMsgs, []);

  // Efficiency score (CLAUDE.md formula)
  const sessionDensity  = metrics.sessionCount / 7;
  const efficiencyScore = (
    Math.min(metrics.outputRatio / 0.15, 1) * 0.40 +
    Math.min(metrics.cacheRate   / 0.85, 1) * 0.35 +
    Math.min(sessionDensity      / 5,    1) * 0.25
  ) * 100;

  const insights    = generateInsights(metrics, weekMsgs, 3);
  // 5s timeout — one-shot CLI must not hang on a slow/unreachable Anthropic API
  const usageResult = await Promise.race([
    fetchUsageLimits(),
    new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 5000)),
  ]);
  const todayProjects = buildTodayProjectBreakdown(todayMsgs, now);

  // Shared across JSON and text modes
  const todayTokens      = todayMsgs.filter(m => m.type === 'assistant' && m.usage).reduce((s, m) =>
    s + m.usage!.inputTokens + m.usage!.outputTokens + m.usage!.cacheCreationTokens + m.usage!.cacheReadTokens, 0);
  const todaySessionCount= new Set(todayMsgs.map(m => m.sessionId)).size;
  // trend.spend = currentSpend - prevSpend; derive prevSpend to compute % change
  const prevWeekSpend = metrics.totalSpend - metrics.trend.spend;
  const weekTrendPct  = prevWeekSpend > 0 ? (metrics.trend.spend / prevWeekSpend) * 100 : 0;

  // ── JSON mode ──────────────────────────────────────────────────────────────
  if (jsonMode) {
    return JSON.stringify({
      version: VERSION,
      generatedAt: now.toISOString(),
      isLive,
      today: {
        sessions: todaySessionCount,
        spend: todayMetrics.totalSpend,
        tokens: todayTokens,
        cacheRate: todayMetrics.cacheRate,
      },
      week: {
        spend: metrics.totalSpend,
        sessions: metrics.sessionCount,
        trendPct: weekTrendPct,
      },
      efficiencyScore: Math.round(efficiencyScore),
      modelMix: metrics.modelMix,
      quota: usageResult.data,
      projects: aggregated.projects.slice(0, 10),
      recentSessions: aggregated.recentSessions.slice(0, 10),
      insights: insights.map(i => ({ icon: i.icon, text: i.text })),
    }, null, 2);
  }

  // ── Text mode ──────────────────────────────────────────────────────────────
  const lines: string[] = [
    '',
    renderHeader(VERSION, isLive),
    '',
    renderToday({ sessions: todaySessionCount, spend: todayMetrics.totalSpend, tokens: todayTokens, cacheRate: todayMetrics.cacheRate, isLive }),
    renderWeek({ spend: metrics.totalSpend, sessions: metrics.sessionCount, trendPct: weekTrendPct }),
  ];

  if (usageResult.data) {
    lines.push('', renderQuota(usageResult.data));
  }

  if (aggregated.recentSessions.length > 0) {
    lines.push('', renderSessions(aggregated.recentSessions, 5));
  }

  const projectsToShow = todayProjects.length > 0
    ? todayProjects.map(p => ({ name: p.name, sessions: 0, tokens: 0, cost: p.cost }))
    : aggregated.projects;

  if (projectsToShow.length > 0) {
    lines.push('', renderProjects(projectsToShow, 5));
  }

  lines.push('');
  const modelLine = renderModels(metrics.modelMix);
  const scoreLine = renderScore(efficiencyScore);
  lines.push(modelLine ? `${modelLine}   ${scoreLine}` : scoreLine);

  const cacheLine = renderCacheSavings(metrics.cacheSavings, metrics.cacheRate);
  if (cacheLine) lines.push(cacheLine);

  if (insights.length > 0) {
    lines.push('', renderInsights(insights));
  }

  lines.push('', renderFooter(now), '');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const watcher    = new JsonlWatcher(jsonlPath, 2000);
  let firstEmit    = false;

  watcher.on('error', (err: Error) => {
    if (!firstEmit) {
      console.error(`\nError: ${err.message}`);
      console.error(`No Claude Code sessions found at:\n  ${jsonlPath}\n`);
      process.exit(1);
    }
  });

  watcher.on('data', async (messages: ParsedMessage[], isLive: boolean) => {
    firstEmit = true;
    const snapshot = await buildSnapshot({
      messages,
      isLive,
      sessionProjectMap: watcher.getSessionProjectMap(),
      activeSessions: watcher.getActiveSessions(),
    });
    console.log(snapshot);
    watcher.stop();
    process.exit(0);
  });

  watcher.start();

  // Exit with error if no data within 3s
  setTimeout(() => {
    if (!firstEmit) {
      console.error(`\nNo Claude Code sessions found at: ${jsonlPath}`);
      console.error('Run Claude Code first, or pass --path to override.\n');
      watcher.stop();
      process.exit(1);
    }
  }, 3000);

  process.on('SIGINT', () => { watcher.stop(); process.exit(0); });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
