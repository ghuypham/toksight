/**
 * Minimal box-drawing table renderer for CLI output.
 * Uses Unicode box chars (┌┐└┘├┤┬┴┼─│) with ASCII fallback.
 * Also provides renderBox for rounded-corner info panels.
 * Zero external dependencies.
 */

const BOX = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  ml: '├', mr: '┤', mt: '┬', mb: '┴', mx: '┼',
};

const BOX_ASCII = {
  tl: '+', tr: '+', bl: '+', br: '+',
  h: '-', v: '|',
  ml: '+', mr: '+', mt: '+', mb: '+', mx: '+',
};

export interface TableColumn {
  header: string;
  align?: 'left' | 'right';
  /** Fixed width. Auto-calculated from content if not set. */
  width?: number;
  /** Hide this column when terminal is narrow (compact mode). */
  compactHide?: boolean;
}

export interface TableOptions {
  unicode?: boolean;
  /** Applied to border characters (e.g. dim). Pass identity fn to disable. */
  colorFn?: (s: string) => string;
  /** Force compact mode (hide compactHide columns). Auto-detected from terminal width if not set. */
  compact?: boolean;
}

/** Terminal width threshold for auto-compact mode */
const COMPACT_THRESHOLD = 80;

/** Get current terminal width, fallback to 100 if unavailable */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 100;
}

/** Strip ANSI escape codes for accurate visible-width measurement. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export interface BoxOptions {
  /** Use Unicode rounded-corner chars. Defaults to true. */
  unicode?: boolean;
  /** Applied to border characters (e.g. dim). Pass identity fn to disable. */
  colorFn?: (s: string) => string;
}

/**
 * Render content lines inside a rounded box with a title.
 *
 * Example:
 *   ╭─ Insights ──────────────────────────────────╮
 *   │ 💰 Opus at 82% — Consider Sonnet            │
 *   ╰─────────────────────────────────────────────╯
 */
export function renderBox(title: string, lines: string[], options?: BoxOptions): string {
  const unicode = options?.unicode ?? true;
  const colorFn = options?.colorFn ?? ((s: string) => s);
  const b = unicode
    ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
    : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };

  // Box inner width: at least title + 4 chars (left border + space + space + right border)
  // and at least as wide as the widest content line
  const maxContentLen = Math.max(
    title.length + 2,
    ...lines.map(l => stripAnsi(l).length),
  );
  // inner width = content + 2 (one space padding each side)
  const innerWidth = maxContentLen + 2;

  // Top border: "╭─ Title ─────────────╮"
  const titleSection = `${b.h} ${title} `;
  const rightFill = b.h.repeat(Math.max(0, innerWidth - titleSection.length));
  const top = colorFn(b.tl + titleSection + rightFill + b.tr);

  // Bottom border
  const bot = colorFn(b.bl + b.h.repeat(innerWidth) + b.br);

  // Content rows with right-padding to fill inner width
  const rows = lines.map(l => {
    const visLen = stripAnsi(l).length;
    const pad = innerWidth - visLen - 1; // -1 for the leading space
    return colorFn(b.v) + ' ' + l + ' '.repeat(Math.max(0, pad)) + colorFn(b.v);
  });

  return [top, ...rows, bot].join('\n');
}

/**
 * Render a bordered table.
 * @param columns Column definitions (header + optional align/width)
 * @param rows    Array of string arrays — one per row, matching columns length.
 *                Cells may contain ANSI escape codes; width is measured on stripped text.
 * @param options Rendering options
 */
export function renderTable(
  columns: TableColumn[],
  rows: string[][],
  options: TableOptions = {},
): string {
  const unicode = options.unicode ?? true;
  const b = unicode ? BOX : BOX_ASCII;
  const dim = options.colorFn ?? ((s: string) => s);
  const compact = options.compact ?? (getTerminalWidth() < COMPACT_THRESHOLD);

  // Filter columns for compact mode
  const visibleIdx = columns.map((c, i) => (!compact || !c.compactHide) ? i : -1).filter(i => i >= 0);
  const visCols = visibleIdx.map(i => columns[i]);
  const visRows = rows.map(row => visibleIdx.map(i => row[i] ?? ''));

  // Column widths = max(header, all data cells) + 2 padding (1 left + 1 right)
  const widths = visCols.map((col, i) => {
    const headerLen = stripAnsi(col.header).length;
    const maxData = visRows.reduce((mx, row) => {
      const len = stripAnsi(row[i] ?? '').length;
      return len > mx ? len : mx;
    }, 0);
    return col.width ?? Math.max(headerLen, maxData) + 2;
  });

  /** Horizontal divider line */
  const divider = (left: string, mid: string, right: string): string =>
    dim(left + widths.map(w => b.h.repeat(w)).join(mid) + right);

  /** Single data/header row */
  const dataRow = (cells: string[]): string => {
    const cols = cells.map((cell, i) => {
      const stripped = stripAnsi(cell);
      // Total column width includes both padding chars, minus 1 for the left space
      const pad = widths[i] - stripped.length - 1;
      if ((visCols[i]?.align ?? 'left') === 'right') {
        return ' '.repeat(Math.max(0, pad)) + cell + ' ';
      }
      return ' ' + cell + ' '.repeat(Math.max(0, pad));
    });
    return dim(b.v) + cols.join(dim(b.v)) + dim(b.v);
  };

  const out: string[] = [];
  out.push(divider(b.tl, b.mt, b.tr));
  out.push(dataRow(visCols.map(c => c.header)));
  out.push(divider(b.ml, b.mx, b.mr));
  for (const row of visRows) {
    out.push(dataRow(row));
  }
  out.push(divider(b.bl, b.mb, b.br));
  return out.join('\n');
}
