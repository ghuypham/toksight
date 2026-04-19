import { theme } from '../styles/theme';

export interface BarListItem {
  name: string;
  stat1?: string;
  stat2?: string;
  cost: number;
}

interface BarListProps {
  title: string;
  items: BarListItem[];
  maxRows?: number;
}

function fmtCost(n: number): string {
  if (n < 0.005) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}

/** Reusable horizontal bar list for tools, MCP, and projects */
export function BarList({ title, items, maxRows = 5 }: BarListProps) {
  if (!items || items.length === 0) return null;

  const visible = items.slice(0, maxRows);
  const maxCost = Math.max(...visible.map((i) => i.cost), 0.01);

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
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visible.map((item, idx) => {
          const barPct = Math.round((item.cost / maxCost) * 100);
          const isLast = idx === visible.length - 1;

          return (
            <div
              key={item.name}
              data-row={idx + 1}
              style={{
                padding: isLast ? '7px 0 0' : '7px 0',
                borderBottom: isLast ? 'none' : `1px solid ${theme.widgetBorder}`,
              }}
            >
              {/* Top row: name + stats */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}>
                <span style={{
                  fontFamily: theme.sans,
                  fontSize: '12px',
                  color: theme.foreground,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  maxWidth: '140px',
                }}>
                  {item.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  {item.stat1 && (
                    <span style={{
                      fontFamily: theme.mono,
                      fontSize: '11px',
                      color: theme.descriptionForeground,
                      minWidth: '36px',
                      textAlign: 'right' as const,
                    }}>
                      {item.stat1}
                    </span>
                  )}
                  {item.stat2 && (
                    <span style={{
                      fontFamily: theme.mono,
                      fontSize: '11px',
                      color: theme.disabledForeground,
                      minWidth: '36px',
                      textAlign: 'right' as const,
                    }}>
                      {item.stat2}
                    </span>
                  )}
                  <span style={{
                    fontFamily: theme.mono,
                    fontSize: '11px',
                    color: theme.coral,
                    minWidth: '40px',
                    textAlign: 'right' as const,
                  }}>
                    {fmtCost(item.cost)}
                  </span>
                </div>
              </div>

              {/* Horizontal bar */}
              <div style={{
                width: '100%',
                height: '4px',
                background: 'transparent',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: theme.coral,
                  borderRadius: '2px',
                  width: `${barPct}%`,
                  minWidth: barPct > 0 ? '2px' : '0',
                  opacity: 0.8,
                  transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
