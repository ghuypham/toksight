import type { ExplorerData } from '../../src/types';
import { theme, claude } from '../styles/theme';

/**
 * Slide 3 — LAST SESSION (recap, mockup §1 Slide 3).
 * Shows the most recent completed session's narrative: quote + outcome + friction.
 *
 * Empty states:
 *  - Session ended <24h ago but Anthropic hasn't produced recap yet → "Recap pending."
 *  - No session at all in last 24h → "No recent session."
 */

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function outcomeColor(outcome: string): string {
  if (outcome === 'fully_achieved') return claude.trendUp;
  if (outcome === 'partially_achieved') return 'var(--tok-warning, #d79b3f)';
  return claude.trendDown;
}

function helpfulColor(helpful: string): string {
  if (helpful === 'very_helpful') return claude.trendUp;
  if (helpful === 'helpful') return claude.trendUp;
  if (helpful === 'neutral') return 'var(--vscode-descriptionForeground)';
  return claude.trendDown;
}

function summarizeFriction(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([k, v]) => `${k} ×${v}`).join(' · ');
}

export function SlideRecap({ data }: { data: ExplorerData }) {
  const lr = data.latestRecap;

  // No session in last 24h
  if (!lr) {
    return (
      <div>
        <div style={{ fontFamily: theme.sans, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-descriptionForeground)', marginBottom: 8 }}>
          Last session
        </div>
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--vscode-disabledForeground)', fontSize: 12, lineHeight: 1.5 }}>
          No recent session.<br />
          Recaps appear for sessions within the last 24h.
        </div>
      </div>
    );
  }

  // Session exists but Anthropic hasn't produced recap yet
  if (!lr.recap) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: theme.sans, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-descriptionForeground)' }}>
            Last session
          </span>
          <span style={{ fontFamily: theme.mono, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
            {relativeTime(lr.lastActivityTime)}
          </span>
        </div>
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--vscode-disabledForeground)', fontSize: 12, lineHeight: 1.5 }}>
          Recap pending.<br />
          Anthropic processes session data within 24h.
        </div>
      </div>
    );
  }

  const r = lr.recap;
  const meta = lr.meta;
  const frictionSummary = summarizeFriction(r.frictionCounts);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: theme.sans, fontSize: 12, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
          Last session
        </span>
        <span style={{ fontFamily: theme.mono, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          {relativeTime(lr.lastActivityTime)}
        </span>
      </div>

      {/* Quote — primary content */}
      <div style={{
        fontFamily: theme.serif,
        fontSize: 12, fontStyle: 'italic',
        color: 'var(--vscode-foreground)',
        padding: '6px 10px',
        borderLeft: `2px solid ${theme.coral}`,
        lineHeight: 1.5,
        marginBottom: 8,
      }}>
        &ldquo;{r.briefSummary}&rdquo;
      </div>

      {/* KV rows */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 3, fontFamily: theme.sans, fontSize: 11 }}>
        <span style={{ color: 'var(--vscode-disabledForeground)' }}>outcome</span>
        <span style={{ fontFamily: theme.mono, fontSize: 10, color: outcomeColor(r.outcome) }}>{r.outcome}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 3, fontFamily: theme.sans, fontSize: 11 }}>
        <span style={{ color: 'var(--vscode-disabledForeground)' }}>helpful</span>
        <span style={{ fontFamily: theme.mono, fontSize: 10, color: helpfulColor(r.claudeHelpfulness) }}>{r.claudeHelpfulness}</span>
      </div>

      {/* Meta line: +lines / -lines · commits · files */}
      {meta && (meta.linesAdded > 0 || meta.linesRemoved > 0 || meta.gitCommits > 0 || meta.filesModified > 0) && (
        <div style={{ marginTop: 8, fontFamily: theme.sans, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          <span style={{ color: claude.trendUp }}>+{meta.linesAdded}</span>
          {' / '}
          <span style={{ color: claude.trendDown }}>-{meta.linesRemoved}</span>
          {' lines · '}
          {meta.gitCommits} commit{meta.gitCommits === 1 ? '' : 's'}
          {' · '}
          {meta.filesModified} file{meta.filesModified === 1 ? '' : 's'}
        </div>
      )}

      {/* Friction */}
      {frictionSummary && (
        <div style={{ marginTop: 6, fontFamily: theme.sans, fontSize: 10, color: claude.trendDown }}>
          friction: {frictionSummary}
        </div>
      )}
    </div>
  );
}
