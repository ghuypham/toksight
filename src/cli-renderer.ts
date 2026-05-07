/**
 * Pure ANSI formatting functions for the TokSight CLI.
 * No side effects — all functions return strings.
 *
 * Cross-platform notes:
 * - Colors disabled when NO_COLOR env var is set (https://no-color.org)
 * - Colors disabled when stdout is not a TTY (piped output)
 * - Unicode block chars fall back to ASCII on Windows cmd.exe (non-UTF8 terminals)
 *   Detection: Windows Terminal sets WT_SESSION; PowerShell 7+ supports UTF-8.
 *   Fallback triggered when stdout.hasColors() is false OR platform is win32 with
 *   no modern terminal indicator.
 */

import type { Insight, ProjectStat, RecentSession } from './types';
import type { UsageLimits } from './types';

// ─── Terminal capability detection ────────────────────────────────────────────

/**
 * True when ANSI escape codes are supported.
 * Respects NO_COLOR (https://no-color.org) and non-TTY pipes.
 */
const COLOR_ENABLED: boolean = (() => {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return process.stdout.isTTY === true;
})();

/**
 * True when Unicode block/box chars are safe to use.
 * Windows Terminal (WT_SESSION) and modern PowerShell support UTF-8.
 * Legacy cmd.exe uses code page 437 — block chars render as garbage.
 */
const UNICODE_ENABLED: boolean = (() => {
  if (process.platform !== 'win32') return true;
  // Windows Terminal sets WT_SESSION; VS Code terminal sets TERM_PROGRAM
  if (process.env.WT_SESSION) return true;
  if (process.env.TERM_PROGRAM === 'vscode') return true;
  if (process.env.TERM === 'xterm-256color') return true;
  return false;
})();

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
  white:   '\x1b[97m',
  gray:    '\x1b[90m',
  orange:  '\x1b[38;5;208m',
};

const ansi = (code: string, s: string) =>
  COLOR_ENABLED ? `${code}${s}${C.reset}` : s;

export const bold  = (s: string) => ansi(C.bold, s);
export const dim   = (s: string) => ansi(C.dim, s);
export const green = (s: string) => ansi(C.green, s);
export const yellow= (s: string) => ansi(C.yellow, s);
export const red   = (s: string) => ansi(C.red, s);
export const cyan  = (s: string) => ansi(C.cyan, s);
export const gray  = (s: string) => ansi(C.gray, s);
export const orange= (s: string) => ansi(C.orange, s);

