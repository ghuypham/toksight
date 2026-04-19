import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { theme } from '../styles/theme';

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
  accent,
  showCountdown = false,
}: {
  label: string;
  pct: number;
  resetsAt: string | null;
  accent?: string;
  showCountdown?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor = accent ?? theme.coral;
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
        <span style={{ color: theme.descriptionForeground, fontVariantNumeric: 'tabular-nums' }}>
          {clamped.toFixed(0)}%
        </span>
      </div>
      <div style={{
        height: 4,
        background: 'var(--vscode-widget-border)',
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
          fontFamily: theme.sans,
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
          accent={theme.coral}
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
          accent={theme.sonnetBlue}
        />
      )}
      {limits?.sevenDayOpus && (
        <QuotaRow
          label="Weekly · Opus"
          pct={limits.sevenDayOpus.utilization}
          resetsAt={limits.sevenDayOpus.resetsAt}
          accent={theme.coral}
        />
      )}

      {/* Forecast line — matches mockup .quota-forecast */}
      {hasForecast && (
        <div style={{
          marginTop: 4,
          fontFamily: theme.sans,
          fontSize: 11,
          color: theme.descriptionForeground,
        }}>
          ⏱ hit 5h cap in {fmtEta(forecast!.etaMinutes)} at {fmtCost(forecast!.burnPerMin)}/min
        </div>
      )}

      {/* Cache savings callout */}
      {cacheSaved >= 0.01 && (
        <div style={{
          marginTop: 6,
          fontFamily: theme.sans,
          fontSize: 10,
          color: 'var(--vscode-descriptionForeground)',
        }}>
          Cache savings this week: <strong style={{ color: theme.activeGreen }}>{fmtCost(cacheSaved)}</strong>
        </div>
      )}
    </GroupHeader>
  );
}
