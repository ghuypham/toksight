import type { AgentTreeNode, SessionAgentTree } from '../../src/types';
import { GroupHeader } from './group-header';

function fmtCost(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toFixed(1);
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

function shortModel(model: string): string {
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return model;
}

const rowStyle: Record<string, string | number> = {
  padding: '4px 0',
  cursor: 'pointer',
  borderRadius: 4,
  transition: 'background 0.15s ease',
};

const typeStyle: Record<string, string | number> = {
  fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
  fontSize: 11,
  color: 'var(--tok-text-primary)',
  fontWeight: 500,
};

const descStyle: Record<string, string | number> = {
  fontSize: 10,
  color: 'var(--tok-text-muted)',
  fontStyle: 'italic',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const metaStyle: Record<string, string | number> = {
  fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--tok-text-muted)',
  opacity: 0.8,
};

const costStyle: Record<string, string | number> = {
  fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
  fontSize: 10,
  color: 'var(--tok-text-muted)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

/** Format elapsed time as "active" or "Xm ago" / "Xh ago" */
function fmtStatus(lastActivity: string): { label: string; isActive: boolean } {
  const elapsed = Date.now() - new Date(lastActivity).getTime();
  if (elapsed < 5 * 60_000) return { label: 'active', isActive: true };
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 60) return { label: `${minutes}m ago`, isActive: false };
  const hours = Math.round(minutes / 60);
  return { label: `${hours}h ago`, isActive: false };
}

/** Agent node row. */
function AgentNode({ node }: { node: AgentTreeNode }) {
  const status = fmtStatus(node.lastActivityTime);
  return (
    <div
      style={rowStyle}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--tok-hover-bg, rgba(128,128,128,0.06))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={typeStyle}>
          {node.agentType}
          {status.isActive
            ? <span style={{ fontSize: 8, color: 'var(--tok-severity-safe, #22c55e)', marginLeft: 6 }}>● active</span>
            : <span style={{ fontSize: 8, color: 'var(--tok-text-muted)', marginLeft: 6, opacity: 0.6 }}>{status.label}</span>
          }
        </span>
        <span style={costStyle}>{fmtCost(node.cost)}</span>
      </div>
      {node.description && (
        <div style={descStyle}>"{node.description}"</div>
      )}
      <div style={metaStyle}>
        {shortModel(node.model)} · {node.messageCount} msgs · {fmtTokens(node.tokens)} tok
      </div>
    </div>
  );
}

interface Props {
  agentTree: SessionAgentTree | null | undefined;
}

/** Sidebar AGENTS group — renders nothing when agentTree is null or empty. */
export function GroupAgentTree({ agentTree }: Props) {
  if (!agentTree || agentTree.agents.length === 0) return null;

  return (
    <GroupHeader label="SUB-AGENTS">
      {/* Summary bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10,
        color: 'var(--tok-text-muted)',
        padding: '2px 4px 6px',
        borderBottom: '1px solid var(--tok-text-muted, rgba(128,128,128,0.15))',
        marginBottom: 6,
        opacity: 0.7,
      }}>
        <span>{agentTree.agents.length} dispatched</span>
        <span style={{ fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}>{fmtCost(agentTree.totalAgentCost)} total</span>
      </div>
      {agentTree.agents.map((agent) => (
        <AgentNode key={agent.agentId} node={agent} />
      ))}
    </GroupHeader>
  );
}
