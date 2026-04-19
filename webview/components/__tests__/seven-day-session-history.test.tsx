import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { SevenDaySessionHistory } from '../seven-day-session-history';
import type { RecentSession, SessionRecap } from '../../../src/types';

const sessions: RecentSession[] = [
  { id: 's1', project: 'tok-sight', cost: 1.23, tokens: 50000, model: 'claude-sonnet-4-6', timeAgo: '2h ago', isActive: false, durationMinutes: 45 },
  { id: 's2', project: 'other-proj', cost: 0.55, tokens: 20000, model: 'claude-haiku-4-5', timeAgo: '1d ago', isActive: false, durationMinutes: 20 },
];

const recaps: Record<string, SessionRecap> = {
  s1: { briefSummary: 'Built X', outcome: 'fully_achieved', claudeHelpfulness: 'very_helpful', frictionCounts: {} },
};

describe('SevenDaySessionHistory', () => {
  it('renders a row per session with cost and project', () => {
    const root = document.createElement('div');
    render(<SevenDaySessionHistory sessions={sessions} recaps={recaps} />, root);
    expect(root.textContent).toContain('tok-sight');
    expect(root.textContent).toContain('$1.23');
    expect(root.textContent).toContain('other-proj');
  });

  it('renders duration in minutes', () => {
    const root = document.createElement('div');
    render(<SevenDaySessionHistory sessions={sessions} recaps={recaps} />, root);
    expect(root.textContent).toContain('45m');
  });

  it('shows empty state when no sessions', () => {
    const root = document.createElement('div');
    render(<SevenDaySessionHistory sessions={[]} recaps={{}} />, root);
    expect(root.textContent).toMatch(/no sessions this week/i);
  });
});
