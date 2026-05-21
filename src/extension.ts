import * as vscode from 'vscode';
import * as os from 'node:os';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { JsonlWatcher } from './jsonl-watcher';
import { calculateMetrics } from './metrics-calculator';
import { calculateCost, calculateCacheSavings } from './pricing-table';
import { generateInsights } from './insights-engine';
import { loadFacets } from './facets-loader';
import { loadSessionMeta } from './session-meta-loader';
import {
  aggregateData,
  formatTokens,
  buildActiveSessionDetail,
  buildBurnRate,
  buildTodaySessions,
  buildSessionRecaps,
  buildSessionMetadata,
  buildMessageStream,
  buildToolInvocations,
  buildTodayProjectBreakdown,
  buildSessionDetail,
  selectLatestRecap,
  computeForecast,
} from './data-aggregator';
import { StatusBarManager } from './status-bar-manager';
import { TokSightViewProvider } from './webview-provider';
import { ExplorerViewProvider } from './explorer-view-provider';
import { DashboardPanelProvider } from './dashboard-panel-provider';
import type {
  ParsedMessage,
  UsageLimits,
  UsageLimitsStatus,
  WebviewData,
  ExplorerData,
} from './types';
import { fetchUsageLimits } from './anthropic-usage-api';
import { buildAgentTree } from './agent-tree-builder';

let watcher: JsonlWatcher | undefined;
let statusBar: StatusBarManager | undefined;
let liveCheckInterval: NodeJS.Timeout | undefined;

// Last-known OAuth quota — fire-and-forget refresh, never blocks UI emit.
// Persisted across reloads via globalState so first emit after window reload
// has data immediately (OAuth API is rate-limited; cache miss = empty UI).
let lastUsageLimits: UsageLimits | null = null;
let lastUsageStatus: UsageLimitsStatus = 'fail';
let usageRefreshInFlight = false;
let extContext: vscode.ExtensionContext | undefined;

const GLOBAL_KEY_USAGE_LIMITS = 'toksight.lastUsageLimits';
const GLOBAL_KEY_USAGE_STATUS = 'toksight.lastUsageStatus';

