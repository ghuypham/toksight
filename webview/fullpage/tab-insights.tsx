import { useMemo } from 'preact/hooks';
import type { WebviewData, SessionRecap, SessionMetaUi } from '../../src/types';

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function labelOutcome(o: string): string {
  if (o === 'fully_achieved')    return 'Shipped';
  if (o === 'partially_achieved') return 'Paused';
  if (o === 'not_achieved')      return 'Abandoned';
  return o;
}

function helpBucket(h: string): '5' | '4' | '3' | 'low' {
  if (h === 'essential')       return '5';
  if (h === 'very_helpful')    return '4';
  if (h === 'somewhat_helpful') return '3';
  return 'low';
}

/** Horizontal distribution row with bar */
function DistRow({ k, v, pct, muted }: { k: string; v: string; pct: number; muted?: boolean }) {
  return (
    <div class="dist-row">
      <div class="dist-k">{k}</div>
      <div class="dist-bar">
        <div class={`dist-fill${muted ? ' muted' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div class="dist-v">{v}</div>
    </div>
  );
}

export function TabInsights({ data }: { data: Partial<WebviewData> }) {
  const insights     = data.insights        ?? [];
  const recaps       = data.sessionRecaps   ?? {};
  const metadata     = data.sessionMetadata ?? {};
  const sessions     = data.recentSessions  ?? [];
  const limits       = data.usageLimits     ?? null;
  const burn         = data.burnRate        ?? null;
  const cacheSaved   = data.cacheSavings    ?? 0;

  /* Recent recaps — join recentSessions + sessionRecaps, top 3 */
  const recapHeroes = useMemo(() => {
    return sessions
      .map(s => ({
        session: s,
        recap: recaps[s.id] as SessionRecap | undefined,
        meta:  metadata[s.id] as SessionMetaUi | undefined,
      }))
      .filter((x): x is typeof x & { recap: SessionRecap } => !!x.recap)
      .slice(0, 3);
  }, [sessions, recaps, metadata]);

  /* Outcome distribution */
  const outcomes = useMemo(() => {
    const t = { fully_achieved: 0, partially_achieved: 0, not_achieved: 0 };
    for (const r of Object.values(recaps)) {
      if (r.outcome in t) t[r.outcome as keyof typeof t]++;
    }
    return { t, total: t.fully_achieved + t.partially_achieved + t.not_achieved };
  }, [recaps]);

  /* Helpfulness distribution */
  const helpful = useMemo(() => {
    const t: Record<'5' | '4' | '3' | 'low', number> = { '5': 0, '4': 0, '3': 0, low: 0 };
    for (const r of Object.values(recaps)) t[helpBucket(r.claudeHelpfulness)]++;
    const total = t['5'] + t['4'] + t['3'] + t.low;
    return { t, total };
  }, [recaps]);

  /* Friction history */
  const friction = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const r of Object.values(recaps)) {
      for (const [k, v] of Object.entries(r.frictionCounts ?? {})) {
        agg[k] = (agg[k] ?? 0) + v;
      }
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [recaps]);

  /* Tool errors */
  const toolErrors = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const m of Object.values(metadata)) {
      for (const [k, v] of Object.entries(m.toolErrorCategories ?? {})) {
        agg[k] = (agg[k] ?? 0) + v;
      }
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [metadata]);

  /* Total user interruptions */
  const totalInterruptions = useMemo(() =>
    Object.values(metadata).reduce((s, m) => s + (m.userInterruptions ?? 0), 0),
    [metadata],
  );

  return (
    <div data-tab="insights">
      {/* ── Recent recaps ── */}
      {recapHeroes.length > 0 && (
        <div class="fp-section">
          <h3>Recent recaps</h3>
          {recapHeroes.map(({ session, recap, meta }) => {
            const metaLine = [
              session.project,
              session.model,
              session.durationMinutes ? fmtDur(session.durationMinutes) : null,
              labelOutcome(recap.outcome).toLowerCase(),
              `helpfulness ${recap.claudeHelpfulness.replaceAll('_', ' ')}`,
            ].filter(Boolean).join(' · ');
            return (
              <div key={session.id} class="recap-hero">
                <div class="rh-title">{recap.briefSummary.split('.')[0]}</div>
                <div class="rh-meta">
                  {metaLine}
                  {meta ? ` · +${meta.linesAdded}/-${meta.linesRemoved}` : ''}
                </div>
                <div class="rh-body">{recap.briefSummary}</div>
                {recap.frictionDetail && (
                  <div style={{ fontSize: '11px', color: 'var(--tok-warning)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--tok-divider)' }}>
                    Friction: {recap.frictionDetail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Live insights ── */}
      {(insights.length > 0 || limits || burn) && (
        <div class="fp-section">
          <h3>Live insights</h3>
          {/* Rule-based insights from engine */}
          {insights.map((ins, i) => (
            <div key={i} class="dist-row">
              <div class="dist-k">{ins.icon} {ins.text}</div>
              <div class="dist-bar" style={{ background: 'transparent' }} />
              <div class="dist-v">{ins.sub ?? ''}</div>
            </div>
          ))}
          {/* Quota warning dist-row if 5h available */}
          {limits?.fiveHour && (
            <DistRow
              k={`⚠ 5h window ${Math.round(limits.fiveHour.utilization)}%`}
              pct={limits.fiveHour.utilization}
              v={limits.fiveHour.resetsAt
                ? `resets ${fmtResetsShort(limits.fiveHour.resetsAt)}`
                : ''}
            />
          )}
          {/* Cache savings */}
          {cacheSaved > 0 && (
            <DistRow
              k="💾 Cache saved"
              pct={Math.min((cacheSaved / 10) * 100, 100)}
              v={`$${cacheSaved.toFixed(2)} / 7d`}
            />
          )}
          {/* Peak burn */}
          {burn && burn.peakCostUsd > 0 && (
            <DistRow
              k="🔥 Peak burn"
              pct={Math.min((burn.peakCostUsd / 0.5) * 100, 100)}
              v={`$${burn.peakCostUsd.toFixed(3)}/min${burn.peakMinutesAgo > 0 ? ` · ${burn.peakMinutesAgo}m ago` : ''}`}
            />
          )}
        </div>
      )}

      {/* ── Outcome distribution · 7d ── */}
      {outcomes.total > 0 && (
        <div class="fp-section">
          <h3>Outcome distribution · 7d</h3>
          <DistRow
            k="Shipped"
            pct={(outcomes.t.fully_achieved / outcomes.total) * 100}
            v={`${outcomes.t.fully_achieved} (${Math.round(outcomes.t.fully_achieved / outcomes.total * 100)}%)`}
          />
          <DistRow
            k="Paused"
            pct={(outcomes.t.partially_achieved / outcomes.total) * 100}
            v={`${outcomes.t.partially_achieved} (${Math.round(outcomes.t.partially_achieved / outcomes.total * 100)}%)`}
            muted
          />
          <DistRow
            k="Abandoned"
            pct={(outcomes.t.not_achieved / outcomes.total) * 100}
            v={`${outcomes.t.not_achieved} (${Math.round(outcomes.t.not_achieved / outcomes.total * 100)}%)`}
            muted
          />
        </div>
      )}

      {/* ── Helpfulness · 7d ── */}
      {helpful.total > 0 && (
        <div class="fp-section">
          <h3>Helpfulness · 7d</h3>
          <DistRow k="★★★★★ (5)" pct={(helpful.t['5'] / helpful.total) * 100} v={String(helpful.t['5'])} />
          <DistRow k="★★★★ (4)"  pct={(helpful.t['4'] / helpful.total) * 100} v={String(helpful.t['4'])} />
          <DistRow k="★★★ (3)"   pct={(helpful.t['3'] / helpful.total) * 100} v={String(helpful.t['3'])} muted />
          <DistRow k="★★ (2) or ★ (1)" pct={(helpful.t.low / helpful.total) * 100} v={String(helpful.t.low)} muted />
        </div>
      )}

      {/* ── Friction history · Tool errors ── */}
      {(friction.length > 0 || toolErrors.length > 0) && (
        <div class="fp-section">
          <div class="two-col">
            <div class="drill-card">
              <h4>Friction history · 7d</h4>
              {friction.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--tok-text-muted)', fontStyle: 'italic' }}>None recorded</div>
              ) : friction.map(([k, v]) => (
                <div key={k} class="mt-row">
                  <span class="n">{k}</span>
                  <span class="s">×{v}</span>
                </div>
              ))}
            </div>
            <div class="drill-card">
              <h4>Tool errors · 7d</h4>
              {toolErrors.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--tok-text-muted)', fontStyle: 'italic' }}>No errors</div>
              ) : toolErrors.map(([k, v]) => (
                <div key={k} class="mt-row">
                  <span class="n">{k}</span>
                  <span class="s">×{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Interruptions · 7d ── */}
      {totalInterruptions > 0 && (
        <div class="fp-section">
          <h3>Interruptions · 7d</h3>
          <DistRow k="User cancel" pct={100} v={String(totalInterruptions)} muted />
        </div>
      )}
    </div>
  );
}

/** Short "Xh Ym" remaining from ISO reset timestamp */
function fmtResetsShort(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return '';
  const totalMins = Math.floor(diff / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
