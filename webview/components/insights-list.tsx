import { useState, useEffect } from 'preact/hooks';
import { theme } from '../styles/theme';
import type { Insight } from '../../src/types';

interface InsightsListProps {
  insights: Insight[];
}

/** INSIGHTS label + auto-rotating carousel (6s) with dot indicators */
export function InsightsList({ insights }: InsightsListProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % insights.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [insights.length]);

  if (insights.length === 0) return null;

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
        Insights
      </div>

      {/* Carousel track */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
          transform: `translateX(-${active * 100}%)`,
        }}>
          {insights.map((insight, i) => (
            <div
              key={i}
              data-insight
              style={{
                minWidth: '100%',
                flexShrink: 0,
                boxSizing: 'border-box' as const,
                background: theme.cardBgElevated,
                borderRadius: theme.radius,
                padding: '12px',
                fontFamily: theme.sans,
                fontSize: '12px',
                lineHeight: '1.5',
                color: theme.foreground,
                minHeight: '60px',
                wordWrap: 'break-word' as const,
                overflowWrap: 'break-word' as const,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: theme.foreground,
                lineHeight: '1.4',
                wordWrap: 'break-word' as const,
                overflowWrap: 'break-word' as const,
              }}>
                <span style={{ flexShrink: 0 }}>{insight.icon}</span>
                <span>{insight.text}</span>
              </div>
              {insight.sub && (
                <span style={{
                  display: 'block',
                  fontSize: '11px',
                  color: theme.disabledForeground,
                  marginTop: '4px',
                  lineHeight: '1.4',
                  wordWrap: 'break-word' as const,
                  overflowWrap: 'break-word' as const,
                }}>
                  {insight.sub}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {insights.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '10px',
        }}>
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: i === active ? theme.descriptionForeground : theme.disabledForeground,
                opacity: i === active ? 1 : 0.3,
                cursor: 'pointer',
                border: 'none',
                padding: 0,
                transition: 'opacity 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
