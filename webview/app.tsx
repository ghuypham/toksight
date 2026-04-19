import { useExtensionData } from './hooks/use-extension-data';
import { theme } from './styles/theme';
import { Header } from './components/header';
import { TodayGrid } from './components/today-grid';
import { DailyBarChart } from './components/daily-bar-chart';
import { ActiveSessionCard } from './components/active-session-card';
import { SpendSection } from './components/spend-section';
import { ModelMixBar } from './components/model-mix-bar';
import { UsageSection } from './components/usage-section';
import { TokenBreakdownView } from './components/token-breakdown';
import { SessionStatsView } from './components/session-stats';
import { BarList } from './components/bar-list';
import { RecentSessions } from './components/recent-sessions';
import { InsightsList } from './components/insights-list';
import { GroupNow } from './sidebar/group-now';
import { GroupToday } from './sidebar/group-today';
import { GroupQuota } from './sidebar/group-quota';
import { GroupModelsTools } from './sidebar/group-models-tools';
import { GroupInsights } from './sidebar/group-insights';
import { FullPageApp } from './fullpage/full-page-app';

/** Convert ToolStat/McpStat/ProjectStat to BarListItem shape */
function toBarItems(
  items: Array<{ name: string; calls?: number; sessions?: number; tokens: number; cost: number }>,
): Array<{ name: string; stat1?: string; stat2?: string; cost: number }> {
  return items.map((it) => ({
    name: it.name,
    stat1: it.calls != null ? `${it.calls}x` : it.sessions != null ? `${it.sessions}s` : undefined,
    stat2: it.tokens >= 1000
      ? `${(it.tokens / 1000).toFixed(0)}K`
      : String(it.tokens),
    cost: it.cost,
  }));
}

const ANIMATIONS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }

