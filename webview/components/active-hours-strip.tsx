import { theme } from '../styles/theme';

/** 24 cells, opacity proportional to message count per hour. */
export function ActiveHoursStrip({ hourCounts }: { hourCounts: Record<number, number> }) {
  const max = Math.max(1, ...Object.values(hourCounts));
  const cells = Array.from({ length: 24 }, (_, h) => hourCounts[h] ?? 0);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, height: 14 }}>
        {cells.map((n, h) => (
          <div
            key={h}
            title={`${h.toString().padStart(2, '0')}:00 · ${n} msgs`}
            style={{
              background: theme.coral,
              opacity: n === 0 ? 0.08 : 0.15 + 0.85 * (n / max),
              borderRadius: 1,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--vscode-disabledForeground)', marginTop: 2 }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  );
}
