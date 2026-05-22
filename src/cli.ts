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
import { aggregateData } from './data-aggregator';
import { generateInsights } from './insights-engine';
import { fetchUsageLimits } from './anthropic-usage-api';
import { calculateCost } from './pricing-table';
import { buildAgentTree } from './agent-tree-builder';

import {
  renderHeader,
  renderSectionHeader,
  renderFooter,
  colorMoney,
  fmtTokens,
  fmtDuration,
  fmtResetsAt,
  progressBar,
  colorUtil,
  dim,
  green,
  shortModel,
  UNICODE_ENABLED,
} from './cli-renderer';
import { renderTable, renderBox, getTerminalWidth } from './cli-table';

import type { ParsedMessage } from './types';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TokSight — Claude Code usage metrics in your terminal

Usage:
  npx toksight              Snapshot and exit
  npx toksight --json       JSON output (pipe-friendly)
  npx toksight --compact    Force compact table layout
  npx toksight --path DIR   Custom JSONL directory

Examples:
  npx toksight
  npx toksight --json | jq '.today.spend'
  npx toksight --path ~/work/.claude/projects
`);
  process.exit(0);
}

const jsonMode = args.includes('--json');
const compactMode = args.includes('--compact');
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

/** Compute project slug from CWD — matches ~/.claude/projects/{slug}/ naming */
function detectProjectSlug(): string | null {
  const cwd = process.cwd();
  // Claude Code encodes paths as: /Users/foo/bar → -Users-foo-bar
  const slug = cwd.replace(/\//g, '-');
  // Verify this slug exists in the JSONL base path
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    if (fs.existsSync(path.join(jsonlPath, slug))) return slug;
  } catch {}
  return null;
}

const currentSlug = detectProjectSlug();
const currentProjectName = currentSlug
  ? currentSlug.split('-').filter(Boolean).pop() ?? currentSlug
  : null;

// ─── Snapshot builder ─────────────────────────────────────────────────────────

interface SnapshotInput {
  messages: ParsedMessage[];
  isLive: boolean;
  sessionProjectMap: Record<string, string>;
  activeSessions: Set<string>;
  watcher: JsonlWatcher;
}

export async function buildSnapshot(input: SnapshotInput): Promise<string> {
  const { messages, isLive, sessionProjectMap, activeSessions, watcher } = input;

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

  const insights    = generateInsights(metrics, weekMsgs, 3);
  // 5s timeout — one-shot CLI must not hang on a slow/unreachable Anthropic API
  const usageResult = await Promise.race([
    fetchUsageLimits(),
    new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 5000)),
  ]);
  // Shared across JSON and text modes — output tokens only (input/cache counts inflate numbers)
  const todayTokens      = todayMsgs.filter(m => m.type === 'assistant' && m.usage).reduce((s, m) =>
    s + m.usage!.outputTokens, 0);
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
      efficiencyScore: Math.round((
        Math.min(metrics.outputRatio / 0.15, 1) * 0.40 +
        Math.min(metrics.cacheRate   / 0.85, 1) * 0.35 +
        Math.min((metrics.sessionCount / 7)  / 5, 1) * 0.25
      ) * 100),
      modelMix: metrics.modelMix,
      quota: usageResult.data,
      projects: aggregated.projects.slice(0, 10),
      recentSessions: aggregated.recentSessions.slice(0, 10),
      insights: insights.map(i => ({ icon: i.icon, text: i.text })),
    }, null, 2);
  }

  // ── Text mode (compact) ────────────────────────────────────────────────

  const projectMessages = currentSlug
    ? messages.filter(m => sessionProjectMap[m.sessionId] === currentProjectName)
    : [];
  const projectTodayMsgs = projectMessages.filter(m => m.timestamp && new Date(m.timestamp) >= todayStart);
  const projectWeekMsgs = projectMessages.filter(m => m.timestamp && new Date(m.timestamp) >= sevenDaysAgo);
  const projectSessions = currentSlug
    ? aggregated.recentSessions.filter(s => s.project === currentProjectName)
    : [];

  const lines: string[] = ['', renderHeader(VERSION, isLive)];

  // ── THIS PROJECT ──
  if (currentProjectName && projectMessages.length > 0) {
    const projTodaySpend = calculateMetrics(projectTodayMsgs, []).totalSpend;
    const projTodaySessions = new Set(projectTodayMsgs.map(m => m.sessionId)).size;
    const projTodayTokens = projectTodayMsgs.filter(m => m.type === 'assistant' && m.usage).reduce((s, m) =>
      s + m.usage!.outputTokens, 0);
    const projWeekMetrics = calculateMetrics(projectWeekMsgs, []);

    lines.push('', renderSectionHeader(`${currentProjectName} (this project)`));
    lines.push('', renderTable(
      [
        { header: 'Spend', align: 'right' },
        { header: 'Sessions' },
        { header: 'Output tok' },
        { header: 'Cache', align: 'right' },
      ],
      [[
        colorMoney(projTodaySpend),
        String(projTodaySessions),
        fmtTokens(projTodayTokens),
        `${Math.round(projWeekMetrics.cacheRate * 100)}%`,
      ]],
      { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
    ));
    if (projectSessions.length === 1) {
      // Inline single-session — no table overhead
      const s = projectSessions[0];
      const status = s.isActive ? green('● now') : dim(s.timeAgo);
      lines.push(`  ${status}  ${dim(shortModel(s.model))}  ${fmtDuration(s.durationMinutes ?? 0)}  ${colorMoney(s.cost)}${dim(' (API value)')}`);
    } else if (projectSessions.length > 1) {
      const sessionRows = projectSessions.slice(0, 3).map(s => [
        s.isActive ? green('● now') : dim(s.timeAgo),
        dim(shortModel(s.model)),
        fmtDuration(s.durationMinutes ?? 0),
        colorMoney(s.cost),
      ]);
      lines.push(renderTable(
        [
          { header: 'Status' },
          { header: 'Model' },
          { header: 'Active', compactHide: true },
          { header: 'Cost', align: 'right' },
        ],
        sessionRows,
        { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
      ));
      lines.push(dim('  * Costs = API equivalent. Claude Code Pro/Max plans are flat rate.'));
    }

    // Sub-agents for active session
    if (projectSessions.length > 0) {
      const activeSession = projectSessions.find(s => s.isActive);
      if (activeSession?.fullSessionId && currentSlug) {
        const sessionDir = watcher.getSubagentDir(activeSession.fullSessionId, currentSlug);
        if (sessionDir) {
          const agentTree = buildAgentTree(sessionDir, activeSession.fullSessionId);
          if (agentTree.agents.length > 0) {
            const agentRows = agentTree.agents.slice(0, 5).map(a => [
              a.agentType,
              colorMoney(a.cost),
              a.description.slice(0, 50),
            ]);
            lines.push('', renderTable(
              [
                { header: 'Sub-agent' },
                { header: 'Cost', align: 'right' },
                { header: 'Task' },
              ],
              agentRows,
              { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
            ));
          }
        }
      }
    }
  }

  // ── ALL PROJECTS ──
  lines.push('', renderSectionHeader('all projects'));
  const trendStr = weekTrendPct > 0 ? `+${Math.round(weekTrendPct)}%` : `${Math.round(weekTrendPct)}%`;
  // Issue #5: include prev week spend in trend display
  const prevWeekSpendAmt = metrics.totalSpend - metrics.trend.spend;
  const prevLabel = prevWeekSpendAmt > 0 ? `prev $${prevWeekSpendAmt.toFixed(2)}` : '';
  lines.push('', renderTable(
    [
      { header: 'Spend (today)', align: 'right' },
      { header: 'Sessions' },
      { header: 'Week spend', align: 'right' },
      { header: 'Trend', align: 'right', compactHide: true },
    ],
    [[
      colorMoney(todayMetrics.totalSpend),
      String(todaySessionCount),
      colorMoney(metrics.totalSpend),
      prevLabel ? dim(`${trendStr} (${prevLabel})`) : dim(trendStr),
    ]],
    { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
  ));

  // Quota: table (or compact single line when --compact or narrow terminal)
  if (usageResult.data) {
    const q = usageResult.data;
    const isCompact = compactMode || getTerminalWidth() < 80;
    if (isCompact) {
      // Compact: keep legacy 1-line format
      const parts: string[] = [];
      if (q.fiveHour) {
        const resetEta = q.fiveHour.resetsAt ? dim(` (${fmtResetsAt(q.fiveHour.resetsAt)})`) : '';
        parts.push(`5h ${progressBar(q.fiveHour.utilization / 100, 8)} ${colorUtil(q.fiveHour.utilization / 100)}${resetEta}`);
      }
      if (q.sevenDay) {
        const resetEta = q.sevenDay.resetsAt ? dim(` (${fmtResetsAt(q.sevenDay.resetsAt)})`) : '';
        parts.push(`7d ${progressBar(q.sevenDay.utilization / 100, 8)} ${colorUtil(q.sevenDay.utilization / 100)}${resetEta}`);
      }
      if (parts.length > 0) lines.push(`  Quota  ${parts.join(`  ${dim('·')}  `)}`);
    } else {
      // Full: quota table with Progress / Used / Resets in columns
      const quotaRows: string[][] = [];
      if (q.fiveHour) {
        quotaRows.push([
          '5h',
          progressBar(q.fiveHour.utilization / 100, 8),
          colorUtil(q.fiveHour.utilization / 100),
          q.fiveHour.resetsAt ? fmtResetsAt(q.fiveHour.resetsAt) : '—',
        ]);
      }
      if (q.sevenDay) {
        quotaRows.push([
          '7d',
          progressBar(q.sevenDay.utilization / 100, 8),
          colorUtil(q.sevenDay.utilization / 100),
          q.sevenDay.resetsAt ? fmtResetsAt(q.sevenDay.resetsAt) : '—',
        ]);
      }
      if (quotaRows.length > 0) {
        lines.push('', renderTable(
          [
            { header: 'Quota' },
            { header: 'Progress' },
            { header: 'Used', align: 'right' },
            { header: 'Resets in', align: 'right' },
          ],
          quotaRows,
          { unicode: UNICODE_ENABLED, colorFn: dim },
        ));
      }
    }
  }

  // Projects table — top 5, week only (issue #3)
  const weekProjectMap = new Map<string, number>();
  for (const m of weekMsgs) {
    if (m.type !== 'assistant' || !m.usage) continue;
    const proj = sessionProjectMap[m.sessionId] ?? m.sessionId.slice(0, 8);
    const cost = calculateCost(m.usage, m.model ?? 'claude-sonnet-4-6');
    weekProjectMap.set(proj, (weekProjectMap.get(proj) ?? 0) + cost);
  }
  const weekProjects = Array.from(weekProjectMap.entries())
    .map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  if (weekProjects.length > 0) {
    const topCost = weekProjects[0]?.cost ?? 1;
    const projRows = weekProjects.slice(0, 5).map(p => [
      p.name,
      colorMoney(p.cost),
      progressBar(topCost > 0 ? p.cost / topCost : 0, 4) + ' ' + dim(`${Math.round(topCost > 0 ? (p.cost / topCost) * 100 : 0)}%`),
    ]);
    lines.push('', renderTable(
      [
        { header: 'Project (this week)' },
        { header: 'Cost', align: 'right' },
        { header: 'Share', compactHide: true },
      ],
      projRows,
      { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
    ));
  }

  // Model mix table — show each model with cost + share (issue #6: add time range label)
  const modelRows = metrics.modelMix
    .filter(m => m.percentage > 0 && m.model !== '<synthetic>')
    .map(m => [
      shortModel(m.model),
      colorMoney(m.cost),
      `${Math.round(m.percentage)}%`,
    ]);
  if (modelRows.length > 0) {
    lines.push('', renderTable(
      [{ header: 'Model (this week)' }, { header: 'Cost', align: 'right' }, { header: 'Share', align: 'right' }],
      modelRows,
      { unicode: UNICODE_ENABLED, colorFn: dim, compact: compactMode || getTerminalWidth() < 80 },
    ));
  }
  // Cache savings
  if (metrics.cacheSavings >= 0.5) {
    lines.push(`  Cache saved ${green('$' + metrics.cacheSavings.toFixed(0))} ${dim('this week')} ${dim('·')} ${Math.round(metrics.cacheRate * 100)}% hit`);
  }

  // Insights: rounded box wrapper
  if (insights.length > 0) {
    const insightLines = insights.slice(0, 3).map(i =>
      `${i.icon} ${i.text}${i.sub ? dim('  — ' + i.sub) : ''}`,
    );
    lines.push('', renderBox('Insights', insightLines, { unicode: UNICODE_ENABLED, colorFn: dim }));
  }

  // Footnote
  lines.push('', dim('  * All costs = API equivalent. Claude Code Pro/Max plans are flat rate.'));
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
      watcher,
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
