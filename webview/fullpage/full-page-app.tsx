import { useState } from 'preact/hooks';
import type { WebviewData } from '../../src/types';
import { TimeRangeProvider, TimeRangeDropdown } from './time-range-context';
import { TabQuota } from './tab-quota';
import { TabSessions } from './tab-sessions';
import { TabProjects } from './tab-projects';
import { TabModelsTools } from './tab-models-tools';
import { TabInsights } from './tab-insights';

export type TabId = 'quota' | 'sessions' | 'projects' | 'models-tools' | 'insights';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'quota',        label: 'Quota' },
  { id: 'sessions',     label: 'Sessions' },
  { id: 'projects',     label: 'Projects' },
  { id: 'models-tools', label: 'Models & Tools' },
  { id: 'insights',     label: 'Insights' },
];

/** Tab title map for the fp-header brand string */
const TAB_TITLE: Record<TabId, string> = {
  quota:          'TokSight · Quota',
  sessions:       'TokSight · Sessions',
  projects:       'TokSight · Projects',
  'models-tools': 'TokSight · Models & Tools',
  insights:       'TokSight · Insights',
};

const FULLPAGE_CSS = `
  .fp-shell {
    /* Dashboard lives in an editor tab (createWebviewPanel) — blend with
     * editor-background, not editorWidget (that's the floating-popup color). */
    background: var(--vscode-editor-background, var(--tok-bg-sunken));
    color: var(--tok-text-primary);
    overflow: hidden;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .fp-header {
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--tok-divider);
    flex-shrink: 0;
  }
  .fp-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    letter-spacing: normal;
    color: var(--tok-text-primary);
  }
  .fp-time {
    padding: 7px 14px 7px 10px;
    background: var(--tok-bg-surface);
    border: 0;
    border-radius: 6px;
    font-size: 12px;
    color: var(--tok-text-primary);
    font-family: inherit;
    cursor: pointer;
  }
  .fp-body {
    display: grid;
    grid-template-columns: 200px 1fr;
    flex: 1;
  }
  .fp-nav {
    /* Inside editor tab — use section-header tint, not sideBar-background
     * (sideBar color inside editor reads like a misplaced sidebar). */
    background: var(--vscode-sideBarSectionHeader-background, transparent);
    padding: 16px 10px;
    border-right: 1px solid var(--tok-divider);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .fp-nav-item {
    padding: 10px 14px;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--tok-text-secondary);
    border-radius: 6px;
    cursor: pointer;
    border-left: 2px solid transparent;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    background: transparent;
    text-align: left;
    width: 100%;
  }
  .fp-nav-item.active {
    color: var(--tok-accent-primary);
    background: var(--tok-bg-surface);
    border-left-color: var(--tok-accent-primary);
    box-shadow: var(--tok-ring);
  }
  .fp-main {
    padding: 24px;
    overflow-y: auto;
  }
  .fp-section {
    margin-bottom: 28px;
  }
  .fp-section:last-child { margin-bottom: 0; }
  .fp-section h3 {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 10px;
    font-weight: 500;
    margin: 0 0 12px 0;
    color: var(--tok-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .fp-stats {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 12px;
  }
  .fp-stat {
    background: var(--tok-bg-surface);
    border-radius: 8px;
    padding: 14px 16px;
    box-shadow: var(--tok-ring);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .fp-stat.hero {
    padding: 18px 20px;
    background: var(--tok-bg-surface);
  }
  .fp-stat-k {
    font-size: 10px;
    color: var(--tok-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }
  .fp-stat-v {
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Consolas, monospace);
    font-size: 18px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--tok-text-primary);
    line-height: 1.1;
  }
  .fp-stat.hero .fp-stat-v {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: -0.02em;
  }
  .fp-stat-v.accent  { color: var(--tok-accent-primary); }
  .fp-stat-v.warn    { color: var(--tok-warning); }
  .fp-stat-v.danger  { color: var(--tok-danger); }
  .fp-stat-v.success { color: var(--tok-success); }
  .fp-hero-bar {
    height: 6px;
    width: 100%;
    background: var(--tok-bar-empty);
    border-radius: 3px;
    overflow: hidden;
    margin: 10px 0 8px;
  }
  .fp-hero-bar > div { height: 100%; border-radius: 3px; }
  .fp-stat-n {
    font-size: 11px;
    color: var(--tok-text-secondary);
    margin-top: 4px;
    min-height: 14px;
  }
  /* 7-day spend big chart */
  .spend7-wrap {
    position: relative;
    background: var(--tok-bg-surface);
    border-radius: 8px;
    padding: 14px;
  }
  .spend7-max {
    position: absolute;
    top: 10px;
    right: 14px;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: var(--tok-text-muted);
    letter-spacing: 0.02em;
  }
  .spend7-big {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    height: 140px;
    align-items: end;
    position: relative;
  }
  .spend7-avg {
    position: absolute;
    left: 0; right: 0;
    border-top: 1px dashed var(--tok-text-muted);
    opacity: 0.35;
    pointer-events: none;
  }
  .spend7-big .b {
    background: var(--tok-accent-primary);
    border-radius: 3px 3px 0 0;
    opacity: 0.4;
    min-height: 4px;
    position: relative;
    transition: opacity .15s ease;
  }
  .spend7-big .b:hover { opacity: 0.85; }
  .spend7-big .b.today { opacity: 1; }
  .spend7-big-labels {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    padding: 8px 0 0 0;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: var(--tok-text-muted);
    text-align: center;
  }
  /* token cells */
  .token-cells {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .tc {
    background: var(--tok-bg-surface);
    padding: 10px 12px;
    border-radius: 6px;
    box-shadow: var(--tok-ring);
  }
  .tc-k {
    font-size: 10px;
    color: var(--tok-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .tc-v {
    font-family: "SF Mono", Consolas, monospace;
    font-size: 18px;
    font-weight: 500;
    color: var(--tok-text-primary);
    margin-top: 4px;
  }
  /* quota rows / bars */
  .fp-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }
  .fp-row-label { color: var(--tok-text-secondary); font-size: 11px; }
  .fp-row-value {
    font-family: "SF Mono", monospace;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--tok-text-primary);
  }
  .fp-row-value.accent { color: var(--tok-accent-primary); }
  .fp-bar {
    height: 5px;
    width: 100%;
    background: var(--tok-bar-empty);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .fp-bar-fill { height: 100%; background: var(--tok-accent-primary); border-radius: 3px; }
  .fp-bar-fill.safe   { background: var(--tok-severity-safe); }
  .fp-bar-fill.warn   { background: var(--tok-warning); }
  .fp-bar-fill.danger { background: var(--tok-danger); }
  .fp-bar-fill.muted  { background: var(--tok-text-secondary); opacity: 0.55; }
  .fp-quota-note {
    margin-top: 4px;
    font-size: 10px;
    color: var(--tok-text-muted);
    margin-bottom: 10px;
  }
  .fp-divider { height: 1px; background: var(--tok-divider); margin: 8px 0; }
  /* cache card */
  .cache-card {
    padding: 16px;
    background: var(--tok-bg-surface);
    border-radius: 8px;
  }
  .cache-card h4 {
    margin: 0 0 10px 0;
    font-size: 10px;
    color: var(--tok-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 500;
  }
  .cc-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 6px 0;
  }
  .cc-k { font-size: 12px; color: var(--tok-text-secondary); }
  .cc-v {
    font-family: "SF Mono", monospace;
    font-size: 18px;
    font-weight: 500;
    color: var(--tok-text-primary);
  }
  /* two-col grid — 3:2 ratio so the left quota bars breathe; cache card fills right */
  .two-col { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; align-items: start; }
  /* three-col grid — equal-rank MCP · Skills · Agents */
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .three-col { grid-template-columns: 1fr; } }
  /* drill card */
  .drill-card {
    background: var(--tok-bg-surface);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: var(--tok-ring);
  }
  .drill-card h4 {
    margin: 0 0 10px 0;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-weight: 600;
    font-size: 11px;
    color: var(--tok-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  /* mt-rows */
  .mt-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px;
    padding: 2px 0;
    font-size: 11px;
    align-items: baseline;
  }
  .mt-row .n {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: var(--tok-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mt-row .s {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: var(--tok-text-muted);
  }
  /* model chip */
  .model-chip {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
  }
  .model-chip.opus   { background: var(--tok-accent-primary); }
  .model-chip.sonnet { background: var(--tok-accent-hover); }
  .model-chip.haiku  { background: var(--tok-text-secondary); opacity: 0.65; }
  /* model stack */
  .model-stack {
    display: flex;
    overflow: hidden;
    background: var(--tok-bar-empty);
    margin: 4px 0 8px;
  }
  .model-stack > div { height: 100%; }
  /* fp table */
  table.fp {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  table.fp th, table.fp td {
    text-align: left;
    padding: 9px 10px;
    border-bottom: 1px solid var(--tok-divider);
  }
  table.fp thead th {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--tok-text-muted);
    font-weight: 500;
  }
  table.fp td.num, table.fp th.num {
    font-family: "SF Mono", monospace;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  table.fp td .share-bar {
    display: inline-block;
    width: 80px; height: 6px;
    background: var(--tok-bar-empty);
    border-radius: 3px;
    overflow: hidden;
    vertical-align: middle;
  }
  table.fp td .share-bar > div {
    height: 100%;
    background: var(--tok-accent-primary);
    opacity: 0.7;
  }
  /* filters */
  .fp-filters {
    display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
  }
  .fp-filters select {
    padding: 6px 10px;
    font-size: 12px;
    font-family: inherit;
    background: var(--tok-bg-surface);
    color: var(--tok-text-primary);
    border: 0;
    border-radius: 5px;
    cursor: pointer;
  }
  /* timeline */
  .fp-timeline {
    display: flex; gap: 2px; align-items: flex-end; height: 64px; padding: 8px 0;
  }
  .fp-t-cell {
    flex: 1;
    background: var(--tok-accent-primary);
    border-radius: 2px 2px 0 0;
    opacity: 0.55;
    min-height: 2px;
  }
  .fp-t-cell.active { opacity: 1; }
  .fp-timeline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--tok-text-muted);
    margin-top: 4px;
  }
  /* active session card */
  .active-card {
    background: var(--tok-bg-surface);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: var(--tok-ring);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
  }
  .ac-k {
    font-size: 11px; color: var(--tok-text-muted);
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .ac-v {
    font-size: 13px; color: var(--tok-text-primary);
    font-family: "SF Mono", Consolas, monospace;
  }
  /* recap hero */
  .recap-hero {
    background: var(--tok-bg-surface);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: var(--tok-ring);
    margin-bottom: 10px;
  }
  .recap-hero:last-child { margin-bottom: 0; }
  .rh-title {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-weight: 500;
    font-size: 13px;
    color: var(--tok-text-primary);
    margin-bottom: 4px;
  }
  .rh-meta { font-size: 11px; color: var(--tok-text-muted); margin-bottom: 8px; }
  .rh-body { font-size: 12px; color: var(--tok-text-secondary); line-height: 1.5; }
  /* dist row */
  .dist-row {
    display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 12px;
  }
  .dist-k { flex: 0 0 150px; color: var(--tok-text-primary); }
  .dist-bar {
    flex: 1; height: 8px; background: var(--tok-bar-empty); border-radius: 4px; overflow: hidden;
  }
  .dist-fill { height: 100%; background: var(--tok-accent-primary); border-radius: 4px; }
  .dist-fill.muted { background: var(--tok-text-secondary); opacity: 0.55; }
  .dist-fill.warn { background: var(--tok-warning); }
  .dist-fill.danger { background: var(--tok-danger); }
  .dist-v { flex: 0 0 auto; color: var(--tok-text-muted); font-variant-numeric: tabular-nums; }
  /* insight line — rule-based insight or KPI without a distribution bar */
  .fp-insight-line {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 10px; padding: 6px 0; font-size: 12px;
    border-bottom: 1px solid var(--tok-divider);
  }
  .fp-insight-line:last-child { border-bottom: 0; }
  .fp-insight-line .k { color: var(--tok-text-primary); }
  .fp-insight-line .v {
    color: var(--tok-text-muted); font-variant-numeric: tabular-nums;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    font-size: 11px;
  }
  /* insights tab */
  .insights-tab ul { list-style: none; padding: 0; margin: 0; }
  .insights-tab li {
    padding: 8px 0;
    border-bottom: 1px solid var(--tok-divider);
    font-size: 12px;
    display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  }
  .insights-tab li:last-child { border-bottom: 0; }
  .insights-tab li .k {
    font-family: "SF Mono", monospace; font-size: 11px; color: var(--tok-text-primary);
  }
  .insights-tab li .v {
    font-family: "SF Mono", monospace; font-size: 11px; color: var(--tok-text-muted);
  }
  /* proj split bar */
  .proj-split {
    display: flex; height: 20px; border-radius: 10px; overflow: hidden;
    background: var(--tok-bar-empty); margin-bottom: 10px;
  }
  .proj-split > div { height: 100%; }
`;

