import { describe, it, expect } from 'vitest';
import {
  progressBar,
  fmtTokens,
  fmtDuration,
  fmtResetsAt,
  colorMoney,
  colorScore,
  colorUtil,
  renderToday,
  renderWeek,
  renderModels,
  renderSessions,
  renderProjects,
  renderInsights,
} from '../src/cli-renderer';

// Strip ANSI escape codes for assertion
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

// ─── Progress bar ─────────────────────────────────────────────────────────────

describe('progressBar', () => {
  it('full bar at 100%', () => {
    expect(strip(progressBar(1, 8))).toBe('████████');
  });
  it('empty bar at 0%', () => {
    expect(strip(progressBar(0, 8))).toBe('░░░░░░░░');
  });
  it('half bar at 50%', () => {
    expect(strip(progressBar(0.5, 8))).toBe('████░░░░');
  });
  it('clamps above 1', () => {
    expect(strip(progressBar(2, 4))).toBe('████');
  });
});

// ─── fmtTokens ────────────────────────────────────────────────────────────────

describe('fmtTokens', () => {
  it('shows raw below 1k', () => {
    expect(fmtTokens(500)).toBe('500');
  });
  it('shows k suffix', () => {
    expect(fmtTokens(12_345)).toBe('12k');
  });
  it('shows M suffix', () => {
    expect(fmtTokens(2_500_000)).toBe('2.5M');
  });
});

// ─── fmtDuration ─────────────────────────────────────────────────────────────

describe('fmtDuration', () => {
  it('sub-minute', () => {
    expect(fmtDuration(0.4)).toBe('<1m');
  });
  it('minutes', () => {
    expect(fmtDuration(45)).toBe('45m');
  });
  it('hours and minutes', () => {
    expect(fmtDuration(90)).toBe('1h 30m');
  });
  it('whole hours', () => {
    expect(fmtDuration(120)).toBe('2h');
  });
});

// ─── fmtResetsAt ─────────────────────────────────────────────────────────────

describe('fmtResetsAt', () => {
  it('null → empty string', () => {
    expect(fmtResetsAt(null)).toBe('');
  });
  it('past → "now"', () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(fmtResetsAt(past)).toBe('now');
  });
  it('minutes ahead', () => {
    const soon = new Date(Date.now() + 25 * 60_000).toISOString();
    expect(fmtResetsAt(soon)).toBe('25m');
  });
  it('hours + minutes ahead', () => {
    const future = new Date(Date.now() + (2 * 60 + 18) * 60_000).toISOString();
    expect(fmtResetsAt(future)).toBe('2h 18m');
  });
  it('days + hours ahead', () => {
    const future = new Date(Date.now() + (3 * 1440 + 4 * 60) * 60_000).toISOString();
    expect(fmtResetsAt(future)).toBe('3d 4h');
  });
});

// ─── Color helpers ────────────────────────────────────────────────────────────

describe('colorMoney', () => {
  it('green below $1', () => {
    expect(colorMoney(0.5)).toContain('\x1b[32m');
  });
  it('yellow $1–$5', () => {
    expect(colorMoney(3)).toContain('\x1b[33m');
  });
  it('red ≥$5', () => {
    expect(colorMoney(10)).toContain('\x1b[31m');
  });
});

describe('colorScore', () => {
  it('green ≥70', () => {
    expect(colorScore(80)).toContain('\x1b[32m');
    expect(strip(colorScore(80))).toBe('80/100');
  });
  it('yellow 40–69', () => {
    expect(colorScore(55)).toContain('\x1b[33m');
  });
  it('red <40', () => {
    expect(colorScore(20)).toContain('\x1b[31m');
  });
});

describe('colorUtil', () => {
  it('green <60%', () => {
    expect(colorUtil(0.5)).toContain('\x1b[32m');
  });
  it('yellow 60–79%', () => {
    expect(colorUtil(0.7)).toContain('\x1b[33m');
  });
  it('red ≥80%', () => {
    expect(colorUtil(0.85)).toContain('\x1b[31m');
  });
});

// ─── renderToday ─────────────────────────────────────────────────────────────

describe('renderToday', () => {
  it('contains all key values', () => {
    const out = strip(renderToday({
      sessions: 4,
      spend: 1.23,
      tokens: 142_000,
      cacheRate: 0.72,
      isLive: true,
    }));
    expect(out).toContain('TODAY');
    expect(out).toContain('$1.23');
    expect(out).toContain('4 sessions');
    expect(out).toContain('142k tokens');
    expect(out).toContain('Cache 72%');
  });

  it('singular session label', () => {
    const out = strip(renderToday({ sessions: 1, spend: 0, tokens: 0, cacheRate: 0, isLive: false }));
    expect(out).toContain('1 session');
    expect(out).not.toContain('1 sessions');
  });
});

