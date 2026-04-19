import { theme } from '../styles/theme';
import type { ActiveSessionDetail } from '../../src/types';
import { getModelDisplayName } from '../utils/model-utils';
import { fmtCost } from '../utils/format';

interface ActiveSessionCardProps {
  session: ActiveSessionDetail | null;
}

/** Green-accented card showing the currently active Claude session */
export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  if (!session) return null;

  return (
    <div style={{
      background: theme.cardBg,
      boxShadow: theme.ring,
      borderRadius: theme.radius,
      borderLeft: `2px solid ${theme.activeGreen}`,
      padding: '12px 14px',
    }}>
      {/* Label */}
      <div style={{
        fontFamily: theme.sans,
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        color: theme.activeGreen,
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: theme.activeGreen,
          flexShrink: 0,
          animation: 'pulse 2s infinite',
          display: 'inline-block',
        }} />
        Active Session
      </div>

      {/* Project name + cost */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '2px',
      }}>
        <span style={{
          fontFamily: theme.sans,
          fontSize: '14px',
          fontWeight: 600,
          color: theme.foreground,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
          maxWidth: '160px',
        }}>
          {session.projectPath || session.sessionId}
        </span>
        <span style={{
          fontFamily: theme.mono,
          fontSize: '14px',
          fontWeight: 500,
          color: theme.coral,
        }}>
          {fmtCost(session.burnRatePerMin * 60)}/hr
        </span>
      </div>

      {/* Model + tokens */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: theme.sans,
          fontSize: '12px',
          color: theme.descriptionForeground,
        }}>
          {getModelDisplayName(session.model)}
        </span>
        <span style={{
          fontFamily: theme.mono,
          fontSize: '11px',
          color: theme.descriptionForeground,
        }}>
          {session.contextTokens.toLocaleString()} tok
        </span>
      </div>
    </div>
  );
}
