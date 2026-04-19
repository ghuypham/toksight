import { describe, it, expect } from 'vitest';
import { buildActiveSessionDetail } from '../src/data-aggregator';
import type { ParsedMessage, SessionMeta } from '../src/types';

function msg(offsetMin: number, opts: Partial<ParsedMessage> = {}): ParsedMessage {
  const ts = new Date(Date.now() - offsetMin * 60_000).toISOString();
  return {
    uuid: `u-${offsetMin}`,
    parentUuid: null,
    type: 'assistant',
    timestamp: ts,
    sessionId: 'active-id',
    model: 'claude-opus-4-7',
    usage: { inputTokens: 1000, outputTokens: 500, cacheCreationTokens: 0, cacheReadTokens: 5000 },
    ...opts,
  };
}

describe('buildActiveSessionDetail', () => {
  it('returns null when no messages in session', () => {
    expect(buildActiveSessionDetail([], 'active-id', '/proj', null)).toBeNull();
  });

  it('computes duration, model, context from last message', () => {
    const messages = [msg(30), msg(15), msg(0)];
    const detail = buildActiveSessionDetail(messages, 'active-id', '/proj', null);
    expect(detail).not.toBeNull();
    expect(detail!.model).toBe('claude-opus-4-7');
    expect(detail!.contextLimit).toBe(1_000_000);
    expect(detail!.contextTokens).toBe(6000);
    expect(detail!.durationMinutes).toBeGreaterThanOrEqual(29);
  });

  it('uses 200k context for sonnet-4-5 / haiku-4-5', () => {
    const messages = [msg(0, { model: 'claude-haiku-4-5' })];
    const detail = buildActiveSessionDetail(messages, 'active-id', '/proj', null);
    expect(detail!.contextLimit).toBe(200_000);
  });

  it('merges session-meta when provided', () => {
    const messages = [msg(0)];
    const meta: SessionMeta = {
      sessionId: 'active-id',
      projectPath: '/proj',
      startTime: messages[0].timestamp,
      durationMinutes: 60,
      toolCounts: { Read: 10 },
      gitCommits: 2,
      linesAdded: 100,
      linesRemoved: 5,
      filesModified: 3,
      toolErrors: 1,
      toolErrorCategories: {},
      userInterruptions: 0,
      usesMcp: false,
      usesTaskAgent: true,
      messageHours: [],
    };
    const detail = buildActiveSessionDetail(messages, 'active-id', '/proj', meta);
    expect(detail!.toolCounts).toEqual({ Read: 10 });
    expect(detail!.gitCommits).toBe(2);
    expect(detail!.toolErrors).toBe(1);
    expect(detail!.linesAdded).toBe(100);
  });

  it('falls back to JSONL-derived toolCounts when no meta', () => {
    const messages = [
      msg(0, { toolUses: [{ name: 'Read' }, { name: 'Edit' }] }),
      msg(1, { toolUses: [{ name: 'Read' }] }),
    ];
    const detail = buildActiveSessionDetail(messages, 'active-id', '/proj', null);
    expect(detail!.toolCounts).toEqual({ Read: 2, Edit: 1 });
  });
});
