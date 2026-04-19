import { theme } from '../styles/theme';
import type { TokenBreakdown } from '../../src/types';
import { useAnimatedValue } from '../hooks/use-animated-value';

interface TokenBreakdownProps {
  breakdown: TokenBreakdown;
}

/** Format animated token count */
function fmtTok(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

/** Single animated column */
function TokenColumn({ value, pct, label, color, index }: {
  value: number; pct: number; label: string; color: string; index: number;
}) {
  const animVal = useAnimatedValue(value);
  const animPct = useAnimatedValue(pct);

  return (
    <div data-token-seg={index} style={{
      flex: 1, display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', padding: '10px 6px',
      borderLeft: index > 1 ? `1px solid ${theme.widgetBorder}` : 'none',
      gap: '3px',
    }}>
      <div style={{ fontFamily: theme.mono, fontSize: '13px', fontWeight: 600, color: theme.foreground, lineHeight: 1 }}>
        {fmtTok(animVal)}
      </div>
      <div style={{
        fontFamily: theme.sans, fontSize: '9px', fontWeight: 500,
        textTransform: 'uppercase' as const, letterSpacing: '0.4px',
        color: theme.disabledForeground, lineHeight: 1,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: theme.mono, fontSize: '10px', fontWeight: 500, color, lineHeight: 1 }}>
        {(animPct * 100).toFixed(0)}%
      </div>
    </div>
  );
}

/** 3-column token breakdown — values animate on data change */
export function TokenBreakdownView({ breakdown }: TokenBreakdownProps) {
  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{
        fontFamily: theme.sans, fontSize: '10px', fontWeight: 500,
        textTransform: 'uppercase' as const, letterSpacing: '0.5px',
        color: theme.disabledForeground, marginBottom: '10px',
      }}>
        Token Breakdown
      </div>
      <div style={{
        display: 'flex', background: theme.cardBg,
        borderRadius: theme.radius, overflow: 'hidden',
      }}>
        <TokenColumn value={breakdown.output} pct={breakdown.outputPct} label="Output" color={theme.coral} index={1} />
        <TokenColumn value={breakdown.input} pct={breakdown.inputPct} label="Input" color={theme.descriptionForeground} index={2} />
        <TokenColumn value={breakdown.cache} pct={breakdown.cachePct} label="Cache" color={theme.sonnetBlue} index={3} />
      </div>
    </div>
  );
}
