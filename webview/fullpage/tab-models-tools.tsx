import { useMemo } from 'preact/hooks';
import type { WebviewData } from '../../src/types';
import { buildModelColorMap, isVisibleModelRow } from '../utils/model-utils';
import { useTimeRange } from './time-range-context';

function fmtTokK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString()}k`;
  return n.toLocaleString();
}

export function TabModelsTools({ data }: { data: Partial<WebviewData> }) {
  const { range } = useTimeRange();
  const periodLabel = range === 'today' ? 'Today' : range === '7d' ? '7d' : range === '30d' ? '30d' : 'All time';

  const modelMix   = (data.modelMix ?? []).filter(isVisibleModelRow);
  const tools      = data.tools      ?? [];
  const mcp        = data.mcp        ?? [];
  const skills     = data.skills     ?? [];
  const agents     = data.agents     ?? [];
  const tb         = data.tokenBreakdown;
  const outputRatio = data.usage?.outputRatio ?? 0;
  const cacheRate  = data.usage?.cacheRate    ?? 0;
  const cacheSaved = data.cacheSavings        ?? 0;
  const metadata   = data.sessionMetadata     ?? {};

  /* Aggregate tool-error counts across all sessions */
  const toolErrorMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const meta of Object.values(metadata)) {
      for (const [tool, count] of Object.entries(meta.toolErrorCategories ?? {})) {
        map.set(tool, (map.get(tool) ?? 0) + count);
      }
    }
    return map;
  }, [metadata]);

  /* Deterministic distinct color per model ID — replaces static MODEL_COLORS
   * that previously collapsed three warm tones into near-identical hues. */
  const modelColorMap = useMemo(
    () => buildModelColorMap(modelMix.map(m => m.model)),
    [modelMix],
  );

  return (
    <div data-tab="models-tools">
      {/* ── Model mix ── */}
      {modelMix.length > 0 && (
        <div class="fp-section">
          <h3>Model mix</h3>
          {/* Stacked bar — distinct hue per model ID */}
          <div class="model-stack" style={{ height: '14px', borderRadius: '7px' }}>
            {modelMix.map(m => (
              <div
                key={m.model}
                style={{
                  width: `${m.percentage}%`,
                  background: modelColorMap[m.model],
                }}
              />
            ))}
          </div>
          {/* Legend rows — chip uses same color as bar segment */}
          {modelMix.map(m => (
            <div key={m.model} class="mt-row">
              <span class="n">
                <span
                  class="model-chip"
                  style={{ background: modelColorMap[m.model] }}
                />
                {m.model}
              </span>
              <span class="s">
                ${m.cost.toFixed(2)} · {m.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Token breakdown ── */}
      {tb && (
        <div class="fp-section">
          <h3>Token breakdown · {periodLabel}</h3>
          <div class="token-cells">
            <div class="tc">
              <div class="tc-k">Input</div>
              <div class="tc-v">{tb.input.toLocaleString()}</div>
            </div>
            <div class="tc">
              <div class="tc-k">Output</div>
              <div class="tc-v">{tb.output.toLocaleString()}</div>
            </div>
            <div class="tc">
              <div class="tc-k">Cache read</div>
              <div class="tc-v">{fmtTokK(tb.cache)}</div>
            </div>
            <div class="tc">
              <div class="tc-k">Cache create</div>
              <div class="tc-v">{fmtTokK(tb.cacheCreation)}</div>
            </div>
          </div>
          {outputRatio > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div class="fp-row">
                <span class="fp-row-label">Output ratio</span>
                <span class="fp-row-value accent">{(outputRatio * 100).toFixed(1)}%</span>
              </div>
              <div class="fp-bar">
                <div class="fp-bar-fill" style={{ width: `${Math.min(outputRatio * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tools table ── */}
      {tools.length > 0 && (
        <div class="fp-section">
          <h3>Tools · {periodLabel}</h3>
          <table class="fp">
            <thead>
              <tr>
                <th>Tool</th>
                <th class="num">Calls</th>
                <th class="num">Tokens</th>
                <th class="num">Cost</th>
                <th class="num">Errors</th>
              </tr>
            </thead>
            <tbody>
              {tools.slice(0, 10).map(t => {
                const errs = toolErrorMap.get(t.name) ?? 0;
                return (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td class="num">{t.calls}</td>
                    <td class="num">{fmtTokK(t.tokens)}</td>
                    <td class="num">${t.cost.toFixed(2)}</td>
                    <td class="num" style={errs > 0 ? { color: 'var(--tok-danger)' } : undefined}>
                      {errs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MCP Servers ── */}
      {mcp.length > 0 && (
        <div class="fp-section">
          <h3>MCP Servers</h3>
          <p style={{ fontSize: '11px', color: 'var(--tok-text-muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            External tool servers connected to Claude via Model Context Protocol — file systems, databases, APIs, and custom integrations.
          </p>
          <SurfaceTable items={mcp} />
        </div>
      )}

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <div class="fp-section">
          <h3>Skills invoked</h3>
          <p style={{ fontSize: '11px', color: 'var(--tok-text-muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            Reusable workflow templates (superpowers) triggered by Claude during this session — codified expertise loaded on demand.
          </p>
          <SurfaceTable items={skills} />
        </div>
      )}

      {/* ── Agents ── */}
      {agents.length > 0 && (
        <div class="fp-section">
          <h3>Agents dispatched</h3>
          <p style={{ fontSize: '11px', color: 'var(--tok-text-muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            Sub-agents spawned via the Task tool to handle specialized work in parallel — each runs as an independent Claude context.
          </p>
          <SurfaceTable items={agents} />
        </div>
      )}

      {/* ── Cache performance ── */}
      {tb && (cacheRate > 0 || cacheSaved > 0 || tb.cache > 0) && (
        <div class="fp-section">
          <h3>Cache performance</h3>
          <div class="cache-card">
            <div class="cc-row">
              <span class="cc-k">Hit rate</span>
              <span class="cc-v">{cacheRate > 0 ? `${Math.round(cacheRate * 100)}%` : '—'}</span>
            </div>
            <div class="cc-row">
              <span class="cc-k">Read tokens</span>
              <span class="cc-v">{tb.cache.toLocaleString()}</span>
            </div>
            <div class="cc-row">
              <span class="cc-k">Create tokens</span>
              <span class="cc-v">{tb.cacheCreation > 0 ? tb.cacheCreation.toLocaleString() : '—'}</span>
            </div>
            <div class="cc-row">
              <span class="cc-k">Saved this week</span>
              <span class="cc-v">${cacheSaved.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Stat = { name: string; calls: number; tokens: number; cost: number };

/** Full-width table for MCP / Skill / Agent surfaces with per-call cost and share bar. */
function SurfaceTable({ items }: { items: Stat[] }) {
  const maxCalls = Math.max(...items.map(i => i.calls), 1);
  const totalCalls = items.reduce((s, i) => s + i.calls, 0);
  const totalCost  = items.reduce((s, i) => s + i.cost, 0);
  const totalTokens = items.reduce((s, i) => s + i.tokens, 0);
  return (
    <>
      <table class="fp">
        <thead>
          <tr>
            <th>Name</th>
            <th class="num">Calls</th>
            <th class="num">Tokens</th>
            <th class="num">Cost</th>
            <th class="num">$/call</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 15).map(it => (
            <tr key={it.name}>
              <td style={{ fontFamily: '"SF Mono", Consolas, monospace', fontSize: '11px' }}>{it.name}</td>
              <td class="num">{it.calls}</td>
              <td class="num">{fmtTokK(it.tokens)}</td>
              <td class="num">${it.cost.toFixed(3)}</td>
              <td class="num" style={{ color: 'var(--tok-text-muted)' }}>
                {it.calls > 0 ? `$${(it.cost / it.calls).toFixed(3)}` : '—'}
              </td>
              <td>
                <div class="share-bar">
                  <div style={{ width: `${(it.calls / maxCalls) * 100}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1px solid var(--tok-divider)', fontWeight: 500 }}>
            <td style={{ color: 'var(--tok-text-muted)', fontSize: '11px' }}>
              {items.length} {items.length === 1 ? 'entry' : 'entries'} total
            </td>
            <td class="num" style={{ color: 'var(--tok-text-muted)' }}>{totalCalls}</td>
            <td class="num" style={{ color: 'var(--tok-text-muted)' }}>{fmtTokK(totalTokens)}</td>
            <td class="num" style={{ color: 'var(--tok-text-muted)' }}>${totalCost.toFixed(3)}</td>
            <td class="num" style={{ color: 'var(--tok-text-muted)' }}>
              {totalCalls > 0 ? `$${(totalCost / totalCalls).toFixed(3)}` : '—'}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </>
  );
}
