import type { WebviewData } from '../../src/types';
import { GroupHeader } from './group-header';
import { GroupEmpty } from './group-empty';
import { getModelDisplayName, buildModelColorMap } from '../utils/model-utils';

/** Shared styles for subsection label (.mt-sub) */
const mtSubStyle: Record<string, string | number> = {
  fontSize: 9,
  color: 'var(--tok-text-muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '8px 0 3px 0',
};

/** Shared styles for one data row (.mt-row) */
const mtRowStyle: Record<string, string | number> = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 4,
  padding: '2px 0',
  fontSize: 11,
  alignItems: 'baseline',
};

const mtNameStyle: Record<string, string | number> = {
  fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
  fontSize: 10,
  color: 'var(--tok-text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const mtStatStyle: Record<string, string | number> = {
  fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
  fontSize: 10,
  color: 'var(--tok-text-muted)',
};

/** Colored model chip dot (8×8px square) — color resolved from caller-provided map */
function ModelChip({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: 2,
      background: color,
      flexShrink: 0,
    }} />
  );
}

/** Stacked model mix bar (full-width, 6px tall) */
function ModelStack({
  modelMix,
  colorMap,
}: {
  modelMix: Array<{ model: string; percentage: number; cost: number }>;
  colorMap: Record<string, string>;
}) {
  return (
    <div style={{
      display: 'flex',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      background: 'var(--tok-bg-sunken)',
      marginBottom: 4,
    }}>
      {modelMix.map((m) => (
        <div
          key={m.model}
          title={`${getModelDisplayName(m.model)}: ${Math.round(m.percentage)}%`}
          style={{
            width: `${m.percentage}%`,
            background: colorMap[m.model],
            minWidth: m.percentage > 0 ? 2 : 0,
          }}
        />
      ))}
    </div>
  );
}

function fmtCostShort(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toFixed(1);
}

function fmtTokens(t: number): string {
  if (t >= 1000) return (t / 1000).toFixed(0) + 'k tok';
  return t + ' tok';
}

/**
 * GROUP: MODELS & TOOLS — 3 subsections matching mockup:
 *   Model mix → stacked bar + per-model mt-row (chip + name · $cost · %)
 *   Top tools → up to 5 mt-row (name · calls · tokens)
 *   MCP · Skills → up to 5 mt-row (name · calls)
 */
export function GroupModelsTools({ data }: { data: WebviewData }) {
  const hasModels = data.modelMix.length > 0;
  const hasTools = data.tools && data.tools.length > 0;
  const hasMcp = data.mcp && data.mcp.length > 0;
  const hasSkills = data.skills && data.skills.length > 0;

  if (!hasModels && !hasTools && !hasMcp && !hasSkills) {
    return (
      <GroupHeader label="Models & Tools">
        <GroupEmpty tight>No tool activity yet.</GroupEmpty>
      </GroupHeader>
    );
  }

  // Merge MCP + Skills into one subsection, sorted by calls desc
  const mcpSkills = [
    ...(data.mcp ?? []).map((m) => ({ name: m.name, calls: m.calls })),
    ...(data.skills ?? []).map((s) => ({ name: s.name, calls: s.calls })),
  ].sort((a, b) => b.calls - a.calls).slice(0, 5);

  // Distinct color per model row — palette indexed by mix order
  const colorMap = buildModelColorMap(data.modelMix.map((m) => m.model));

  return (
    <GroupHeader label="Models & Tools">
      {/* Model mix subsection */}
      {hasModels && (
        <>
          <div style={{ ...mtSubStyle, marginTop: 0 }}>Model mix</div>
          <ModelStack modelMix={data.modelMix} colorMap={colorMap} />
          {data.modelMix.map((m) => (
            <div key={m.model} style={mtRowStyle}>
              <span style={mtNameStyle}>
                <ModelChip color={colorMap[m.model]} />
                {getModelDisplayName(m.model)}
              </span>
              <span style={mtStatStyle}>
                {fmtCostShort(m.cost)} · {Math.round(m.percentage)}%
              </span>
            </div>
          ))}
        </>
      )}

      {/* Top tools subsection */}
      {hasTools && (
        <>
          <div style={mtSubStyle}>Top tools</div>
          {data.tools.slice(0, 5).map((t) => (
            <div key={t.name} style={mtRowStyle}>
              <span style={mtNameStyle}>{t.name}</span>
              <span style={mtStatStyle}>{t.calls} · {fmtTokens(t.tokens)}</span>
            </div>
          ))}
        </>
      )}

      {/* MCP · Skills subsection */}
      {mcpSkills.length > 0 && (
        <>
          <div style={mtSubStyle}>MCP · Skills</div>
          {mcpSkills.map((s) => (
            <div key={s.name} style={mtRowStyle}>
              <span style={mtNameStyle}>{s.name}</span>
              <span style={mtStatStyle}>{s.calls} calls</span>
            </div>
          ))}
        </>
      )}
    </GroupHeader>
  );
}
