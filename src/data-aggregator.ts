import type { ParsedMessage, ToolStat, McpStat, SkillStat, AgentStat, ProjectStat, RecentSession, SparklinePoint, BurnRateData, BurnRateBar, TodaySessionSummary, ActiveSessionDetail, SessionMeta, SessionFacets, SessionRecap, SessionMetaUi, MessageStreamEntry, ToolInvocation, SessionDetail, SessionTimelineEvent, TokenBreakdown, ModelPricing } from './types';
import { calculateCost, calculateCacheSavings } from './pricing-table';

export interface AggregatedData {
  tools: ToolStat[];
  mcp: McpStat[];
  skills: SkillStat[];
  agents: AgentStat[];
  projects: ProjectStat[];
  sparkline: SparklinePoint[];
  recentSessions: RecentSession[];
  activeSession: RecentSession | null;
  totalToolCalls: number;
  avgSessionDurationMinutes: number;
}

/** Aggregate parsed messages into tools, MCP, projects, and session breakdowns */
export function aggregateData(
  messages: ParsedMessage[],
  sessionProjectMap: Record<string, string> = {},
  activeSessions: Set<string> = new Set(),
): AggregatedData {
  const toolMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  const mcpMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  const skillMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  const agentMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  const projectMap = new Map<string, { sessions: Set<string>; tokens: number; cost: number }>();
  const dailyCosts = new Map<string, number>();
  const sessionStats = new Map<string, {
    tokens: number; cost: number; model: string; lastTime: string; firstTime: string;
    toolCallCount: number;
  }>();

  for (const msg of messages) {
    if (msg.type !== 'assistant' || !msg.usage) continue;

    const model = msg.model ?? 'claude-sonnet-4-6';
    const cost = calculateCost(msg.usage, model);
    const tokens = msg.usage.inputTokens + msg.usage.outputTokens +
      msg.usage.cacheCreationTokens + msg.usage.cacheReadTokens;
    const nTools = msg.toolUses?.length ?? 1;
    const shareCost = cost / nTools;
    const shareTokens = Math.floor(tokens / nTools);

    // Daily costs for sparkline
    if (msg.timestamp) {
      const day = msg.timestamp.slice(0, 10);
      dailyCosts.set(day, (dailyCosts.get(day) ?? 0) + cost);
    }

    // Session stats
    const toolsInMsg = msg.toolUses?.length ?? 0;
    const ses = sessionStats.get(msg.sessionId);
    if (ses) {
      ses.tokens += tokens;
      ses.cost += cost;
      ses.toolCallCount += toolsInMsg;
      if (model && model !== '<synthetic>') ses.model = model;
      if (msg.timestamp > ses.lastTime) ses.lastTime = msg.timestamp;
      if (msg.timestamp < ses.firstTime) ses.firstTime = msg.timestamp;
    } else {
      sessionStats.set(msg.sessionId, {
        tokens, cost, model,
        lastTime: msg.timestamp, firstTime: msg.timestamp,
        toolCallCount: toolsInMsg,
      });
    }

    // Project stats
    const projName = sessionProjectMap[msg.sessionId] ?? msg.sessionId.slice(0, 8);
    const proj = projectMap.get(projName);
    if (proj) {
      proj.sessions.add(msg.sessionId);
      proj.tokens += tokens;
      proj.cost += cost;
    } else {
      projectMap.set(projName, { sessions: new Set([msg.sessionId]), tokens, cost });
    }

    // Tool stats
    if (msg.toolUses) {
      for (const tool of msg.toolUses) {
        const existing = toolMap.get(tool.name);
        if (existing) {
          existing.calls++;
          existing.tokens += shareTokens;
          existing.cost += shareCost;
        } else {
          toolMap.set(tool.name, { calls: 1, tokens: shareTokens, cost: shareCost });
        }

        // Skill extraction (Skill tool calls — input.skill captured by parser)
        if (tool.name === 'Skill' && tool.skill) {
          const sk = skillMap.get(tool.skill);
          if (sk) {
            sk.calls++;
            sk.tokens += shareTokens;
            sk.cost += shareCost;
          } else {
            skillMap.set(tool.skill, { calls: 1, tokens: shareTokens, cost: shareCost });
          }
        }

        // Agent extraction (Task tool calls — input.subagent_type captured by parser)
        if (tool.name === 'Task' && tool.agent) {
          const ag = agentMap.get(tool.agent);
          if (ag) {
            ag.calls++;
            ag.tokens += shareTokens;
            ag.cost += shareCost;
          } else {
            agentMap.set(tool.agent, { calls: 1, tokens: shareTokens, cost: shareCost });
          }
        }

        // MCP extraction
        if (tool.name.startsWith('mcp__')) {
          const server = tool.name.split('__')[1] ?? tool.name;
          const mcpExisting = mcpMap.get(server);
          if (mcpExisting) {
            mcpExisting.calls++;
            mcpExisting.tokens += shareTokens;
            mcpExisting.cost += shareCost;
          } else {
            mcpMap.set(server, { calls: 1, tokens: shareTokens, cost: shareCost });
          }
        }
      }
    }
  }

  // Build sparkline (last 7 days)
  const now = new Date();
  const sparkline: SparklinePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const day = d.toISOString().slice(0, 10);
    sparkline.push({ date: day, cost: Math.round((dailyCosts.get(day) ?? 0) * 100) / 100 });
  }

  // Build recent sessions sorted by last activity
  const recentSessions: RecentSession[] = Array.from(sessionStats.entries())
    .sort((a, b) => b[1].lastTime.localeCompare(a[1].lastTime))
    .slice(0, 5)
    .map(([id, s]) => {
      const elapsed = (now.getTime() - new Date(s.lastTime).getTime()) / 1000;
      const durationMin = (new Date(s.lastTime).getTime() - new Date(s.firstTime).getTime()) / 60000;
      const costPerMin = durationMin > 0 ? s.cost / durationMin : 0;
      return {
        id: id.slice(0, 8),
        fullSessionId: id,
        project: sessionProjectMap[id] ?? id.slice(0, 8),
        cost: Math.round(s.cost * 100) / 100,
        tokens: s.tokens,
        model: s.model,
        timeAgo: formatTimeAgo(elapsed),
        isActive: activeSessions.has(id),
        durationMinutes: Math.round(durationMin),
        toolCallCount: s.toolCallCount,
        costPerMin: Math.round(costPerMin * 100) / 100,
      };
    });

  const activeSession = recentSessions.find(s => s.isActive) ?? null;

  // Compute recent burn rate ($/hr) for the active session — last 15 min window of activity
  // Answers "am I burning fast right now?" — extrapolates last 15 min × 4
  if (activeSession) {
    const fullId = Array.from(sessionStats.keys()).find(id => id.startsWith(activeSession.id)) ?? activeSession.id;
    const windowMs = 15 * 60_000;
    const cutoff = now.getTime() - windowMs;
    let recentCost = 0;
    for (const msg of messages) {
      if (msg.sessionId !== fullId) continue;
      if (msg.type !== 'assistant' || !msg.usage) continue;
      if (new Date(msg.timestamp).getTime() < cutoff) continue;
      recentCost += calculateCost(msg.usage, msg.model ?? 'claude-sonnet-4-6');
    }
    activeSession.recentBurnRatePerHr = Math.round(recentCost * 4 * 100) / 100;  // ×4 = extrapolate to /hr
  }

  // Sort all by cost descending
  const tools: ToolStat[] = Array.from(toolMap.entries())
    .map(([name, d]) => ({ name, calls: d.calls, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  const mcp: McpStat[] = Array.from(mcpMap.entries())
    .map(([name, d]) => ({ name, calls: d.calls, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  const skills: SkillStat[] = Array.from(skillMap.entries())
    .map(([name, d]) => ({ name, calls: d.calls, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  const agents: AgentStat[] = Array.from(agentMap.entries())
    .map(([name, d]) => ({ name, calls: d.calls, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  const projects: ProjectStat[] = Array.from(projectMap.entries())
    .map(([name, d]) => ({ name, sessions: d.sessions.size, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  const durations = Array.from(sessionStats.values())
    .map(s => (new Date(s.lastTime).getTime() - new Date(s.firstTime).getTime()) / 60000)
    .filter(d => d > 0);
  const avgSessionDurationMinutes = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    tools,
    mcp,
    skills,
    agents,
    projects,
    sparkline,
    recentSessions,
    activeSession,
    totalToolCalls: Array.from(toolMap.values()).reduce((s, t) => s + t.calls, 0),
    avgSessionDurationMinutes,
  };
}

/**
 * Bucket messages from given session into per-minute cost bars.
 * windowMinutes = 30 for widget, 60 for full page.
 */
export function buildBurnRate(
  messages: ParsedMessage[],
  sessionId: string,
  windowMinutes: number,
): BurnRateData {
  const now = Date.now();
  const bars: BurnRateBar[] = Array.from({ length: windowMinutes }, (_, i) => ({
    minuteOffset: i,
    costUsd: 0,
  }));

  for (const msg of messages) {
    if (msg.sessionId !== sessionId) continue;
    if (msg.type !== 'assistant' || !msg.usage) continue;
    const offsetMin = Math.floor((now - new Date(msg.timestamp).getTime()) / 60_000);
    if (offsetMin < 0 || offsetMin >= windowMinutes) continue;
    const cost = calculateCost(msg.usage, msg.model ?? 'claude-sonnet-4-6');
    bars[offsetMin].costUsd = Math.round((bars[offsetMin].costUsd + cost) * 100) / 100;
  }

  const costs = bars.map(b => b.costUsd);
  const peakCostUsd = Math.max(0, ...costs);
  const peakMinutesAgo = costs.indexOf(peakCostUsd);
  const nonZero = costs.filter(c => c > 0);
  const avgPerMin = nonZero.length > 0
    ? Math.round((nonZero.reduce((a, b) => a + b, 0) / nonZero.length) * 100) / 100
    : 0;
  const nowPerMin = bars[0].costUsd;

  let trend: 'rising' | 'steady' | 'cooling' = 'steady';
  if (avgPerMin > 0) {
    if (nowPerMin > avgPerMin * 1.5) trend = 'rising';
    else if (nowPerMin < avgPerMin * 0.5) trend = 'cooling';
  }

  return { bars, peakCostUsd, peakMinutesAgo, avgPerMin, nowPerMin, trend };
}

/**
 * Group today's messages by sessionId → timeline entries sorted by start time.
 * todayISO = 'YYYY-MM-DD'
 */
export function buildTodaySessions(
  messages: ParsedMessage[],
  todayISO: string,
): TodaySessionSummary[] {
  const bySession = new Map<string, {
    start: string; end: string;
    cost: number;
    modelCost: Map<string, number>;
  }>();

  for (const msg of messages) {
    if (msg.type !== 'assistant' || !msg.usage) continue;
    if (!msg.timestamp.startsWith(todayISO)) continue;
    const cost = calculateCost(msg.usage, msg.model ?? 'claude-sonnet-4-6');
    const model = msg.model ?? 'unknown';

    const entry = bySession.get(msg.sessionId);
    if (entry) {
      if (msg.timestamp < entry.start) entry.start = msg.timestamp;
      if (msg.timestamp > entry.end) entry.end = msg.timestamp;
      entry.cost += cost;
      entry.modelCost.set(model, (entry.modelCost.get(model) ?? 0) + cost);
    } else {
      bySession.set(msg.sessionId, {
        start: msg.timestamp,
        end: msg.timestamp,
        cost,
        modelCost: new Map([[model, cost]]),
      });
    }
  }

  const result: TodaySessionSummary[] = [];
  for (const [sessionId, data] of bySession) {
    const durationMinutes = Math.round(
      (new Date(data.end).getTime() - new Date(data.start).getTime()) / 60_000,
    );
    const dominantModel = Array.from(data.modelCost.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
    result.push({
      sessionId,
      startTs: data.start,
      endTs: data.end,
      durationMinutes,
      costUsd: Math.round(data.cost * 100) / 100,
      dominantModel,
    });
  }

  result.sort((a, b) => a.startTs.localeCompare(b.startTs));
  return result;
}

function contextLimitFor(model: string): number {
  if (model.includes('opus-4-7') || model.includes('opus-4-6') || model.includes('sonnet-4-6')) {
    return 1_000_000;
  }
  return 200_000;
}

/**
 * Build full active-session detail by merging JSONL stats + optional session-meta.
 * Returns null if no assistant messages found for sessionId.
 */
export function buildActiveSessionDetail(
  messages: ParsedMessage[],
  sessionId: string,
  projectPath: string,
  meta: SessionMeta | null,
): ActiveSessionDetail | null {
  const sessionMsgs = messages
    .filter(m => m.sessionId === sessionId && m.type === 'assistant' && m.usage)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (sessionMsgs.length === 0) return null;

  const first = sessionMsgs[0];
  const last = sessionMsgs[sessionMsgs.length - 1];
  const model = last.model ?? 'claude-sonnet-4-6';
  const contextLimit = contextLimitFor(model);
  const contextTokens = (last.usage?.inputTokens ?? 0) + (last.usage?.cacheReadTokens ?? 0) + (last.usage?.cacheCreationTokens ?? 0);
  const durationMinutes = Math.round(
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 60_000,
  );

  let toolCounts: Record<string, number>;
  if (meta?.toolCounts && Object.keys(meta.toolCounts).length > 0) {
    toolCounts = meta.toolCounts;
  } else {
    toolCounts = {};
    for (const m of sessionMsgs) {
      for (const t of m.toolUses ?? []) {
        toolCounts[t.name] = (toolCounts[t.name] ?? 0) + 1;
      }
    }
  }

  const filesEditedSet = new Set<string>();
  for (const m of sessionMsgs) {
    for (const t of m.toolUses ?? []) {
      if ((t.name === 'Edit' || t.name === 'Write') && t.path) {
        filesEditedSet.add(t.path);
      }
    }
  }

  const now = Date.now();
  const cutoff = now - 15 * 60_000;
  let recentCost = 0;
  for (const m of sessionMsgs) {
    if (new Date(m.timestamp).getTime() < cutoff) continue;
    recentCost += calculateCost(m.usage!, m.model ?? 'claude-sonnet-4-6');
  }
  const burnRatePerMin = Math.round((recentCost / 15) * 100) / 100;

  const last5Cutoff = now - 5 * 60_000;
  let last5 = 0;
  let prev10 = 0;
  for (const m of sessionMsgs) {
    const t = new Date(m.timestamp).getTime();
    if (t < cutoff) continue;
    const cost = calculateCost(m.usage!, m.model ?? 'claude-sonnet-4-6');
    if (t >= last5Cutoff) last5 += cost;
    else prev10 += cost;
  }
  const prev10PerMin = prev10 / 10;
  const last5PerMin = last5 / 5;
  let burnTrend: 'rising' | 'steady' | 'cooling' = 'steady';
  if (prev10PerMin > 0) {
    if (last5PerMin > prev10PerMin * 1.3) burnTrend = 'rising';
    else if (last5PerMin < prev10PerMin * 0.7) burnTrend = 'cooling';
  }

  return {
    sessionId,
    projectPath,
    model,
    startTs: first.timestamp,
    lastTs: last.timestamp,
    durationMinutes,
    contextTokens,
    contextLimit,
    contextPct: Math.round((contextTokens / contextLimit) * 100),
    toolCounts,
    filesEdited: Array.from(filesEditedSet),
    toolErrors: meta?.toolErrors ?? 0,
    gitCommits: meta?.gitCommits ?? 0,
    linesAdded: meta?.linesAdded ?? 0,
    linesRemoved: meta?.linesRemoved ?? 0,
    burnRatePerMin,
    burnTrend,
  };
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Format token count to human readable */
export function formatTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

/**
 * Build session recaps keyed by sessionId — UI-relevant subset of SessionFacets.
 * loadFacets is injected for testability (avoids fs dependency).
 */
export function buildSessionRecaps(
  sessionIds: string[],
  loadFacets: (sessionId: string) => SessionFacets | null,
): Record<string, SessionRecap> {
  const out: Record<string, SessionRecap> = {};
  for (const id of sessionIds) {
    const f = loadFacets(id);
    if (!f) continue;
    out[id] = {
      briefSummary: f.briefSummary,
      outcome: f.outcome,
      claudeHelpfulness: f.claudeHelpfulness,
      frictionCounts: f.frictionCounts,
      frictionDetail: f.frictionDetail,
    };
  }
  return out;
}

/**
 * Build session metadata keyed by sessionId — UI-relevant subset of SessionMeta.
 * loadMeta is injected for testability.
 */
export function buildSessionMetadata(
  sessionIds: string[],
  loadMeta: (sessionId: string) => SessionMeta | null,
): Record<string, SessionMetaUi> {
  const out: Record<string, SessionMetaUi> = {};
  for (const id of sessionIds) {
    const m = loadMeta(id);
    if (!m) continue;
    out[id] = {
      gitCommits: m.gitCommits,
      linesAdded: m.linesAdded,
      linesRemoved: m.linesRemoved,
      filesModified: m.filesModified,
      toolErrors: m.toolErrors,
      toolErrorCategories: m.toolErrorCategories,
      toolCounts: m.toolCounts,
      userInterruptions: m.userInterruptions,
      usesMcp: m.usesMcp,
      usesTaskAgent: m.usesTaskAgent,
      firstPrompt: m.firstPrompt,
    };
  }
  return out;
}

const PREVIEW_MAX = 60;

/**
 * Build last N assistant messages newest-first with cost, tool name, and 60-char preview.
 * previewFn is injectable for testability; defaults to tool-based summary.
 * Used exclusively for full-page NOW tab — do not attach to sidebar payload.
 */
export function buildMessageStream(
  messages: ParsedMessage[],
  limit: number = 20,
  previewFn: (m: ParsedMessage) => string = defaultPreview,
): MessageStreamEntry[] {
  const assistants = messages.filter(m => m.type === 'assistant');
  const tail = assistants.slice(-limit).reverse();  // newest-first
  return tail.map(m => {
    const usage = m.usage ?? { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
    const costUsd = m.model ? calculateCost(usage, m.model) : 0;
    const raw = previewFn(m);
    const preview = raw.length > PREVIEW_MAX ? raw.slice(0, PREVIEW_MAX - 1) + '…' : raw;
    return {
      ts: m.timestamp,
      model: m.model ?? 'unknown',
      costUsd,
      tool: m.toolUses?.[0]?.name,
      preview,
    };
  });
}

function defaultPreview(m: ParsedMessage): string {
  // Fallback to tool summary — no raw message text stored on ParsedMessage.
  const tools = m.toolUses ?? [];
  if (tools.length === 0) return '(assistant message)';
  const head = tools[0];
  const pathPart = head.path ? ` ${head.path}` : '';
  return `${head.name}${pathPart}${tools.length > 1 ? ` +${tools.length - 1}` : ''}`;
}

/**
 * Flatten toolUses from all messages into a newest-first list of ToolInvocation entries.
 * Capped at limit (default 30). ok defaults to true — JSONL has no per-tool error signal yet.
 * Used exclusively for the full-page NOW tab tool invocation stream.
 */
export function buildToolInvocations(messages: ParsedMessage[], limit: number = 30): ToolInvocation[] {
  const out: ToolInvocation[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const msg = messages[i];
    if (!msg.toolUses) continue;
    for (let j = msg.toolUses.length - 1; j >= 0 && out.length < limit; j--) {
      const t = msg.toolUses[j];
      out.push({ ts: msg.timestamp, tool: t.name, inputPath: t.path, ok: true });
    }
  }
  return out;
}

export interface LatestRecap {
  sessionId: string;
  lastActivityTime: string;
  recap: SessionRecap | null;
  meta: SessionMetaUi | null;
}

export function selectLatestRecap(input: {
  sessions: ReadonlyArray<{ sessionId: string; lastActivityTime: string; isActive: boolean }>;
  facets: Record<string, SessionRecap>;
  meta: Record<string, SessionMetaUi>;
}): LatestRecap | null {
  const completed = input.sessions.filter(s => !s.isActive);
  if (completed.length === 0) return null;
  const sorted = [...completed].sort((a, b) =>
    new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime()
  );
  const s = sorted[0];
  return {
    sessionId: s.sessionId,
    lastActivityTime: s.lastActivityTime,
    recap: input.facets[s.sessionId] ?? null,
    meta: input.meta[s.sessionId] ?? null,
  };
}

/** Forecast result — null when no meaningful prediction possible. */
export interface Forecast {
  etaMinutes: number;
  burnPerMin: number;
}

export function computeForecast(input: {
  remainingUsd: number;
  burnPerMin: number;
}): Forecast | null {
  if (input.burnPerMin <= 0) return null;
  if (input.remainingUsd <= 0) return null;
  const etaMinutes = Math.floor(input.remainingUsd / input.burnPerMin);
  return { etaMinutes, burnPerMin: input.burnPerMin };
}

/** Per-project today breakdown entry. */
export interface TodayProjectEntry {
  name: string;
  cost: number;
  pct: number;
}

/**
 * Group today's messages by project (derived from sessionId → JSONL file path),
 * sum cost, return top 3 sorted desc.
 * NOTE: caller passes messages that carry `_cost` and `_project` sidecars attached
 * by the wiring layer. See phase-02 Task 4.
 */
export function buildTodayProjectBreakdown(
  msgs: ReadonlyArray<any>,
  now: Date,
): TodayProjectEntry[] {
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const isToday = (ts: string) => {
    const t = new Date(ts);
    return t.getUTCFullYear() === y && t.getUTCMonth() === m && t.getUTCDate() === d;
  };

  const buckets = new Map<string, number>();
  for (const msg of msgs) {
    if (!isToday(msg.timestamp)) continue;
    const project = msg._project ?? 'unknown';
    const cost = msg._cost ?? 0;
    buckets.set(project, (buckets.get(project) ?? 0) + cost);
  }

  const total = [...buckets.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return [...buckets.entries()]
    .map(([name, rawCost]) => {
      const cost = Math.round(rawCost * 1e10) / 1e10;
      return { name, cost, pct: cost / total };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 3);
}

const TIMELINE_MAX_EVENTS = 200;

/**
 * Build drill-down detail for a session: timeline + token mix + cache savings + outcome.
 * Returns null when no assistant messages exist for sessionId.
 *
 * sessionId may be a full UUID OR a truncated 8-char prefix — caller should pass
 * the prefix when only that is available; we resolve to the longest matching id.
 */
export function buildSessionDetail(
  messages: ParsedMessage[],
  sessionId: string,
  projectPath: string,
  meta: SessionMeta | null,
  facets: SessionFacets | null,
  pricingOverrides?: Record<string, Partial<ModelPricing>>,
): SessionDetail | null {
  // Resolve prefix to full id (recentSessions ships truncated id).
  let resolvedId = sessionId;
  if (sessionId.length < 32) {
    const found = messages.find(m => m.sessionId.startsWith(sessionId));
    if (found) resolvedId = found.sessionId;
  }

  const sessionMsgs = messages
    .filter(m => m.sessionId === resolvedId && m.type === 'assistant' && m.usage)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (sessionMsgs.length === 0) return null;

  const first = sessionMsgs[0];
  const last = sessionMsgs[sessionMsgs.length - 1];
  const dominantModel = pickDominantModel(sessionMsgs);
  const durationMinutes = Math.max(0, Math.round(
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 60_000,
  ));

  // Token breakdown + totals + costs.
  let inTok = 0, outTok = 0, cacheTok = 0, cacheCreate = 0;
  let totalCost = 0, savings = 0;
  for (const m of sessionMsgs) {
    const u = m.usage!;
    inTok += u.inputTokens;
    outTok += u.outputTokens;
    cacheTok += u.cacheReadTokens;
    cacheCreate += u.cacheCreationTokens;
    const model = m.model ?? 'claude-sonnet-4-6';
    totalCost += calculateCost(u, model, pricingOverrides);
    savings += calculateCacheSavings(u, model, pricingOverrides);
  }
  const totalTokens = inTok + outTok + cacheTok + cacheCreate;
  const tokenMix: TokenBreakdown = {
    output: outTok,
    input: inTok,
    cache: cacheTok,
    cacheCreation: cacheCreate,
    outputPct: totalTokens > 0 ? (outTok / totalTokens) * 100 : 0,
    inputPct: totalTokens > 0 ? (inTok / totalTokens) * 100 : 0,
    cachePct: totalTokens > 0 ? (cacheTok / totalTokens) * 100 : 0,
    cacheCreationPct: totalTokens > 0 ? (cacheCreate / totalTokens) * 100 : 0,
  };

  // Tool counts — prefer meta.toolCounts when richer (covers tools we don't capture).
  let toolCounts: Record<string, number>;
  if (meta?.toolCounts && Object.keys(meta.toolCounts).length > 0) {
    toolCounts = { ...meta.toolCounts };
  } else {
    toolCounts = {};
    for (const m of sessionMsgs) {
      for (const t of m.toolUses ?? []) {
        toolCounts[t.name] = (toolCounts[t.name] ?? 0) + 1;
      }
    }
  }

  // Files edited (from tool invocations) — count Edit/Write per file path.
  const filesEditedMap = new Map<string, number>();
  for (const m of sessionMsgs) {
    for (const t of m.toolUses ?? []) {
      if ((t.name === 'Edit' || t.name === 'Write') && t.path) {
        filesEditedMap.set(t.path, (filesEditedMap.get(t.path) ?? 0) + 1);
      }
    }
  }
  const filesEdited = Array.from(filesEditedMap, ([path, edits]) => ({ path, edits }))
    .sort((a, b) => b.edits - a.edits || a.path.localeCompare(b.path));

  // Timeline — one event per assistant message that has activity. Cap at TIMELINE_MAX_EVENTS
  // (newest-kept) to bound payload size for very long sessions.
  const allEvents: SessionTimelineEvent[] = sessionMsgs.map(m => ({
    ts: m.timestamp,
    costUsd: Math.round(calculateCost(m.usage!, m.model ?? 'claude-sonnet-4-6', pricingOverrides) * 10000) / 10000,
    tools: (m.toolUses ?? []).map(t => ({ name: t.name, path: t.path })),
  }));
  // hasError is best-effort: meta only carries totals/categories — we mark events at end of
  // session if the meta records any error and timeline is non-empty (degraded but useful).
  if (meta && meta.toolErrors > 0 && allEvents.length > 0) {
    allEvents[allEvents.length - 1].hasError = true;
  }
  const timeline = allEvents.length <= TIMELINE_MAX_EVENTS
    ? allEvents
    : allEvents.slice(allEvents.length - TIMELINE_MAX_EVENTS);

  return {
    sessionId: resolvedId,
    projectPath,
    model: dominantModel,
    startTs: first.timestamp,
    endTs: last.timestamp,
    durationMinutes,
    firstPrompt: meta?.firstPrompt,
    totalTokens,
    tokenMix,
    cacheSavingsUsd: Math.round(savings * 100) / 100,
    totalCostUsd: Math.round(totalCost * 100) / 100,
    toolCounts,
    filesEdited,
    timeline,
    outcome: facets?.outcome,
    helpfulness: facets?.claudeHelpfulness,
    briefSummary: facets?.briefSummary,
  };
}

function pickDominantModel(msgs: ParsedMessage[]): string {
  const counts = new Map<string, number>();
  for (const m of msgs) {
    const model = m.model ?? 'claude-sonnet-4-6';
    if (model === '<synthetic>') continue;
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  let best = 'claude-sonnet-4-6';
  let max = 0;
  for (const [model, n] of counts) {
    if (n > max) { max = n; best = model; }
  }
  return best;
}
