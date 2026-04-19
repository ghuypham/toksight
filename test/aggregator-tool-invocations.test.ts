import { describe, it, expect } from 'vitest';
import { buildToolInvocations } from '../src/data-aggregator';
import type { ParsedMessage } from '../src/types';

function m(uuid: string, tools: Array<{ name: string; path?: string }> = []): ParsedMessage {
  return {
    uuid, parentUuid: null, type: 'assistant', timestamp: `2026-04-18T10:${uuid.padStart(2, '0')}:00Z`,
    sessionId: 's', model: 'claude-sonnet-4-6', toolUses: tools,
  };
}

describe('buildToolInvocations', () => {
  it('flattens toolUses across messages, newest-first, capped at limit', () => {
    const msgs = [m('01', [{ name: 'Read', path: '/a' }, { name: 'Edit', path: '/b' }]), m('02', [{ name: 'Bash' }])];
    const out = buildToolInvocations(msgs, 10);
    expect(out.length).toBe(3);
    expect(out[0].tool).toBe('Bash');            // newest-first
    expect(out[1].tool).toBe('Edit');
    expect(out[2].tool).toBe('Read');
    expect(out[2].inputPath).toBe('/a');
  });

  it('respects limit', () => {
    const msgs = Array.from({ length: 50 }, (_, i) => m(String(i), [{ name: 'Read' }]));
    expect(buildToolInvocations(msgs, 20).length).toBe(20);
  });

  it('marks ok=true by default (ParsedMessage has no error signal yet)', () => {
    expect(buildToolInvocations([m('1', [{ name: 'Read' }])], 5)[0].ok).toBe(true);
  });
});
