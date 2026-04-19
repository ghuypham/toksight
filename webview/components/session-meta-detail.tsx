import type { SessionMetaUi } from '../../src/types';
import { claude, theme } from '../styles/theme';

/** Key/value table: commits · lines · files · tool errors · interruptions + breakdown rows. */
export function SessionMetaDetail({ meta }: { meta: SessionMetaUi }) {
  const rows: Array<[string, string, string?]> = [
    ['Commits',       String(meta.gitCommits),    meta.gitCommits > 0 ? claude.trendUp : undefined],
    ['Lines +/−',     `+${meta.linesAdded} −${meta.linesRemoved}`],
    ['Files',         String(meta.filesModified)],
    ['Tool errors',   String(meta.toolErrors),    meta.toolErrors > 0 ? claude.trendDown : undefined],
    ['Interruptions', String(meta.userInterruptions)],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: theme.sans, fontSize: 11 }}>
      {rows.map(([k, v, color]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: 'var(--vscode-descriptionForeground)' }}>{k}</span>
          <span style={{ fontFamily: theme.mono, color: color ?? 'var(--vscode-foreground)', fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      {Object.keys(meta.toolErrorCategories).length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          Error breakdown: {Object.entries(meta.toolErrorCategories).map(([k, v]) => `${k}:${v}`).join(' · ')}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
        {Object.entries(meta.toolCounts).slice(0, 5).map(([k, v]) => `${k}×${v}`).join(' · ')}
      </div>
    </div>
  );
}
