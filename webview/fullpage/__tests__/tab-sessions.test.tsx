import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { TabSessions } from '../tab-sessions';
import type { RecentSession } from '../../../src/types';

const sessions: RecentSession[] = [
  { id: 's1', project: 'tok-sight', cost: 2.4, tokens: 184000, model: 'Sonnet', timeAgo: '2h', isActive: false },
  { id: 's2', project: 'saas-api',  cost: 1.2, tokens: 80000,  model: 'Opus',   timeAgo: '5h', isActive: false },
];

describe('TabSessions', () => {
  it('renders sessions table with correct row count', () => {
    const root = document.createElement('div');
    render(<TabSessions data={{ recentSessions: sessions } as any} />, root);
    // tbody rows (exclude header row)
    const rows = root.querySelectorAll('table.fp tbody tr');
    expect(rows.length).toBe(2);
  });

  it('filters by project via select', () => {
    const root = document.createElement('div');
    act(() => { render(<TabSessions data={{ recentSessions: sessions } as any} />, root); });
    const selects = root.querySelectorAll('.fp-filters select');
    const projSelect = selects[0] as HTMLSelectElement;
    act(() => {
      projSelect.value = 'tok-sight';
      projSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const rows = root.querySelectorAll('table.fp tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('tok-sight');
  });

  it('renders data-tab attribute for shell routing', () => {
    const root = document.createElement('div');
    render(<TabSessions data={{ recentSessions: sessions } as any} />, root);
    expect(root.querySelector('[data-tab="sessions"]')).toBeTruthy();
  });

  it('shows no table when sessions is empty', () => {
    const root = document.createElement('div');
    render(<TabSessions data={{ recentSessions: [] } as any} />, root);
    // No fp table rendered
    expect(root.querySelector('table.fp')).toBeFalsy();
  });

  it('renders stat boxes', () => {
    const root = document.createElement('div');
    render(<TabSessions data={{ recentSessions: sessions } as any} />, root);
    const stats = root.querySelectorAll('.fp-stat');
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });
});
