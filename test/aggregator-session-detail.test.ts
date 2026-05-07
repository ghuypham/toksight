import { describe, it, expect } from 'vitest';
import { buildSessionDetail } from '../src/data-aggregator';
import type { ParsedMessage, SessionMeta, SessionFacets } from '../src/types';

const SID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function msg(offsetMin: number, opts: Partial<ParsedMessage> = {}): ParsedMessage {
  const ts = new Date(Date.now() - offsetMin * 60_000).toISOString();
  return {
    uuid: `u-${offsetMin}`,
    parentUuid: null,
    type: 'assistant',
    timestamp: ts,
    sessionId: SID,
    model: 'claude-sonnet-4-6',
    usage: { inputTokens: 1000, outputTokens: 500, cacheCreationTokens: 100, cacheReadTokens: 4000 },
    ...opts,
  };
}

describe('buildSessionDetail', () => {
  it('returns null when no assistant messages match sessionId', () => {
    expect(buildSessionDetail([], SID, '/proj', null, null)).toBeNull();
    expect(
      buildSessionDetail([msg(0, { sessionId: 'other' })], SID, '/proj', null, null),
    ).toBeNull();
  });

  it('resolves an 8-char prefix to the full session id', () => {
    const messages = [msg(10), msg(0)];
    const detail = buildSessionDetail(messages, SID.slice(0, 8), '/proj', null, null);
    expect(detail).not.toBeNull();
    expect(detail!.sessionId).toBe(SID);
  });

  it('aggregates totals, token mix, and timeline ordering', () => {
    const messages = [
      msg(20, { toolUses: [{ name: 'Read', path: '/a.ts' }] }),
      msg(10, { toolUses: [{ name: 'Edit', path: '/a.ts' }, { name: 'Edit', path: '/b.ts' }] }),
      msg(0, { toolUses: [{ name: 'Bash' }] }),
    ];
    const detail = buildSessionDetail(messages, SID, '/repo/proj', null, null);
    expect(detail).not.toBeNull();
    // 3 messages × (1000 + 500 + 100 + 4000) = 16800 tokens
    expect(detail!.totalTokens).toBe(16800);
    // tokenMix percentages must sum ~100
    const sum = detail!.tokenMix.outputPct + detail!.tokenMix.inputPct
      + detail!.tokenMix.cachePct + detail!.tokenMix.cacheCreationPct;
    expect(sum).toBeCloseTo(100, 1);
    // tools aggregated correctly
    expect(detail!.toolCounts.Edit).toBe(2);
    expect(detail!.toolCounts.Read).toBe(1);
    expect(detail!.toolCounts.Bash).toBe(1);
    // files deduped, with edit counts (a.ts edited twice — once Read does NOT count, once Edit; b.ts once)
    expect(detail!.filesEdited).toEqual([
      { path: '/a.ts', edits: 1 },
      { path: '/b.ts', edits: 1 },
    ]);
    // timeline oldest-first
    expect(detail!.timeline.length).toBe(3);
    expect(new Date(detail!.timeline[0].ts).getTime())
      .toBeLessThan(new Date(detail!.timeline[2].ts).getTime());
    // duration ~20m
    expect(detail!.durationMinutes).toBe(20);
    // cost > 0, savings > 0 (we have 4000 cache reads/turn × 3)
    expect(detail!.totalCostUsd).toBeGreaterThan(0);
    expect(detail!.cacheSavingsUsd).toBeGreaterThan(0);
  });

  it('prefers meta.toolCounts when richer than message-derived counts', () => {
    const messages = [msg(0, { toolUses: [{ name: 'Read' }] })];
    const meta: SessionMeta = {
      sessionId: SID, projectPath: '/p', startTime: '', durationMinutes: 0,
      toolCounts: { Read: 5, Bash: 2 },
      gitCommits: 0, linesAdded: 0, linesRemoved: 0, filesModified: 0,
      toolErrors: 0, toolErrorCategories: {}, userInterruptions: 0,
      usesMcp: false, usesTaskAgent: false, messageHours: [],
      firstPrompt: 'hello world',
    };
    const detail = buildSessionDetail(messages, SID, '/p', meta, null);
    expect(detail!.toolCounts).toEqual({ Read: 5, Bash: 2 });
    expect(detail!.firstPrompt).toBe('hello world');
  });

  it('passes through facets outcome / helpfulness / summary', () => {
    const messages = [msg(0)];
    const facets: SessionFacets = {
      sessionId: SID,
      briefSummary: 'shipped feature X',
      outcome: 'fully_achieved',
      claudeHelpfulness: 'very_helpful',
      frictionCounts: {},
    };
    const detail = buildSessionDetail(messages, SID, '/p', null, facets);
    expect(detail!.outcome).toBe('fully_achieved');
    expect(detail!.helpfulness).toBe('very_helpful');
    expect(detail!.briefSummary).toBe('shipped feature X');
  });

  it('marks last timeline event with hasError when meta records errors', () => {
    const messages = [msg(5), msg(0)];
    const meta: SessionMeta = {
      sessionId: SID, projectPath: '/p', startTime: '', durationMinutes: 0,
      toolCounts: {}, gitCommits: 0, linesAdded: 0, linesRemoved: 0,
      filesModified: 0, toolErrors: 3, toolErrorCategories: { Edit: 3 },
      userInterruptions: 0, usesMcp: false, usesTaskAgent: false, messageHours: [],
    };
    const detail = buildSessionDetail(messages, SID, '/p', meta, null);
    expect(detail!.timeline[0].hasError).toBeUndefined();
    expect(detail!.timeline[1].hasError).toBe(true);
  });

  it('caps timeline at 200 events for very long sessions', () => {
    const messages = Array.from({ length: 250 }, (_, i) => msg(250 - i));
    const detail = buildSessionDetail(messages, SID, '/p', null, null);
    expect(detail!.timeline.length).toBe(200);
  });
});
