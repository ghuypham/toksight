import { theme } from '../styles/theme';
import type { SparklinePoint } from '../../src/types';

interface SparklineChartProps {
  points: SparklinePoint[];
}

/** SVG polyline sparkline with coral gradient fill and x-axis date labels */
export function SparklineChart({ points }: SparklineChartProps) {
  if (!points || points.length < 2) return null;

  const W = 268;
  const H = 40;
  const padX = 2;
  const padY = 4;

  const max = Math.max(...points.map((p) => p.cost), 0.01);

  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * (W - padX * 2));
  const ys = points.map((p) => H - padY - (p.cost / max) * (H - padY * 2));

  const linePoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const fillPoints =
    linePoints +
    ` ${xs[xs.length - 1]},${H} ${xs[0]},${H}`;

  // Build date labels for x-axis
  const dateLabels = points.map((p, i) => {
    if (!p.date) return '';
    const d = new Date(p.date);
    const day = d.getDate();
    // First label gets "Mon DD" format, rest just day number
    if (i === 0) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[d.getMonth()]} ${day}`;
    }
    return String(day);
  });

  return (
    <div style={{ paddingTop: '4px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: '40px' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sparkGradSidebar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.coral} stopOpacity="0.15" />
            <stop offset="100%" stopColor={theme.coral} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon data-spark-fill points={fillPoints} fill="url(#sparkGradSidebar)" />
        <polyline
          data-spark
          points={linePoints}
          fill="none"
          stroke={theme.coral}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {/* X-axis dates below chart */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: theme.sans,
        fontSize: '9px',
        color: theme.disabledForeground,
        marginTop: '2px',
        padding: '0 2px',
      }}>
        {dateLabels.map((label, i) => (
          <span
            key={i}
            style={i === dateLabels.length - 1
              ? { color: theme.coral, fontWeight: 600 }
              : undefined}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
