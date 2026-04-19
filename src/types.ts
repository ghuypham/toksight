/** Raw JSONL line types — not all lines are messages */
export type JsonlLineType = 'user' | 'assistant' | 'system' | 'permission-mode' | 'file-history-snapshot' | 'attachment';

/** Token usage from assistant message */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

/** Parsed message from JSONL */
export interface ParsedMessage {
  uuid: string;
  parentUuid: string | null;
  type: 'user' | 'assistant';
  timestamp: string;
  model?: string;
  usage?: TokenUsage;
  toolUses?: Array<{ name: string; path?: string; skill?: string; agent?: string }>;
  sessionId: string;
}

/** Session = one JSONL file */
export interface SessionData {
  sessionId: string;
  filePath: string;
  messages: ParsedMessage[];
  startTime: string;
  lastActivityTime: string;
  isActive: boolean;
}

/** Cost per million tokens for a model */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheCreationPerMillion: number;
}

/** Insight from insights engine */
export interface Insight {
  icon: string;
  text: string;
  sub?: string;
  priority: 'actionable' | 'informational' | 'motivational';
}

/** Tool usage aggregation */
export interface ToolStat {
  name: string;
  calls: number;
  tokens: number;
  cost: number;
}

/** MCP server aggregation */
export interface McpStat {
  name: string;
  calls: number;
  tokens: number;
  cost: number;
}

/** Skill invocation aggregation (e.g. superpowers:brainstorming) */
export interface SkillStat {
  name: string;
  calls: number;
  tokens: number;
  cost: number;
}

/** Agent invocation aggregation — Task tool's subagent_type (e.g. "ui-ux-designer", "Explore") */
export interface AgentStat {
  name: string;
  calls: number;
  tokens: number;
  cost: number;
}

/** Project aggregation */
export interface ProjectStat {
  name: string;
  sessions: number;
  tokens: number;
  cost: number;
}

/** Recent session for display */
export interface RecentSession {
  id: string;
  project: string;
  cost: number;
  tokens: number;
  model: string;
  timeAgo: string;
  isActive: boolean;
  /** Session duration in minutes (last - first message time) */
  durationMinutes?: number;
  /** Total tool calls within this session */
  toolCallCount?: number;
  /** Cost per minute rate (legacy: avg over full session including idle) */
  costPerMin?: number;
  /** Burn rate $/hr based on last 15 minutes of activity — only set for active session */
  recentBurnRatePerHr?: number;
}

/** Today summary metrics */
export interface TodaySummary {
  sessions: number;
  projects: number;
  tokens: number;
  tokensFmt: string;
  cost: number;
}

/** Sparkline data point */
export interface SparklinePoint {
  date: string;
  cost: number;
}

/** Model mix entry with percentage and cost */
export interface ModelMixEntry {
  model: string;
  cost: number;
  percentage: number;
  tokens: number;
}

/** Data for explorer widget */
export interface ExplorerData {
  isLive: boolean;
  activeModel: string | null;
  todaySpend: number;
  weekSpend: number;
  todayTokens: number;
  weekTokens: number;
  spendTrend: number;
  sparkline: SparklinePoint[];
  activeSession: RecentSession | null;
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
  topProjects: ProjectStat[];
  primaryUnit?: PrimaryUnit;

  // NEW — widget 4-slides
  activeSessionDetail: ActiveSessionDetail | null;
  burnRate: BurnRateData;
  todaySessions: TodaySessionSummary[];
  cacheRate: number;                    // 0..1
  modelMixToday: ModelMixEntry[];       // today only (vs existing week modelMix)
  window5h: number;                     // real 5h window spend (USD) — used for quota forecast
  budget5h: number;                     // user-configured 5h cap ($USD); 0 = unset
  cacheSavings: number;                 // $ saved this week via cache reads (vs full input price)

