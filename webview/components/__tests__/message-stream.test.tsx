import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { MessageStream } from '../message-stream';

describe('MessageStream', () => {
  it('renders timestamp model cost tool preview per entry', () => {
    const entries = [
      { ts: '2026-04-18T10:30:00Z', model: 'claude-sonnet-4-6', costUsd: 0.042, tool: 'Read', preview: 'Read /path/to/file.ts' },
    ];
    const root = document.createElement('div');
    render(<MessageStream entries={entries} />, root);
    expect(root.textContent).toMatch(/Read \/path\/to\/file\.ts/);
    expect(root.textContent).toMatch(/\$0\.04/);
  });

  it('shows empty state', () => {
    const root = document.createElement('div');
    render(<MessageStream entries={[]} />, root);
    expect(root.textContent).toMatch(/no messages yet/i);
  });

  it('renders multiple entries', () => {
    const entries = [
      { ts: '2026-04-18T10:00:00Z', model: 'claude-opus-4-7', costUsd: 0.10, preview: 'some output' },
      { ts: '2026-04-18T10:01:00Z', model: 'claude-sonnet-4-6', costUsd: 0.05, tool: 'Write', preview: 'wrote file' },
    ];
    const root = document.createElement('div');
    render(<MessageStream entries={entries} />, root);
    expect(root.textContent).toContain('some output');
    expect(root.textContent).toContain('wrote file');
  });
});
