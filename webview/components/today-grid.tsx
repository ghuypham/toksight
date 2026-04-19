import { theme } from '../styles/theme';
import type { TodaySummary } from '../../src/types';
import { useAnimatedValue, formatAnimatedCost } from '../hooks/use-animated-value';

interface TodayGridProps {
  today: TodaySummary;
}

/** Animated single cell */
function AnimatedCell({ value, label, index, isCost }: {
  value: number; label: string; index: number; isCost?: boolean;
}) {
  const anim = useAnimatedValue(value);
  const display = isCost ? formatAnimatedCost(anim) : String(Math.round(anim));

  return (
    <div data-cell={index} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
      background: theme.cardBg, borderRadius: '6px', padding: '8px',
    }}>
      <span style={{
        fontFamily: theme.mono, fontSize: '18px', fontWeight: 700,
        color: theme.foreground, lineHeight: '1.2',
      }}>
        {display}
      </span>
      <span style={{
        fontFamily: theme.sans, fontSize: '10px', textTransform: 'uppercase',
        letterSpacing: '0.5px', color: theme.disabledForeground, lineHeight: '1.4',
      }}>
        {label}
      </span>
    </div>
  );
}

/** Tokens cell with string format */
function TokensCell({ tokens, tokensFmt, index }: {
  tokens: number; tokensFmt: string; index: number;
}) {
  const anim = useAnimatedValue(tokens);
  const display = anim >= 1e6 ? `${(anim / 1e6).toFixed(1)}M`
    : anim >= 1e3 ? `${(anim / 1e3).toFixed(0)}K`
    : String(Math.round(anim));

  return (
    <div data-cell={index} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
      background: theme.cardBg, borderRadius: '6px', padding: '8px',
    }}>
      <span style={{
        fontFamily: theme.mono, fontSize: '18px', fontWeight: 700,
        color: theme.foreground, lineHeight: '1.2',
      }}>
        {display}
      </span>
      <span style={{
        fontFamily: theme.sans, fontSize: '10px', textTransform: 'uppercase',
        letterSpacing: '0.5px', color: theme.disabledForeground, lineHeight: '1.4',
      }}>
        Tokens
      </span>
    </div>
  );
}

/** 2x2 grid: Sessions, Projects, Tokens, API Value — all values animate on change */
export function TodayGrid({ today }: TodayGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <AnimatedCell value={today.sessions} label="Sessions" index={1} />
      <AnimatedCell value={today.projects} label="Projects" index={2} />
      <TokensCell tokens={today.tokens} tokensFmt={today.tokensFmt} index={3} />
      <AnimatedCell value={today.cost} label="API Value" index={4} isCost />
    </div>
  );
}
