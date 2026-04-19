import type { UsageLimits, UsageLimitsStatus, UsageWindow } from './types';
import { readClaudeToken } from './keychain-reader';

export interface UsageLimitsResult {
  data: UsageLimits | null;
  status: UsageLimitsStatus;
}

const CACHE_TTL_OK_MS = 5 * 60_000;   // success: cache 5 min
const CACHE_TTL_FAIL_MS = 10 * 60_000; // failure (429/network): back off 10 min
const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage';
const ANTHROPIC_BETA = 'oauth-2025-04-20';

interface Cache {
  at: number;
  ttl: number;
  result: UsageLimitsResult;
}
let cache: Cache | null = null;

export function clearUsageCache(): void {
  cache = null;
}

export interface FetchOptions {
  tokenReader?: () => Promise<string | null>;
  fetcher?: typeof fetch;
}

function parseWindow(raw: unknown): UsageWindow | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { utilization?: unknown; resets_at?: unknown };
  if (typeof r.utilization !== 'number') return undefined;
  return {
    utilization: r.utilization,
    resetsAt: typeof r.resets_at === 'string' ? r.resets_at : null,
  };
}

/**
 * Fetch current usage quotas from Anthropic OAuth Usage API.
 * Endpoint is undocumented (reverse-engineered from Claude Code + community tools).
 * Cache: 5 min on success, 10 min on failure (429/network) to avoid spam.
 * Returns tagged result so caller can distinguish no-auth vs API failure.
 */
export async function fetchUsageLimits(opts: FetchOptions = {}): Promise<UsageLimitsResult> {
  if (cache && Date.now() - cache.at < cache.ttl) {
    return cache.result;
  }

  const tokenReader = opts.tokenReader ?? readClaudeToken;
  const fetcher = opts.fetcher ?? fetch;

  const token = await tokenReader();
  if (!token) {
    const result: UsageLimitsResult = { data: null, status: 'no-auth' };
    cache = { at: Date.now(), ttl: CACHE_TTL_FAIL_MS, result };
    return result;
  }

  try {
    const res = await fetcher(ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': ANTHROPIC_BETA,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const result: UsageLimitsResult = { data: null, status: 'fail' };
      cache = { at: Date.now(), ttl: CACHE_TTL_FAIL_MS, result };
      return result;
    }
    const body: any = await res.json();
    const data: UsageLimits = {
      fiveHour: parseWindow(body.five_hour),
      sevenDay: parseWindow(body.seven_day),
      sevenDaySonnet: parseWindow(body.seven_day_sonnet),
      sevenDayOpus: parseWindow(body.seven_day_opus),
    };
    const result: UsageLimitsResult = { data, status: 'ok' };
    cache = { at: Date.now(), ttl: CACHE_TTL_OK_MS, result };
    return result;
  } catch {
    const result: UsageLimitsResult = { data: null, status: 'fail' };
    cache = { at: Date.now(), ttl: CACHE_TTL_FAIL_MS, result };
    return result;
  }
}
