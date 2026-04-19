import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseJsonlContent } from '../../src/jsonl-parser';
import { buildTodayProjectBreakdown, selectLatestRecap, computeForecast } from '../../src/data-aggregator';

const FIXTURES = join(__dirname, 'fixtures');

describe('integration — full data flow', () => {
  it('parses JSONL, aggregates, produces breakdown', () => {
    const raw = readFileSync(join(FIXTURES, 'sample-session.jsonl'), 'utf-8');
    const msgs = parseJsonlContent(raw, 's1');
    expect(msgs).toHaveLength(3);
    // attach _cost + _project sidecars (normally done by metrics-calculator)
    const enriched = msgs.map(m => ({ ...m, _cost: 0.5, _project: 'tok-sight-fixture' }));
    const today = new Date('2026-04-18T10:00:00Z');
    const breakdown = buildTodayProjectBreakdown(enriched, today);
    expect(breakdown[0].name).toBe('tok-sight-fixture');
    expect(breakdown[0].cost).toBeGreaterThan(0);
  });

  it('selects latest recap with facets+meta joined', () => {
    const facets = JSON.parse(readFileSync(join(FIXTURES, 'sample-facets.json'), 'utf-8'));
    const meta = JSON.parse(readFileSync(join(FIXTURES, 'sample-meta.json'), 'utf-8'));
    const r = selectLatestRecap({
      sessions: [{ sessionId: 's1', lastActivityTime: '2026-04-18T09:01:00Z', isActive: false }],
      facets: { s1: { briefSummary: facets.brief_summary, outcome: facets.outcome, claudeHelpfulness: facets.claude_helpfulness, frictionCounts: facets.friction_counts } },
      meta: { s1: { linesAdded: meta.lines_added, linesRemoved: meta.lines_removed, gitCommits: meta.git_commits, filesModified: meta.files_modified, toolErrors: meta.tool_errors, toolErrorCategories: {}, toolCounts: meta.tool_counts, userInterruptions: 0, usesMcp: false, usesTaskAgent: false } },
    });
    expect(r?.recap?.briefSummary).toContain('Fixture');
    expect(r?.meta?.linesAdded).toBe(10);
  });

  it('forecast returns null when no burn', () => {
    expect(computeForecast({ remainingUsd: 10, burnPerMin: 0 })).toBeNull();
  });
});
