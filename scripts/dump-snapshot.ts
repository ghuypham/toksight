/**
 * Reads real JSONL data from ~/.claude/projects/, runs TokSight's aggregation
 * pipeline, and writes snapshot.json consumed by mockup.html.
 *
 * Usage: npx tsx scripts/dump-snapshot.ts
 *   or: npm run dump-snapshot  (chains `open mockup.html`)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parseJsonlContent } from '../src/jsonl-parser';
import { calculateMetrics } from '../src/metrics-calculator';
import {
  aggregateData,
  formatTokens,
  buildActiveSessionDetail,
  buildBurnRate,
  buildTodaySessions,
  buildToolInvocations,
} from '../src/data-aggregator';
import { calculateCost } from '../src/pricing-table';
import { generateInsights } from '../src/insights-engine';
import { loadFacets } from '../src/facets-loader';
import { loadSessionMeta } from '../src/session-meta-loader';
import type {
  ParsedMessage,
  WebviewData,
  ExplorerData,
  SessionRecap,
  SessionMetaUi,
} from '../src/types';

const jsonlPath = path.join(os.homedir(), '.claude', 'projects');
const OUT_PATH = path.join(
  __dirname,
  '..',
  'plans',
  '260417-1352-ui-value-audit-redesign',
  'snapshot.json',
);

/** Recursively find .jsonl files — skip /subagents/ (reuses parent sessionId) */
function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'subagents') continue;
        results.push(...findJsonlFiles(full));
      } else if (entry.name.endsWith('.jsonl')) {
        results.push(full);
      }
    }
  } catch {
    /* skip unreadable */
  }
  return results;
}

function extractProject(filePath: string): string {
  const rel = path.relative(jsonlPath, filePath);
  const projDir = rel.split(path.sep)[0] ?? '';
  const parts = projDir.split('-').filter(Boolean);
  return parts[parts.length - 1] ?? projDir.slice(0, 12);
}

function loadAllData(): {
  messages: ParsedMessage[];
  sessionProjectMap: Record<string, string>;
  activeSessions: Set<string>;
} {
  const files = findJsonlFiles(jsonlPath);
  const allMessages: ParsedMessage[] = [];
  const sessionProjectMap: Record<string, string> = {};
  const activeSessions = new Set<string>();
  // Mirror JsonlWatcher: "active" = file mtime < 30s ago (NOT last message timestamp)
  const ACTIVE_THRESHOLD_MS = 30_000;
  const nowMs = Date.now();

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const sessionId = path.basename(file, '.jsonl');
      const project = extractProject(file);
      const messages = parseJsonlContent(content, sessionId);
      sessionProjectMap[sessionId] = project;
      allMessages.push(...messages);
      const stat = fs.statSync(file);
      if (nowMs - stat.mtimeMs < ACTIVE_THRESHOLD_MS) {
        activeSessions.add(sessionId);
      }
    } catch {
      /* skip corrupt */
    }
  }
  return { messages: allMessages, sessionProjectMap, activeSessions };
}

function sumSpend(messages: ParsedMessage[]): number {
  return messages.reduce((sum, m) => {
    if (m.type !== 'assistant' || !m.usage) return sum;
    return sum + calculateCost(m.usage, m.model ?? 'claude-sonnet-4-6');
  }, 0);
}

