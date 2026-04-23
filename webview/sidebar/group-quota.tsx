import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { theme } from '../styles/theme';
import { quotaSeverityColor } from '../utils/quota-severity';

/** Format ISO countdown as "Xh Ym" or "Ym" (empty when null/past). */
function fmtCountdown(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'resetting';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** One quota row — label + percent + progress bar. showCountdown only for 5h window. */
function QuotaRow({
  label,
  pct,
  resetsAt,
  showCountdown = false,
}: {
  label: string;
  pct: number;
  resetsAt: string | null;
  showCountdown?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor = quotaSeverityColor(pct);
  const countdown = showCountdown ? fmtCountdown(resetsAt) : '';

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontFamily: theme.sans,
        fontSize: 11,
        marginBottom: 4,
      }}>
        <span style={{ color: theme.foreground }}>{label}</span>
        <span style={{ fontFamily: theme.mono, color: barColor, fontVariantNumeric: 'tabular-nums', fontWeight: pct >= 80 ? 600 : 400 }}>
          {clamped.toFixed(0)}%
        </span>
      </div>
      <div style={{
        height: 4,
        background: 'var(--tok-bar-empty)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div
          data-progress
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: barColor,
          }}
        />
      </div>
      {countdown && (
        <div style={{
          fontFamily: theme.mono,
          fontSize: 10,
          color: theme.disabledForeground,
          marginTop: 3,
        }}>
          resets in {countdown}
        </div>
      )}
    </div>
  );
}

function fmtEta(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return '< 1m';
  if (minutes < 60) return `~${Math.round(minutes)}m`;
  return `~${(minutes / 60).toFixed(1)}h`;
}

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(2);
  if (n < 100) return '$' + n.toFixed(1);
  if (n < 1000) return '$' + Math.round(n);
  return '$' + (n / 1000).toFixed(1) + 'k';
}

/** GROUP: QUOTA — Anthropic OAuth usage windows + forecast box + cache savings. */
export function GroupQuota({ data }: { data: WebviewData }) {
  const limits = data.usageLimits;
  const forecast = data.forecast;
  const cacheSaved = data.cacheSavings;
  const hasLimits = limits && (limits.fiveHour || limits.sevenDay || limits.sevenDaySonnet || limits.sevenDayOpus);
  const hasForecast = forecast && Number.isFinite(forecast.etaMinutes) && forecast.burnPerMin > 0;

  // Empty-state copy depends on WHY we have no data — distinguishes auth vs API
  // failure so user knows whether to sign in or just wait for the next refresh.
  if (!hasLimits && !hasForecast) {
    const status = data.usageLimitsStatus;
    const message = status === 'fail'
      ? 'Quota unavailable — retrying.'
      : status === 'no-auth'
        ? 'Sign in to Claude or set a budget to see quota.'
        : 'No active quota windows.';
    return (
      <GroupHeader label="Quota">
        <GroupEmpty tight>{message}</GroupEmpty>
      </GroupHeader>
    );
  }

  return (
    <GroupHeader label="Quota">
      {limits?.fiveHour && (
        <QuotaRow
          label="5h window"
          pct={limits.fiveHour.utilization}
          resetsAt={limits.fiveHour.resetsAt}
          showCountdown
        />
      )}
      {limits?.sevenDay && (
        <QuotaRow
          label="Weekly · all"
          pct={limits.sevenDay.utilization}
          resetsAt={limits.sevenDay.resetsAt}
        />
      )}
      {limits?.sevenDaySonnet && (
        <QuotaRow
          label="Weekly · Sonnet"
          pct={limits.sevenDaySonnet.utilization}
          resetsAt={limits.sevenDaySonnet.resetsAt}
        />
      )}
      {limits?.sevenDayOpus && (
        <QuotaRow
          label="Weekly · Opus"
          pct={limits.sevenDayOpus.utilization}
          resetsAt={limits.sevenDayOpus.resetsAt}
        />
      )}

      {/* Forecast line — mixed label+numeric+money, mono whole per user 2026-04-24 */}
      {hasForecast && (
        <div style={{
          marginTop: 4,
          fontFamily: theme.mono,
          fontSize: 11,
          color: theme.descriptionForeground,
        }}>
          ⏱ hit 5h cap in {fmtEta(forecast!.etaMinutes)} at {fmtCost(forecast!.burnPerMin)}/min
        </div>
      )}

      {/* Cache savings — label in sans, money in mono */}
      {cacheSaved >= 0.01 && (
        <div style={{
          marginTop: 6,
          fontFamily: theme.sans,
          fontSize: 10,
          color: 'var(--vscode-descriptionForeground)',
        }}>
          Cache savings this week: <strong style={{ fontFamily: theme.mono, color: theme.activeGreen }}>{fmtCost(cacheSaved)}</strong>
        </div>
      )}
    </GroupHeader>
  );
}
