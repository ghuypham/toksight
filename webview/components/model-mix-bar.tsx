import { theme } from '../styles/theme';
import { getModelDisplayName, buildModelColorMap } from '../utils/model-utils';
import { fmtCost } from '../utils/format';

interface ModelMixBarProps {
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
}

/** Stacked model mix bar with per-model cost display */
export function ModelMixBar({ modelMix }: ModelMixBarProps) {
  if (modelMix.length === 0) return null;
  // Distinct color per row, palette ordered by mix order
  const colorMap = buildModelColorMap(modelMix.map((m) => m.model));

  return (
    <div style={{ padding: '14px 0' }}>
      {/* Section label */}
      <div style={{
        fontFamily: theme.sans,
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        color: theme.disabledForeground,
        marginBottom: '10px',
      }}>
        Models
      </div>

      {/* Stacked bar */}
      <div style={{
        display: 'flex',
        height: '8px',
        borderRadius: '4px',
        overflow: 'hidden',
        background: theme.pageBg,
      }}>
        {modelMix.map((m) => (
          <div
            key={m.model}
            data-model-seg
            title={`${getModelDisplayName(m.model)}: ${Math.round(m.percentage)}% (${fmtCost(m.cost)})`}
            style={{
              width: `${m.percentage}%`,
              backgroundColor: colorMap[m.model],
              minWidth: m.percentage > 0 ? '2px' : '0',
              height: '100%',
              transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            }}
          />
        ))}
      </div>

      {/* Legend with cost */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginTop: '10px',
      }}>
        {modelMix.map((m) => (
          <div key={m.model} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '2px',
                backgroundColor: colorMap[m.model],
                display: 'inline-block',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: theme.sans,
                fontSize: '11px',
                color: theme.descriptionForeground,
              }}>
                {getModelDisplayName(m.model)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
              <span style={{
                fontFamily: theme.mono,
                fontSize: '11px',
                color: theme.disabledForeground,
              }}>
                {Math.round(m.percentage)}%
              </span>
              <span style={{
                fontFamily: theme.mono,
                fontSize: '11px',
                color: theme.coral,
                minWidth: '36px',
                textAlign: 'right' as const,
              }}>
                {fmtCost(m.cost)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
