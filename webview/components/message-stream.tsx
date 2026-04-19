import type { MessageStreamEntry } from '../../src/types';
import { theme } from '../styles/theme';
import { getModelColor, getModelFamilyName } from '../utils/model-utils';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MessageStream({ entries }: { entries: MessageStreamEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 11, padding: 8 }}>
        No messages yet
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 80px 52px 1fr',
            gap: 8,
            alignItems: 'baseline',
            fontSize: 11,
            fontFamily: theme.mono,
            padding: '2px 6px',
            borderBottom: '1px solid var(--vscode-widget-border)',
          }}
        >
          <span style={{ color: 'var(--vscode-disabledForeground)' }}>{fmtTime(e.ts)}</span>
          <span style={{ color: getModelColor(e.model), fontSize: 10 }}>{getModelFamilyName(e.model)}</span>
          <span style={{ color: 'var(--vscode-foreground)' }}>${e.costUsd.toFixed(3)}</span>
          <span style={{ color: 'var(--vscode-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.tool ? <span style={{ color: theme.coral, marginRight: 4 }}>{e.tool}</span> : null}
            {e.preview}
          </span>
        </div>
      ))}
    </div>
  );
}
