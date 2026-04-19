import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { SlideSessionNow } from '../slide-session-now';

const activeBase = {
  sessionId: 's',
  projectPath: '/p/tok-sight',
  model: 'claude-opus-4-7',
  startTs: 'x',
  lastTs: 'y',
  durationMinutes: 72,
  contextTokens: 62_000,
  contextLimit: 200_000,
  contextPct: 31,
  toolCounts: {},
  filesEdited: [],
  toolErrors: 0,
  gitCommits: 0,
  linesAdded: 0,
  linesRemoved: 0,
  burnRatePerMin: 0.08,
  burnTrend: 'steady' as const,
};

const dataBase = {
  activeSessionDetail: activeBase,
  activeSessionSpent: 2.40,
  activeSessionSaved: 0.62,
  burnRate: { bars: [], peakCostUsd: 0, peakMinutesAgo: 0, avgPerMin: 0, nowPerMin: 0, trend: 'steady' as const },
  modelMixToday: [
    { model: 'claude-opus-4-7', cost: 2.80, percentage: 58, tokens: 0 },
    { model: 'claude-opus-4-6', cost: 0.87, percentage: 18, tokens: 0 },
    { model: 'claude-sonnet-4-6', cost: 0.82, percentage: 17, tokens: 0 },
    { model: 'claude-haiku-4-5', cost: 0.33, percentage: 7, tokens: 0 },
  ],
};

describe('SlideSessionNow v2 (mockup-aligned)', () => {
  it('renders empty state when no active session', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={{ activeSessionDetail: null } as any} />, root);
    expect(root.textContent).toMatch(/No active Claude session/i);
  });

  it('shows project name + model family + duration', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={dataBase as any} />, root);
    expect(root.textContent).toMatch(/tok-sight/);
    expect(root.textContent).toMatch(/1h 12m/);
  });

  it('does NOT show /compact hint below 70% context', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={dataBase as any} />, root);
    expect(root.textContent).toMatch(/31%/);
    expect(root.textContent).not.toMatch(/compact/i);
  });

  it('shows /compact hint at ≥70% context (threshold from mockup)', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={{ ...dataBase, activeSessionDetail: { ...activeBase, contextPct: 78 } } as any} />, root);
    expect(root.textContent).toMatch(/78%/);
    expect(root.textContent).toMatch(/compact/i);
  });

  it('Spent/Burn/Saved cells all render', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={dataBase as any} />, root);
    expect(root.textContent).toMatch(/Spent/);
    expect(root.textContent).toMatch(/Burn/);
    expect(root.textContent).toMatch(/Saved/);
    expect(root.textContent).toMatch(/\$2\.40/);
    expect(root.textContent).toMatch(/\$0\.62/);
    expect(root.textContent).toMatch(/\$0\.08\/m/);
  });

  it('renders top 3 model rows + tail for 4th', () => {
    const root = document.createElement('div');
    render(<SlideSessionNow data={dataBase as any} />, root);
    expect(root.textContent).toMatch(/claude-opus-4-7/);
    expect(root.textContent).toMatch(/claude-opus-4-6/);
    expect(root.textContent).toMatch(/claude-sonnet-4-6/);
    // 4th model appears as tail
    expect(root.textContent).toMatch(/\+1 other/);
  });
});
