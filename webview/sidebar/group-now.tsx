import type { WebviewData, ActiveSessionDetail, BurnRateData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { getModelDisplayName } from '../utils/model-utils';

/** Format path as short project name: last non-empty segment. */
function fmtProject(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Format duration in minutes as "Xh Ym" or "Nm". */
function fmtDuration(m: number): string {
  if (m < 1) return '< 1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toFixed(1);
}

/** Session card: project · model, meta row + cost. */
function SessionCard({ session }: { session: ActiveSessionDetail }) {
  const project = fmtProject(session.projectPath);
  const model = getModelDisplayName(session.model);
  const totalTools = Object.values(session.toolCounts).reduce((a, b) => a + b, 0);
  const linesInfo = (session.linesAdded > 0 || session.linesRemoved > 0)
    ? ` · +${session.linesAdded}/-${session.linesRemoved}`
    : '';
  const durationStr = fmtDuration(session.durationMinutes);

  return (
    <div style={{
      padding: '8px 10px',
      background: 'var(--tok-bg-sunken)',
      borderRadius: 6,
      marginBottom: 6,
    }}>
      {/* proj · model */}
      <div style={{
        fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--tok-text-primary)',
        marginBottom: 3,
      }}>
        {project} · {model}
      </div>
      {/* meta + cost */}
      <div style={{
        fontSize: 10,
        color: 'var(--tok-text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{durationStr} · {totalTools} tools{linesInfo}</span>
        <span>{fmtCost(session.burnRatePerMin * session.durationMinutes)}</span>
      </div>
    </div>
  );
}

/** 15-bar vertical burn chart with peak highlight + caption. */
function SidebarBurnChart({ data }: { data: BurnRateData }) {
  // Take last 15 bars (or pad with zeros if fewer)
  const rawBars = [...data.bars].reverse(); // oldest-first
  const bars = rawBars.slice(-15);
  if (bars.length === 0) return null;

  const max = Math.max(data.peakCostUsd, 0.001);

  const trendLabel = data.trend === 'rising' ? 'rising'
    : data.trend === 'cooling' ? 'cooling'
    : 'steady';

  return (
    <div>
      {/* 15 vertical bars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${bars.length}, 1fr)`,
        gap: 2,
        height: 28,
        alignItems: 'flex-end',
        marginTop: 6,
      }}>
        {bars.map((b, i) => {
          const heightPct = Math.max((b.costUsd / max) * 100, b.costUsd > 0 ? 4 : 2);
          const isPeak = b.minuteOffset === data.peakMinutesAgo && b.costUsd > 0;
          return (
            <div
              key={i}
              title={`${b.minuteOffset}m ago: $${b.costUsd.toFixed(3)}/min`}
              style={{
                height: `${heightPct}%`,
                background: isPeak ? 'var(--tok-warning)' : 'var(--tok-accent-primary)',
                opacity: isPeak ? 1 : 0.45,
                borderRadius: '1px 1px 0 0',
                minHeight: 2,
              }}
            />
          );
        })}
      </div>
      {/* Caption */}
      <div style={{
        fontSize: 10,
        color: 'var(--tok-text-muted)',
        marginTop: 4,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>burn {bars.length}m</span>
        <span>
          peak {fmtCost(data.peakCostUsd)}/min · now {fmtCost(data.nowPerMin)}/min · {trendLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * GROUP: NOW — active session card + 15-bar burn chart + caption.
 * Mockup: session-card (project · model, meta + cost) + burn-chart + burn-caption.
 * SpendSection removed — that belongs in the explorer widget, not here.
 */
export function GroupNow({ data }: { data: WebviewData; primaryUnit?: 'cost' | 'tokens' }) {
  const hasActive = !!data.activeSession;
  const hasBurn = data.burnRate.bars.length > 0;

  if (!hasActive && !hasBurn) {
    return (
      <GroupHeader label="Now">
        <GroupEmpty>
          No active session.
          <br />
          Start Claude Code to begin tracking.
        </GroupEmpty>
      </GroupHeader>
    );
  }

  return (
    <GroupHeader label="Now">
      {hasActive && <SessionCard session={data.activeSession!} />}
      {hasBurn && <SidebarBurnChart data={data.burnRate} />}
    </GroupHeader>
  );
}
