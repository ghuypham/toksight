import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { theme } from '../styles/theme';

/**
 * GROUP: TODAY — today summary + recent project rows (mockup-aligned).
 * 3-cell grid (Sessions · Projects · Spend) + up to 3 recent session rows
 * showing project · cost · duration · recency.
 *
 * Hides entirely when no activity today (today.sessions === 0).
 */

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toFixed(1);
}

function fmtDuration(m: number | undefined): string {
  if (!m || m < 1) return '—';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function Cell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: theme.mono,
        fontSize: 16,
        fontWeight: 700,
        color: accent ? theme.coral : 'var(--vscode-foreground)',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        color: 'var(--vscode-descriptionForeground)',
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

export function GroupToday({ data }: { data: WebviewData }) {
  const t = data.today;
  if (t.sessions === 0) {
    return (
      <GroupHeader label="Today">
        <GroupEmpty tight>No sessions yet today.</GroupEmpty>
      </GroupHeader>
    );
  }

  // Recent rows — today's sessions sorted by most recent (already provided)
  const recent = (data.recentSessions ?? []).slice(0, 3);

  return (
    <GroupHeader label="Today">
      {/* 3-cell summary grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        padding: '6px 0',
      }}>
        <Cell value={String(t.sessions)} label="Sessions" />
        <Cell value={String(t.projects)} label="Projects" />
        <Cell value={fmtCost(t.cost)} label="Spend" accent />
      </div>

      {/* Recent session rows */}
      {recent.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {recent.map((s) => (
            <div key={s.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '4px 0',
              fontFamily: theme.sans,
              fontSize: 11,
              borderTop: '1px solid var(--vscode-widget-border)',
            }}>
              <span style={{
                color: 'var(--vscode-foreground)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                paddingRight: 8,
              }}>
                {s.project}
              </span>
              <span style={{
                fontFamily: theme.mono,
                fontSize: 10,
                color: 'var(--vscode-descriptionForeground)',
                flexShrink: 0,
              }}>
                {fmtCost(s.cost)} · {fmtDuration(s.durationMinutes)} · {s.timeAgo}
              </span>
            </div>
          ))}
        </div>
      )}
    </GroupHeader>
  );
}
