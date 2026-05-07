import { useState, useMemo } from 'preact/hooks';
import type { WebviewData, TodaySessionSummary, ActiveSessionDetail } from '../../src/types';
import { getModelFamilyName } from '../utils/model-utils';
import { useTimeRange } from './time-range-context';
import { TodaySessionsTimeline } from '../components/today-sessions-timeline';

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function fmtTokK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function projName(path: string): string {
  return path.split('/').pop() || path;
}

/** Today 24-hour hourly timeline bar chart */
function TodayTimeline({ sessions }: { sessions: TodaySessionSummary[] }) {
  const buckets = new Array<number>(24).fill(0);
  for (const s of sessions) {
    const h = new Date(s.startTs).getHours();
    if (Number.isFinite(h)) buckets[h] += s.costUsd;
  }
  const max = Math.max(...buckets, 0.0001);
  const nowH = new Date().getHours();
  return (
    <div>
      <div class="fp-timeline">
        {buckets.map((c, h) => (
          <div
            key={h}
            class={`fp-t-cell${h === nowH && c > 0 ? ' active' : ''}`}
            style={{ height: c > 0 ? `${Math.max(4, Math.round((c / max) * 100))}%` : '0' }}
            title={`${String(h).padStart(2,'0')}:00 $${c.toFixed(3)}`}
          />
        ))}
      </div>
      <div class="fp-timeline-labels">
        <span>00</span><span>06</span><span>12</span>
        <span>now · {nowH}</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

/** Active session 2-column card */
function ActiveCard({ s }: { s: ActiveSessionDetail }) {
  const totalTools = Object.values(s.toolCounts).reduce((a, b) => a + b, 0);
  const rows = [
    { k: 'Project',   v: projName(s.projectPath) },
    { k: 'Model',     v: s.model },
    { k: 'Duration',  v: fmtDur(s.durationMinutes) },
    { k: 'Tools',     v: `${totalTools} calls` },
    { k: 'Tokens',    v: `${s.contextTokens.toLocaleString()} (+${s.linesAdded}/-${s.linesRemoved} lines)` },
    { k: 'Cost · burn', v: `$${(s.burnRatePerMin * s.durationMinutes).toFixed(2)} · $${s.burnRatePerMin.toFixed(3)}/min` },
    { k: 'Started',   v: new Date(s.startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { k: 'Session id', v: shortId(s.sessionId) },
  ];
  return (
    <div class="active-card">
      {rows.map(r => (
        <div key={r.k}>
          <div class="ac-k">{r.k}</div>
          <div class="ac-v">{r.v}</div>
        </div>
      ))}
    </div>
  );
}

interface TabSessionsProps {
  data: Partial<WebviewData>;
  onSelectSession?: (sessionId: string) => void;
}

export function TabSessions({ data, onSelectSession }: TabSessionsProps) {
  const sessions  = data.recentSessions ?? [];
  const today     = data.todaySessions  ?? [];
  const active    = data.activeSession  ?? null;
  const latest    = data.latestRecap    ?? null;
  const stats     = data.sessionStats;
  const weekSpend = data.spend?.week ?? 0;

  const { range } = useTimeRange();
  const showToday = range === 'today';
  const periodLabel = range === 'today' ? 'Today' : range === '7d' ? '7d' : range === '30d' ? '30d' : 'All time';

  const [projFilter, setProjFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  const projects = useMemo(() => [...new Set(sessions.map(s => s.project))], [sessions]);
  const models   = useMemo(() => [...new Set(sessions.map(s => s.model))],   [sessions]);
  const filtered = useMemo(() => sessions.filter(s =>
    (!projFilter  || s.project === projFilter) &&
    (!modelFilter || s.model   === modelFilter),
  ), [sessions, projFilter, modelFilter]);

  /* Today aggregates */
  const todaySpend = useMemo(() => today.reduce((s, t) => s + t.costUsd, 0), [today]);
  const todayAvgDur = today.length > 0
    ? today.reduce((s, t) => s + t.durationMinutes, 0) / today.length
    : 0;

  /* Longest session for stat box */
  const longest = today.length > 0
    ? today.reduce((mx, s) => s.durationMinutes > mx.durationMinutes ? s : mx, today[0])
    : null;

  return (
    <div data-tab="sessions">
      {/* ── Stat boxes ── */}
      <div class="fp-section">
        <div class="fp-stats">
          <div class="fp-stat">
            <div class="fp-stat-k">Sessions · {periodLabel}</div>
            <div class="fp-stat-v">{showToday ? today.length : sessions.length}</div>
            <div class="fp-stat-n">{periodLabel} window</div>
          </div>
          <div class="fp-stat">
            <div class="fp-stat-k">Avg duration</div>
            <div class="fp-stat-v">{showToday ? fmtDur(todayAvgDur) : stats ? fmtDur(stats.avgDurationMinutes) : '—'}</div>
            <div class="fp-stat-n">{periodLabel} window</div>
          </div>
          <div class="fp-stat">
            <div class="fp-stat-k">Longest</div>
            <div class="fp-stat-v">{longest ? fmtDur(longest.durationMinutes) : '—'}</div>
            <div class="fp-stat-n">{longest ? getModelFamilyName(longest.dominantModel) : 'today'}</div>
          </div>
          <div class="fp-stat">
            <div class="fp-stat-k">Total spend</div>
            <div class="fp-stat-v">${showToday ? todaySpend.toFixed(2) : weekSpend.toFixed(2)}</div>
            <div class="fp-stat-n">{periodLabel} window</div>
          </div>
        </div>
      </div>

      {/* ── Today timeline ── */}
      {today.length > 0 && (
        <div class="fp-section">
          <h3>Today timeline · 24h</h3>
          <TodayTimeline sessions={today} />
        </div>
      )}

      {/* ── Today session bars (clickable for drill-down) ── */}
      {onSelectSession && today.length > 0 && (
        <div class="fp-section">
          <h3>Sessions today · click for detail</h3>
          <TodaySessionsTimeline sessions={today} onSelect={onSelectSession} />
        </div>
      )}

      {/* ── Active session ── */}
      {active && (
        <div class="fp-section">
          <h3>Active session</h3>
          <ActiveCard s={active} />
        </div>
      )}

      {/* ── Today sessions table (range=today) ── */}
      {showToday && today.length > 0 && (
        <div class="fp-section">
          <h3>Sessions · Today</h3>
          <table class="fp">
            <thead>
              <tr>
                <th>Started</th>
                <th>Ended</th>
                <th>Model</th>
                <th class="num">Dur</th>
                <th class="num">Cost</th>
              </tr>
            </thead>
            <tbody>
              {[...today].reverse().map(s => (
                <tr
                  key={s.sessionId}
                  onClick={onSelectSession ? () => onSelectSession(s.sessionId) : undefined}
                  style={onSelectSession ? { cursor: 'pointer' } : undefined}
                >
                  <td>{new Date(s.startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{new Date(s.endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{getModelFamilyName(s.dominantModel)}</td>
                  <td class="num">{fmtDur(s.durationMinutes)}</td>
                  <td class="num">${s.costUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sessions table (range≠today) ── */}
      {!showToday && sessions.length > 0 && (
        <div class="fp-section">
          <h3>Sessions · {periodLabel}</h3>
          <div class="fp-filters">
            <select
              value={projFilter}
              onChange={e => setProjFilter((e.target as HTMLSelectElement).value)}
            >
              <option value="">All projects</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={modelFilter}
              onChange={e => setModelFilter((e.target as HTMLSelectElement).value)}
            >
              <option value="">All models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <table class="fp">
            <thead>
              <tr>
                <th>When</th>
                <th>Project</th>
                <th>Model</th>
                <th class="num">Dur</th>
                <th class="num">Tokens</th>
                <th class="num">Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sid = s.fullSessionId ?? s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={onSelectSession ? () => onSelectSession(sid) : undefined}
                    style={onSelectSession ? { cursor: 'pointer' } : undefined}
                  >
                    <td>{s.timeAgo}</td>
                    <td>{s.project}</td>
                    <td>{s.model}</td>
                    <td class="num">{fmtDur(s.durationMinutes ?? 0)}</td>
                    <td class="num">{fmtTokK(s.tokens)}</td>
                    <td class="num">${s.cost.toFixed(2)}</td>
                    <td>{s.isActive ? 'active' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Latest recap ── */}
      {latest?.recap && (
        <div class="fp-section">
          <h3>Latest recap</h3>
          <div class="recap-hero">
            <div class="rh-title">{latest.recap.briefSummary.split('.')[0]}</div>
            <div class="rh-meta">
              {[
                active ? projName(active.projectPath) : null,
                active?.model,
                active ? fmtDur(active.durationMinutes) : null,
                latest.meta ? `${latest.meta.gitCommits} commit${latest.meta.gitCommits === 1 ? '' : 's'}` : null,
                latest.recap.outcome.replaceAll('_', ' '),
                `helpfulness ${latest.recap.claudeHelpfulness.replaceAll('_', ' ')}`,
              ].filter(Boolean).join(' · ')}
            </div>
            <div class="rh-body">{latest.recap.briefSummary}</div>
          </div>
        </div>
      )}
    </div>
  );
}