// ─── renderWeek ───────────────────────────────────────────────────────────────

describe('renderWeek', () => {
  it('shows spend and session count', () => {
    const out = strip(renderWeek({ spend: 8.45, sessions: 23, trendPct: 12 }));
    expect(out).toContain('$8.45');
    expect(out).toContain('23 sessions');
    expect(out).toContain('+12%');
  });

  it('shows flat when trendPct = 0', () => {
    const out = strip(renderWeek({ spend: 1, sessions: 5, trendPct: 0 }));
    expect(out).toContain('flat');
  });

  it('negative trend (savings)', () => {
    const out = strip(renderWeek({ spend: 1, sessions: 5, trendPct: -20 }));
    expect(out).toContain('-20%');
  });
});

// ─── renderModels ─────────────────────────────────────────────────────────────

describe('renderModels', () => {
  it('renders model names and percentages', () => {
    const out = strip(renderModels([
      { model: 'claude-sonnet-4-6', percentage: 85, cost: 1 },
      { model: 'claude-haiku-4-5',  percentage: 15, cost: 0.1 },
    ]));
    expect(out).toContain('Sonnet');
    expect(out).toContain('85%');
    expect(out).toContain('Haiku');
    expect(out).toContain('15%');
  });

  it('filters <synthetic>', () => {
    const out = strip(renderModels([
      { model: '<synthetic>', percentage: 100, cost: 1 },
    ]));
    expect(out).toBe('');
  });

  it('merges duplicate short names', () => {
    const out = strip(renderModels([
      { model: 'claude-opus-4-5',  percentage: 40, cost: 1 },
      { model: 'claude-opus-4-6',  percentage: 40, cost: 1 },
      { model: 'claude-sonnet-4-6', percentage: 20, cost: 0.5 },
    ]));
    // Should show Opus once with merged 80%
    const matches = out.match(/Opus/g) ?? [];
    expect(matches.length).toBe(1);
    expect(out).toContain('80%');
  });
});

// ─── renderSessions ───────────────────────────────────────────────────────────

describe('renderSessions', () => {
  const sessions = [
    { id: 'a', project: 'my-project', cost: 0.18, tokens: 1000, model: 'claude-sonnet-4-6', timeAgo: '2m', isActive: true, durationMinutes: 12 },
    { id: 'b', project: 'other',      cost: 0.09, tokens: 500,  model: 'claude-sonnet-4-6', timeAgo: '1h', isActive: false, durationMinutes: 8 },
  ];

  it('renders project and cost', () => {
    const out = strip(renderSessions(sessions));
    expect(out).toContain('my-project');
    expect(out).toContain('$0.18');
  });

  it('respects max limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...sessions[0], id: `s${i}`, project: `proj-${i}`,
    }));
    const out = strip(renderSessions(many, 3));
    expect((out.match(/proj-/g) ?? []).length).toBe(3);
  });

  it('empty returns empty string', () => {
    expect(renderSessions([])).toBe('');
  });
});

// ─── renderProjects ───────────────────────────────────────────────────────────

describe('renderProjects', () => {
  const projects = [
    { name: 'saas-app', sessions: 5, tokens: 100_000, cost: 1.5 },
    { name: 'cli-tool', sessions: 3, tokens: 50_000,  cost: 0.8 },
  ];

  it('shows project names and costs', () => {
    const out = strip(renderProjects(projects));
    expect(out).toContain('saas-app');
    expect(out).toContain('$1.50');
    expect(out).toContain('cli-tool');
  });

  it('empty returns empty string', () => {
    expect(renderProjects([])).toBe('');
  });
});

// ─── renderInsights ───────────────────────────────────────────────────────────

describe('renderInsights', () => {
  it('renders icon and text', () => {
    const out = strip(renderInsights([
      { icon: '💡', text: 'High cache rate', priority: 'informational' },
      { icon: '⚡', text: 'Above average', sub: 'Keep it up', priority: 'motivational' },
    ]));
    expect(out).toContain('💡');
    expect(out).toContain('High cache rate');
    expect(out).toContain('⚡');
    expect(out).toContain('Keep it up');
  });

  it('empty returns empty string', () => {
    expect(renderInsights([])).toBe('');
  });
});
