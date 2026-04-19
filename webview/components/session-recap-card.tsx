import type { SessionRecap } from '../../src/types';
import { claude, theme } from '../styles/theme';

const outcomeColor: Record<SessionRecap['outcome'], string> = {
  fully_achieved: claude.trendUp,
  partially_achieved: 'var(--tok-warning)',
  not_achieved: claude.trendDown,
};

const outcomeLabel: Record<SessionRecap['outcome'], string> = {
  fully_achieved: 'Fully achieved',
  partially_achieved: 'Partially achieved',
  not_achieved: 'Not achieved',
};

/** Summary card: outcome badge · helpfulness · brief summary · friction breakdown. */
export function SessionRecapCard({ recap }: { recap: SessionRecap }) {
  return (
    <div style={{ padding: 10, background: theme.cardBg, borderRadius: theme.radius, boxShadow: theme.ring, fontFamily: theme.sans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: outcomeColor[recap.outcome], color: '#000', fontWeight: 600,
        }}>
          {outcomeLabel[recap.outcome]}
        </span>
        <span style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          {recap.claudeHelpfulness.replace(/_/g, ' ')}
        </span>
      </div>
      <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--vscode-foreground)', lineHeight: 1.4 }}>
        {recap.briefSummary}
      </p>
      {Object.keys(recap.frictionCounts).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          Friction: {Object.entries(recap.frictionCounts).map(([k, v]) => `${k}:${v}`).join(' · ')}
        </div>
      )}
      {recap.frictionDetail && (
        <p style={{ fontSize: 10, marginTop: 4, color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>
          {recap.frictionDetail}
        </p>
      )}
    </div>
  );
}
