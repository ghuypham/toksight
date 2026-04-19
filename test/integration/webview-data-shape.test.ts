import { describe, it, expect } from 'vitest';
import type { WebviewData } from '../../src/types';

describe('WebviewData shape guard', () => {
  it('has all required phase-1 + phase-2 fields', () => {
    const required: Array<keyof WebviewData> = [
      'username', 'today', 'spend', 'usage', 'modelMix', 'sparkline',
      'tools', 'mcp', 'skills', 'projects', 'recentSessions',
      'activeSession', 'burnRate', 'todaySessions',
      'sessionRecaps', 'sessionMetadata',
      'insights', 'isLive', 'cacheSavings', 'tokenBreakdown', 'sessionStats', 'summary',
      'usageLimits', 'todayProjectBreakdown', 'latestRecap', 'forecast',
    ];
    // Compile-time: the `required` array type annotation forces keys to exist in WebviewData.
    // If any field is missing, TypeScript fails the build.
    expect(required.length).toBeGreaterThan(20);
  });
});
