import type { TodaySessionSummary } from '../../src/types';
import { getModelColor } from '../utils/model-utils';

interface Props {
  sessions: TodaySessionSummary[];
  onSelect?: (sessionId: string) => void;
}

/** Horizontal strip — one bar per session scaled by duration; gaps = idle. */
export function TodaySessionsTimeline({ sessions, onSelect }: Props) {
  if (sessions.length === 0) {
    return (
      <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 11, padding: '8px 0', textAlign: 'center' }}>
        No sessions today
      </div>
    );
  }

  // Timeline spans first start → last end, bars positioned proportionally.
  const first = Date.parse(sessions[0].startTs);
  const last = Date.parse(sessions[sessions.length - 1].endTs);
  const span = Math.max(last - first, 1);

  return (
    <div style={{ position: 'relative', height: 22, marginTop: 6 }}>
      {sessions.map(s => {
        const start = Date.parse(s.startTs);
        const end = Date.parse(s.endTs);
        const leftPct = ((start - first) / span) * 100;
        const widthPct = Math.max(((end - start) / span) * 100, 1.5);
        const title = `${s.durationMinutes}m · $${s.costUsd.toFixed(2)} · ${s.dominantModel}`;
        return (
          <button
            key={s.sessionId}
            data-session-bar
            type="button"
            title={title}
            onClick={() => onSelect?.(s.sessionId)}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: 0,
              bottom: 0,
              background: getModelColor(s.dominantModel),
              border: 'none',
              borderRadius: 2,
              cursor: onSelect ? 'pointer' : 'default',
              opacity: 0.85,
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );
}
