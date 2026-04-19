import { describe, it, expect } from 'vitest';
import {
  buildActiveSessionDetail,
  buildBurnRate,
  buildTodaySessions,
  buildMessageStream,
} from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

function msg(sessionId: string, tsISO: string, model = 'claude-sonnet-4-6'): ParsedMessage {
  return {
    uuid: `${sessionId}-${tsISO}`,
    parentUuid: null,
    type: 'assistant',
    timestamp: tsISO,
    sessionId,
    model,
    usage: {
      inputTokens: 100, outputTokens: 500,
      cacheCreationTokens: 0, cacheReadTokens: 2000,
    },
  };
}

describe('extension wiring: full data pipeline composition', () => {
  it('composes activeSession + burnRate + todaySessions from same message pool', () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const recentTs = new Date(now.getTime() - 2 * 60_000).toISOString();
    const messages: ParsedMessage[] = [
      msg('live', recentTs),
      msg('live', new Date(now.getTime() - 60_000).toISOString()),
      msg('earlier-today', `${today}T01:00:00Z`),
    ];

    const active = buildActiveSessionDetail(messages, 'live', '/p', null);
    expect(active).not.toBeNull();
    expect(active!.sessionId).toBe('live');

    const burn = buildBurnRate(messages, 'live', 30);
    expect(burn.bars).toHaveLength(30);
    expect(burn.nowPerMin).toBeGreaterThanOrEqual(0);

    const todayList = buildTodaySessions(messages, today);
    expect(todayList.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty messages gracefully', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildActiveSessionDetail([], 'x', '/p', null)).toBeNull();
    expect(buildTodaySessions([], today)).toEqual([]);
    expect(buildBurnRate([], 'x', 30).bars).toHaveLength(30);
  });

  it('buildMessageStream returns entries with cost when messages present', () => {
    const now = new Date();
    const recentTs = new Date(now.getTime() - 2 * 60_000).toISOString();
    const messages = [
      {
        uuid: 'a1', parentUuid: null, type: 'assistant' as const,
        timestamp: recentTs, sessionId: 'live',
        model: 'claude-sonnet-4-6',
        usage: { inputTokens: 100, outputTokens: 500, cacheCreationTokens: 0, cacheReadTokens: 0 },
        toolUses: [{ name: 'Read', path: '/file.ts' }],
      },
    ];
    const stream = buildMessageStream(messages, 20);
    expect(stream.length).toBeGreaterThan(0);
    expect(stream[0].costUsd).toBeGreaterThan(0);
    expect(stream[0].tool).toBe('Read');
  });
});
