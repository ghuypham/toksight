import type { BurnRateData } from '../../src/types';
import { theme } from '../styles/theme';

/** 30-bar (or 60-bar) cost chart with peak marker + avg reference line. */
export function BurnChart({ data, height = 48 }: { data: BurnRateData; height?: number }) {
  if (!data.bars.length) return null;
  const max = Math.max(data.peakCostUsd, 0.001);
  const avgPct = data.avgPerMin > 0 ? (data.avgPerMin / max) * 100 : 0;

  function barColor(cost: number, isNow: boolean): string {
    if (isNow) return theme.coral;
    const ratio = cost / max;
    if (ratio > 0.75) return 'var(--tok-danger)';
    if (ratio > 0.4) return 'var(--tok-warning)';
    return 'var(--tok-success)';
  }

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      {/* Avg reference line */}
      {avgPct > 0 && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: `${avgPct}%`,
          height: 1,
          borderTop: '1px dashed var(--vscode-widget-border)',
          opacity: 0.6,
        }} title={`avg $${data.avgPerMin.toFixed(2)}/min`} />
      )}
      {/* Bars (reverse: oldest at left, newest at right) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
        {[...data.bars].reverse().map((b, i) => {
          const h = max > 0 ? (b.costUsd / max) * 100 : 0;
          const isNow = b.minuteOffset === 0;
          const isPeak = b.minuteOffset === data.peakMinutesAgo && b.costUsd > 0;
          return (
            <div key={i} title={`${b.minuteOffset}m ago: $${b.costUsd.toFixed(2)}`}
              style={{
                flex: 1,
                height: `${Math.max(h, 2)}%`,
                background: barColor(b.costUsd, isNow),
                outline: isNow ? `1px solid ${theme.coral}` : 'none',
                borderRadius: '1px 1px 0 0',
                transition: 'height 0.3s ease',
                position: 'relative',
              }}>
              {isPeak && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, color: theme.coral,
                }}>▼</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
