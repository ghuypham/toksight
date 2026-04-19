import { useMemo } from 'preact/hooks';
import type { WebviewData } from '../../src/types';
import { buildModelColorMap } from '../utils/model-utils';

function fmtTokK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString()}k`;
  return n.toLocaleString();
}

export function TabModelsTools({ data }: { data: Partial<WebviewData> }) {
  const modelMix   = data.modelMix   ?? [];
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

      {/* ── Token breakdown · 7d ── */}
      {tb && (
        <div class="fp-section">
          <h3>Token breakdown · 7d</h3>
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

      {/* ── Tools table · 7d ── */}
      {tools.length > 0 && (
        <div class="fp-section">
          <h3>Tools · 7d</h3>
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

      {/* ── MCP · Skills · Agents ── three equal-rank extension surfaces.
         Each column: top-N rows with share bar (% of that column's max calls),
         total-calls / total-cost footer row. */}
      {(mcp.length > 0 || skills.length > 0 || agents.length > 0) && (
        <div class="fp-section">
          <h3>MCP · Skills · Agents</h3>
          <div class="three-col">
            <StatsColumn title="MCP servers" items={mcp} emptyLabel="No MCP calls yet" />
            <StatsColumn title="Skills invoked" items={skills} emptyLabel="No Skill calls yet" />
            <StatsColumn title="Agents dispatched" items={agents} emptyLabel="No Task agents yet" />
          </div>
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

/** Entry shape shared by MCP, Skill, Agent — all three surfaces carry the same
 * call/tokens/cost fields so a single column component handles all three. */
type Stat = { name: string; calls: number; tokens: number; cost: number };

/**
 * Single drill column: top-8 rows with share bar (% of max calls in this column),
 * footer shows column totals. Empty state keeps column width stable so the 3-col
 * grid doesn't reflow when one surface has no data.
 */
function StatsColumn({ title, items, emptyLabel }: { title: string; items: Stat[]; emptyLabel: string }) {
  const maxCalls = Math.max(...items.map(i => i.calls), 1);
  const totalCalls = items.reduce((s, i) => s + i.calls, 0);
  const totalCost  = items.reduce((s, i) => s + i.cost, 0);
  return (
    <div class="drill-card">
      <h4>{title}</h4>
      {items.length === 0 && (
        <div class="mt-row">
          <span class="n" style={{ color: 'var(--tok-text-muted)' }}>{emptyLabel}</span>
        </div>
      )}
      {items.slice(0, 8).map(it => (
        <div key={it.name} class="mt-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '3px' }}>
          <span class="n" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
          <span class="s">
            {it.calls}× {it.cost >= 0.01 ? ` · $${it.cost.toFixed(2)}` : ''}
          </span>
          <div style={{ gridColumn: '1 / -1', height: '3px', background: 'var(--tok-bar-empty)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(it.calls / maxCalls) * 100}%`, height: '100%', background: 'var(--tok-accent-primary)' }} />
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <div class="mt-row" style={{ borderTop: '1px solid var(--tok-divider)', marginTop: '6px', paddingTop: '6px' }}>
          <span class="n" style={{ color: 'var(--tok-text-muted)' }}>
            {items.length} total · {totalCalls} calls
          </span>
          <span class="s">${totalCost.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
