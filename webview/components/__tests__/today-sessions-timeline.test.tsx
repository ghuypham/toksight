import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { TodaySessionsTimeline } from '../today-sessions-timeline';

const sessions = [
  { sessionId: 'a', startTs: '2026-04-18T09:00:00Z', endTs: '2026-04-18T09:30:00Z', durationMinutes: 30, costUsd: 0.42, dominantModel: 'claude-sonnet-4-6' },
  { sessionId: 'b', startTs: '2026-04-18T11:00:00Z', endTs: '2026-04-18T12:15:00Z', durationMinutes: 75, costUsd: 1.80, dominantModel: 'claude-opus-4-7' },
];

describe('TodaySessionsTimeline', () => {
  it('renders one bar per session with title attribute', () => {
    const root = document.createElement('div');
    render(<TodaySessionsTimeline sessions={sessions} />, root);
    const bars = root.querySelectorAll('[data-session-bar]');
    expect(bars.length).toBe(2);
    expect(bars[0].getAttribute('title')).toContain('$0.42');
    expect(bars[1].getAttribute('title')).toContain('75m');
  });

  it('renders empty state when no sessions', () => {
    const root = document.createElement('div');
    render(<TodaySessionsTimeline sessions={[]} />, root);
    expect(root.textContent).toMatch(/no sessions today/i);
  });

  it('fires onSelect when bar clicked', () => {
    let picked: string | null = null;
    const root = document.createElement('div');
    render(<TodaySessionsTimeline sessions={sessions} onSelect={(id) => { picked = id; }} />, root);
    (root.querySelector('[data-session-bar]') as HTMLElement).click();
    expect(picked).toBe('a');
  });
});
