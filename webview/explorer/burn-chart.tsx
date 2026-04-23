import type { BurnRateData } from '../../src/types';
import { theme } from '../styles/theme';

/** 30-bar (or 60-bar) cost chart with peak marker + avg reference line. */
export function BurnChart({ data, height = 48 }: { data: BurnRateData; height?: number }) {
  if (!data.bars.length) return null;
  const max = Math.max(data.peakCostUsd, 0.001);
  const avgPct = data.avgPerMin > 0 ? (data.avgPerMin / max) * 100 : 0;

  // Burn chart visualizes TREND over time, not severity per minute. One accent
  // (coral) with an age-based opacity ramp keeps the eye on "now" while still
  // showing shape. Peak marker (▼) + avg line carry the at-a-glance signal.
  const barsCount = data.bars.length;
  function barOpacity(indexFromNow: number, isNow: boolean): number {
    if (isNow) return 1;
    // older bars fade down to 0.35 — still legible against sunken bg
    const ageRatio = barsCount > 1 ? indexFromNow / (barsCount - 1) : 0;
    return 0.9 - ageRatio * 0.55;
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
          // indexFromNow: 0 = now (rightmost), barsCount-1 = oldest (leftmost)
          const indexFromNow = barsCount - 1 - i;
          return (
            <div key={i} title={`${b.minuteOffset}m ago: $${b.costUsd.toFixed(2)}`}
              style={{
                flex: 1,
                height: `${Math.max(h, 2)}%`,
                background: theme.coral,
                opacity: barOpacity(indexFromNow, isNow),
                borderRadius: '1px 1px 0 0',
                transition: 'height 0.3s ease, opacity 0.3s ease',
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
