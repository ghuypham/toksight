import type { UsageLimits, UsageLimitsStatus, UsageWindow } from './types';
import { readClaudeToken } from './keychain-reader';

export interface UsageLimitsResult {
  data: UsageLimits | null;
  status: UsageLimitsStatus;
}

const CACHE_TTL_OK_MS = 5 * 60_000;      // success: cache 5 min
const CACHE_TTL_FAIL_MS = 10 * 60_000;   // failure after first success: back off 10 min
const CACHE_TTL_NOAUTH_MS = 30_000;      // no-auth before first success: retry every 30s (avoids hammering keychain on each JSONL event)
const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage';
const ANTHROPIC_BETA = 'oauth-2025-04-20';
// Self-identify to Anthropic — transparency > anonymity. If they want to
// throttle/block third-party clients, let them target us by name instead
// of flagging the user's OAuth token as suspicious traffic.
// Version is hard-coded (not read from package.json) so bundled CLI + extension
// stay zero-FS-dep at runtime; bump manually on release.
const USER_AGENT = 'TokSight-vscode/0.1.0 (+https://github.com/hardingpham/toksight)';

interface Cache {
  at: number;
  ttl: number;
  result: UsageLimitsResult;
  hasData: boolean; // true once we've received a successful response
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
 *
 * Cache strategy:
 * - No prior data (first open): skip cache on failure so next JSONL event retries immediately.
 * - Has prior data: apply TTL (5 min ok, 10 min fail/no-auth) to avoid spamming Anthropic.
 */
export async function fetchUsageLimits(opts: FetchOptions = {}): Promise<UsageLimitsResult> {
  if (cache && Date.now() - cache.at < cache.ttl) {
    return cache.result;
  }

  const tokenReader = opts.tokenReader ?? readClaudeToken;
  const fetcher = opts.fetcher ?? fetch;
  const hadData = cache?.hasData ?? false;

  const token = await tokenReader();
  if (!token) {
    const result: UsageLimitsResult = { data: null, status: 'no-auth' };
    // Short TTL (30s) before first success — prevents hammering keychain on every JSONL event.
    // Long TTL (10min) after first success — user logged out, back off.
    cache = { at: Date.now(), ttl: hadData ? CACHE_TTL_FAIL_MS : CACHE_TTL_NOAUTH_MS, result, hasData: false };
    return result;
  }

  try {
    const res = await fetcher(ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': ANTHROPIC_BETA,
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
    if (!res.ok) {
      const result: UsageLimitsResult = { data: null, status: 'fail' };
      if (hadData) cache = { at: Date.now(), ttl: CACHE_TTL_FAIL_MS, result, hasData: false };
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
    cache = { at: Date.now(), ttl: CACHE_TTL_OK_MS, result, hasData: true };
    return result;
  } catch {
    const result: UsageLimitsResult = { data: null, status: 'fail' };
    if (hadData) cache = { at: Date.now(), ttl: CACHE_TTL_FAIL_MS, result, hasData: false };
    return result;
  }
}
