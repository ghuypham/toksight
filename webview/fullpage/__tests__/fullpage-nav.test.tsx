import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { FullPageApp } from '../full-page-app';

const fixture = {
  spend: { today: 0, week: 0, prevWeek: 0, trendPct: 0, window5h: 0 },
  today: { sessions: 0, projects: 0, tokens: 0, tokensFmt: '0', cost: 0 },
  tokenBreakdown: { output: 0, input: 0, cache: 0, cacheCreation: 0, outputPct: 0, inputPct: 0, cachePct: 0, cacheCreationPct: 0 },
  usage: { outputRatio: 0, cacheRate: 0 },
  modelMix: [],
  sparkline: [],
  tools: [],
  mcp: [],
  skills: [],
  projects: [],
  recentSessions: [],
  activeSession: null,
  burnRate: { bars: [], peakCostUsd: 0, peakMinutesAgo: 0, avgPerMin: 0, nowPerMin: 0, trend: 'steady' },
  todaySessions: [],
  sessionRecaps: {},
  sessionMetadata: {},
  messageStream: [],
  insights: [],
  isLive: false,
  usageLimits: null,
  todayProjectBreakdown: [],
  latestRecap: null,
  forecast: null,
  cacheSavings: 0,
  sessionStats: { avgCostPerSession: 0, avgDurationMinutes: 0 },
  summary: { totalToolCalls: 0, mcpCount: 0, skillCount: 0, projectCount: 0 },
  username: 'test',
} as any;

describe('FullPageApp nav', () => {
  it('renders 5 nav items in order', () => {
    const root = document.createElement('div');
    render(<FullPageApp data={fixture} />, root);
    const items = Array.from(root.querySelectorAll('[data-nav-item]')).map(n => n.textContent);
    expect(items).toEqual(['Quota', 'Sessions', 'Projects', 'Models & Tools', 'Insights']);
  });

  it('defaults to QUOTA tab', () => {
    const root = document.createElement('div');
    render(<FullPageApp data={fixture} />, root);
    const active = root.querySelector('[data-nav-item][aria-current="page"]');
    expect(active?.textContent).toBe('Quota');
    expect(root.querySelector('[data-tab="quota"]')).toBeTruthy();
    expect(root.querySelector('[data-tab="sessions"]')).toBeFalsy();
  });

  it('switches tab on nav click', () => {
    const root = document.createElement('div');
    act(() => { render(<FullPageApp data={fixture} />, root); });
    const sessionsBtn = Array.from(root.querySelectorAll('[data-nav-item]'))
      .find(n => n.textContent === 'Sessions') as HTMLElement;
    act(() => { sessionsBtn.click(); });
    expect(root.querySelector('[data-tab="sessions"]')).toBeTruthy();
    expect(root.querySelector('[data-tab="quota"]')).toBeFalsy();
  });

  it('renders time-range dropdown', () => {
    const root = document.createElement('div');
    render(<FullPageApp data={fixture} />, root);
    expect(root.querySelector('[data-testid="time-range-dropdown"]')).toBeTruthy();
  });

  it('switches to all 5 tabs without throwing', () => {
    const root = document.createElement('div');
    act(() => { render(<FullPageApp data={fixture} />, root); });
    const tabIds = ['Sessions', 'Projects', 'Models & Tools', 'Insights', 'Quota'];
    for (const label of tabIds) {
      const btn = Array.from(root.querySelectorAll('[data-nav-item]'))
        .find(n => n.textContent === label) as HTMLElement;
      act(() => { btn.click(); });
    }
    // After cycling back to Quota the active item should be Quota
    const active = root.querySelector('[data-nav-item][aria-current="page"]');
    expect(active?.textContent).toBe('Quota');
  });
});
