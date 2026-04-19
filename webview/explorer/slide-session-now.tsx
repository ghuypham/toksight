import type { ExplorerData } from '../../src/types';
import { theme, claude } from '../styles/theme';
import { getModelFamilyName, buildModelColorMap } from '../utils/model-utils';

/**
 * Slide 2 — SESSION NOW (v2, mockup-aligned).
 * Answers "how's this session going?" + "what models am I spending on today?"
 *
 * Layout:
 *   Title — project · model
 *   Context · Xk / Yk · N%  + bar
 *   /compact hint at ≥70%
 *   Cell row: Spent · Burn · Saved
 *   Today: model stack + top 3 model rows + tail
 */

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(2);
  if (n < 100) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}

function fmtBurn(n: number): string {
  if (n < 0.01) return '$0.00';
  if (n < 1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(1);
}

function fmtMinutes(m: number): string {
  if (m < 1) return '< 1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function projectName(path: string): string {
  if (!path) return 'session';
  return path.split('/').pop() || path;
}

function Cell({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--vscode-disabledForeground)', marginBottom: 2 }}>
        {k}
      </div>
      <div style={{ fontFamily: theme.mono, fontSize: 12, fontWeight: 600, color: color ?? 'var(--vscode-foreground)' }}>
        {v}
      </div>
    </div>
  );
}

export function SlideSessionNow({ data }: { data: ExplorerData }) {
  const s = data.activeSessionDetail;
  if (!s) {
    return (
      <div>
        <div style={{ fontFamily: theme.sans, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-descriptionForeground)', marginBottom: 8 }}>
          Session
        </div>
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--vscode-disabledForeground)', fontSize: 12 }}>
          No active Claude session.
        </div>
      </div>
    );
  }

  const ctxColor = s.contextPct >= 80 ? claude.trendDown
                 : s.contextPct >= 70 ? 'var(--tok-warning, #d79b3f)'
                 : 'var(--vscode-foreground)';
  const showCompactHint = s.contextPct >= 70;

  // Burn rate — prefer session-level; fall back to global nowPerMin
  const burn = s.burnRatePerMin > 0 ? s.burnRatePerMin : data.burnRate.nowPerMin;

  // Model mix today — top 3 rows + tail aggregator
  const mix = data.modelMixToday.slice().sort((a, b) => b.cost - a.cost);
  const topMix = mix.slice(0, 3);
  const tail = mix.slice(3);
  const tailCost = tail.reduce((sum, m) => sum + m.cost, 0);
  // Distinct color per row, palette ordered by descending cost
  const colorMap = buildModelColorMap(mix.map((m) => m.model));

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: theme.sans, fontSize: 12, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
          {projectName(s.projectPath)} · <span style={{ color: 'var(--vscode-descriptionForeground)', fontWeight: 500 }}>{getModelFamilyName(s.model)}</span>
        </span>
        <span style={{ fontFamily: theme.mono, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
          {fmtMinutes(s.durationMinutes)}
        </span>
      </div>

      {/* Context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontFamily: theme.sans, fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
          Context · {(s.contextTokens / 1000).toFixed(0)}k / {(s.contextLimit / 1000).toFixed(0)}k
        </span>
        <span style={{ fontFamily: theme.mono, fontSize: 12, fontWeight: 600, color: ctxColor }}>
          {s.contextPct}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--vscode-input-background)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(s.contextPct, 100)}%`, background: ctxColor, transition: 'width 0.4s ease' }} />
      </div>
      {showCompactHint && (
        <div style={{ marginTop: 4, fontSize: 10, color: claude.trendDown, fontFamily: theme.sans }}>
          Run <code style={{ fontFamily: theme.mono, padding: '0 3px', background: 'var(--vscode-input-background)', borderRadius: 2 }}>/compact</code> to free context
        </div>
      )}

      {/* Cell row: Spent · Burn · Saved */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--vscode-widget-border)' }}>
        <Cell k="Spent" v={fmtCost(data.activeSessionSpent)} color={theme.coral} />
        <Cell k="Burn" v={`${fmtBurn(burn)}/m`} />
        <Cell k="Saved" v={fmtCost(data.activeSessionSaved)} color={claude.trendUp} />
      </div>

      {/* Model mix today */}
      {mix.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--vscode-widget-border)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--vscode-disabledForeground)', marginBottom: 4 }}>
            Today
          </div>
          {/* stack bar */}
          <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            {mix.map((m) => (
              <div key={m.model} title={`${m.model} · ${Math.round(m.percentage)}%`} style={{
                width: `${m.percentage}%`,
                background: colorMap[m.model],
              }} />
            ))}
          </div>
          {/* rows */}
          {topMix.map((m) => (
            <div key={m.model} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 3, fontFamily: theme.sans, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--vscode-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorMap[m.model], flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.model}</span>
              </span>
              <span style={{ fontFamily: theme.mono, color: 'var(--vscode-descriptionForeground)', fontSize: 10, flexShrink: 0 }}>
                {fmtCost(m.cost)} · {Math.round(m.percentage)}%
              </span>
            </div>
          ))}
          {tail.length > 0 && (
            <div style={{ marginTop: 3, fontFamily: theme.sans, fontSize: 10, color: 'var(--vscode-disabledForeground)' }}>
              +{tail.length} other · {fmtCost(tailCost)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
