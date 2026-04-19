import { theme } from '../styles/theme';
import type { SparklinePoint } from '../../src/types';

interface DailyBarChartProps {
  points: SparklinePoint[];
}

/** 7-day vertical bar chart with today highlighted and hover tooltips */
export function DailyBarChart({ points }: DailyBarChartProps) {
  if (!points || points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.cost), 0.01);
  const todayIdx = points.length - 1;

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
        7-Day Spend
      </div>

      {/* Bar chart */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        height: '52px',
      }}>
        {points.map((p, i) => {
          const isToday = i === todayIdx;
          const heightPct = max > 0 ? (p.cost / max) * 100 : 0;
          const d = new Date(p.date);
          const day = d.getDate();
          const dateLabel = String(day);

          // Format tooltip: "Mon DD — $X.XX"
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const tooltip = `${months[d.getMonth()]} ${day} — $${p.cost.toFixed(2)}`;

          return (
            <div
              key={i}
              title={tooltip}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: '4px',
                cursor: 'default',
              }}
            >
              {/* Bar container */}
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div data-bar={i + 1} style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 4)}%`,
                  background: theme.coral,
                  opacity: isToday ? 1 : 0.4,
                  borderRadius: '2px 2px 0 0',
                  // GPU-accelerated vertical scale anchored at bottom
                  transformOrigin: 'bottom',
                  transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                }} />
              </div>
              {/* Date label */}
              <div style={{
                fontFamily: theme.mono,
                fontSize: '9px',
                color: isToday ? theme.coral : theme.disabledForeground,
                fontWeight: isToday ? 700 : 400,
                lineHeight: 1,
              }}>
                {dateLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
