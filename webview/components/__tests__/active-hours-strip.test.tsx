import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { ActiveHoursStrip } from '../active-hours-strip';

describe('ActiveHoursStrip', () => {
  it('renders 24 hour cells', () => {
    const root = document.createElement('div');
    render(<ActiveHoursStrip hourCounts={{}} />, root);
    // 24 cells each titled HH:00
    const cells = root.querySelectorAll('[title]');
    expect(cells.length).toBe(24);
  });

  it('shows hour label in title', () => {
    const root = document.createElement('div');
    render(<ActiveHoursStrip hourCounts={{ 9: 5, 14: 12 }} />, root);
    const titles = Array.from(root.querySelectorAll('[title]')).map(el => el.getAttribute('title'));
    expect(titles.some(t => t?.includes('09:00'))).toBe(true);
    expect(titles.some(t => t?.includes('5 msgs'))).toBe(true);
  });

  it('renders time axis labels', () => {
    const root = document.createElement('div');
    render(<ActiveHoursStrip hourCounts={{}} />, root);
    expect(root.textContent).toContain('00');
    expect(root.textContent).toContain('12');
    expect(root.textContent).toContain('23');
  });
});