/** Raw money string without ANSI — use when padding is needed before colorizing */
export function fmtMoney(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/** Pick ANSI color fn for a USD amount: green <$1, yellow <$5, red ≥$5 */
function moneyColorFn(usd: number): (s: string) => string {
  if (usd < 1) return green;
  if (usd < 5) return yellow;
  return red;
}

/** Color money amount: green <$1, yellow <$5, red ≥$5 */
export function colorMoney(usd: number): string {
  const s = fmtMoney(usd);
  if (usd < 1) return green(s);
  if (usd < 5) return yellow(s);
  return red(s);
}

/** Color a 0-100 score: green ≥70, yellow ≥40, red <40 */
export function colorScore(score: number): string {
  const s = `${Math.round(score)}/100`;
  if (score >= 70) return green(s);
  if (score >= 40) return yellow(s);
  return red(s);
}

/** Color a utilization 0-1: green <0.6, yellow <0.8, red ≥0.8 (matches sidebar) */
export function colorUtil(util: number): string {
  const pct = Math.round(util * 100);
  const s = `${pct}%`;
  if (util < 0.6) return green(s);
  if (util < 0.8) return yellow(s);
  return red(s);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

/**
 * Render a filled/empty progress bar.
 * Unicode: ████████░░░░   ASCII fallback: ########....
 */
export function progressBar(util: number, width = 16): string {
  const filled = Math.round(Math.min(util, 1) * width);
  const empty = width - filled;
  const bar = UNICODE_ENABLED
    ? '█'.repeat(filled) + '░'.repeat(empty)
    : '#'.repeat(filled) + '.'.repeat(empty);
  // Thresholds match sidebar/widget (80% red, 60% amber) so UX is consistent
  // across VS Code and terminal.
  if (util >= 0.8) return red(bar);
  if (util >= 0.6) return yellow(bar);
  return green(bar);
}

// ─── Token formatter ─────────────────────────────────────────────────────────

export function fmtTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─── Duration formatter ───────────────────────────────────────────────────────

export function fmtDuration(minutes: number): string {
  if (minutes < 1)   return '<1m';
  if (minutes < 60)  return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format seconds until reset as "2h 18m" or "3d 4h" */
export function fmtResetsAt(resetsAt: string | null): string {
  if (!resetsAt) return '';
  const diffMs = new Date(resetsAt).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  // Round to nearest minute — floor caused off-by-one (24m for 25-min target when test runs a few ms late)
  const totalMin = Math.round(diffMs / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins  = totalMin % 60;
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Section label ────────────────────────────────────────────────────────────

export function label(text: string, width = 9): string {
  return bold(cyan(text.toUpperCase().padEnd(width)));
}

// ─── Section renderers ────────────────────────────────────────────────────────

export interface TodayStats {
  sessions: number;
  spend: number;
  tokens: number;
  cacheRate: number;
  isLive: boolean;
}

export function renderHeader(version: string, isLive: boolean): string {
  const dot = UNICODE_ENABLED ? { on: '●', off: '○' } : { on: '*', off: '-' };
  const live = isLive
    ? `${green(dot.on)} ${bold(green('LIVE'))}`
    : `${gray(dot.off)} ${dim('OFFLINE')}`;
  return `${bold(orange('TokSight'))} ${dim(`v${version}`)}   ${live}`;
}

export function renderToday(s: TodayStats): string {
  const parts = [
    colorMoney(s.spend),
    `${s.sessions} session${s.sessions !== 1 ? 's' : ''}`,
    `${fmtTokens(s.tokens)} tokens`,
    `Cache ${Math.round(s.cacheRate * 100)}%`,
  ];
  return `${label('today')}  ${parts.join(dim('  ·  '))}`;
}

export interface WeekStats {
  spend: number;
  sessions: number;
  trendPct: number;
}

export function renderWeek(s: WeekStats): string {
  const trend = s.trendPct > 0
    ? red(`+${Math.round(s.trendPct)}%`)
    : s.trendPct < 0
      ? green(`${Math.round(s.trendPct)}%`)
      : dim('flat');
  return `${label('week')}   ${colorMoney(s.spend)}  ·  ${s.sessions} sessions  ${dim('vs last week')} ${trend}`;
}

export function renderQuota(limits: UsageLimits): string {
  const lines: string[] = [];

  const renderRow = (name: string, util: number | undefined, resetsAt: string | null | undefined) => {
    if (util === undefined) return null;
    // Anthropic API returns utilization as 0-100 (percent). Normalize to 0-1
    // for progressBar/colorUtil which expect a fraction. Clamp to guard against
    // API values that drift above 100 in edge cases (e.g. burst windows).
    const frac = Math.min(Math.max(util / 100, 0), 1);
    const bar = progressBar(frac, 16);
    const pct = colorUtil(frac);
    const eta = resetsAt ? dim(`  resets in ${fmtResetsAt(resetsAt)}`) : '';
    const warnChar = UNICODE_ENABLED ? '⚠' : '!';
    const warn = frac >= 0.8 ? ` ${red(warnChar)}` : '';
    return `  ${bold(name.padEnd(12))} ${bar}  ${pct}${eta}${warn}`;
  };

  const row5h = renderRow('5h', limits.fiveHour?.utilization, limits.fiveHour?.resetsAt);
  const row7d = renderRow('7d', limits.sevenDay?.utilization, limits.sevenDay?.resetsAt);
  const rowSonnet = renderRow('7d Sonnet', limits.sevenDaySonnet?.utilization, limits.sevenDaySonnet?.resetsAt);
  const rowOpus = renderRow('7d Opus', limits.sevenDayOpus?.utilization, limits.sevenDayOpus?.resetsAt);

  if (row5h) lines.push(row5h);
  if (row7d) lines.push(row7d);
  if (rowSonnet) lines.push(rowSonnet);
  if (rowOpus) lines.push(rowOpus);

  if (lines.length === 0) return '';
  return `${label('quota')}\n${lines.join('\n')}`;
}

export function renderSessions(sessions: RecentSession[], max = 5): string {
  if (sessions.length === 0) return '';
  const rows = sessions.slice(0, max).map(s => {
    const activeDot = UNICODE_ENABLED ? '● ' : '* ';
    const active = s.isActive ? green(activeDot) : '  ';
    const time   = dim(s.timeAgo.padEnd(6));
    const model  = dim(shortModel(s.model).padEnd(14));
    const dur    = s.durationMinutes !== undefined ? fmtDuration(s.durationMinutes).padEnd(6) : '      ';
    // Pad raw string before colorizing — ANSI codes inflate string length and break alignment
    const cost   = moneyColorFn(s.cost)(fmtMoney(s.cost).padEnd(7));
    const proj   = gray(truncate(s.project, 28));
    return `  ${active}${time}  ${model}  ${dur}  ${cost}  ${proj}`;
  });
  return `${label('sessions')} ${dim(`(recent ${Math.min(sessions.length, max)})`)}
${rows.join('\n')}`;
}

export function renderProjects(projects: ProjectStat[], max = 5): string {
  if (projects.length === 0) return '';
  const topCost = projects[0]?.cost ?? 1;
  const rows = projects.slice(0, max).map(p => {
    const bar  = progressBar(topCost > 0 ? p.cost / topCost : 0, 10);
    const pct  = dim(`${Math.round(topCost > 0 ? (p.cost / topCost) * 100 : 0)}%`.padStart(4));
    const cost = colorMoney(p.cost);
    const name = truncate(p.name, 24).padEnd(24);
    return `  ${name}  ${cost}  ${bar}  ${pct}`;
  });
  return `${label('projects')}\n${rows.join('\n')}`;
}

/** ANSI color per model family for the visual bar */
function modelAnsi(name: string): string {
  if (name === 'Opus')   return '\x1b[38;5;208m'; // orange
  if (name === 'Sonnet') return '\x1b[36m';         // cyan
  if (name === 'Haiku')  return '\x1b[32m';         // green
  return '\x1b[37m';
}

/**
 * Render model mix as a colored horizontal bar + legend.
 *
 * Example:
 *   MODELS   ██████████████████░░░░  Opus 79% $1040  ·  Sonnet 21% $274
 */
export function renderModels(modelMix: Array<{ model: string; percentage: number; cost: number }>): string {
  // Filter synthetic, merge duplicate short names (e.g. two Opus variants → one Opus)
  const merged = new Map<string, { pct: number; cost: number }>();
  for (const m of modelMix) {
    if (m.model === '<synthetic>' || m.percentage <= 0) continue;
    const key = shortModel(m.model);
    const existing = merged.get(key);
    if (existing) {
      existing.pct  += m.percentage;
      existing.cost += m.cost;
    } else {
      merged.set(key, { pct: m.percentage, cost: m.cost });
    }
  }
  if (merged.size === 0) return '';

  // Build colored bar (24 chars wide) — each model gets proportional blocks
  const BAR_WIDTH = 24;
  const FILL_CHAR = UNICODE_ENABLED ? '█' : '#';
  let bar = '';
  let allocated = 0;
  const entries = Array.from(merged.entries());
  for (let i = 0; i < entries.length; i++) {
    const [name, v] = entries[i];
    // Last segment fills remainder to avoid rounding gaps
    const chars = i === entries.length - 1
      ? BAR_WIDTH - allocated
      : Math.round((v.pct / 100) * BAR_WIDTH);
    const segment = FILL_CHAR.repeat(Math.max(0, chars));
    bar += COLOR_ENABLED
      ? `${modelAnsi(name)}${segment}${C.reset}`
      : segment;
    allocated += chars;
  }

  // Legend: "Opus 79% $1040  ·  Sonnet 21% $274"
  const legend = entries.map(([name, v]) =>
    // dim() wraps the whole cost — don't nest colorMoney inside dim (resets dim early)
    `${bold(name)} ${dim(`${Math.round(v.pct)}%`)} ${dim(fmtMoney(v.cost))}`,
  ).join(dim('  ·  '));

  return `${label('models')}  ${bar}  ${legend}`;
}

export function renderInsights(insights: Insight[]): string {
  if (insights.length === 0) return '';
  const rows = insights.map(i => `  ${i.icon} ${i.text}${i.sub ? dim('  — ' + i.sub) : ''}`);
  return `${label('insights')}\n${rows.join('\n')}`;
}

/**
 * Cache savings callout — only shown when savings are meaningful (≥ $0.50).
 * Highlights TokSight's unique visibility into cache economics.
 */
export function renderCacheSavings(savedUsd: number, cacheRate: number): string {
  if (savedUsd < 0.5) return '';
  const pct = Math.round(cacheRate * 100);
  return `${label('cache')}   ${green('saved $' + savedUsd.toFixed(2))}${dim(' this week')}  ${dim('·')}  ${bold(`${pct}%`)} cache hit rate`;
}

export function renderScore(score: number): string {
  return `${label('score')}    ${colorScore(score)}`;
}

export function renderFooter(updatedAt: Date): string {
  const t = updatedAt.toLocaleTimeString('en-US', { hour12: false });
  const sep = UNICODE_ENABLED ? '─' : '-';
  return dim(`${sep.repeat(3)} updated ${t} ${sep.repeat(35)}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortModel(model: string): string {
  if (!model) return 'unknown';
  if (model.includes('opus'))   return 'Opus';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku'))  return 'Haiku';
  return model.split('-').slice(-1)[0] ?? model;
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  // Show only last path segment for readability
  const seg = s.split(/[/\\]/).filter(Boolean).pop() ?? s;
  return seg.length > max ? seg.slice(0, max - 1) + '…' : seg;
}
