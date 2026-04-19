import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadFacets, clearFacetsCache } from '../src/facets-loader';

describe('facets-loader', () => {
  const tmpDir = path.join(os.tmpdir(), `toksight-facets-test-${Date.now()}`);
  const facetsDir = path.join(tmpDir, 'usage-data', 'facets');

  beforeEach(() => {
    clearFacetsCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(facetsDir, { recursive: true });
  });

  it('returns null when file missing', () => {
    const result = loadFacets('missing-id', tmpDir);
    expect(result).toBeNull();
  });

  it('parses facets file and normalizes fields', () => {
    const sessionId = '04fff561-a9fd-462b-b4bf-bd35c505626a';
    const raw = {
      session_id: sessionId,
      brief_summary: 'User did X',
      outcome: 'partially_achieved',
      claude_helpfulness: 'very_helpful',
      friction_counts: { wrong_approach: 1 },
      friction_detail: 'explained later',
    };
    fs.writeFileSync(path.join(facetsDir, `${sessionId}.json`), JSON.stringify(raw));

    const result = loadFacets(sessionId, tmpDir);
    expect(result).toEqual({
      sessionId,
      briefSummary: 'User did X',
      outcome: 'partially_achieved',
      claudeHelpfulness: 'very_helpful',
      frictionCounts: { wrong_approach: 1 },
      frictionDetail: 'explained later',
    });
  });

  it('returns null on malformed JSON', () => {
    const sessionId = 'bad-json';
    fs.writeFileSync(path.join(facetsDir, `${sessionId}.json`), '{not json');
    expect(loadFacets(sessionId, tmpDir)).toBeNull();
  });

  it('caches loaded result', () => {
    const sessionId = 'cache-test';
    const raw = { session_id: sessionId, brief_summary: 'X', outcome: 'fully_achieved',
      claude_helpfulness: 'essential', friction_counts: {} };
    const filePath = path.join(facetsDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(raw));

    const first = loadFacets(sessionId, tmpDir);
    fs.unlinkSync(filePath);
    const second = loadFacets(sessionId, tmpDir);  // still cached

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });
});