async function main() {
  const { messages, sessionProjectMap, activeSessions } = loadAllData();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const currentWeek = messages.filter((m) => new Date(m.timestamp) >= sevenDaysAgo);
  const previousWeek = messages.filter((m) => {
    const t = new Date(m.timestamp);
    return t >= fourteenDaysAgo && t < sevenDaysAgo;
  });
  const todayMessages = messages.filter((m) => new Date(m.timestamp) >= todayStart);
  const windowMessages = messages.filter((m) => new Date(m.timestamp) >= fiveHoursAgo);

  const metrics = calculateMetrics(currentWeek, previousWeek);
  metrics.isLive = activeSessions.size > 0;

  const todaySpend = sumSpend(todayMessages);
  const weekSpend = sumSpend(currentWeek);
  const prevWeekSpend = sumSpend(previousWeek);
  const window5h = sumSpend(windowMessages);
  const trendPct =
    prevWeekSpend > 0 ? ((weekSpend - prevWeekSpend) / prevWeekSpend) * 100 : 0;

  const agg = aggregateData(messages, sessionProjectMap, activeSessions);
  const insights = generateInsights(metrics, currentWeek, 3);

  // ---- Active session detail (JSONL + session-meta merged) ----
  const activeSessionId = Array.from(activeSessions)[0] ?? null;
  const activeProjectPath = activeSessionId
    ? sessionProjectMap[activeSessionId] ?? ''
    : '';
  const activeMeta = activeSessionId ? await loadSessionMeta(activeSessionId) : null;
  const activeSessionDetail = activeSessionId
    ? buildActiveSessionDetail(messages, activeSessionId, activeProjectPath, activeMeta)
    : null;

  // ---- Today sessions timeline ----
  const todayISO = todayStart.toISOString().slice(0, 10);
  const todaySessionsList = buildTodaySessions(messages, todayISO);

  // ---- Burn rate (30-min window) ----
  const burnRate = activeSessionId
    ? buildBurnRate(messages, activeSessionId, 30)
    : {
        bars: Array.from({ length: 30 }, (_, i) => ({ minuteOffset: i, costUsd: 0 })),
        peakCostUsd: 0,
        peakMinutesAgo: 0,
        avgPerMin: 0,
        nowPerMin: 0,
        trend: 'steady' as const,
      };

  // ---- Message stream (last 20 assistant messages in active session) ----
  const messageStream = activeSessionId
    ? messages
        .filter((m) => m.sessionId === activeSessionId && m.type === 'assistant' && m.usage)
        .slice(-20)
        .map((m) => ({
          ts: m.timestamp,
          model: m.model ?? 'unknown',
          costUsd:
            Math.round(
              calculateCost(m.usage!, m.model ?? 'claude-sonnet-4-6') * 1000,
            ) / 1000,
          tool: m.toolUses?.[0]?.name,
          preview: '',
        }))
    : undefined;

  // ---- Facets + session-meta for each today session ----
  const recapsList = await Promise.all(
    todaySessionsList.map(async (s) => ({
      id: s.sessionId,
      facets: await Promise.resolve(loadFacets(s.sessionId)).catch(() => null),
      meta: await Promise.resolve(loadSessionMeta(s.sessionId)).catch(() => null),
    })),
  );
  const sessionRecaps: Record<string, SessionRecap> = {};
  const sessionMetadata: Record<string, SessionMetaUi> = {};
  for (const r of recapsList) {
    if (r.facets) {
      sessionRecaps[r.id] = {
        briefSummary: r.facets.briefSummary,
        outcome: r.facets.outcome,
        claudeHelpfulness: r.facets.claudeHelpfulness,
        frictionCounts: r.facets.frictionCounts,
        frictionDetail: r.facets.frictionDetail,
      };
    }
    if (r.meta) {
      sessionMetadata[r.id] = {
        gitCommits: r.meta.gitCommits,
        linesAdded: r.meta.linesAdded,
        linesRemoved: r.meta.linesRemoved,
        filesModified: r.meta.filesModified,
        toolErrors: r.meta.toolErrors,
        toolErrorCategories: r.meta.toolErrorCategories,
        toolCounts: r.meta.toolCounts,
        userInterruptions: r.meta.userInterruptions,
        usesMcp: r.meta.usesMcp,
        usesTaskAgent: r.meta.usesTaskAgent,
      };
    }
  }

  // ---- Today aggregates ----
  const todayTokens = todayMessages
    .filter((m) => m.type === 'assistant' && m.usage)
    .reduce(
      (s, m) =>
        s +
        (m.usage!.inputTokens +
          m.usage!.outputTokens +
          m.usage!.cacheCreationTokens +
          m.usage!.cacheReadTokens),
      0,
    );
  const todayProjects = new Set(
    todayMessages
      .filter((m) => m.type === 'assistant')
      .map((m) => sessionProjectMap[m.sessionId] ?? m.sessionId.slice(0, 8)),
  );
  const todaySessionsSet = new Set(
    todayMessages.filter((m) => m.type === 'assistant').map((m) => m.sessionId),
  );

  // ---- Today model mix + cache rate ----
  const todayModelCost = new Map<string, number>();
  let todayCacheReads = 0;
  let todayTotalInput = 0;
  for (const m of todayMessages) {
    if (m.type !== 'assistant' || !m.usage) continue;
    const cost = calculateCost(m.usage, m.model ?? 'claude-sonnet-4-6');
    const model = m.model ?? 'unknown';
    todayModelCost.set(model, (todayModelCost.get(model) ?? 0) + cost);
    todayCacheReads += m.usage.cacheReadTokens;
    todayTotalInput +=
      m.usage.inputTokens + m.usage.cacheReadTokens + m.usage.cacheCreationTokens;
  }
  const todayTotalCost = Array.from(todayModelCost.values()).reduce((a, b) => a + b, 0);
  const modelMixToday = Array.from(todayModelCost.entries()).map(([model, cost]) => ({
    model,
    cost: Math.round(cost * 100) / 100,
    percentage: todayTotalCost > 0 ? (cost / todayTotalCost) * 100 : 0,
    tokens: 0,
  }));
  const cacheRateToday = todayTotalInput > 0 ? todayCacheReads / todayTotalInput : 0;

  const webviewData: WebviewData = {
    username: os.userInfo().username,
    today: {
      sessions: todaySessionsSet.size,
      projects: todayProjects.size,
      tokens: todayTokens,
      tokensFmt: formatTokens(todayTokens),
      cost: todaySpend,
    },
    spend: { today: todaySpend, week: weekSpend, prevWeek: prevWeekSpend, trendPct, window5h },
    usage: { outputRatio: metrics.outputRatio, cacheRate: metrics.cacheRate },
    modelMix: metrics.modelMix,
    sparkline: agg.sparkline,
    tools: agg.tools,
    mcp: agg.mcp,
    skills: agg.skills,
    projects: agg.projects,
    recentSessions: agg.recentSessions,
    activeSession: activeSessionDetail,
    burnRate,
    todaySessions: todaySessionsList,
    sessionRecaps,
    sessionMetadata,
    messageStream,
    toolInvocations: buildToolInvocations(messages, 30),
    insights,
    isLive: metrics.isLive,
    cacheSavings: metrics.cacheSavings,
    tokenBreakdown: metrics.tokenBreakdown,
    sessionStats: {
      avgCostPerSession:
        todaySessionsSet.size > 0
          ? Math.round((todaySpend / todaySessionsSet.size) * 100) / 100
          : 0,
      avgDurationMinutes: agg.avgSessionDurationMinutes,
    },
    summary: {
      totalToolCalls: agg.totalToolCalls,
      mcpCount: agg.mcp.length,
      skillCount: agg.skills.length,
      projectCount: agg.projects.length,
    },
  };

  const weekTokens =
    metrics.tokenBreakdown.input +
    metrics.tokenBreakdown.output +
    metrics.tokenBreakdown.cache;
  const explorerData: ExplorerData = {
    isLive: metrics.isLive,
    activeModel: agg.activeSession?.model ?? null,
    todaySpend,
    weekSpend,
    todayTokens,
    weekTokens,
    spendTrend: trendPct,
    sparkline: agg.sparkline,
    activeSession: agg.activeSession,
    modelMix: metrics.modelMix,
    topProjects: agg.projects.slice(0, 3),
    primaryUnit: 'cost',
    activeSessionDetail,
    burnRate,
    todaySessions: todaySessionsList,
    cacheRate: cacheRateToday,
    modelMixToday,
    window5h,
    budget5h: 0,
    cacheSavings: metrics.cacheSavings,
  };

  const output = {
    generatedAt: new Date().toISOString(),
    webviewData,
    explorerData,
    meta: {
      totalMessages: messages.length,
      totalFiles: findJsonlFiles(jsonlPath).length,
      totalSessions: new Set(messages.map((m) => m.sessionId)).size,
    },
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  // Also write .js form so mockup.html works over file:// (fetch is blocked by CORS locally)
  const jsPath = OUT_PATH.replace(/\.json$/, '.js');
  fs.writeFileSync(
    jsPath,
    `// Auto-generated by scripts/dump-snapshot.ts — do not edit\nwindow.__SNAPSHOT__ = ${JSON.stringify(output)};\n`,
  );
  console.log(`Snapshot → ${OUT_PATH}`);
  console.log(`Snapshot → ${jsPath}`);
  console.log(
    `Messages: ${messages.length} · Sessions: ${output.meta.totalSessions} · Files: ${output.meta.totalFiles}`,
  );
  console.log(
    `Today: $${todaySpend.toFixed(2)} · Week: $${weekSpend.toFixed(2)} · 5h: $${window5h.toFixed(2)} · Cache saved: $${metrics.cacheSavings.toFixed(2)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
