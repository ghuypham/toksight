import { describe, it, expect, vi } from 'vitest';
import { buildSessionRecaps } from '../src/data-aggregator';
import type { SessionFacets } from '../src/types';

describe('buildSessionRecaps', () => {
  it('maps facets keyed by sessionId with only UI-relevant fields', () => {
    const facets: SessionFacets = {
      sessionId: 'abc',
      briefSummary: 'User wanted X; Claude delivered Y.',
      outcome: 'fully_achieved',
      claudeHelpfulness: 'very_helpful',
      frictionCounts: { buggy_code: 2 },
      frictionDetail: 'two buggy intermediate attempts',
    };
    const load = vi.fn((id: string) => id === 'abc' ? facets : null);
    const recaps = buildSessionRecaps(['abc', 'missing'], load);
    expect(recaps).toEqual({
      abc: {
        briefSummary: 'User wanted X; Claude delivered Y.',
        outcome: 'fully_achieved',
        claudeHelpfulness: 'very_helpful',
        frictionCounts: { buggy_code: 2 },
        frictionDetail: 'two buggy intermediate attempts',
      },
    });
    expect(recaps.missing).toBeUndefined();
  });

  it('returns {} when all facets missing', () => {
    expect(buildSessionRecaps(['a', 'b'], () => null)).toEqual({});
  });
});
