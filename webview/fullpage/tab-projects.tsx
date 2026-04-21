import { useMemo } from 'preact/hooks';
import type { WebviewData } from '../../src/types';
import { buildModelColorMap } from '../utils/model-utils';
import { useTimeRange } from './time-range-context';

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function fmtTokK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** Distinct-hue palette for project-split segments — shares the model palette
 * so the whole dashboard uses one visually coherent color spectrum. */
const PROJECT_PALETTE = [
  '#D97757', '#5B9BD5', '#A78BFA', '#34D399',
  '#FBBF24', '#F472B6', '#60A5FA', '#FB923C', '#999999',
];

export function TabProjects({ data }: { data: Partial<WebviewData> }) {
  const projects   = data.projects               ?? [];
  const todaySplit = data.todayProjectBreakdown  ?? [];
  const sessions   = data.recentSessions         ?? [];
  const weekSpend  = data.spend?.week            ?? 0;

  const { range } = useTimeRange();
  const showToday = range === 'today';
  const periodLabel = range === 'today' ? 'Today' : range === '7d' ? '7d' : range === '30d' ? '30d' : 'All time';

  const todaySpend = useMemo(() => todaySplit.reduce((s, p) => s + p.cost, 0), [todaySplit]);

  const top       = projects[0] ?? null;
  const topShare  = top && weekSpend > 0 ? (top.cost / weekSpend) * 100 : 0;
  const lastActive = sessions[0] ?? null;

  /* Avg duration per project from recentSessions */
  const avgDurMap = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const s of sessions) {
      if (s.durationMinutes == null) continue;
      const e = map.get(s.project) ?? { sum: 0, count: 0 };
      e.sum += s.durationMinutes;
      e.count += 1;
      map.set(s.project, e);
    }
    return map;
  }, [sessions]);

  /* Model mix for top project */
  const topModelMix = useMemo(() => {
    if (!top) return [];
    const byModel = new Map<string, number>();
    for (const s of sessions) {
      if (s.project !== top.name) continue;
      byModel.set(s.model, (byModel.get(s.model) ?? 0) + s.cost);
    }
    const total = [...byModel.values()].reduce((a, b) => a + b, 0) || 1;
    return [...byModel.entries()]
      .map(([model, cost]) => ({ model, cost, pct: (cost / total) * 100 }))
      .sort((a, b) => b.cost - a.cost);
  }, [sessions, top]);

  /* Recent sessions for top project */
  const topSessions = useMemo(() =>
    sessions.filter(s => s.project === top?.name).slice(0, 4),
    [sessions, top],
  );

  /* Distinct-hue color per model ID for the top-project drill chips */
  const topModelColorMap = useMemo(
    () => buildModelColorMap(topModelMix.map(m => m.model)),
    [topModelMix],
  );

  const maxCost = Math.max(...projects.map(p => p.cost), 0.0001);

  return (
    <div data-tab="projects">
      {/* ── Stat boxes ── */}
      <div class="fp-section">
        <div class="fp-stats">
          <div class="fp-stat">
            <div class="fp-stat-k">Active projects · {periodLabel}</div>
            <div class="fp-stat-v">{showToday ? todaySplit.length : projects.length}</div>
            <div class="fp-stat-n">≥1 session · {periodLabel}</div>
          </div>
          {top && !showToday && (
            <div class="fp-stat">
              <div class="fp-stat-k">Top project</div>
              <div class="fp-stat-v" style={{ fontSize: '16px' }}>{top.name}</div>
              <div class="fp-stat-n">
                {topShare > 0 ? `${topShare.toFixed(0)}% of weekly spend` : '7d'}
              </div>
            </div>
          )}
          {showToday && todaySplit.length > 0 && (
            <div class="fp-stat">
              <div class="fp-stat-k">Today spend</div>
              <div class="fp-stat-v">${todaySpend.toFixed(2)}</div>
              <div class="fp-stat-n">across {todaySplit.length} project{todaySplit.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {lastActive && (
            <div class="fp-stat">
              <div class="fp-stat-k">Last active</div>
              <div class="fp-stat-v">{lastActive.isActive ? 'now' : lastActive.timeAgo}</div>
              <div class="fp-stat-n">{lastActive.project}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Today split ── */}
      {todaySplit.length > 0 && (
        <div class="fp-section">
          <h3>Today split</h3>
          <div class="proj-split">
            {todaySplit.map((p, i) => (
              <div
                key={p.name}
                style={{
                  width: `${p.pct}%`,
                  background: PROJECT_PALETTE[i % PROJECT_PALETTE.length],
                }}
                title={`${p.name} ${p.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          {todaySplit.map((p, i) => (
            <div key={p.name} class="mt-row">
              <span class="n">
                <span
                  class="model-chip"
                  style={{ background: PROJECT_PALETTE[i % PROJECT_PALETTE.length] }}
                />
                {p.name}
              </span>
              <span class="s">${p.cost.toFixed(2)} · {p.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Project ranking table ── */}
      {!showToday && projects.length > 0 && (
        <div class="fp-section">
          <h3>Project ranking · {periodLabel}</h3>
          <table class="fp">
            <thead>
              <tr>
                <th>Project</th>
                <th class="num">Sess</th>
                <th class="num">Tokens</th>
                <th class="num">Cost</th>
                <th class="num">Avg dur</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const e = avgDurMap.get(p.name);
                const avgDur = e ? e.sum / e.count : 0;
                const sharePct = Math.round((p.cost / maxCost) * 100);
                return (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td class="num">{p.sessions}</td>
                    <td class="num">{fmtTokK(p.tokens)}</td>
                    <td class="num">${p.cost.toFixed(2)}</td>
                    <td class="num">{avgDur > 0 ? fmtDur(avgDur) : '—'}</td>
                    <td>
                      <div class="share-bar">
                        <div style={{ width: `${sharePct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Top project drill ── */}
      {!showToday && top && (topModelMix.length > 0 || topSessions.length > 0) && (
        <div class="fp-section">
          <h3>Top project drill · {top.name}</h3>
          <div class="two-col">
            {topModelMix.length > 0 && (
              <div class="drill-card">
                <h4>Model mix</h4>
                {topModelMix.map(m => (
                  <div key={m.model} class="mt-row">
                    <span class="n">
                      <span
                        class="model-chip"
                        style={{ background: topModelColorMap[m.model] }}
                      />
                      {m.model}
                    </span>
                    <span class="s">${m.cost.toFixed(2)} · {m.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
            {topSessions.length > 0 && (
              <div class="drill-card">
                <h4>Recent sessions</h4>
                {topSessions.map(s => (
                  <div key={s.id} class="mt-row">
                    <span class="n">
                      {s.isActive ? 'now · ' : ''}{s.timeAgo}
                      {s.durationMinutes ? ` · ${fmtDur(s.durationMinutes)}` : ''}
                    </span>
                    <span class="s">${s.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
