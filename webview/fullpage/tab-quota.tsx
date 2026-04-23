import type { WebviewData, SparklinePoint } from '../../src/types';
import { quotaBarClass, quotaSeverity } from '../utils/quota-severity';

/** Format minutes as "~Xh Ym" or "~Ym" */
function fmtEta(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '—';
  if (m < 60) return `~${Math.round(m)}m`;
  return `~${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
}

/** Format ISO reset time as "resets in Xd Yh" */
function fmtResetsAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return '';
  const totalMins = Math.floor(diff / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs  = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `resets in ${days}d ${hrs}h`;
  if (hrs > 0)  return `resets in ${hrs}h ${mins}m`;
  return `resets in ${mins}m`;
}

/** Day-of-week short label */
function dayLabel(dateStr: string, isLast: boolean): string {
  if (isLast) return 'Today';
  const d = new Date(dateStr);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] ?? dateStr.slice(5);
}

/** Bar fill class — delegates to shared helper (danger ≥80, warn ≥60). */
const barFillClass = quotaBarClass;

export function TabQuota({ data }: { data: Partial<WebviewData> }) {
  const limits    = data.usageLimits ?? null;
  const forecast  = data.forecast   ?? null;
  const burn      = data.burnRate   ?? null;
  const spend     = data.spend;
  const usage     = data.usage;
  const cacheSav  = data.cacheSavings ?? 0;
  const spark     = (data.sparkline ?? []).slice(-7) as SparklinePoint[];
  const breakdown = data.tokenBreakdown;

  const weekPct     = limits?.sevenDay?.utilization     ?? null;
  const fiveHrPct   = limits?.fiveHour?.utilization     ?? null;
  const sevenDayPct = limits?.sevenDay?.utilization     ?? null;
  const sonnetPct   = limits?.sevenDaySonnet?.utilization ?? null;

  const todaySpend = spend?.today ?? 0;
  const weekSpend  = spend?.week  ?? 0;
  const cacheRate  = usage?.cacheRate ?? 0;
  const outputRatio = usage?.outputRatio ?? 0;
  const costPerOut = breakdown && breakdown.output > 0 && weekSpend > 0
    ? weekSpend / breakdown.output : 0;

  const maxBar = spark.reduce((m, p) => Math.max(m, p.cost), 0.0001);

  return (
    <div data-tab="quota">
      {/* ── Stat boxes — only render when data present ── */}
      {(weekPct != null || todaySpend > 0 || cacheSav > 0 || weekSpend > 0) && (
        <div class="fp-section">
          <div class="fp-stats">
            {weekPct != null && (
              <div class="fp-stat hero">
                <div class="fp-stat-k">Week · all models</div>
                <div class={`fp-stat-v ${quotaSeverity(weekPct) === 'danger' ? 'danger' : quotaSeverity(weekPct) === 'warn' ? 'warn' : weekPct > 0 ? 'accent' : ''}`}>
                  {Math.round(weekPct)}%
                </div>
                <div class="fp-hero-bar">
                  <div class={barFillClass(weekPct)} style={{ width: `${Math.min(weekPct, 100)}%` }} />
                </div>
                <div class="fp-stat-n">
                  {limits?.sevenDay?.resetsAt ? fmtResetsAt(limits.sevenDay.resetsAt) : 'Weekly quota'}
                </div>
              </div>
            )}
            {todaySpend > 0 && (
              <div class="fp-stat">
                <div class="fp-stat-k">Today spend</div>
                <div class="fp-stat-v">${todaySpend.toFixed(2)}</div>
                <div class="fp-stat-n">
                  {spend?.trendPct != null
                    ? `${spend.trendPct >= 0 ? '+' : ''}${Math.round(spend.trendPct)}% vs yesterday`
                    : ' '}
                </div>
              </div>
            )}
            {cacheSav > 0 && (
              <div class="fp-stat">
                <div class="fp-stat-k">Cache saved · 7d</div>
                <div class="fp-stat-v success">${cacheSav.toFixed(2)}</div>
                <div class="fp-stat-n">
                  {cacheRate > 0 ? `${Math.round(cacheRate * 100)}% hit rate` : ' '}
                </div>
              </div>
            )}
            {weekSpend > 0 && (
              <div class="fp-stat">
                <div class="fp-stat-k">Total spend · 7d</div>
                <div class="fp-stat-v">${weekSpend.toFixed(2)}</div>
                <div class="fp-stat-n">{' '}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Current quota ── */}
      <div class="fp-section">
        <h3>Current quota</h3>
        <div class="two-col">
          <div>
            {fiveHrPct != null ? (
              <>
                <div class="fp-row">
                  <span class="fp-row-label">5h window</span>
                  <span class="fp-row-value accent">{Math.round(fiveHrPct)}%</span>
                </div>
                <div class="fp-bar">
                  <div class={barFillClass(fiveHrPct)} style={{ width: `${fiveHrPct}%` }} />
                </div>
                <div class="fp-quota-note">{fmtResetsAt(limits?.fiveHour?.resetsAt)}</div>
              </>
            ) : (
              <div class="fp-quota-note" style={{ marginBottom: '10px' }}>5h window — no OAuth data</div>
            )}
            <div class="fp-divider" />
            {sevenDayPct != null ? (
              <>
                <div class="fp-row">
                  <span class="fp-row-label">Weekly · all models</span>
                  <span class="fp-row-value">{Math.round(sevenDayPct)}%</span>
                </div>
                <div class="fp-bar">
                  <div class={barFillClass(sevenDayPct)} style={{ width: `${sevenDayPct}%` }} />
                </div>
                <div class="fp-quota-note">{fmtResetsAt(limits?.sevenDay?.resetsAt)}</div>
              </>
            ) : (
              <div class="fp-quota-note">Weekly quota — no OAuth data</div>
            )}
            {sonnetPct != null && (
              <>
                <div class="fp-row" style={{ marginTop: '10px' }}>
                  <span class="fp-row-label">Weekly · Sonnet only</span>
                  <span class="fp-row-value">{Math.round(sonnetPct)}%</span>
                </div>
                <div class="fp-bar">
                  <div class={barFillClass(sonnetPct)} style={{ width: `${sonnetPct}%` }} />
                </div>
              </>
            )}
          </div>
          <div>
            <div class="cache-card">
              <h4>Forecast &amp; burn</h4>
              {forecast && forecast.etaMinutes > 0 ? (
                <>
                  <div class="cc-row">
                    <span class="cc-k">Hit 5h cap in</span>
                    <span class="cc-v">{fmtEta(forecast.etaMinutes)}</span>
                  </div>
                  {forecast.burnPerMin > 0 && (
                    <div class="cc-row">
                      <span class="cc-k">Current burn</span>
                      <span class="cc-v">${forecast.burnPerMin.toFixed(3)}/min</span>
                    </div>
                  )}
                </>
              ) : (
                <div class="cc-row">
                  <span class="cc-k">No active session</span>
                  <span class="cc-v">—</span>
                </div>
              )}
              {burn && burn.peakCostUsd > 0 && (
                <div class="cc-row">
                  <span class="cc-k">Peak today</span>
                  <span class="cc-v">
                    ${burn.peakCostUsd.toFixed(3)}/min
                    {burn.peakMinutesAgo > 0 ? ` · ${burn.peakMinutesAgo}m ago` : ''}
                  </span>
                </div>
              )}
              {limits?.sevenDay?.resetsAt && (
                <div class="cc-row">
                  <span class="cc-k">ETA weekly cap</span>
                  <span class="cc-v">{fmtResetsAt(limits.sevenDay.resetsAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 7-day spend chart ── */}
      {spark.length > 0 && (() => {
        const avg = spark.reduce((s, p) => s + p.cost, 0) / spark.length;
        const avgPct = maxBar > 0 ? (avg / maxBar) * 100 : 0;
        return (
          <div class="fp-section">
            <h3>7-day spend</h3>
            <div class="spend7-wrap">
              <span class="spend7-max">max ${maxBar.toFixed(2)}</span>
              <div class="spend7-big">
                {avgPct > 0 && (
                  <div class="spend7-avg" style={{ bottom: `${avgPct}%` }} title={`avg $${avg.toFixed(2)}`} />
                )}
                {spark.map((pt, i) => {
                  const isLast = i === spark.length - 1;
                  const h = Math.max(4, Math.round((pt.cost / maxBar) * 100));
                  return (
                    <div
                      key={pt.date}
                      class={`b${isLast ? ' today' : ''}`}
                      style={{ height: `${h}%` }}
                      title={`${dayLabel(pt.date, isLast)} · $${pt.cost.toFixed(2)}`}
                    />
                  );
                })}
              </div>
              <div class="spend7-big-labels">
                {spark.map((pt, i) => (
                  <span key={pt.date}>{dayLabel(pt.date, i === spark.length - 1)}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Token economics — only when at least one metric is meaningful ── */}
      {(costPerOut > 0 || outputRatio > 0 || cacheRate > 0 || weekSpend > 0) && (
        <div class="fp-section">
          <h3>Token economics</h3>
          <div class="token-cells">
            {costPerOut > 0 && (
              <div class="tc">
                <div class="tc-k">Cost / 1M output tokens</div>
                <div class="tc-v">${(costPerOut * 1_000_000).toFixed(2)}</div>
              </div>
            )}
            {outputRatio > 0 && (
              <div class="tc">
                <div class="tc-k">Output ratio</div>
                <div class="tc-v">{(outputRatio * 100).toFixed(1)}%</div>
              </div>
            )}
            {cacheRate > 0 && (
              <div class="tc">
                <div class="tc-k">Cache hit rate</div>
                <div class="tc-v">{Math.round(cacheRate * 100)}%</div>
              </div>
            )}
            {weekSpend > 0 && (
              <div class="tc">
                <div class="tc-k">Total spend · 7d</div>
                <div class="tc-v">${weekSpend.toFixed(2)}</div>
              </div>
            )}
          </div>
          {/* Input/Output split bar — makes outputRatio legible as "how much
           *  of what Claude processed was actually answering vs reading".
           *  Left = input (read), right = output (generated). */}
          {outputRatio > 0 && (
            <div style={{ marginTop: 12 }}>
              <div class="fp-row">
                <span class="fp-row-label">Input vs output</span>
                <span class="fp-row-value" style={{ color: 'var(--tok-text-muted)' }}>
                  {Math.round((1 - outputRatio) * 100)}% in · {Math.round(outputRatio * 100)}% out
                </span>
              </div>
              <div style={{
                display: 'flex',
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                background: 'var(--tok-bar-empty)',
                marginTop: 4,
              }}>
                <div
                  title={`input ${Math.round((1 - outputRatio) * 100)}%`}
                  style={{
                    width: `${(1 - outputRatio) * 100}%`,
                    background: 'var(--tok-text-secondary)',
                    opacity: 0.6,
                  }}
                />
                <div
                  title={`output ${Math.round(outputRatio * 100)}%`}
                  style={{
                    width: `${outputRatio * 100}%`,
                    background: 'var(--tok-accent-primary)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
