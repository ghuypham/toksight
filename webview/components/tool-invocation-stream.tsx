import { theme, claude } from '../styles/theme';

export interface ToolInvocation {
  ts: string;
  tool: string;
  inputPath?: string;
  durationMs?: number;
  ok: boolean;
}

/** Per-tool rows: status icon · tool name · input path · duration. Presentation only. */
export function ToolInvocationStream({ entries }: { entries: ToolInvocation[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', padding: 8 }}>
        No tool calls in window
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '14px 72px 1fr 56px',
            gap: 6,
            fontSize: 11,
            fontFamily: theme.mono,
            padding: '2px 6px',
          }}
        >
          <span style={{ color: e.ok ? claude.trendUp : claude.trendDown }}>{e.ok ? '✓' : '✗'}</span>
          <span style={{ color: theme.coral }}>{e.tool}</span>
          <span style={{ color: 'var(--vscode-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.inputPath ?? '—'}
          </span>
          <span style={{ color: 'var(--vscode-disabledForeground)', textAlign: 'right' }}>
            {e.durationMs != null ? `${e.durationMs}ms` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
