import { useEffect, useRef, useMemo } from 'preact/hooks';
import type { SessionDetail, SessionTimelineEvent } from '../../src/types';
import { getModelFamilyName } from '../utils/model-utils';

interface Props {
  /** undefined = closed, null = loading or no data, SessionDetail = render. */
  detail: SessionDetail | null | undefined;
  /** True while waiting for backend response (parent decides). */
  loading: boolean;
  onClose: () => void;
}

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return '<1m';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function projName(p: string): string {
  return p.split('/').filter(Boolean).pop() || p || '—';
}

function shortPath(p: string): string {
  if (!p) return '';
  if (p.length <= 50) return p;
  return '…' + p.slice(p.length - 49);
}

/** Strip projectPath prefix → relative path (or last 2 segments fallback for cross-project files). */
function relPath(full: string, root: string): string {
  if (!full) return '';
  if (root && full.startsWith(root)) {
    return full.slice(root.length).replace(/^\/+/, '') || full;
  }
  // Fallback: keep last 2 segments so it's still readable.
  const parts = full.split('/').filter(Boolean);
  return parts.length <= 2 ? full : '…/' + parts.slice(-2).join('/');
}

/** Split a relative path into [folder, filename] for two-tone display. */
function splitPath(rel: string): { folder: string; name: string } {
  const i = rel.lastIndexOf('/');
  return i < 0
    ? { folder: '', name: rel }
    : { folder: rel.slice(0, i + 1), name: rel.slice(i + 1) };
}

const MODAL_CSS = `
  .sd-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.55);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .sd-card {
    width: min(900px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--vscode-editor-background, var(--tok-bg-sunken));
    color: var(--tok-text-primary);
    border-radius: 12px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), var(--tok-ring);
    padding: 22px 26px;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  }
  .sd-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; margin-bottom: 16px;
  }
  .sd-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px; font-weight: 500; margin: 0; line-height: 1.25;
    color: var(--tok-text-primary);
  }
  .sd-meta { font-size: 11px; color: var(--tok-text-muted); margin-top: 4px; }
  .sd-close {
    background: transparent; border: 0; color: var(--tok-text-muted);
    cursor: pointer; padding: 4px 10px; font-size: 18px; line-height: 1;
    border-radius: 6px;
  }
  .sd-close:hover { background: var(--tok-bg-surface); color: var(--tok-text-primary); }
  .sd-section { margin: 16px 0; }
  .sd-section h4 {
    font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    margin: 0 0 8px 0; color: var(--tok-text-muted); font-weight: 500;
  }
  .sd-prompt {
    background: var(--tok-bg-surface); padding: 10px 12px; border-radius: 6px;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, monospace);
    font-size: 12px; line-height: 1.5; color: var(--tok-text-secondary);
    white-space: pre-wrap; word-wrap: break-word; max-height: 140px; overflow-y: auto;
  }
  .sd-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  }
  .sd-stat {
    background: var(--tok-bg-surface); padding: 10px 12px; border-radius: 6px;
    box-shadow: var(--tok-ring);
  }
  .sd-stat-k {
    font-size: 10px; color: var(--tok-text-muted);
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .sd-stat-v {
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    font-size: 16px; font-weight: 500; color: var(--tok-text-primary);
    font-variant-numeric: tabular-nums;
  }
  .sd-stat-n { font-size: 10px; color: var(--tok-text-secondary); margin-top: 2px; }
  .sd-mix-bar {
    display: flex; height: 8px; border-radius: 4px; overflow: hidden;
    background: var(--tok-bar-empty); margin: 6px 0 4px;
  }
  .sd-mix-bar > div { height: 100%; }
  .sd-mix-legend {
    display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: var(--tok-text-muted);
  }
  .sd-mix-dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px;
    vertical-align: middle;
  }
  .sd-tools-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px;
  }
  .sd-tool-row {
    display: flex; justify-content: space-between; gap: 8px;
    background: var(--tok-bg-surface); padding: 6px 10px; border-radius: 4px;
    font-size: 11px;
  }
  .sd-tool-row .n { color: var(--tok-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sd-tool-row .c {
    color: var(--tok-text-muted); font-family: var(--vscode-editor-font-family, monospace);
    font-variant-numeric: tabular-nums;
  }
  .sd-files {
    display: flex; flex-direction: column; gap: 0; max-height: 200px; overflow-y: auto;
    background: var(--tok-bg-surface); padding: 4px 0; border-radius: 6px;
  }
  .sd-file {
    display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    padding: 5px 12px;
    font-family: var(--vscode-editor-font-family, monospace); font-size: 11px;
    border-bottom: 1px solid var(--tok-divider);
  }
  .sd-file:last-child { border-bottom: 0; }
  .sd-file-path {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
  }
  .sd-file-folder { color: var(--tok-text-muted); }
  .sd-file-name   { color: var(--tok-text-primary); font-weight: 500; }
  .sd-file-edits {
    color: var(--tok-text-muted); font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .sd-timeline {
    display: flex; flex-direction: column; gap: 0;
    max-height: 320px; overflow-y: auto;
    background: var(--tok-bg-surface); border-radius: 6px;
    padding: 4px 0;
  }
  .sd-tl-row {
    display: grid; grid-template-columns: 64px 1fr auto; gap: 10px;
    padding: 6px 12px; border-bottom: 1px solid var(--tok-divider);
    align-items: baseline; font-size: 11px;
  }
  .sd-tl-row:last-child { border-bottom: 0; }
  .sd-tl-row.error { background: rgba(220, 80, 70, 0.08); }
  .sd-tl-time {
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--tok-text-muted); font-variant-numeric: tabular-nums;
  }
  .sd-tl-tools {
    color: var(--tok-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sd-tl-tool {
    display: inline-block; padding: 1px 6px; border-radius: 3px;
    background: rgba(127, 127, 127, 0.12); margin-right: 4px;
    font-family: var(--vscode-editor-font-family, monospace);
  }
  .sd-tl-cost {
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--tok-text-muted); font-variant-numeric: tabular-nums;
  }
  .sd-outcome {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 500;
  }
  .sd-outcome.fully_achieved   { background: rgba(46, 160, 67, 0.18); color: var(--tok-success, #2ea043); }
  .sd-outcome.partially_achieved { background: rgba(218, 165, 32, 0.18); color: var(--tok-warning, #d4a017); }
  .sd-outcome.not_achieved     { background: rgba(220, 80, 70, 0.18); color: var(--tok-danger, #dc5046); }
  .sd-loading { padding: 32px; text-align: center; color: var(--tok-text-muted); font-size: 12px; }
`;