  // v2 — mockup-aligned slides (QUOTA / SESSION / RECAP)
  usageLimits: UsageLimits | null;      // OAuth quota (Slide 1 rows + forecast)
  usageLimitsStatus: UsageLimitsStatus; // tri-state: lets UI distinguish auth-vs-API failure
  forecast: { etaMinutes: number; burnPerMin: number } | null;  // Slide 1 forecast box
  latestRecap: {                        // Slide 3 recap
    sessionId: string;
    lastActivityTime: string;
    recap: SessionRecap | null;
    meta: SessionMetaUi | null;
  } | null;
  /** Active session cumulative cost (Slide 2 Spent cell) */
  activeSessionSpent: number;
  /** Active session cache savings so far (Slide 2 Saved cell) */
  activeSessionSaved: number;
}

/** Token breakdown: output, input, cache-read, cache-create with percentages */
export interface TokenBreakdown {
  output: number;
  input: number;
  /** Cache-read tokens */
  cache: number;
  /** Cache-creation tokens */
  cacheCreation: number;
  outputPct: number;
  inputPct: number;
  cachePct: number;
  cacheCreationPct: number;
}

/** Session statistics */
export interface SessionStats {
  avgCostPerSession: number;
  avgDurationMinutes: number;
}

/** All computed metrics (used internally by metrics-calculator) */
export interface MetricsData {
  outputRatio: number;
  cacheRate: number;
  totalSpend: number;
  costPerOutputToken: number;
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
  sessionCount: number;
  /** Money saved this period via cache reads (vs charging full input price) */
  cacheSavings: number;
  trend: {
    outputRatio: number;
    cacheRate: number;
    spend: number;
  };
  estimatedWindowSpend: number;
  todaySpend: number;
  isLive: boolean;
  tokenBreakdown: TokenBreakdown;
}

/** Primary unit for hero numbers — 'cost' shows $, 'tokens' shows token counts */
export type PrimaryUnit = 'cost' | 'tokens';

/** Anthropic AI-written qualitative analysis from ~/.claude/usage-data/facets/<id>.json */
export interface SessionFacets {
  sessionId: string;
  briefSummary: string;
  outcome: 'fully_achieved' | 'partially_achieved' | 'not_achieved';
  claudeHelpfulness: 'essential' | 'very_helpful' | 'somewhat_helpful' | 'not_helpful';
  frictionCounts: Record<string, number>;
  frictionDetail?: string;
}

/** Anthropic post-session metadata from ~/.claude/usage-data/session-meta/<id>.json */
export interface SessionMeta {
  sessionId: string;
  projectPath: string;
  startTime: string;
  durationMinutes: number;
  toolCounts: Record<string, number>;
  gitCommits: number;
  linesAdded: number;
  linesRemoved: number;
  filesModified: number;
  toolErrors: number;
  toolErrorCategories: Record<string, number>;
  userInterruptions: number;
  usesMcp: boolean;
  usesTaskAgent: boolean;
  messageHours: number[];
}

/** Data sent from extension host to sidebar webview */
export interface WebviewData {
  username: string;
  today: TodaySummary;
  spend: {
    today: number;
    week: number;
    prevWeek: number;
    trendPct: number;
    window5h: number;
  };
  usage: {
    outputRatio: number;
    cacheRate: number;
  };
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
  sparkline: SparklinePoint[];
  tools: ToolStat[];
  mcp: McpStat[];
  skills: SkillStat[];
  agents: AgentStat[];
  projects: ProjectStat[];
  recentSessions: RecentSession[];
  activeSession: ActiveSessionDetail | null;
  burnRate: BurnRateData;
  todaySessions: TodaySessionSummary[];
  sessionRecaps: Record<string, SessionRecap>;
  sessionMetadata: Record<string, SessionMetaUi>;
  messageStream?: MessageStreamEntry[];
  toolInvocations?: ToolInvocation[];  // editor surface only — last 30
  insights: Insight[];
  isLive: boolean;
  usageLimits: UsageLimits | null;
  usageLimitsStatus: UsageLimitsStatus; // tri-state — see fetchUsageLimitsStatus
  /** Phase 2 additions — see spec §8 */
  todayProjectBreakdown: Array<{ name: string; cost: number; pct: number }>;
  latestRecap: {
    sessionId: string;
    lastActivityTime: string;
    recap: SessionRecap | null;
    meta: SessionMetaUi | null;
  } | null;
  forecast: { etaMinutes: number; burnPerMin: number } | null;
  /** $ saved this week via cache reads (vs full input price) */
  cacheSavings: number;
  tokenBreakdown: TokenBreakdown;
  sessionStats: SessionStats;
  summary: {
    totalToolCalls: number;
    mcpCount: number;
    skillCount: number;
    agentCount: number;
    projectCount: number;
  };
}

