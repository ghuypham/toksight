/**
 * Tests for sidebar group components — renders each Group directly
 * (not full <App/>) to avoid VS Code API mocking friction.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'preact';
import { GroupHeader } from '../group-header';
import { GroupNow } from '../group-now';
import { GroupToday } from '../group-today';
import { GroupQuota } from '../group-quota';
import { GroupModelsTools } from '../group-models-tools';
import { GroupInsights } from '../group-insights';
import type { WebviewData, UsageLimits } from '../../../src/types';

// Minimal valid WebviewData fixture
const fixture: WebviewData = {
  username: 'test',
  today: { sessions: 2, projects: 1, tokens: 5000, tokensFmt: '5K', cost: 0.12 },
  spend: { today: 0.12, week: 0.85, prevWeek: 0.70, trendPct: 21, window5h: 0.04 },
  usage: { outputRatio: 0.12, cacheRate: 0.72 },
  modelMix: [{ model: 'claude-sonnet-4-6', percentage: 100, cost: 0.85 }],
  sparkline: [
    { date: '2026-04-12', cost: 0.10 },
    { date: '2026-04-13', cost: 0.15 },
    { date: '2026-04-14', cost: 0.08 },
  ],
  tools: [{ name: 'Read', calls: 30, tokens: 8000, cost: 0.05 }],
  mcp: [],
  skills: [{ name: 'react-best-practices', calls: 5, tokens: 2000, cost: 0.02 }],
  agents: [],
  projects: [],
  recentSessions: [],
  activeSession: null,
  burnRate: { bars: [], peakCostUsd: 0, peakMinutesAgo: 0, avgPerMin: 0, nowPerMin: 0, trend: 'steady' },
  todaySessions: [
    { sessionId: 's1', startTs: '2026-04-18T09:00:00Z', endTs: '2026-04-18T09:30:00Z', durationMinutes: 30, costUsd: 0.12, dominantModel: 'claude-sonnet-4-6' },
  ],
  sessionRecaps: {},
  sessionMetadata: {},
  insights: [
    { icon: '💡', text: 'Cache rate 72% — good', priority: 'informational' },
    { icon: '⚡', text: 'High output ratio', priority: 'actionable' },
  ],
  isLive: false,
  usageLimits: null,
  usageLimitsStatus: 'no-auth',
  todayProjectBreakdown: [],
  latestRecap: null,
  forecast: null,
  cacheSavings: 0.03,
  tokenBreakdown: { output: 600, input: 3000, cache: 1400, cacheCreation: 0, outputPct: 12, inputPct: 60, cachePct: 28, cacheCreationPct: 0 },
  sessionStats: { avgCostPerSession: 0.06, avgDurationMinutes: 25 },
  summary: { totalToolCalls: 30, mcpCount: 0, skillCount: 1, agentCount: 0, projectCount: 1 },
};

const sampleLimits: UsageLimits = {
  fiveHour: { utilization: 42, resetsAt: '2099-01-01T00:00:00Z' },
  sevenDay: { utilization: 18, resetsAt: '2099-01-05T00:00:00Z' },
  sevenDaySonnet: { utilization: 9, resetsAt: '2099-01-05T00:00:00Z' },
};

let root: HTMLDivElement;

afterEach(() => {
  if (root) root.remove();
});

describe('GroupHeader', () => {
  it('renders uppercase label text', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupHeader label="NOW">content</GroupHeader>, root);
    const label = root.querySelector('section > div');
    expect(label?.textContent).toBe('NOW');
  });

  it('applies accent border-left when accent provided', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupHeader label="TEST" accent="#4CAF50">x</GroupHeader>, root);
    const label = root.querySelector('section > div') as HTMLElement;
    // jsdom normalises hex to rgb — check border-left is set (non-empty)
    expect(label.style.borderLeft).not.toBe('');
  });
});

describe('GroupNow', () => {
  it('renders NOW label', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupNow data={fixture} primaryUnit="cost" />, root);
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim());
    expect(labels).toContain('Now');
  });

  it('does not render active session card when activeSession is null', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupNow data={{ ...fixture, activeSession: null }} primaryUnit="cost" />, root);
    // ActiveSessionCard returns null when session is null; no "Active Session" label
    expect(root.textContent).not.toContain('Active Session');
  });
});

describe('GroupToday', () => {
  it('renders TODAY label', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupToday data={fixture} />, root);
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim());
    expect(labels).toContain('Today');
  });

  it('renders 3-cell summary (Sessions · Projects · Spend) when sessions exist', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupToday data={fixture} />, root);
    const text = root.textContent ?? '';
    expect(text).toContain('Sessions');
    expect(text).toContain('Projects');
    expect(text).toContain('Spend');
  });
});

describe('GroupQuota', () => {
  it('renders Quota empty state when usageLimits is null', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupQuota data={fixture} />, root);
    expect(root.textContent).toContain('Sign in to Claude');
  });

  it('renders Quota empty state when all windows undefined', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupQuota data={{ ...fixture, usageLimits: {} }} />, root);
    expect(root.textContent).toContain('Sign in to Claude');
  });

  it('renders QUOTA label when at least one window present', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupQuota data={{ ...fixture, usageLimits: sampleLimits }} />, root);
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim());
    expect(labels).toContain('Quota');
  });

  it('renders percent for each provided window', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupQuota data={{ ...fixture, usageLimits: sampleLimits }} />, root);
    expect(root.textContent).toContain('42%');
    expect(root.textContent).toContain('18%');
    expect(root.textContent).toContain('9%');
    expect(root.textContent).toContain('Weekly · Sonnet');
  });
});

describe('GroupModelsTools', () => {
  it('renders MODELS & TOOLS label', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupModelsTools data={fixture} />, root);
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim());
    expect(labels).toContain('Models & Tools');
  });
});

describe('GroupInsights', () => {
  it('renders INSIGHTS label when insights exist', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupInsights data={fixture} />, root);
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim());
    expect(labels).toContain('Insights');
  });

  it('renders Insights empty state when insights array is empty', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupInsights data={{ ...fixture, insights: [] }} />, root);
    expect(root.textContent).toContain('Insights appear after a few sessions');
  });
});

describe('Sidebar group order (composed)', () => {
  it('NOW → TODAY → QUOTA → MODELS&TOOLS → INSIGHTS label order', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    // Render all 5 groups in order (mimics sidebar branch)
    render(
      <>
        <GroupNow data={fixture} primaryUnit="cost" />
        <GroupToday data={fixture} />
        <GroupQuota data={{ ...fixture, usageLimits: sampleLimits }} />
        <GroupModelsTools data={fixture} />
        <GroupInsights data={fixture} />
      </>,
      root,
    );
    const labels = Array.from(root.querySelectorAll('section > div'))
      .map(n => n.textContent?.trim())
      .filter(s => /^(now|today|quota|models & tools|insights)$/i.test(s ?? ''));
    expect(labels).toEqual(['Now', 'Today', 'Quota', 'Models & Tools', 'Insights']);
  });
});
