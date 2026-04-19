import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { theme } from '../styles/theme';

/** Global time-range filter for full-page dashboard. */
export type TimeRange = 'today' | '7d' | '30d' | 'all';

interface Ctx {
  range: TimeRange;
  setRange: (r: TimeRange) => void;
}

const TimeRangeContext = createContext<Ctx>({ range: '7d', setRange: () => { /* noop default */ } });

export function TimeRangeProvider({ children }: { children: ComponentChildren }) {
  const [range, setRange] = useState<TimeRange>('7d');
  return (
    <TimeRangeContext.Provider value={{ range, setRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}

/** Native select styled with VS Code tokens. */
export function TimeRangeDropdown() {
  const { range, setRange } = useTimeRange();
  return (
    <select
      data-testid="time-range-dropdown"
      value={range}
      onChange={(e) => setRange((e.target as HTMLSelectElement).value as TimeRange)}
      style={{
        fontFamily: theme.sans,
        fontSize: 12,
        padding: '4px 8px',
        background: 'var(--vscode-dropdown-background)',
        color: 'var(--vscode-dropdown-foreground)',
        border: 'none',
        boxShadow: 'var(--tok-ring-shadow)',
        borderRadius: 4,
      }}
    >
      <option value="today">Today</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="all">All time</option>
    </select>
  );
}