interface FullPageAppProps {
  data: WebviewData;
  /** Optional drill-down trigger — App owns modal state; tabs forward clicks here. */
  onSelectSession?: (sessionId: string) => void;
}

/** Full-page dashboard: fp-header (brand + time-range) + fp-nav (5 tabs) + active tab body. */
export function FullPageApp({ data, onSelectSession }: FullPageAppProps) {
  const [tab, setTab] = useState<TabId>('quota');

  function renderTabContent() {
    switch (tab) {
      case 'quota':        return <TabQuota data={data} />;
      case 'sessions':     return <TabSessions data={data} onSelectSession={onSelectSession} />;
      case 'projects':     return <TabProjects data={data} />;
      case 'models-tools': return <TabModelsTools data={data} />;
      case 'insights':     return <TabInsights data={data} />;
    }
  }

  return (
    <TimeRangeProvider>
      <style>{FULLPAGE_CSS}</style>
      <div class="fp-shell">
        {/* Header */}
        <div class="fp-header">
          <h2 class="fp-title">{TAB_TITLE[tab]}</h2>
          <TimeRangeDropdown />
        </div>
        {/* Body: nav + main */}
        <div class="fp-body">
          <nav class="fp-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                class={`fp-nav-item${tab === t.id ? ' active' : ''}`}
                data-nav-item
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <main class="fp-main" data-tab={tab}>
            {renderTabContent()}
          </main>
        </div>
      </div>
    </TimeRangeProvider>
  );
}
