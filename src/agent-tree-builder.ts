import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentTreeNode, SessionAgentTree, TokenUsage } from './types';
import { calculateCost } from './pricing-table';

/** Subagent is "active" if its JSONL was written within this window */
const AGENT_ACTIVE_THRESHOLD_MS = 5 * 60_000; // 5 minutes

/** Max agents to return (active-first, then most recent) */
const MAX_AGENTS = 5;

/** Cache parsed agent data keyed by agentId — invalidated when JSONL mtime changes */
const agentCache = new Map<string, { mtimeMs: number; node: Omit<AgentTreeNode, 'children'> }>();

/** Clear cache (for testing) */
export function clearAgentCache(): void { agentCache.clear(); }

function readAgentMeta(metaPath: string, agentId: string): { agentType: string; description: string } {
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      agentType: (data.agentType as string) ?? agentId,
      description: (data.description as string) ?? '',
    };
  } catch {
    return { agentType: agentId, description: '' };
  }
}

function parseSubagentUsage(jsonlPath: string): {
  tokens: number; cost: number; model: string; messageCount: number;
} {
  const result = { tokens: 0, cost: 0, model: 'unknown', messageCount: 0 };
  try {
    const content = fs.readFileSync(jsonlPath, 'utf-8');
    const lines = content.split('\n');
    const modelCounts = new Map<string, number>();

    for (const line of lines) {
      if (!line.trim()) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(line);
      } catch {
        continue;
      }
      if (data.type !== 'assistant') continue;
      const message = data.message as Record<string, unknown> | undefined;
      if (!message) continue;

      const rawUsage = message.usage as Record<string, number> | undefined;
      if (!rawUsage) continue;

      const usage: TokenUsage = {
        inputTokens: rawUsage.input_tokens ?? 0,
        outputTokens: rawUsage.output_tokens ?? 0,
        cacheCreationTokens: rawUsage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: rawUsage.cache_read_input_tokens ?? 0,
      };

      const model = (message.model as string) ?? 'claude-sonnet-4-6';
      const msgTokens = usage.inputTokens + usage.outputTokens +
        usage.cacheCreationTokens + usage.cacheReadTokens;
      const msgCost = calculateCost(usage, model);

      result.tokens += msgTokens;
      result.cost += msgCost;
      result.messageCount++;
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    }

    if (modelCounts.size > 0) {
      result.model = [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  } catch {
    // File read failed — return zeroes
  }
  return result;
}

/**
 * Build agent tree for a session directory.
 * Scans {sessionDir}/subagents/ for agent-{id}.meta.json + agent-{id}.jsonl.
 * Skips compact files (agent-acompact-*) to avoid double-counting.
 */
export function buildAgentTree(sessionDir: string, sessionId: string): SessionAgentTree {
  const empty: SessionAgentTree = { sessionId, agents: [], totalAgentCost: 0, totalAgentTokens: 0 };
  const subagentsDir = path.join(sessionDir, 'subagents');

  if (!fs.existsSync(subagentsDir)) return empty;

  let files: string[];
  try {
    files = fs.readdirSync(subagentsDir) as unknown as string[];
  } catch {
    return empty;
  }

  const agentIds = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.jsonl')) continue;
    if (file.includes('compact')) continue;
    const match = file.match(/^agent-(.+)\.jsonl$/);
    if (match) agentIds.add(match[1]);
  }

  const agents: AgentTreeNode[] = [];
  let totalCost = 0;
  let totalTokens = 0;

  for (const agentId of agentIds) {
    const jsonlPath = path.join(subagentsDir, `agent-${agentId}.jsonl`);

    // Cache hit: skip re-parse if JSONL file hasn't changed
    let mtimeMs = 0;
    try { mtimeMs = fs.statSync(jsonlPath).mtimeMs; } catch { /* missing file */ }
    const cached = agentCache.get(agentId);
    if (cached && cached.mtimeMs === mtimeMs) {
      agents.push({ ...cached.node, children: [] });
      totalCost += cached.node.cost;
      totalTokens += cached.node.tokens;
      continue;
    }

    const metaPath = path.join(subagentsDir, `agent-${agentId}.meta.json`);
    const meta = readAgentMeta(metaPath, agentId);
    const usage = parseSubagentUsage(jsonlPath);

    const node = {
      agentId,
      agentType: meta.agentType,
      description: meta.description,
      model: usage.model,
      tokens: usage.tokens,
      cost: Math.round(usage.cost * 10000) / 10000,
      messageCount: usage.messageCount,
      lastActivityTime: new Date(mtimeMs).toISOString(),
    };
    agentCache.set(agentId, { mtimeMs, node });
    agents.push({ ...node, children: [] });

    totalCost += usage.cost;
    totalTokens += usage.tokens;
  }

  // Sort: active agents first, then by most recent activity
  const now = Date.now();
  agents.sort((a, b) => {
    const aActive = (now - new Date(a.lastActivityTime).getTime()) < AGENT_ACTIVE_THRESHOLD_MS;
    const bActive = (now - new Date(b.lastActivityTime).getTime()) < AGENT_ACTIVE_THRESHOLD_MS;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime();
  });

  return {
    sessionId,
    agents: agents.slice(0, MAX_AGENTS),
    totalAgentCost: Math.round(totalCost * 100) / 100,
    totalAgentTokens: totalTokens,
  };
}
