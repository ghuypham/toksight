import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { SessionRecapCard } from '../session-recap-card';

describe('SessionRecapCard', () => {
  it('renders summary and outcome badge', () => {
    const root = document.createElement('div');
    render(<SessionRecapCard recap={{
      briefSummary: 'User asked X; Claude did Y.',
      outcome: 'fully_achieved',
      claudeHelpfulness: 'very_helpful',
      frictionCounts: { buggy_code: 2 },
    }} />, root);
    expect(root.textContent).toMatch(/fully achieved/i);
    expect(root.textContent).toMatch(/buggy_code/);
    expect(root.textContent).toContain('User asked X; Claude did Y.');
  });

  it('renders partially_achieved badge', () => {
    const root = document.createElement('div');
    render(<SessionRecapCard recap={{
      briefSummary: 'Partial.',
      outcome: 'partially_achieved',
      claudeHelpfulness: 'somewhat_helpful',
      frictionCounts: {},
    }} />, root);
    expect(root.textContent).toMatch(/partially achieved/i);
  });

  it('renders frictionDetail when present', () => {
    const root = document.createElement('div');
    render(<SessionRecapCard recap={{
      briefSummary: 'Something.',
      outcome: 'not_achieved',
      claudeHelpfulness: 'not_helpful',
      frictionCounts: {},
      frictionDetail: 'Kept hallucinating paths.',
    }} />, root);
    expect(root.textContent).toContain('Kept hallucinating paths.');
  });
});
