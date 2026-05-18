import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { buildAgentTree, clearAgentCache } from '../src/agent-tree-builder';

vi.mock('node:fs');

const mockedFs = vi.mocked(fs);

function agentAssistantLine(model: string, inputTokens: number, outputTokens: number): string {
  return JSON.stringify({
    type: 'assistant',
    uuid: 'a1',
    parentUuid: null,
    sessionId: 'session-1',
    agentId: 'agent-abc123',
    timestamp: '2026-05-17T10:00:00.000Z',
    message: {
      role: 'assistant',
      model,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      content: [{ type: 'text', text: 'done' }],
    },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  clearAgentCache();
  // Default statSync mock for mtime cache — each test gets a unique mtime
  mockedFs.statSync.mockReturnValue({ mtimeMs: Date.now() + Math.random() * 1e9 } as any);
});

describe('buildAgentTree', () => {
  it('returns empty tree when subagents dir does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    const result = buildAgentTree('/fake/session-dir', 'session-1');
    expect(result.agents).toEqual([]);
    expect(result.totalAgentCost).toBe(0);
    expect(result.totalAgentTokens).toBe(0);
  });

  it('parses one agent with meta.json + JSONL', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue(
      ['agent-abc123.meta.json', 'agent-abc123.jsonl'] as any,
    );
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath);
      if (p.endsWith('.meta.json')) {
        return JSON.stringify({ agentType: 'Explore', description: 'Explore codebase' });
      }
      if (p.endsWith('.jsonl')) {
        return agentAssistantLine('claude-sonnet-4-6', 1000, 200) + '\n'
          + agentAssistantLine('claude-sonnet-4-6', 500, 100);
      }
      return '';
    });

    const result = buildAgentTree('/fake/session-dir', 'session-1');
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].agentType).toBe('Explore');
    expect(result.agents[0].description).toBe('Explore codebase');
    expect(result.agents[0].model).toBe('claude-sonnet-4-6');
    expect(result.agents[0].messageCount).toBe(2);
    expect(result.agents[0].tokens).toBe(1800);
    expect(result.agents[0].cost).toBeGreaterThan(0);
    expect(result.totalAgentTokens).toBe(1800);
  });

  it('handles missing meta.json gracefully', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue(
      ['agent-xyz789.jsonl'] as any,
    );
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath);
      if (p.endsWith('.meta.json')) throw new Error('ENOENT');
      if (p.endsWith('.jsonl')) {
        return agentAssistantLine('claude-sonnet-4-6', 100, 50);
      }
      return '';
    });

    const result = buildAgentTree('/fake/session-dir', 'session-1');
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].agentType).toBe('xyz789');
    expect(result.agents[0].description).toBe('');
  });

  it('handles corrupt JSONL lines gracefully', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue(
      ['agent-abc123.meta.json', 'agent-abc123.jsonl'] as any,
    );
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath);
      if (p.endsWith('.meta.json')) {
        return JSON.stringify({ agentType: 'researcher', description: 'Research' });
      }
      if (p.endsWith('.jsonl')) return 'not valid json\n{also bad}';
      return '';
    });

    const result = buildAgentTree('/fake/session-dir', 'session-1');
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].tokens).toBe(0);
    expect(result.agents[0].cost).toBe(0);
    expect(result.agents[0].messageCount).toBe(0);
  });

  it('skips compact agent files (agent-acompact-*)', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue(
      [
        'agent-abc123.meta.json', 'agent-abc123.jsonl',
        'agent-acompact-xyz.jsonl', 'agent-acompact-xyz.meta.json',
      ] as any,
    );
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath);
      if (p.endsWith('.meta.json')) {
        return JSON.stringify({ agentType: 'Explore', description: 'test' });
      }
      if (p.endsWith('.jsonl')) {
        return agentAssistantLine('claude-sonnet-4-6', 100, 50);
      }
      return '';
    });

    const result = buildAgentTree('/fake/session-dir', 'session-1');
    expect(result.agents).toHaveLength(1);
  });
});
