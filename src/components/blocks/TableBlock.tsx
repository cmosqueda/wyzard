import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { PopoverMenu } from '../ui/PopoverMenu';
import { MathText } from '../ui/MathText';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  GripHorizontal,
  GripVertical,
  Bookmark,
} from 'lucide-react';

export type TableAlign = 'left' | 'center' | 'right';

export interface TableBlockProps {
  /** rows[r][c] — plain text; `$…$` renders as LaTeX */
  rows?: string[][];
  headerRow?: boolean;
  headerColumn?: boolean;
  striped?: boolean;
  columnAlign?: TableAlign[];
  /** Column widths in percent (sum ≈ 100). Even split when unset. */
  columnWidths?: number[];
  caption?: string;
  keepTogetherOnPageTurn?: boolean;
}

const DEFAULT_ROWS: string[][] = [
  ['Item', 'Detail', 'Value'],
  ['', '', ''],
  ['', '', ''],
];

const MIN_COL_PCT = 8;

/** Rectangular copy of the grid (every row padded to the widest row). */
export function normalizeRows(rows?: string[][]): string[][] {
  const src = rows && rows.length > 0 ? rows : DEFAULT_ROWS;
  const cols = Math.max(1, ...src.map((r) => r.length));
  return src.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ''));
}

function validWidths(widths: number[] | undefined, cols: number): number[] | null {
  return Array.isArray(widths) && widths.length === cols && widths.every((w) => w > 0) ? widths : null;
}

