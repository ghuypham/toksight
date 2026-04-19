import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { SessionMetaDetail } from '../session-meta-detail';

const meta = {
  gitCommits: 3,
  linesAdded: 50,
  linesRemoved: 2,
  filesModified: 5,
  toolErrors: 1,
  toolErrorCategories: { permission_denied: 1 },
  toolCounts: { Read: 10, Write: 4, Bash: 2 },
  userInterruptions: 0,
  usesMcp: false,
  usesTaskAgent: false,
};

describe('SessionMetaDetail', () => {
  it('renders lines added/removed', () => {
    const root = document.createElement('div');
    render(<SessionMetaDetail meta={meta} />, root);
    expect(root.textContent).toContain('+50');
    expect(root.textContent).toContain('−2');
  });

  it('renders commits row', () => {
    const root = document.createElement('div');
    render(<SessionMetaDetail meta={meta} />, root);
    expect(root.textContent).toContain('Commits');
    expect(root.textContent).toContain('3');
  });

  it('renders tool error breakdown', () => {
    const root = document.createElement('div');
    render(<SessionMetaDetail meta={meta} />, root);
    expect(root.textContent).toContain('permission_denied');
  });

  it('renders tool counts', () => {
    const root = document.createElement('div');
    render(<SessionMetaDetail meta={meta} />, root);
    expect(root.textContent).toContain('Read×10');
  });
});
