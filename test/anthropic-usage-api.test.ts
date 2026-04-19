import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUsageLimits, clearUsageCache } from '../src/anthropic-usage-api';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body } as any);

describe('fetchUsageLimits', () => {
  beforeEach(() => clearUsageCache());

  it('returns no-auth status when token missing', async () => {
    const r = await fetchUsageLimits({ tokenReader: async () => null });
    expect(r.status).toBe('no-auth');
    expect(r.data).toBeNull();
  });

  it('returns fail status on HTTP error', async () => {
    const r = await fetchUsageLimits({
      tokenReader: async () => 'tok',
      fetcher: async () => ({ ok: false, status: 429, json: async () => ({}) } as any),
    });
    expect(r.status).toBe('fail');
    expect(r.data).toBeNull();
  });

  it('parses real OAuth response shape into UsageLimits', async () => {
    const apiBody = {
      five_hour: { utilization: 83.4, resets_at: '2026-04-18T19:00:00Z' },
      seven_day: { utilization: 41.0, resets_at: '2026-04-22T00:00:00Z' },
      seven_day_sonnet: { utilization: 28.5, resets_at: '2026-04-22T00:00:00Z' },
    };
    const r = await fetchUsageLimits({
      tokenReader: async () => 'tok',
      fetcher: async () => ok(apiBody),
    });
    expect(r.status).toBe('ok');
    expect(r.data?.fiveHour?.utilization).toBe(83.4);
    expect(r.data?.fiveHour?.resetsAt).toBe('2026-04-18T19:00:00Z');
    expect(r.data?.sevenDay?.utilization).toBe(41.0);
    expect(r.data?.sevenDaySonnet?.utilization).toBe(28.5);
    expect(r.data?.sevenDayOpus).toBeUndefined();
  });

  it('handles resets_at=null (no active reset)', async () => {
    const r = await fetchUsageLimits({
      tokenReader: async () => 'tok',
      fetcher: async () => ok({
        five_hour: { utilization: 10, resets_at: null },
        seven_day: { utilization: 5, resets_at: null },
      }),
    });
    expect(r.data?.fiveHour?.resetsAt).toBeNull();
  });

  it('skips windows when utilization is missing or non-numeric', async () => {
    const r = await fetchUsageLimits({
      tokenReader: async () => 'tok',
      fetcher: async () => ok({
        five_hour: { utilization: 10, resets_at: 't' },
        seven_day: null,
        seven_day_sonnet: { resets_at: 't' }, // missing utilization
      }),
    });
    expect(r.data?.fiveHour?.utilization).toBe(10);
    expect(r.data?.sevenDay).toBeUndefined();
    expect(r.data?.sevenDaySonnet).toBeUndefined();
  });

  it('caches response across calls', async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({
      five_hour: { utilization: 1, resets_at: 't' },
      seven_day: { utilization: 2, resets_at: 't' },
    }));
    const opts = { tokenReader: async () => 'tok', fetcher };
    await fetchUsageLimits(opts);
    await fetchUsageLimits(opts);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('sends Bearer token + anthropic-beta header', async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({ five_hour: { utilization: 1, resets_at: 't' } }));
    await fetchUsageLimits({ tokenReader: async () => 'my-tok', fetcher });
    const call = fetcher.mock.calls[0];
    expect(call[0]).toBe('https://api.anthropic.com/api/oauth/usage');
    expect(call[1].headers['Authorization']).toBe('Bearer my-tok');
    expect(call[1].headers['anthropic-beta']).toBe('oauth-2025-04-20');
  });
});
