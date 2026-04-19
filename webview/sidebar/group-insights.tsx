import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';

/**
 * GROUP: INSIGHTS — flat list of up to 3 insight rows.
 * Matches mockup .insight-row layout: icon column + text + .insight-sub italic subtext.
 * No carousel — sidebar space is vertical, all rows visible at once.
 */
export function GroupInsights({ data }: { data: WebviewData }) {
  if (!data.insights || data.insights.length === 0) {
    return (
      <GroupHeader label="Insights">
        <GroupEmpty tight>Insights appear after a few sessions.</GroupEmpty>
      </GroupHeader>
    );
  }

  const rows = data.insights.slice(0, 3);

  return (
    <GroupHeader label="Insights">
      {rows.map((insight, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            padding: '5px 0',
            fontSize: 11,
            lineHeight: 1.4,
            borderTop: i === 0 ? 'none' : '1px solid var(--tok-divider)',
          }}
        >
          {/* Icon column */}
          <span style={{ fontSize: 13, flexShrink: 0 }}>{insight.icon}</span>
          {/* Text + subtext */}
          <span style={{ flex: 1, color: 'var(--tok-text-primary)' }}>
            {insight.text}
            {insight.sub && (
              <span style={{
                color: 'var(--tok-text-muted)',
                fontSize: 10,
                display: 'block',
                marginTop: 1,
                fontStyle: 'italic',
              }}>
                {insight.sub}
              </span>
            )}
          </span>
        </div>
      ))}
    </GroupHeader>
  );
}
