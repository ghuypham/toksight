import { theme } from '../styles/theme';
import type { RecentSession } from '../../src/types';

interface RecentSessionsProps {
  sessions: RecentSession[];
}

function fmtCost(n: number): string {
  if (n < 0.005) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}

/** RECENT label + session list with project name, timeAgo, cost, active dot */
export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div style={{ padding: '14px 0' }}>
      {/* Section label */}
      <div style={{
        fontFamily: theme.sans,
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        color: theme.disabledForeground,
        marginBottom: '10px',
      }}>
        Recent
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sessions.map((s, idx) => {
          const isLast = idx === sessions.length - 1;
          return (
            <div
              key={s.id}
              data-row={idx + 1}
              style={{
                padding: isLast ? '8px 0 0' : '8px 0',
                borderBottom: isLast ? 'none' : `1px solid ${theme.widgetBorder}`,
              }}
            >
              {/* Row 1: project name + timeAgo */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  {s.isActive && (
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: theme.activeGreen,
                      flexShrink: 0,
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }} />
                  )}
                  <span style={{
                    fontFamily: theme.sans,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: theme.foreground,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    maxWidth: '160px',
                  }}>
                    {s.project || s.id}
                  </span>
                </div>
                <span style={{
                  fontFamily: theme.sans,
                  fontSize: '11px',
                  color: theme.disabledForeground,
                  flexShrink: 0,
                  marginLeft: '8px',
                }}>
                  {s.timeAgo}
                </span>
              </div>

              {/* Row 2: project/active status + cost */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginTop: '1px',
              }}>
                <span style={{
                  fontFamily: theme.sans,
                  fontSize: '11px',
                  color: s.isActive ? theme.activeGreen : theme.disabledForeground,
                }}>
                  {s.isActive ? '\u25CF active' : s.project || s.id.slice(0, 8)}
                </span>
                <span style={{
                  fontFamily: theme.mono,
                  fontSize: '12px',
                  color: theme.descriptionForeground,
                }}>
                  {fmtCost(s.cost)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
