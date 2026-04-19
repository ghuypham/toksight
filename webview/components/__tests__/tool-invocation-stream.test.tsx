import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { ToolInvocationStream } from '../tool-invocation-stream';

describe('ToolInvocationStream', () => {
  it('renders rows with status icon tool and path', () => {
    const entries = [
      { ts: '2026-04-18T10:00:00Z', tool: 'Read', inputPath: '/src/app.ts', durationMs: 12, ok: true },
      { ts: '2026-04-18T10:01:00Z', tool: 'Write', inputPath: '/src/out.ts', durationMs: 8, ok: false },
    ];
    const root = document.createElement('div');
    render(<ToolInvocationStream entries={entries} />, root);
    expect(root.textContent).toContain('✓');
    expect(root.textContent).toContain('✗');
    expect(root.textContent).toContain('Read');
    expect(root.textContent).toContain('/src/app.ts');
    expect(root.textContent).toContain('12ms');
  });

  it('shows empty state when no entries', () => {
    const root = document.createElement('div');
    render(<ToolInvocationStream entries={[]} />, root);
    expect(root.textContent).toMatch(/no tool calls/i);
  });

  it('renders dash when inputPath absent', () => {
    const entries = [{ ts: '2026-04-18T10:00:00Z', tool: 'Bash', ok: true }];
    const root = document.createElement('div');
    render(<ToolInvocationStream entries={entries} />, root);
    expect(root.textContent).toContain('—');
  });
});