/** Drill-down modal — shows session timeline + tools + tokens + outcome. ESC closes. */
export function SessionDetailModal({ detail, loading, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ESC closes; click on overlay (outside card) closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Sort tools desc by count for display.
  const sortedTools = useMemo(() => {
    if (!detail) return [] as Array<[string, number]>;
    return Object.entries(detail.toolCounts).sort((a, b) => b[1] - a[1]);
  }, [detail]);

  return (
    <div
      class="sd-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Session detail"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{MODAL_CSS}</style>
      <div class="sd-card" ref={cardRef as any}>
        {loading || !detail ? (
          <>
            <div class="sd-head">
              <div>
                <h3 class="sd-title">Session</h3>
                <div class="sd-meta">{loading ? 'Loading…' : 'No data for this session.'}</div>
              </div>
              <button class="sd-close" type="button" onClick={onClose} aria-label="Close">×</button>
            </div>
            {loading && <div class="sd-loading">Loading session detail…</div>}
          </>
        ) : (
          <>
            <ModalContent detail={detail} sortedTools={sortedTools} onClose={onClose} />
          </>
        )}
      </div>
    </div>
  );
}

function ModalContent({
  detail, sortedTools, onClose,
}: {
  detail: SessionDetail;
  sortedTools: Array<[string, number]>;
  onClose: () => void;
}) {
  const totalTools = sortedTools.reduce((s, [, n]) => s + n, 0);
  const m = detail.tokenMix;
  return (
    <>
      <div class="sd-head">
        <div>
          <h3 class="sd-title">{projName(detail.projectPath)} · {fmtTime(detail.startTs)}</h3>
          <div class="sd-meta">
            {[
              getModelFamilyName(detail.model),
              fmtDur(detail.durationMinutes),
              `${totalTools} tool calls`,
              detail.sessionId.slice(0, 8),
            ].join(' · ')}
            {detail.outcome && (
              <>
                {' · '}
                <span class={`sd-outcome ${detail.outcome}`}>{detail.outcome.replaceAll('_', ' ')}</span>
              </>
            )}
          </div>
        </div>
        <button class="sd-close" type="button" onClick={onClose} aria-label="Close">×</button>
      </div>

      {detail.firstPrompt && (
        <div class="sd-section">
          <h4>First prompt</h4>
          <div class="sd-prompt">{detail.firstPrompt}</div>
        </div>
      )}

      {detail.briefSummary && (
        <div class="sd-section">
          <h4>Summary</h4>
          <div class="sd-prompt">{detail.briefSummary}</div>
        </div>
      )}

      <div class="sd-section">
        <h4>Stats</h4>
        <div class="sd-stats">
          <div class="sd-stat">
            <div class="sd-stat-k">Cost</div>
            <div class="sd-stat-v">${detail.totalCostUsd.toFixed(2)}</div>
            {detail.cacheSavingsUsd > 0 && (
              <div class="sd-stat-n">saved ${detail.cacheSavingsUsd.toFixed(2)}</div>
            )}
          </div>
          <div class="sd-stat">
            <div class="sd-stat-k">Tokens</div>
            <div class="sd-stat-v">{fmtTokens(detail.totalTokens)}</div>
            <div class="sd-stat-n">{fmtTokens(m.output)} out · {fmtTokens(m.cache)} cache</div>
          </div>
          <div class="sd-stat">
            <div class="sd-stat-k">Tools</div>
            <div class="sd-stat-v">{totalTools}</div>
            <div class="sd-stat-n">{sortedTools.length} kinds</div>
          </div>
          <div class="sd-stat">
            <div class="sd-stat-k">Duration</div>
            <div class="sd-stat-v">{fmtDur(detail.durationMinutes)}</div>
            <div class="sd-stat-n">{fmtTime(detail.startTs)}–{fmtTime(detail.endTs)}</div>
          </div>
        </div>
      </div>

      <div class="sd-section">
        <h4>Token mix</h4>
        <div class="sd-mix-bar" aria-hidden="true">
          <div title={`output ${m.outputPct.toFixed(0)}%`} style={{ width: `${m.outputPct}%`, background: 'var(--tok-accent-primary)' }} />
          <div title={`input ${m.inputPct.toFixed(0)}%`} style={{ width: `${m.inputPct}%`, background: 'var(--tok-accent-hover)' }} />
          <div title={`cache read ${m.cachePct.toFixed(0)}%`} style={{ width: `${m.cachePct}%`, background: 'var(--tok-text-secondary)', opacity: 0.55 }} />
          <div title={`cache create ${m.cacheCreationPct.toFixed(0)}%`} style={{ width: `${m.cacheCreationPct}%`, background: 'var(--tok-warning, #d4a017)' }} />
        </div>
        <div class="sd-mix-legend">
          <span><span class="sd-mix-dot" style={{ background: 'var(--tok-accent-primary)' }} />output {m.outputPct.toFixed(0)}%</span>
          <span><span class="sd-mix-dot" style={{ background: 'var(--tok-accent-hover)' }} />input {m.inputPct.toFixed(0)}%</span>
          <span><span class="sd-mix-dot" style={{ background: 'var(--tok-text-secondary)', opacity: 0.55 }} />cache read {m.cachePct.toFixed(0)}%</span>
          <span><span class="sd-mix-dot" style={{ background: 'var(--tok-warning, #d4a017)' }} />cache create {m.cacheCreationPct.toFixed(0)}%</span>
        </div>
      </div>

      {sortedTools.length > 0 && (
        <div class="sd-section">
          <h4>Tools</h4>
          <div class="sd-tools-grid">
            {sortedTools.slice(0, 24).map(([name, count]) => (
              <div key={name} class="sd-tool-row" title={`${name} · ${count} call${count === 1 ? '' : 's'}`}>
                <span class="n">{name}</span>
                <span class="c">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.filesEdited.length > 0 && (
        <div class="sd-section">
          <h4>Files edited · {detail.filesEdited.length}</h4>
          <div class="sd-files">
            {detail.filesEdited.slice(0, 50).map(f => {
              const rel = relPath(f.path, detail.projectPath);
              const { folder, name } = splitPath(rel);
              return (
                <div key={f.path} class="sd-file" title={f.path}>
                  <span class="sd-file-path">
                    {folder && <span class="sd-file-folder">{folder}</span>}
                    <span class="sd-file-name">{name}</span>
                  </span>
                  <span class="sd-file-edits">{f.edits}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detail.timeline.length > 0 && (
        <div class="sd-section">
          <h4>Activity · {detail.timeline.length} step{detail.timeline.length === 1 ? '' : 's'}</h4>
          <div class="sd-timeline">
            {detail.timeline.map((e, i) => <TimelineRow key={i} ev={e} />)}
          </div>
        </div>
      )}
    </>
  );
}

function TimelineRow({ ev }: { ev: SessionTimelineEvent }) {
  const summary = ev.tools.length === 0
    ? <span style={{ color: 'var(--tok-text-muted)' }}>(message)</span>
    : (
      <span>
        {ev.tools.slice(0, 4).map((t, i) => (
          <span key={i} class="sd-tl-tool" title={t.path ?? t.name}>
            {t.name}{t.path ? ` ${shortPath(t.path)}` : ''}
          </span>
        ))}
        {ev.tools.length > 4 && <span style={{ color: 'var(--tok-text-muted)' }}>+{ev.tools.length - 4}</span>}
      </span>
    );
  return (
    <div class={`sd-tl-row${ev.hasError ? ' error' : ''}`}>
      <div class="sd-tl-time">{fmtTime(ev.ts)}</div>
      <div class="sd-tl-tools">{summary}</div>
      <div class="sd-tl-cost">{ev.costUsd >= 0.01 ? `$${ev.costUsd.toFixed(2)}` : '—'}</div>
    </div>
  );
}