/* === Keyframes === */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes barGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes barGrowY {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
@keyframes heroGlow {
  0% { opacity: 0.3; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes cellPop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes rowSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes sparkDraw {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}
@keyframes sparkFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === Apply animations to elements === */

/* Sections fade-slide-up with stagger */
[data-section] {
  animation: fadeSlideUp 0.45s ease-out both;
}
[data-section="1"] { animation-delay: 0.03s; }
[data-section="2"] { animation-delay: 0.06s; }
[data-section="3"] { animation-delay: 0.09s; }
[data-section="4"] { animation-delay: 0.12s; }
[data-section="5"] { animation-delay: 0.15s; }
[data-section="6"] { animation-delay: 0.18s; }
[data-section="7"] { animation-delay: 0.21s; }
[data-section="8"] { animation-delay: 0.24s; }
[data-section="9"] { animation-delay: 0.27s; }
[data-section="10"] { animation-delay: 0.30s; }
[data-section="11"] { animation-delay: 0.33s; }

/* Today grid cells pop in */
[data-cell] {
  animation: cellPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
[data-cell="1"] { animation-delay: 0.1s; }
[data-cell="2"] { animation-delay: 0.15s; }
[data-cell="3"] { animation-delay: 0.2s; }
[data-cell="4"] { animation-delay: 0.25s; }

/* Bar chart bars grow vertically — anchored at bottom */
[data-bar] {
  transform-origin: bottom;
  animation: barGrowY 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
[data-bar="1"] { animation-delay: 0.1s; }
[data-bar="2"] { animation-delay: 0.15s; }
[data-bar="3"] { animation-delay: 0.2s; }
[data-bar="4"] { animation-delay: 0.25s; }
[data-bar="5"] { animation-delay: 0.3s; }
[data-bar="6"] { animation-delay: 0.35s; }
[data-bar="7"] { animation-delay: 0.4s; }

/* Model bar segments grow */
[data-model-seg] {
  transform-origin: left;
  animation: barGrow 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both;
}

/* Usage progress bars grow */
[data-progress] {
  transform-origin: left;
  animation: barGrow 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
}

/* Hero numbers bounce */
[data-hero] {
  display: inline-block;
  animation: heroGlow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
}

/* List rows slide in */
[data-row] {
  animation: rowSlideIn 0.35s ease-out both;
}
[data-row="1"] { animation-delay: 0.05s; }
[data-row="2"] { animation-delay: 0.1s; }
[data-row="3"] { animation-delay: 0.15s; }
[data-row="4"] { animation-delay: 0.2s; }
[data-row="5"] { animation-delay: 0.25s; }

/* Sparkline draw-in */
svg polyline[data-spark] {
  stroke-dasharray: 300;
  animation: sparkDraw 1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}
svg polygon[data-spark-fill] {
  animation: sparkFadeIn 0.5s ease-out 0.6s both;
}

/* Token breakdown segments */
[data-token-seg] {
  animation: fadeSlideUp 0.4s ease-out both;
}
[data-token-seg="1"] { animation-delay: 0.15s; }
[data-token-seg="2"] { animation-delay: 0.22s; }
[data-token-seg="3"] { animation-delay: 0.29s; }

/* Efficiency card */
[data-efficiency] {
  animation: fadeSlideUp 0.5s ease-out 0.1s both;
}

/* Insight cards */
[data-insight] {
  animation: fadeSlideUp 0.4s ease-out 0.2s both;
}

/* Hover effects */
[data-cell]:hover { transform: scale(1.03); }
[data-cell] { transition: transform 0.15s ease; }
[data-row] { transition: background 0.15s ease; border-radius: 4px; }
[data-row]:hover { background: rgba(255,255,255,0.03); }
`;

export function App() {
  const { data, mode, settings } = useExtensionData();
  const primaryUnit = settings.primaryUnit;
  const isEditor = mode === 'editor';

  if (!data) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.disabledForeground,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: '13px',
      }}>
        <p>No Claude Code sessions found.</p>
        <p style={{ fontSize: '12px', marginTop: '8px', color: theme.disabledForeground }}>
          TokSight watches ~/.claude/projects/ for JSONL files.
          Configure the path in settings if needed.
        </p>
      </div>
    );
  }

  const hasTools = data.tools && data.tools.length > 0;
  const hasMcp = data.mcp && data.mcp.length > 0;
  const hasSkills = data.skills && data.skills.length > 0;
  const hasProjects = data.projects && data.projects.length > 0;

  // --- Reusable section blocks ---

  const spendBlock = (
    <div data-section="1">
      <SpendSection
        today={data.spend.today}
        week={data.spend.week}
        trendPct={data.spend.trendPct}
        window5h={data.spend.window5h}
        todayTokens={data.today.tokens}
        weekTokens={data.tokenBreakdown.input + data.tokenBreakdown.output + data.tokenBreakdown.cache + data.tokenBreakdown.cacheCreation}
        primaryUnit={primaryUnit}
      />
    </div>
  );

  const todayBlock = (
    <div data-section="2" style={{ padding: '14px 0' }}>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: theme.disabledForeground,
        marginBottom: '10px',
      }}>
        Today
      </div>
      <TodayGrid today={data.today} />
      {data.summary && (
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          color: theme.disabledForeground,
          textAlign: 'center',
          padding: '6px 0 0',
        }}>
          {data.summary.totalToolCalls.toLocaleString()} calls
          <span style={{ margin: '0 5px', opacity: 0.4 }}>&middot;</span>
          {data.summary.mcpCount} MCPs
          <span style={{ margin: '0 5px', opacity: 0.4 }}>&middot;</span>
          {data.summary.skillCount} skills
          <span style={{ margin: '0 5px', opacity: 0.4 }}>&middot;</span>
          {data.summary.projectCount} projects
        </div>
      )}
    </div>
  );

  const activeSessionBlock = data.activeSession ? (
    <div data-section="4" style={{ paddingTop: '12px' }}>
      <ActiveSessionCard session={data.activeSession} />
    </div>
  ) : null;

  const sessionStatsBlock = data.sessionStats ? (
    <div data-section="8">
      <SessionStatsView stats={data.sessionStats} />
    </div>
  ) : null;

  const modelsBlock = (
    <div data-section="5">
      <div style={{ height: '1px', background: theme.widgetBorder }} />
      <ModelMixBar modelMix={data.modelMix} />
    </div>
  );

  const usageBlock = (
    <div data-section="6">
      <div style={{ height: '1px', background: theme.widgetBorder }} />
      <UsageSection
        outputRatio={data.usage.outputRatio}
        cacheRate={data.usage.cacheRate}
        cacheSavings={data.cacheSavings}
        totalSpend={data.spend.week}
      />
    </div>
  );

  const tokenBreakdownBlock = data.tokenBreakdown ? (
    <div data-section="7">
      <TokenBreakdownView breakdown={data.tokenBreakdown} />
    </div>
  ) : null;

  const dailyBarBlock = data.sparkline && data.sparkline.length >= 2 ? (
    <div data-section="3">
      <DailyBarChart points={data.sparkline} />
    </div>
  ) : null;

  const toolsBarsBlock = (
    <div data-section="9">
      {hasTools && (
        <>
          <div style={{ height: '1px', background: theme.widgetBorder }} />
          <BarList title="Tools" items={toBarItems(data.tools)} />
        </>
      )}
      {hasMcp && (
        <>
          <div style={{ height: '1px', background: theme.widgetBorder }} />
          <BarList title="MCP Servers" items={toBarItems(data.mcp)} />
        </>
      )}
      {hasSkills && (
        <>
          <div style={{ height: '1px', background: theme.widgetBorder }} />
          <BarList title="Skills" items={toBarItems(data.skills)} />
        </>
      )}
      {hasProjects && (
        <>
          <div style={{ height: '1px', background: theme.widgetBorder }} />
          <BarList title="Projects" items={toBarItems(data.projects)} />
        </>
      )}
    </div>
  );

  const recentSessionsBlock = data.recentSessions && data.recentSessions.length > 0 ? (
    <div data-section="10">
      <RecentSessions sessions={data.recentSessions} />
      <div style={{ height: '1px', background: theme.widgetBorder }} />
    </div>
  ) : null;

  const insightsBlock = (
    <div data-section="11">
      <InsightsList insights={data.insights} />
    </div>
  );

  const footnoteBlock = (
    <div style={{
      padding: '8px 0 16px',
      fontFamily: "'Inter', sans-serif",
      fontSize: '10px',
      color: theme.disabledForeground,
      fontStyle: 'italic',
      lineHeight: '1.4',
    }}>
      API value = equivalent cost if using Claude API directly. Claude Code subscriptions (Pro/Max) are flat rate.
    </div>
  );

  return (
    <div style={{
      // Sidebar lives inside a VS Code panel that already adds chrome padding;
      // editor mode is full-bleed and needs the breathing room.
      padding: isEditor ? '0 12px' : '0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{ANIMATIONS_CSS}</style>

      {/* Header: TokSight brand + green dot + username */}
      <Header data={data} />

      {isEditor ? (
        /* ── Editor mode: full-page left-nav + 4 tabs ── */
        <FullPageApp data={data} />
      ) : (
        /* ── Sidebar mode: 5 labeled groups — NOW → TODAY → QUOTA → MODELS&TOOLS → INSIGHTS ── */
        <>
          <GroupNow data={data} primaryUnit={primaryUnit} />
          <GroupToday data={data} />
          <GroupQuota data={data} />
          <GroupModelsTools data={data} />
          <GroupInsights data={data} />
          {footnoteBlock}
        </>
      )}
    </div>
  );
}
