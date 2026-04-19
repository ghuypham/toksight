import type { RecentSession, SessionRecap } from '../../src/types';
import { claude, theme } from '../styles/theme';

interface Props {
  sessions: RecentSession[];
  recaps: Record<string, SessionRecap>;
}

const outcomeDot: Record<SessionRecap['outcome'], string> = {
  fully_achieved: claude.trendUp,
  partially_achieved: 'var(--tok-warning)',
  not_achieved: claude.trendDown,
};

/** Row-per-session list: outcome dot · project · cost · duration · relative time. */
export function SevenDaySessionHistory({ sessions, recaps }: Props) {
  if (sessions.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', padding: 8 }}>
        No sessions this week
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sessions.map(s => {
        const recap = recaps[s.id];
        return (
          <div
            key={s.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '10px 1fr 56px 56px 60px',
              gap: 8,
              padding: '4px 0',
              fontFamily: theme.sans,
              fontSize: 11,
              borderBottom: '1px solid var(--vscode-widget-border)',
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              marginTop: 4,
              background: recap ? outcomeDot[recap.outcome] : 'var(--vscode-disabledForeground)',
              display: 'inline-block',
            }} />
            <span style={{ color: 'var(--vscode-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.project}
            </span>
            <span style={{ fontFamily: theme.mono, color: 'var(--vscode-foreground)' }}>
              ${s.cost.toFixed(2)}
            </span>
            <span style={{ fontFamily: theme.mono, color: 'var(--vscode-descriptionForeground)' }}>
              {s.durationMinutes != null ? `${s.durationMinutes}m` : '—'}
            </span>
            <span style={{ color: 'var(--vscode-disabledForeground)', fontSize: 10 }}>{s.timeAgo}</span>
          </div>
        );
      })}
    </div>
  );
}