export function activate(context: vscode.ExtensionContext): void {
  extContext = context;

  // Hydrate last-known quota from previous session so widget/sidebar render
  // immediately on reload instead of waiting for a (possibly rate-limited) OAuth fetch.
  const persistedLimits = context.globalState.get<UsageLimits | null>(GLOBAL_KEY_USAGE_LIMITS, null);
  const persistedStatus = context.globalState.get<UsageLimitsStatus>(GLOBAL_KEY_USAGE_STATUS, 'fail');
  if (persistedLimits) {
    lastUsageLimits = persistedLimits;
    lastUsageStatus = persistedStatus;
  }

  // Kick off OAuth fetch immediately so cache + persistence populate ASAP — we
  // don't want to wait for the watcher's first emit (which races with webview load).
  if (vscode.workspace.getConfiguration('toksight').get<boolean>('oauthEnabled', true)) {
    refreshUsageLimitsInBackground();
  }

  // Resolve JSONL path
  const config = vscode.workspace.getConfiguration('toksight');
  const configuredPath = config.get<string>('jsonlPath', '');
  const jsonlPath = configuredPath || path.join(os.homedir(), '.claude', 'projects');

  // Status bar
  statusBar = new StatusBarManager();
  context.subscriptions.push({ dispose: () => statusBar?.dispose() });

  // Webview providers
  const viewProvider = new TokSightViewProvider(context.extensionUri);
  const explorerProvider = new ExplorerViewProvider(context.extensionUri);
  const dashboardProvider = new DashboardPanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TokSightViewProvider.viewType, viewProvider),
    vscode.window.registerWebviewViewProvider(ExplorerViewProvider.viewType, explorerProvider),
    vscode.commands.registerCommand('toksight.openDashboard', () => {
      dashboardProvider.open();
    }),
  );

  // Get username (async to avoid blocking activation)
  let username = os.userInfo().username;
  getUsername().then((name) => { username = name; });

  // When webview opens late, push current data
  viewProvider.onDidResolve(() => {
    if (watcher) {
      const messages = watcher.getMessages();
      if (messages.length > 0) {
        watcher.emit('data', messages, watcher.isAnySessionActive());
      }
    }
  });

  // Drill-down session detail — webview asks for full data on click; we resolve
  // against the current message cache (no FS round-trip) and post back to caller.
  const handleSessionRequest = (target: 'sidebar' | 'dashboard') => (sessionId: string) => {
    if (!watcher) return;
    const cfg = vscode.workspace.getConfiguration('toksight');
    const overrides = cfg.get<Record<string, unknown>>('pricingOverrides', {}) as
      Record<string, Partial<import('./types').ModelPricing>> | undefined;
    const messages = watcher.getMessages();
    const sessionProjectMap = watcher.getSessionProjectMap();
    // Resolve prefix to full id so meta/facets sidecars load by UUID, not slice.
    let fullId = sessionId;
    if (sessionId.length < 32) {
      const found = messages.find(m => m.sessionId.startsWith(sessionId));
      if (found) fullId = found.sessionId;
    }
    const projectPath = sessionProjectMap[fullId] ?? '';
    const meta = loadSessionMeta(fullId);
    const facets = loadFacets(fullId);
    const detail = buildSessionDetail(messages, fullId, projectPath, meta, facets, overrides);
    if (target === 'sidebar') viewProvider.postSessionDetail(detail);
    else dashboardProvider.postSessionDetail(detail);
  };
  viewProvider.onRequestSession(handleSessionRequest('sidebar'));
  dashboardProvider.onRequestSession(handleSessionRequest('dashboard'));

  // Start watcher
  watcher = new JsonlWatcher(jsonlPath);

  watcher.on('data', async (messages: ParsedMessage[], isLive: boolean) => {
    // Re-fetch config each emit so changes (e.g. primaryUnit toggle) take effect immediately
    const config = vscode.workspace.getConfiguration('toksight');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Split messages by period
    const currentWeek = messages.filter((m) => new Date(m.timestamp) >= sevenDaysAgo);
    const previousWeek = messages.filter((m) => {
      const t = new Date(m.timestamp);
      return t >= fourteenDaysAgo && t < sevenDaysAgo;
    });
    const todayMessages = messages.filter((m) => new Date(m.timestamp) >= todayStart);
    const windowMessages = messages.filter((m) => new Date(m.timestamp) >= fiveHoursAgo);

    // Calculate metrics
    const pricingOverrides = config.get<Record<string, unknown>>('pricingOverrides', {});
    const metrics = calculateMetrics(currentWeek, previousWeek, pricingOverrides);
    metrics.isLive = isLive;

    // Time-specific spends
    const window5h = sumSpend(windowMessages, pricingOverrides);
    const todaySpend = sumSpend(todayMessages, pricingOverrides);
    const weekSpend = sumSpend(currentWeek, pricingOverrides);
    const prevWeekSpend = sumSpend(previousWeek, pricingOverrides);
    const trendPct = prevWeekSpend > 0
      ? ((weekSpend - prevWeekSpend) / prevWeekSpend) * 100
      : 0;

    // Generate insights
    const maxInsights = config.get<number>('insightsMax', 3);
    const insights = generateInsights(metrics, currentWeek, maxInsights);

    // Aggregate new breakdown data
    const sessionProjectMap = watcher?.getSessionProjectMap() ?? {};
    const activeSessions = watcher?.getActiveSessions() ?? new Set<string>();
    const agg = aggregateData(messages, sessionProjectMap, activeSessions);

    // ---- Resolve active session detail (merge JSONL + session-meta) ----
    const activeSessionId = Array.from(activeSessions)[0] ?? null;
    const activeProjectPath = activeSessionId
      ? (sessionProjectMap[activeSessionId] ?? '')
      : '';
    const activeMeta = activeSessionId
      ? await loadSessionMeta(activeSessionId)
      : null;
    const activeSessionDetail = activeSessionId
      ? buildActiveSessionDetail(messages, activeSessionId, activeProjectPath, activeMeta)
      : null;

    // ---- Agent tree for active session (scoped to current workspace) ----
    const workspaceSlug = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      ? vscode.workspace.workspaceFolders[0].uri.fsPath.replace(/\//g, '-')
      : undefined;
    let agentSessionDir: string | null = null;
    let agentSessionId: string | null = activeSessionId;
    if (agentSessionId) {
      agentSessionDir = watcher?.getSubagentDir(agentSessionId, workspaceSlug) ?? null;
    }
    if (!agentSessionDir) {
      for (const s of agg.recentSessions) {
        const sid = s.fullSessionId ?? s.id;
        const dir = watcher?.getSubagentDir(sid, workspaceSlug);
        if (dir) { agentSessionDir = dir; agentSessionId = sid; break; }
      }
    }
    const agentTree = agentSessionDir
      ? buildAgentTree(agentSessionDir, agentSessionId!)
      : null;

    // ---- Today sessions timeline ----
    const todayISO = todayStart.toISOString().slice(0, 10);
    const todaySessionsList = buildTodaySessions(messages, todayISO);

    // ---- Burn rate (30-min window for widget; full-page dashboard uses same fn with 60) ----
    const burnRate = activeSessionId
      ? buildBurnRate(messages, activeSessionId, 30)
      : { bars: Array.from({ length: 30 }, (_, i) => ({ minuteOffset: i, costUsd: 0 })),
          peakCostUsd: 0, peakMinutesAgo: 0, avgPerMin: 0, nowPerMin: 0, trend: 'steady' as const };

    // ---- Build session recaps + metadata via aggregator (sync loaders) ----
    const todaySessionIds = todaySessionsList.map(s => s.sessionId);
    const sessionRecaps = buildSessionRecaps(todaySessionIds, loadFacets);
    const sessionMetadata = buildSessionMetadata(todaySessionIds, loadSessionMeta);
    // messageStream + toolInvocations — full-page NOW tab only (sidebar ignores these fields)
    const messageStream = buildMessageStream(messages, 20);
    const toolInvocations = buildToolInvocations(messages, 30);

    // Today summary
    const todayTokens = todayMessages
      .filter((m) => m.type === 'assistant' && m.usage)
      .reduce((s, m) => s + (m.usage!.inputTokens + m.usage!.outputTokens +
        m.usage!.cacheCreationTokens + m.usage!.cacheReadTokens), 0);

    const todayProjects = new Set(
      todayMessages.filter((m) => m.type === 'assistant').map((m) => sessionProjectMap[m.sessionId] ?? m.sessionId.slice(0, 8)),
    );
    const todaySessions = new Set(
      todayMessages.filter((m) => m.type === 'assistant').map((m) => m.sessionId),
    );

    // OAuth quota — fire-and-forget refresh; UI uses last-known value so a slow
    // / rate-limited Anthropic API never delays the live data emit.
    const oauthEnabled = config.get<boolean>('oauthEnabled', true);
    if (oauthEnabled) {
      refreshUsageLimitsInBackground();
    } else {
      lastUsageLimits = null;
      lastUsageStatus = 'no-auth';
    }
    const usageLimits = lastUsageLimits;
    const usageLimitsStatus = lastUsageStatus;

    // Read budget5h once — reused in both webviewData and explorerData
    const budget5h = config.get<number>('budget5h', 0);

    // Enrich messages with sidecar cost + project for today-project breakdown
    const enrichedMessages = messages.map((m) => ({
      ...m,
      _project: sessionProjectMap[m.sessionId] ?? m.sessionId.slice(0, 8),
      _cost: m.type === 'assistant' && m.usage
        ? calculateCost(
            m.usage,
            m.model ?? 'claude-sonnet-4-6',
            pricingOverrides as Record<string, Partial<import('./types').ModelPricing>> | undefined,
          )
        : 0,
    }));
    const todayProjectBreakdown = buildTodayProjectBreakdown(enrichedMessages, new Date());

    // Map TodaySessionSummary -> shape selectLatestRecap expects
    const sessionsForRecap = todaySessionsList.map((s) => ({
      sessionId: s.sessionId,
      lastActivityTime: s.endTs,
      isActive: activeSessions.has(s.sessionId),
    }));
    const latestRecap = selectLatestRecap({
      sessions: sessionsForRecap,
      facets: sessionRecaps,
      meta: sessionMetadata,
    });

    // OAuth returns % only (no $ cap) — forecast uses local budget5h setting.
    const forecast = computeForecast({
      remainingUsd: Math.max(0, budget5h - window5h),
      burnPerMin: burnRate.nowPerMin,
    });

    // Build webview data (new shape)
    const webviewData: WebviewData = {
      username,
      today: {
        sessions: todaySessions.size,
        projects: todayProjects.size,
        tokens: todayTokens,
        tokensFmt: formatTokens(todayTokens),
        cost: todaySpend,
      },
      spend: {
        today: todaySpend,
        week: weekSpend,
        prevWeek: prevWeekSpend,
        trendPct,
        window5h,
      },
      usage: {
        outputRatio: metrics.outputRatio,
        cacheRate: metrics.cacheRate,
      },
      modelMix: metrics.modelMix,
      sparkline: agg.sparkline,
      tools: agg.tools,
      mcp: agg.mcp,
      skills: agg.skills,
      agents: agg.agents,
      projects: agg.projects,
      recentSessions: agg.recentSessions,
      activeSession: activeSessionDetail,
      burnRate,
      todaySessions: todaySessionsList,
      sessionRecaps,
      sessionMetadata,
      messageStream,
      toolInvocations,
      insights,
      isLive,
      usageLimits,
      usageLimitsStatus,
      todayProjectBreakdown,
      latestRecap,
      forecast,
      cacheSavings: metrics.cacheSavings,
      tokenBreakdown: metrics.tokenBreakdown,
      sessionStats: {
        avgCostPerSession: todaySessions.size > 0
          ? Math.round((todaySpend / todaySessions.size) * 100) / 100
          : 0,
        avgDurationMinutes: agg.avgSessionDurationMinutes,
      },
      agentTree,
      summary: {
        totalToolCalls: agg.totalToolCalls,
        mcpCount: agg.mcp.length,
        skillCount: agg.skills.length,
        agentCount: agg.agents.length,
        projectCount: agg.projects.length,
      },
    };

    // Today-only model mix (contrasts with week mix)
    const todayModelCost = new Map<string, number>();
    let todayCacheReads = 0;
    let todayTotalInput = 0;
    for (const m of todayMessages) {
      if (m.type !== 'assistant' || !m.usage) continue;
      const cost = calculateCost(
        m.usage,
        m.model ?? 'claude-sonnet-4-6',
        pricingOverrides as Record<string, Partial<import('./types').ModelPricing>> | undefined,
      );
      const model = m.model ?? 'unknown';
      todayModelCost.set(model, (todayModelCost.get(model) ?? 0) + cost);
      todayCacheReads += m.usage.cacheReadTokens;
      todayTotalInput += m.usage.inputTokens + m.usage.cacheReadTokens + m.usage.cacheCreationTokens;
    }
    const todayTotalCost = Array.from(todayModelCost.values()).reduce((a, b) => a + b, 0);
    const modelMixToday = Array.from(todayModelCost.entries()).map(([model, cost]) => ({
      model,
      cost: Math.round(cost * 100) / 100,
      percentage: todayTotalCost > 0 ? (cost / todayTotalCost) * 100 : 0,
      tokens: 0,  // not used in widget; leave 0
    }));
    const cacheRateToday = todayTotalInput > 0 ? todayCacheReads / todayTotalInput : 0;

    // Active session cumulative Spent + Saved (Slide 2 cells)
    let activeSessionSpent = 0;
    let activeSessionSaved = 0;
    if (activeSessionId) {
      for (const m of messages) {
        if (m.sessionId !== activeSessionId || m.type !== 'assistant' || !m.usage) continue;
        const model = m.model ?? 'claude-sonnet-4-6';
        const overrides = pricingOverrides as Record<string, Partial<import('./types').ModelPricing>> | undefined;
        activeSessionSpent += calculateCost(m.usage, model, overrides);
        activeSessionSaved += calculateCacheSavings(m.usage, model, overrides);
      }
    }

    // Build explorer data (4-slide carousel widget)
    const weekTokensTotal = metrics.tokenBreakdown.input + metrics.tokenBreakdown.output + metrics.tokenBreakdown.cache + metrics.tokenBreakdown.cacheCreation;
    const explorerData: ExplorerData = {
      isLive,
      activeModel: agg.activeSession?.model ?? null,
      todaySpend,
      weekSpend,
      todayTokens,
      weekTokens: weekTokensTotal,
      spendTrend: trendPct,
      sparkline: agg.sparkline,
      activeSession: agg.activeSession,
      modelMix: metrics.modelMix,
      topProjects: agg.projects.slice(0, 3),
      primaryUnit: config.get<'cost' | 'tokens'>('primaryUnit', 'cost'),
      // NEW: widget 4-slides
      activeSessionDetail,
      burnRate,
      todaySessions: todaySessionsList,
      cacheRate: cacheRateToday,
      modelMixToday,
      window5h,
      budget5h,
      cacheSavings: metrics.cacheSavings,
      // v2 mockup-aligned
      usageLimits,
      usageLimitsStatus,
      forecast,
      latestRecap,
      activeSessionSpent,
      activeSessionSaved,
    };

    // Update UI
    statusBar?.update({ metrics, usageLimits, burnPerMin: burnRate.nowPerMin });
    explorerProvider.updateFull(explorerData);
    viewProvider.postMessage(webviewData);
    // Activity bar badge: show 5h quota % (safe ignore if API unavailable)
    const badgePct = usageLimits?.fiveHour?.utilization ?? 0;
    viewProvider.setBadge(badgePct, `5h quota: ${badgePct}%`);
    dashboardProvider.update(webviewData);
    viewProvider.postSettings({
      carouselInterval: config.get<number>('carouselInterval', 5000),
      primaryUnit: config.get<'cost' | 'tokens'>('primaryUnit', 'cost'),
    });
  });

  watcher.on('error', (error: Error) => {
    console.error('TokSight watcher error:', error.message);
    statusBar?.setError('Watch failed');
  });

  watcher.start();

  // Periodically check live status (every 10s)
  let lastIsLive = false;
  liveCheckInterval = setInterval(() => {
    if (watcher) {
      const isLive = watcher.isAnySessionActive();
      if (isLive !== lastIsLive) {
        lastIsLive = isLive;
        const messages = watcher.getMessages();
        if (messages.length > 0) {
          watcher.emit('data', messages, isLive);
        }
      }
    }
  }, 10_000);

  context.subscriptions.push({ dispose: () => clearInterval(liveCheckInterval) });
  context.subscriptions.push({ dispose: () => watcher?.stop() });

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('toksight')) {
        if (watcher) {
          const messages = watcher.getMessages();
          watcher.emit('data', messages, watcher.isAnySessionActive());
        }
      }
    }),
  );
}

