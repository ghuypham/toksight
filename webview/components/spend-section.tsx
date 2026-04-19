import { theme } from '../styles/theme';
import { useAnimatedValue, formatAnimatedCost } from '../hooks/use-animated-value';
import { sendToExtension } from '../hooks/use-extension-data';
import type { PrimaryUnit } from '../../src/types';

/** Compact $/tokens chip toggle — same as widget for consistency */
function UnitToggle({ unit }: { unit: PrimaryUnit }) {
  const isTokens = unit === 'tokens';
  const flip = () => sendToExtension('setPrimaryUnit', isTokens ? 'cost' : 'tokens');
  const base = {
    fontFamily: theme.sans, fontSize: '9px', fontWeight: 600,
    padding: '2px 6px', cursor: 'pointer', border: 'none',
    background: 'transparent', lineHeight: 1,
  } as const;
  const active = { ...base, background: theme.coral, color: '#fff' };
  const inactive = { ...base, color: theme.disabledForeground };
  return (
    <div title="Switch hero unit" style={{
      display: 'inline-flex', borderRadius: '3px', overflow: 'hidden',
      border: `1px solid ${theme.widgetBorder}`,
    }}>
      <button onClick={() => isTokens && flip()} style={!isTokens ? active : inactive}>$</button>
      <button onClick={() => !isTokens && flip()} style={isTokens ? active : inactive}>tok</button>
    </div>
  );
}

interface SpendSectionProps {
  today: number;
  week: number;
  trendPct: number;
  window5h: number;
  todayTokens: number;
  weekTokens: number;
  primaryUnit: PrimaryUnit;
}

function fmtTok(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

/** SPEND section: today hero + week row + 5h estimated window — toggleable cost/tokens */
export function SpendSection({ today, week, trendPct, window5h, todayTokens, weekTokens, primaryUnit }: SpendSectionProps) {
  const animToday = useAnimatedValue(today);
  const animWeek = useAnimatedValue(week);
  const animWindow = useAnimatedValue(window5h);
  const animTodayTokens = useAnimatedValue(todayTokens);
  const animWeekTokens = useAnimatedValue(weekTokens);
  const isTokens = primaryUnit === 'tokens';
  const heroToday = isTokens ? fmtTok(animTodayTokens) : formatAnimatedCost(animToday);
  const heroWeek = isTokens ? fmtTok(animWeekTokens) : formatAnimatedCost(animWeek);

  const trendUp = trendPct > 0;
  const trendColor = trendUp ? 'var(--tok-danger)' : 'var(--tok-success)';
  const trendArrow = trendUp ? '▲' : '▼';

  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px',
      }}>
        <div style={{
          fontFamily: theme.sans, fontSize: '10px', fontWeight: 500,
          textTransform: 'uppercase' as const, letterSpacing: '0.5px',
          color: theme.disabledForeground,
        }}>
          {isTokens ? 'Tokens' : 'Spend'}
        </div>
        <UnitToggle unit={primaryUnit} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Today hero */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: theme.sans, fontSize: '12px', color: theme.disabledForeground }}>
            Today
          </span>
          <span data-hero style={{
            fontFamily: theme.mono, fontSize: '24px', fontWeight: 700,
            color: theme.coral, lineHeight: '1.2', letterSpacing: '-0.5px',
          }}>
            {heroToday}
          </span>
        </div>

        {/* Week + trend */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: theme.sans, fontSize: '12px', color: theme.disabledForeground }}>
            This week
          </span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontFamily: theme.mono, fontSize: '16px', fontWeight: 500, color: theme.foreground,
            }}>
              {heroWeek}
            </span>
            {trendPct !== 0 && (
              <span style={{ fontFamily: theme.mono, fontSize: '11px', color: trendColor }}>
                {trendArrow} {Math.abs(trendPct).toFixed(0)}%
              </span>
            )}
          </span>
        </div>

        {/* 5h window */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: theme.sans, fontSize: '12px', color: theme.descriptionForeground, opacity: 0.7,
          }}>
            ~5h (est.)
          </span>
          <span style={{
            fontFamily: theme.mono, fontSize: '14px', fontWeight: 400, color: theme.descriptionForeground,
          }}>
            {formatAnimatedCost(animWindow)}
          </span>
        </div>
      </div>
    </div>
  );
}
