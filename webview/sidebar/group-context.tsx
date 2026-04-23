import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { theme } from '../styles/theme';
import { quotaSeverityColor } from '../utils/quota-severity';

/**
 * GROUP: CONTEXT — active-session context-window utilization.
 * Mirrors mockup §Sidebar Context block but as a standalone labeled group
 * (parity with NOW / TODAY / QUOTA / MODELS&TOOLS / INSIGHTS).
 *
 * Shows:
 *   - Tokens used / limit (Xk / Yk)
 *   - Utilization % with severity color (<50 safe green, 50-79 amber, ≥80 red)
 *   - Progress bar
 *   - /compact hint when ≥70%
 *
 * Empty state: no active session OR contextLimit unknown → "No active session.".
 */
export function GroupContext({ data }: { data: WebviewData }) {
  const s = data.activeSession;
  const hasContext = !!s && s.contextLimit > 0;

  if (!hasContext) {
    return (
      <GroupHeader label="Context">
        <GroupEmpty>
          No active session.
        </GroupEmpty>
      </GroupHeader>
    );
  }

  const session = s!;
  const color = quotaSeverityColor(session.contextPct);
  const tokensK = (session.contextTokens / 1000).toFixed(0);
  const limitK = (session.contextLimit / 1000).toFixed(0);
  const showCompactHint = session.contextPct >= 70;

  return (
    <GroupHeader label="Context">
      <div>
        {/* Tokens / limit + % — numeric, so mono throughout (per user 2026-04-24) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: theme.mono,
          fontSize: 11,
          marginBottom: 4,
        }}>
          <span style={{ color: 'var(--tok-text-primary)' }}>
            {tokensK}k
            <span style={{ color: 'var(--tok-text-muted)' }}> / {limitK}k</span>
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: session.contextPct >= 80 ? 700 : 600,
            color,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {session.contextPct}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4,
          background: 'var(--tok-bar-empty)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(session.contextPct, 100)}%`,
            height: '100%',
            background: color,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* /compact hint at ≥70% — matches widget slide 2 treatment */}
        {showCompactHint && (
          <div style={{
            marginTop: 6,
            fontFamily: theme.sans,
            fontSize: 10,
            color,
          }}>
            Run <code style={{
              fontFamily: theme.mono,
              padding: '0 3px',
              background: 'var(--vscode-input-background)',
              borderRadius: 2,
            }}>/compact</code> to free context
          </div>
        )}
      </div>
    </GroupHeader>
  );
}