/** Extended active-session detail (merged JSONL stats + session-meta) */
export interface ActiveSessionDetail {
  sessionId: string;
  projectPath: string;
  model: string;
  startTs: string;
  lastTs: string;
  durationMinutes: number;
  contextTokens: number;
  contextLimit: number;
  contextPct: number;
  toolCounts: Record<string, number>;
  filesEdited: string[];
  toolErrors: number;
  gitCommits: number;
  linesAdded: number;
  linesRemoved: number;
  burnRatePerMin: number;
  burnTrend: 'rising' | 'steady' | 'cooling';
}

/** Burn rate chart bars (minute-bucketed cost over window) */
export interface BurnRateBar {
  minuteOffset: number;
  costUsd: number;
}

export interface BurnRateData {
  bars: BurnRateBar[];
  peakCostUsd: number;
  peakMinutesAgo: number;
  avgPerMin: number;
  nowPerMin: number;
  trend: 'rising' | 'steady' | 'cooling';
}

/** Today's session summary for timeline display */
export interface TodaySessionSummary {
  sessionId: string;
  startTs: string;
  endTs: string;
  durationMinutes: number;
  costUsd: number;
  dominantModel: string;
}

/** Subset of facets used in UI (spec §5.3) */
export interface SessionRecap {
  briefSummary: string;
  outcome: 'fully_achieved' | 'partially_achieved' | 'not_achieved';
  claudeHelpfulness: string;
  frictionCounts: Record<string, number>;
  frictionDetail?: string;
}

/** Subset of session-meta used in UI (spec §5.4) */
export interface SessionMetaUi {
  gitCommits: number;
  linesAdded: number;
  linesRemoved: number;
  filesModified: number;
  toolErrors: number;
  toolErrorCategories: Record<string, number>;
  toolCounts: Record<string, number>;
  userInterruptions: number;
  usesMcp: boolean;
  usesTaskAgent: boolean;
}

/** Message stream entry — full page NOW tab only */
export interface MessageStreamEntry {
  ts: string;
  model: string;
  costUsd: number;
  tool?: string;
  preview: string;
}

/** Tool invocation entry — full page NOW tab only, last 30 newest-first */
export interface ToolInvocation {
  ts: string;
  tool: string;
  inputPath?: string;
  durationMs?: number;      // optional — often unknown from JSONL
  ok: boolean;              // true unless a known error signal
}

/**
 * One quota window from Anthropic OAuth Usage API.
 * `utilization` is a percentage float 0–100 (e.g. 42.0 = 42%).
 * `resetsAt` is ISO 8601 UTC (e.g. "2026-04-18T18:30:00Z") or null if no active reset.
 */
export interface UsageWindow {
  utilization: number;
  resetsAt: string | null;
}

/**
 * OAuth Anthropic Usage API response (GET /api/oauth/usage).
 * All windows are optional — only included when the plan has that quota.
 * Reference: researcher-260418-2149-oauth-sonnet-field-verify.md
 */
export interface UsageLimits {
  fiveHour?: UsageWindow;
  sevenDay?: UsageWindow;
  sevenDaySonnet?: UsageWindow;
  sevenDayOpus?: UsageWindow;
}

/**
 * Distinguishes "user not signed in" vs "API call failed" vs "all good"
 * so the sidebar/widget can render the right empty state per case.
 *   no-auth → no Claude OAuth token in keychain → "Sign in to Claude"
 *   fail    → token exists but API returned non-OK / network error → "Quota unavailable — retrying"
 *   ok      → fetched (windows array may still be empty for free-tier accounts)
 */
export type UsageLimitsStatus = 'ok' | 'fail' | 'no-auth';