/**
 * Refresh OAuth usage in the background. If a refresh is already in flight or
 * the cached value is still warm, the call is a no-op (cache layer handles TTL).
 * On change, re-emits the latest watcher data so the UI picks up new quotas.
 */
function refreshUsageLimitsInBackground(): void {
  if (usageRefreshInFlight) return;
  usageRefreshInFlight = true;
  fetchUsageLimits()
    .then((res) => {
      const changed = res.status !== lastUsageStatus
        || JSON.stringify(res.data) !== JSON.stringify(lastUsageLimits);
      // Only overwrite cached good data on success — preserve last-known on fail/no-auth
      // so transient 429s don't blank the UI after a reload.
      if (res.status === 'ok') {
        lastUsageLimits = res.data;
        lastUsageStatus = res.status;
        // Persist successful fetches so reload picks up last-known quota.
        // Promise.all so failures surface to the catch below; void for fire-and-forget.
        void Promise.all([
          extContext?.globalState.update(GLOBAL_KEY_USAGE_LIMITS, res.data),
          extContext?.globalState.update(GLOBAL_KEY_USAGE_STATUS, res.status),
        ]).catch((err) => console.error('TokSight: globalState persist failed', err));
      } else if (!lastUsageLimits) {
        // No prior good data — surface the failure status (no-auth / fail).
        lastUsageStatus = res.status;
      }
      if (changed && watcher) {
        // Re-trigger emit so UI gets fresh quota without waiting for next file event
        watcher.emit('data', watcher.getMessages(), watcher.isAnySessionActive());
      }
    })
    .catch(() => {
      // Network error — keep last-known good quota; just mark status as fail
      // if we have nothing cached.
      if (!lastUsageLimits) lastUsageStatus = 'fail';
    })
    .finally(() => {
      usageRefreshInFlight = false;
    });
}

function sumSpend(messages: ParsedMessage[], overrides: Record<string, unknown>): number {
  return messages.reduce((sum, m) => {
    if (m.type !== 'assistant' || !m.usage) return sum;
    return (
      sum +
      calculateCost(
        m.usage,
        m.model ?? 'claude-sonnet-4-6',
        overrides as Record<string, Partial<import('./types').ModelPricing>> | undefined,
      )
    );
  }, 0);
}

export function deactivate(): void {
  watcher?.stop();
  statusBar?.dispose();
  if (liveCheckInterval) clearInterval(liveCheckInterval);
}

function getUsername(): Promise<string> {
  return new Promise((resolve) => {
    exec('git config user.name', { encoding: 'utf-8' }, (err, stdout) => {
      resolve(err ? os.userInfo().username : stdout.trim());
    });
  });
}