export const TableBlock: UserComponent<TableBlockProps> = ({
  rows: rawRows,
  headerRow = true,
  headerColumn = false,
  striped = false,
  columnAlign,
  columnWidths,
  caption = '',
  keepTogetherOnPageTurn = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    actions: { setProp },
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const rows = normalizeRows(rawRows);
  const rowCount = rows.length;
  const colCount = rows[0].length;
  const tableRef = useRef<HTMLTableElement>(null);
  const [liveWidths, setLiveWidths] = useState<number[] | null>(null);
  const widths = liveWidths || validWidths(columnWidths, colCount);
  const aligns = (c: number): TableAlign => columnAlign?.[c] || 'left';

  // ---- grid mutations (all operate on a normalised copy so ragged data is repaired) ----
  const mutate = (fn: (grid: string[][], p: TableBlockProps) => void) =>
    setProp((p: TableBlockProps) => {
      const grid = normalizeRows(p.rows);
      fn(grid, p);
      p.rows = grid;
    });

  const setCell = (r: number, c: number, value: string) =>
    mutate((g) => {
      g[r][c] = value;
    });

  const insertRow = (at: number) =>
    mutate((g) => {
      g.splice(at, 0, Array.from({ length: g[0].length }, () => ''));
    });

  const deleteRow = (at: number) =>
    mutate((g) => {
      if (g.length > 1) g.splice(at, 1);
    });

  const moveRow = (at: number, dir: -1 | 1) =>
    mutate((g) => {
      const to = at + dir;
      if (to < 0 || to >= g.length) return;
      [g[at], g[to]] = [g[to], g[at]];
    });

  const reorderCols = <T,>(arr: T[] | undefined, fill: T, cols: number, fn: (a: T[]) => void) => {
    const next = Array.from({ length: cols }, (_, i) => arr?.[i] ?? fill);
    fn(next);
    return next;
  };

  const insertCol = (at: number) =>
    mutate((g, p) => {
      const cols = g[0].length;
      g.forEach((row) => row.splice(at, 0, ''));
      p.columnAlign = reorderCols<TableAlign>(p.columnAlign, 'left', cols, (a) => a.splice(at, 0, 'left'));
      p.columnWidths = undefined;
    });

  const deleteCol = (at: number) =>
    mutate((g, p) => {
      const cols = g[0].length;
      if (cols <= 1) return;
      g.forEach((row) => row.splice(at, 1));
      p.columnAlign = reorderCols<TableAlign>(p.columnAlign, 'left', cols, (a) => a.splice(at, 1));
      p.columnWidths = undefined;
    });

  const moveCol = (at: number, dir: -1 | 1) =>
    mutate((g, p) => {
      const cols = g[0].length;
      const to = at + dir;
      if (to < 0 || to >= cols) return;
      g.forEach((row) => ([row[at], row[to]] = [row[to], row[at]]));
      p.columnAlign = reorderCols<TableAlign>(p.columnAlign, 'left', cols, (a) => ([a[at], a[to]] = [a[to], a[at]]));
      if (p.columnWidths && p.columnWidths.length === cols) {
        const w = [...p.columnWidths];
        [w[at], w[to]] = [w[to], w[at]];
        p.columnWidths = w;
      }
    });

  const setAlign = (c: number, a: TableAlign) =>
    setProp((p: TableBlockProps) => {
      const cols = normalizeRows(p.rows)[0].length;
      p.columnAlign = reorderCols<TableAlign>(p.columnAlign, 'left', cols, (arr) => {
        arr[c] = a;
      });
    });

  // ---- keyboard navigation & spreadsheet paste ----
  const focusCell = (r: number, c: number) => {
    const el = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
  };

  const handleCellKey = (e: React.KeyboardEvent<HTMLDivElement>, r: number, c: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      let nr = r;
      let nc = c + (e.shiftKey ? -1 : 1);
      if (nc >= colCount) {
        nc = 0;
        nr += 1;
      } else if (nc < 0) {
        nc = colCount - 1;
        nr -= 1;
      }
      if (nr < 0) return;
      if (nr >= rowCount) {
        insertRow(rowCount);
        setTimeout(() => focusCell(nr, nc), 40);
      } else {
        focusCell(nr, nc);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (r + 1 >= rowCount) {
        insertRow(rowCount);
        setTimeout(() => focusCell(r + 1, c), 40);
      } else {
        focusCell(r + 1, c);
      }
    }
  };

  const pasteGrid = (r: number, c: number, text: string): boolean => {
    const lines = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
    const grid = lines.map((l) => l.split('\t'));
    if (grid.length === 1 && grid[0].length === 1) return false;
    mutate((g, p) => {
      const needCols = Math.max(g[0].length, c + Math.max(...grid.map((row) => row.length)));
      const needRows = Math.max(g.length, r + grid.length);
      g.forEach((row) => {
        while (row.length < needCols) row.push('');
      });
      while (g.length < needRows) g.push(Array.from({ length: needCols }, () => ''));
      grid.forEach((row, ri) => row.forEach((val, ci) => (g[r + ri][c + ci] = val.trim())));
      if (needCols !== (p.columnAlign?.length ?? needCols)) p.columnWidths = undefined;
      p.columnWidths = needCols === colCount ? p.columnWidths : undefined;
    });
    return true;
  };

  // ---- column resizing ----
  const startColResize = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    const table = tableRef.current;
    if (!table || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const startX = e.clientX;
    const scale = table.offsetWidth > 0 ? table.getBoundingClientRect().width / table.offsetWidth : 1;
    const widthPx = Math.max(1, table.offsetWidth * scale);
    const base = widths || Array.from({ length: colCount }, () => 100 / colCount);
    const total = base.reduce((a, b) => a + b, 0) || 100;
    const start = base.map((w) => (w / total) * 100);
    const pair = start[index] + start[index + 1];
    let latest = start;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      moved = true;
      const delta = ((ev.clientX - startX) / widthPx) * 100;
      const left = Math.min(pair - MIN_COL_PCT, Math.max(MIN_COL_PCT, start[index] + delta));
      latest = start.slice();
      latest[index] = Math.round(left * 10) / 10;
      latest[index + 1] = Math.round((pair - left) * 10) / 10;
      setLiveWidths(latest);
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove as EventListener);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      setLiveWidths(null);
      if (!moved) return;
      setProp((p: TableBlockProps) => {
        p.columnWidths = latest;
      });
    };
    target.addEventListener('pointermove', onMove as EventListener);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const menuBtn =
    'flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-neo-ink hover:bg-neo-yellow/50 disabled:opacity-40 disabled:hover:bg-transparent whitespace-nowrap';

  return (
    <figure
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative my-4 transition-all text-neo-ink ${
        selected
          ? 'ring-2 ring-neo-yellow ring-offset-2'
          : hovered
          ? 'outline outline-1 outline-dashed outline-neo-vermilion'
          : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {keepTogetherOnPageTurn && (
        <span className="absolute -top-2 right-1 z-10 flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1 py-0.5 rounded shadow-neo-sm font-bold pointer-events-none">
          <Bookmark className="w-2.5 h-2.5" />
          Keep on Page
        </span>
      )}

      <div className="pl-7 pt-6 pr-7 pb-7 relative">
        <table ref={tableRef} className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            {Array.from({ length: colCount }, (_, c) => (
              <col key={c} style={widths ? { width: `${widths[c]}%` } : undefined} />
            ))}
          </colgroup>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={r}
                className={striped && !(headerRow && r === 0) && r % 2 === 0 ? 'bg-neo-bg/60' : ''}
              >
                {row.map((cell, c) => {
                  const isHeader = (headerRow && r === 0) || (headerColumn && c === 0);
                  const Tag = isHeader ? 'th' : 'td';
                  return (
                    <Tag
                      key={c}
                      className={`relative group/cell border border-neo-ink/40 px-2 py-1.5 align-top ${
                        isHeader ? 'bg-neo-bg font-bold' : 'bg-transparent'
                      }`}
                      style={{ textAlign: aligns(c) }}
                    >
                      <MathText
                        value={cell}
                        singleLine
                        dataCell={`${r}-${c}`}
                        onChange={(v) => setCell(r, c, v)}
                        onKeyDown={(e) => handleCellKey(e, r, c)}
                        onPasteText={(t) => pasteGrid(r, c, t)}
                        className="min-h-[1.25rem] break-words"
                      />

                      {/* Column menu (above the first row) */}
                      {r === 0 && (
                        <div
                          className={`absolute -top-6 left-1/2 -translate-x-1/2 z-20 ${
                            selected ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100 [@media(hover:none)]:opacity-100'
                          } transition-opacity`}
                        >
                          <PopoverMenu
                            title="Column options"
                            icon={<GripHorizontal className="w-3.5 h-3.5" />}
                            buttonClassName="!px-1.5 !py-0.5 bg-white border border-neo-ink/60 text-gray-600 hover:bg-neo-yellow"
                          >
                            {(close) => (
                              <div className="flex flex-col min-w-[170px]">
                                <div className="grid grid-cols-3 gap-1 pb-1 mb-1 border-b border-gray-200">
                                  {(
                                    [
                                      ['left', <AlignLeft key="l" className="w-3.5 h-3.5" />],
                                      ['center', <AlignCenter key="c" className="w-3.5 h-3.5" />],
                                      ['right', <AlignRight key="r" className="w-3.5 h-3.5" />],
                                    ] as const
                                  ).map(([a, icon]) => (
                                    <button
                                      key={a}
                                      type="button"
                                      title={`Align ${a}`}
                                      onClick={() => setAlign(c, a)}
                                      className={`p-1.5 flex justify-center rounded border border-neo-ink/50 ${
                                        aligns(c) === a ? 'bg-neo-yellow' : 'bg-white hover:bg-neo-bg'
                                      }`}
                                    >
                                      {icon}
                                    </button>
                                  ))}
                                </div>
                                <button type="button" className={menuBtn} onClick={() => { insertCol(c); close(); }}>
                                  <ArrowLeft className="w-3.5 h-3.5" /> Insert left
                                </button>
                                <button type="button" className={menuBtn} onClick={() => { insertCol(c + 1); close(); }}>
                                  <ArrowRight className="w-3.5 h-3.5" /> Insert right
                                </button>
                                <button type="button" className={menuBtn} disabled={c === 0} onClick={() => { moveCol(c, -1); close(); }}>
                                  <ArrowLeft className="w-3.5 h-3.5" /> Move left
                                </button>
                                <button type="button" className={menuBtn} disabled={c === colCount - 1} onClick={() => { moveCol(c, 1); close(); }}>
                                  <ArrowRight className="w-3.5 h-3.5" /> Move right
                                </button>
                                <button type="button" className={`${menuBtn} !text-red-600`} disabled={colCount <= 1} onClick={() => { deleteCol(c); close(); }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete column
                                </button>
                              </div>
                            )}
                          </PopoverMenu>
                        </div>
                      )}

                      {/* Row menu (left of the first column) */}
                      {c === 0 && (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 -left-7 z-20 ${
                            selected ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100 [@media(hover:none)]:opacity-100'
                          } transition-opacity`}
                        >
                          <PopoverMenu
                            title="Row options"
                            icon={<GripVertical className="w-3.5 h-3.5" />}
                            buttonClassName="!px-0.5 !py-1 bg-white border border-neo-ink/60 text-gray-600 hover:bg-neo-yellow"
                          >
                            {(close) => (
                              <div className="flex flex-col min-w-[150px]">
                                <button type="button" className={menuBtn} onClick={() => { insertRow(r); close(); }}>
                                  <ArrowUp className="w-3.5 h-3.5" /> Insert above
                                </button>
                                <button type="button" className={menuBtn} onClick={() => { insertRow(r + 1); close(); }}>
                                  <ArrowDown className="w-3.5 h-3.5" /> Insert below
                                </button>
                                <button type="button" className={menuBtn} disabled={r === 0} onClick={() => { moveRow(r, -1); close(); }}>
                                  <ArrowUp className="w-3.5 h-3.5" /> Move up
                                </button>
                                <button type="button" className={menuBtn} disabled={r === rowCount - 1} onClick={() => { moveRow(r, 1); close(); }}>
                                  <ArrowDown className="w-3.5 h-3.5" /> Move down
                                </button>
                                <button type="button" className={`${menuBtn} !text-red-600`} disabled={rowCount <= 1} onClick={() => { deleteRow(r); close(); }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete row
                                </button>
                              </div>
                            )}
                          </PopoverMenu>
                        </div>
                      )}

                      {/* Column resize handle (first row, not on the last column) */}
                      {r === 0 && c < colCount - 1 && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          title="Drag to resize column"
                          onPointerDown={(e) => startColResize(e, c)}
                          onMouseDown={(e) => e.preventDefault()}
                          draggable={false}
                          style={{ touchAction: 'none' }}
                          className="absolute top-0 -right-1 w-2 h-full z-10 cursor-col-resize hover:bg-neo-violet/50"
                        />
                      )}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row / column */}
        <button
          type="button"
          onClick={() => insertRow(rowCount)}
          title="Add row"
          className={`absolute left-7 right-7 bottom-1 h-5 flex items-center justify-center rounded border border-dashed border-neo-ink/40 text-gray-500 hover:bg-neo-yellow/40 hover:text-neo-ink transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 hover:opacity-100 [@media(hover:none)]:opacity-100'
          }`}
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={() => insertCol(colCount)}
          title="Add column"
          className={`absolute top-6 bottom-7 right-1 w-5 flex items-center justify-center rounded border border-dashed border-neo-ink/40 text-gray-500 hover:bg-neo-yellow/40 hover:text-neo-ink transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 hover:opacity-100 [@media(hover:none)]:opacity-100'
          }`}
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>

      <figcaption
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Add a caption…"
        onBlur={(e) =>
          setProp((p: TableBlockProps) => {
            p.caption = e.currentTarget.textContent || '';
          })
        }
        className="text-center text-xs font-mono text-gray-500 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      >
        {caption}
      </figcaption>
    </figure>
  );
};

export const TableSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as TableBlockProps,
  }));

  const grid = normalizeRows(props.rows);
  const rowCount = grid.length;
  const colCount = grid[0].length;

  const resize = (rowsWanted: number, colsWanted: number) =>
    setProp((p: TableBlockProps) => {
      const g = normalizeRows(p.rows);
      const r = Math.min(50, Math.max(1, rowsWanted));
      const c = Math.min(12, Math.max(1, colsWanted));
      const next = Array.from({ length: r }, (_, ri) =>
        Array.from({ length: c }, (_, ci) => g[ri]?.[ci] ?? '')
      );
      if (c !== g[0].length) p.columnWidths = undefined;
      p.rows = next;
    });

  const toggle = (key: 'headerRow' | 'headerColumn' | 'striped' | 'keepTogetherOnPageTurn', fallback: boolean) => (
    <input
      type="checkbox"
      checked={props[key] ?? fallback}
      onChange={(e) => setProp((p: TableBlockProps) => (p[key] = e.target.checked))}
      className="w-4 h-4 accent-neo-ink rounded"
    />
  );

  const stepper = (label: string, value: number, set: (v: number) => void, max: number) => (
    <div className="flex items-center justify-between gap-2">
      <span className="font-heading font-semibold uppercase tracking-wider text-[11px] text-neo-ink">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => set(value - 1)} className="w-7 py-1 border-neo border-neo-ink rounded bg-white hover:bg-neo-bg font-mono font-bold">
          −
        </button>
        <span className="w-8 text-center font-mono">{value}</span>
        <button type="button" onClick={() => set(Math.min(max, value + 1))} className="w-7 py-1 border-neo border-neo-ink rounded bg-white hover:bg-neo-bg font-mono font-bold">
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      <p className="text-[11px] text-gray-600 leading-snug">
        Click a cell to type. <strong>Tab</strong>/<strong>Enter</strong> move between cells, and pasting from a spreadsheet fills the grid.
        Use the grips on the table edges to insert, move or delete rows and columns, or drag a column border to resize.
        Wrap math in <code className="bg-white px-1 rounded border border-gray-300">$…$</code> for LaTeX.
      </p>

      {stepper('Rows', rowCount, (v) => resize(v, colCount), 50)}
      {stepper('Columns', colCount, (v) => resize(rowCount, v), 12)}

      <div className="flex flex-col gap-2 border-neo border-neo-ink rounded bg-neo-bg/50 p-2.5">
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          {toggle('headerRow', true)} Header row
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          {toggle('headerColumn', false)} Header column
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          {toggle('striped', false)} Striped rows
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink" title="Adds break-inside: avoid so the table isn't split across e-reader pages">
          {toggle('keepTogetherOnPageTurn', true)} Keep on one page
        </label>
      </div>

      {props.columnWidths && (
        <button
          type="button"
          onClick={() => setProp((p: TableBlockProps) => (p.columnWidths = undefined))}
          className="py-1 text-center font-mono border-neo border-neo-ink rounded bg-white hover:bg-neo-bg"
        >
          Reset column widths
        </button>
      )}
    </div>
  );
};

TableBlock.craft = {
  displayName: 'Table',
  props: {
    rows: DEFAULT_ROWS,
    headerRow: true,
    headerColumn: false,
    striped: false,
    columnAlign: undefined,
    columnWidths: undefined,
    caption: '',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: TableSettings,
  },
};
