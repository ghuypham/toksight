import type { ExplorerData } from '../../src/types';
import { theme } from '../styles/theme';
import { quotaSeverityColor } from '../utils/quota-severity';
import { SurfaceLabel } from '../components/surface-label';

/**
 * Slide 1 — QUOTA (per mockup §1 Slide 1).
 * Answers: "how much Claude quota do I have left?"
 *
 * Rows: 5h window · Weekly all · Weekly Sonnet (each = OAuth utilization %).
 * Forecast box: ETA to cap at current burn rate.
 * 7-day sparkline: today highlighted coral rightmost, past muted.
 *
 * Empty state: no OAuth signal AND no sparkline → "Configure quota or sign in to Claude."
 */

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}

function fmtEta(minutes: number): string {
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `~${Math.round(minutes)}m`;
  return `~${(minutes / 60).toFixed(1)}h`;
}

function fmtResetsIn(resetsAt: string | null): string {
  if (!resetsAt) return '';
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (!isFinite(ms) || ms <= 0) return '';
  const total = Math.floor(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function QuotaRow({ label, meta, pct }: {
  label: string;
  meta?: string;
  pct: number;
}) {
  // Severity shared with sidebar + dashboard — single source of truth in
  // utils/quota-severity.ts. Widget defers to coral at normal levels so each
  // surface has the same "brand at rest, amber/red under pressure" behavior.
  const color = quotaSeverityColor(pct);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
        <span style={{ fontFamily: theme.sans, fontSize: 11, color: 'var(--vscode-foreground)' }}>
          {label}
          {meta && (
            <span style={{ fontFamily: theme.mono, color: 'var(--vscode-disabledForeground)', fontSize: 10 }}> · {meta}</span>
          )}
        </span>
        <span style={{ fontFamily: theme.mono, fontSize: 12, fontWeight: pct >= 80 ? 700 : 600, color }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--tok-bar-empty)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </>
  );
}

export function SlideQuota({ data }: { data: ExplorerData }) {
  const ul = data.usageLimits;
  const hasOAuth = !!(ul?.fiveHour || ul?.sevenDay || ul?.sevenDaySonnet);
  const spark = data.sparkline;
  const hasSpark = spark.length >= 2;

  // Empty state — no signal at all
  if (!hasOAuth && !hasSpark) {
    return (
      <div>
        <SurfaceLabel>QUOTA</SurfaceLabel>
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--vscode-disabledForeground)', fontSize: 12 }}>
          Configure quota or sign in to Claude.
        </div>
      </div>
    );
  }

  const fh = ul?.fiveHour;
  const sd = ul?.sevenDay;
  const sdS = ul?.sevenDaySonnet;

  // Forecast (ETA to 5h cap). Hidden if no burn or budget not configured.
  const forecast = data.forecast;
  const showForecast = forecast && isFinite(forecast.etaMinutes) && forecast.burnPerMin > 0;

  // Sparkline
  const maxCost = hasSpark ? Math.max(...spark.map(p => p.cost), 0.01) : 0.01;
  const todayIdx = spark.length - 1;

  return (
    <div>
      <SurfaceLabel>QUOTA</SurfaceLabel>

      {/* Usage rows */}
      {fh && (
        <QuotaRow
          label="5h window"
          meta={fmtResetsIn(fh.resetsAt) ? `resets ${fmtResetsIn(fh.resetsAt)}` : undefined}
          pct={fh.utilization}
        />
      )}
      {sd && <QuotaRow label="Weekly · all" pct={sd.utilization} />}
      {sdS && <QuotaRow label="Weekly · Sonnet" pct={sdS.utilization} />}

      {/* Forecast box — mixed label+numeric+money, mono whole (per user 2026-04-24) */}
      {showForecast && (
        <div style={{
          marginTop: 10, padding: '6px 8px',
          background: 'var(--vscode-input-background)',
          borderRadius: 4,
          fontFamily: theme.mono, fontSize: 11,
          color: 'var(--vscode-foreground)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⏱</span>
          <span>
            hit limit in{' '}
            <strong style={{ color: theme.coral }}>{fmtEta(forecast.etaMinutes)}</strong>
            {' '}at {fmtCost(forecast.burnPerMin)}/min
          </span>
        </div>
      )}

      {/* 7-day sparkline — fixed chart height (50px). User feedback
       *  2026-04-24: don't flex-grow this; slide is sized by content,
       *  not the chart. */}
      {hasSpark && (() => {
        const avg = spark.reduce((s, p) => s + p.cost, 0) / spark.length;
        const avgPct = maxCost > 0 ? (avg / maxCost) * 100 : 0;
        return (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: theme.mono, fontSize: 9, color: 'var(--vscode-disabledForeground)', marginBottom: 3 }}>
              <span>Last 7 days · avg {fmtCost(avg)}</span>
              <span>today <strong style={{ color: 'var(--vscode-foreground)' }}>{fmtCost(data.todaySpend)}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 50, position: 'relative', marginTop: 8 }}>
              {/* Avg reference line */}
              {avgPct > 0 && (
                <div
                  title={`avg ${fmtCost(avg)}`}
                  style={{
                    position: 'absolute', left: 0, right: 0,
                    bottom: `${avgPct}%`,
                    height: 1,
                    borderTop: '1px dashed var(--vscode-widget-border)',
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {spark.map((p, i) => {
                const h = (p.cost / maxCost) * 100;
                const isToday = i === todayIdx;
                return (
                  <div key={i} data-spark-bar style={{
                    flex: 1,
                    height: `${Math.max(h, 4)}%`,
                    background: isToday ? theme.coral : 'var(--vscode-descriptionForeground)',
                    opacity: isToday ? 1 : 0.35,
                    borderRadius: '1px 1px 0 0',
                  }} title={`${p.date}: ${fmtCost(p.cost)}`} />
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
