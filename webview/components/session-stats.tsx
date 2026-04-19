import { theme } from '../styles/theme';
import type { SessionStats } from '../../src/types';
import { useAnimatedValue, formatAnimatedCost } from '../hooks/use-animated-value';

interface SessionStatsProps {
  stats: SessionStats;
}

/** Session stats — values animate from old to new on data change */
export function SessionStatsView({ stats }: SessionStatsProps) {
  const animCost = useAnimatedValue(stats.avgCostPerSession);
  const animDur = useAnimatedValue(stats.avgDurationMinutes);

  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{
        fontFamily: theme.sans, fontSize: '10px', fontWeight: 500,
        textTransform: 'uppercase' as const, letterSpacing: '0.5px',
        color: theme.disabledForeground, marginBottom: '10px',
      }}>
        Session Stats
      </div>
      <div style={{
        background: theme.cardBg, borderRadius: theme.radius, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '9px 12px',
        }}>
          <span style={{ fontFamily: theme.sans, fontSize: '11px', color: theme.descriptionForeground }}>
            Avg cost / session
          </span>
          <span style={{ fontFamily: theme.mono, fontSize: '12px', fontWeight: 600, color: theme.foreground }}>
            {formatAnimatedCost(animCost)}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '9px 12px', borderTop: `1px solid ${theme.widgetBorder}`,
        }}>
          <span style={{ fontFamily: theme.sans, fontSize: '11px', color: theme.descriptionForeground }}>
            Avg duration
          </span>
          <span style={{ fontFamily: theme.mono, fontSize: '12px', fontWeight: 600, color: theme.foreground }}>
            {Math.round(animDur)}m
          </span>
        </div>
      </div>
    </div>
  );
}
