import { theme } from '../styles/theme';
import { CacheSavingsCard } from './efficiency-card';
import { useAnimatedValue, formatAnimatedPct } from '../hooks/use-animated-value';

interface UsageSectionProps {
  outputRatio: number;
  cacheRate: number;
  cacheSavings: number;
  totalSpend: number;
}

/** USAGE section: cache savings card + output ratio + cache rate */
export function UsageSection({ outputRatio, cacheRate, cacheSavings, totalSpend }: UsageSectionProps) {
  const animOutput = useAnimatedValue(outputRatio);
  const animCache = useAnimatedValue(cacheRate);

  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{
        fontFamily: theme.sans, fontSize: '10px', fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        color: theme.disabledForeground, marginBottom: '12px',
      }}>
        Usage
      </div>

      <CacheSavingsCard cacheSavings={cacheSavings} totalSpend={totalSpend} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
        {/* Output ratio */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: theme.sans, fontSize: '12px', color: theme.descriptionForeground, fontWeight: 500 }}>
              Output ratio
            </span>
            <span style={{ fontFamily: theme.mono, fontSize: '16px', fontWeight: 600, color: theme.foreground }}>
              {formatAnimatedPct(animOutput)}
            </span>
          </div>
          <div style={{ width: '100%', height: '4px', background: theme.inputBg, borderRadius: '2px', overflow: 'hidden', marginBottom: '2px' }}>
            <div data-progress style={{
              height: '100%',
              width: `${Math.min(animOutput / 0.15 * 100, 100)}%`,
              background: theme.coral,
              borderRadius: '2px',
              transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            }} />
          </div>
          <div style={{ fontFamily: theme.sans, fontSize: '10px', color: theme.disabledForeground, lineHeight: '1.4' }}>
            Share of tokens Claude generates vs. input
          </div>
        </div>

        {/* Cache rate */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: theme.sans, fontSize: '12px', color: theme.descriptionForeground, fontWeight: 500 }}>
              Cache rate
            </span>
            <span style={{ fontFamily: theme.mono, fontSize: '16px', fontWeight: 600, color: theme.foreground }}>
              {formatAnimatedPct(animCache, 0)}
            </span>
          </div>
          <div style={{ width: '100%', height: '4px', background: theme.inputBg, borderRadius: '2px', overflow: 'hidden', marginBottom: '2px' }}>
            <div data-progress style={{
              height: '100%',
              width: `${Math.min(animCache * 100, 100)}%`,
              background: theme.sonnetBlue,
              borderRadius: '2px',
              transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            }} />
          </div>
          <div style={{ fontFamily: theme.sans, fontSize: '10px', color: theme.disabledForeground, lineHeight: '1.4' }}>
            Context reused from cache
          </div>
        </div>
      </div>
    </div>
  );
}
