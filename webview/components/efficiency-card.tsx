import { theme } from '../styles/theme';
import { useAnimatedValue, formatAnimatedCost } from '../hooks/use-animated-value';

interface CacheSavingsCardProps {
  /** $ saved this period via cache reads vs full input price */
  cacheSavings: number;
  /** Total spend this period — used to show savings as % of bill */
  totalSpend: number;
}

/**
 * Honest, calibratable metric: actual money saved by cache reads.
 * Replaces the old "Efficiency Score" composite which had arbitrary thresholds.
 */
export function CacheSavingsCard({ cacheSavings, totalSpend }: CacheSavingsCardProps) {
  const animSavings = useAnimatedValue(cacheSavings);
  const pct = totalSpend > 0 ? (cacheSavings / (cacheSavings + totalSpend)) * 100 : 0;
  const animPct = useAnimatedValue(pct);

  return (
    <div data-efficiency style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      background: theme.cardBg, borderRadius: theme.radius,
      padding: '12px 14px', boxSizing: 'border-box' as const,
    }}>
      <div data-hero style={{
        fontFamily: theme.mono, fontSize: '24px', fontWeight: 700,
        color: theme.activeGreen, lineHeight: 1, flexShrink: 0,
        letterSpacing: '-0.5px',
      }}>
        {formatAnimatedCost(animSavings)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
        <div style={{
          fontFamily: theme.sans, fontSize: '12px', fontWeight: 600,
          color: theme.foreground, lineHeight: 1.2,
        }} title="Cache reads cost ~10% of input tokens — this is what caching saved you">
          Cache savings
        </div>
        <div style={{
          fontFamily: theme.sans, fontSize: '10px',
          color: theme.disabledForeground, lineHeight: 1.3,
        }}>
          {animPct.toFixed(0)}% off your bill this week
        </div>
      </div>
    </div>
  );
}

/** Backwards-compat alias — old import path still works during migration */
export { CacheSavingsCard as EfficiencyCard };
