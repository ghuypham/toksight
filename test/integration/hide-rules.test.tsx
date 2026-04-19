// @vitest-environment jsdom
/**
 * Hide-rule regression guard: when data sources are missing (no OAuth, no budget,
 * empty sparkline), UI surfaces must not leak fake numbers like "$0.00" or "0%".
 * Adapts to actual codebase: GroupQuota returns null; TabQuota hides 7-day chart.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'preact';
import { GroupQuota } from '../../webview/sidebar/group-quota';
import { TabQuota } from '../../webview/fullpage/tab-quota';
import type { WebviewData } from '../../src/types';

// Minimal empty fixture — no quota, no spark, no burn.
// status='no-auth' models the first-launch state where the user hasn't signed
// into Claude yet; copy must invite them to sign in (not "API failed").
const empty = {
  usageLimits: null,
  usageLimitsStatus: 'no-auth',
  sparkline: [],
  burnRate: { bars: [], peakCostUsd: 0, peakMinutesAgo: 0, avgPerMin: 0, nowPerMin: 0, trend: 'steady' },
} as unknown as WebviewData;

let root: HTMLDivElement;

afterEach(() => {
  if (root) root.remove();
});

describe('hide rules — no fake data when source missing', () => {
  it('sidebar GroupQuota shows sign-in empty state (no fake numbers) when usageLimits null', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<GroupQuota data={empty} />, root);
    const text = root.textContent ?? '';
    // Per mockup: empty state replaces null; must not leak placeholder numbers.
    expect(text).toContain('Sign in to Claude');
    expect(text).not.toMatch(/\$0\.00/);
    expect(text).not.toMatch(/\b0%\b/);
  });

  it('fullpage TabQuota hides 7-day chart when sparkline empty', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<TabQuota data={empty} />, root);
    // Section renders, but "7-day spend" heading must not appear without data.
    expect(root.textContent ?? '').not.toMatch(/7-day spend/);
  });

  it('TabQuota with no source renders no numeric placeholder', () => {
    root = document.createElement('div');
    document.body.appendChild(root);
    render(<TabQuota data={empty} />, root);
    // Regression: ensure no fallback numbers like "$0.00" or "0%" leak through
    expect(root.textContent ?? '').not.toMatch(/\$0\.00/);
    expect(root.textContent ?? '').not.toMatch(/\b0%\b/);
  });
});
