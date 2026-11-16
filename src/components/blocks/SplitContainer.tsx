import React, { useRef, useState } from 'react';
import { useNode, Element, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { Columns, Grid, Bookmark, ArrowUpDown } from 'lucide-react';

export type SplitDesktopLayout =
  | '50/50'
  | '60/40'
  | '40/60'
  | '70/30'
  | '30/70'
  | '33/33/33'
  | '50/25/25'
  | '25/50/25'
  | '25/25/50'
  | '25/25/25/25'
  | 'bento-2x2';

export interface SplitContainerProps {
  desktopRatio?: SplitDesktopLayout;
  tabletColumns?: '1' | '2' | 'auto';
  gap?: 'none' | 'sm' | 'md' | 'lg';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  showDivider?: boolean;
  reverseOnMobile?: boolean;
  keepTogetherOnPageTurn?: boolean;
  /** Free-form column widths in percent (sum ≈ 100). Overrides the preset ratio when set. */
  columnWidths?: number[];
  /** Free-form minimum height of the grid in px. 0 / undefined = auto-height. */
  minHeight?: number;
}

const MIN_COL_PCT = 10;
const MIN_GRID_HEIGHT = 80;

const GAP_PX: Record<NonNullable<SplitContainerProps['gap']>, number> = {
  none: 0,
  sm: 12,
  md: 24,
  lg: 32,
};

/** Preset ratio → percentage widths of the columns in the first grid row. */
export function getPresetWidths(ratio: SplitDesktopLayout = '60/40'): number[] {
  switch (ratio) {
    case '50/50':
    case 'bento-2x2':
      return [50, 50];
    case '60/40':
      return [60, 40];
    case '40/60':
      return [40, 60];
    case '70/30':
      return [70, 30];
    case '30/70':
      return [30, 70];
    case '33/33/33':
      return [100 / 3, 100 / 3, 100 / 3];
    case '50/25/25':
      return [50, 25, 25];
    case '25/50/25':
      return [25, 50, 25];
    case '25/25/50':
      return [25, 25, 50];
    case '25/25/25/25':
      return [25, 25, 25, 25];
    default:
      return [60, 40];
  }
}

/** Number of columns on the first grid row at the native (desktop) layout. */
export function getNativeColumnCount(ratio: SplitDesktopLayout = '60/40'): number {
  return ratio === 'bento-2x2' ? 2 : getActiveCellCount(ratio);
}

export const SplitColumn: UserComponent<{
  children?: React.ReactNode;
  backgroundColor?: string;
}> = ({ children, backgroundColor = 'transparent' }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      data-drop-zone="true"
      className="flex-1 min-h-[140px] flex flex-col gap-4 p-3 border-2 border-dashed border-gray-300 rounded-lg transition-all hover:border-neo-yellow/80"
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
};

SplitColumn.craft = {
  displayName: 'Grid / Split Cell',
  props: {
    backgroundColor: 'transparent',
  },
  rules: {
    canDrag: () => false,
  },
};

export function getActiveCellCount(ratio: SplitDesktopLayout = '60/40'): 2 | 3 | 4 {
  switch (ratio) {
    case '33/33/33':
    case '50/25/25':
    case '25/50/25':
    case '25/25/50':
      return 3;
    case '25/25/25/25':
    case 'bento-2x2':
      return 4;
    default:
      return 2;
  }
}

export const SplitContainer: UserComponent<SplitContainerProps> = ({
  desktopRatio = '60/40',
  tabletColumns = 'auto',
  gap = 'md',
  alignItems = 'stretch',
  showDivider = false,
  reverseOnMobile = false,
  keepTogetherOnPageTurn = false,
  columnWidths,
  minHeight,
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

  const gridRef = useRef<HTMLDivElement>(null);
  const [liveWidths, setLiveWidths] = useState<number[] | null>(null);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);

  const viewportMode = useEditorStore((state) => state.viewportMode);
  const cellCount = getActiveCellCount(desktopRatio);

  const getGapClass = () => {
    switch (gap) {
      case 'none':
        return 'gap-0';
      case 'sm':
        return 'gap-3';
      case 'lg':
        return 'gap-8';
      case 'md':
      default:
        return 'gap-6';
    }
  };

  const getAlignClass = () => {
    switch (alignItems) {
      case 'start':
        return 'items-start';
      case 'center':
        return 'items-center';
      case 'end':
        return 'items-end';
      case 'stretch':
      default:
        return 'items-stretch';
    }
  };

  const isMobile = viewportMode === 'mobile';
  const isTablet = viewportMode === 'tablet';

  // Free-form widths only apply while the grid shows its native column count
  const nativeCols = getNativeColumnCount(desktopRatio);
  const gridColCount = isMobile
    ? 1
    : isTablet
    ? tabletColumns === '1'
      ? 1
      : tabletColumns === '2'
      ? 2
      : desktopRatio === '25/25/25/25'
      ? 2
      : nativeCols
    : nativeCols;
  const storedWidths =
    Array.isArray(columnWidths) &&
    columnWidths.length === nativeCols &&
    columnWidths.every((w) => typeof w === 'number' && w > 0)
      ? columnWidths
      : null;
  const activeWidths = liveWidths || storedWidths;
  const canResize = gridColCount === nativeCols && nativeCols > 1;
  const useCustomWidths = canResize && !!activeWidths;
  const effectiveMinHeight = liveHeight ?? (minHeight && minHeight > 0 ? minHeight : 0);

  const getGapPx = () => GAP_PX[gap] ?? GAP_PX.md;

  const getScale = (el: HTMLElement) =>
    el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 1;

  const handleColumnResizeStart = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    const grid = gridRef.current;
    if (!grid || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);

    const startX = e.clientX;
    const scale = getScale(grid);
    const usablePx = Math.max(1, (grid.offsetWidth - getGapPx() * (nativeCols - 1)) * scale);
    const base = (activeWidths || getPresetWidths(desktopRatio)).slice();
    const total = base.reduce((a, b) => a + b, 0) || 100;
    const start = base.map((w) => (w / total) * 100);
    const pair = start[index] + start[index + 1];
    let latest = start;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      moved = true;
      const delta = ((ev.clientX - startX) / usablePx) * 100;
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
      setProp((p: SplitContainerProps) => {
        p.columnWidths = latest;
      });
    };
    target.addEventListener('pointermove', onMove as EventListener);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const handleHeightResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);

    const startY = e.clientY;
    const scale = getScale(grid);
    const startH = grid.offsetHeight;
    let latest = startH;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      moved = true;
      latest = Math.max(MIN_GRID_HEIGHT, Math.round(startH + (ev.clientY - startY) / scale));
      setLiveHeight(latest);
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove as EventListener);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      setLiveHeight(null);
      if (!moved) return;
      setProp((p: SplitContainerProps) => {
        p.minHeight = latest;
      });
    };
    target.addEventListener('pointermove', onMove as EventListener);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  // Handle sits on the boundary between column `index` and `index + 1` of the first row
  const renderColumnHandle = (index: number) => {
    if (!canResize || index >= nativeCols - 1) return null;
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize columns"
        onPointerDown={(e) => handleColumnResizeStart(e, index)}
        onMouseDown={(e) => e.preventDefault()}
        draggable={false}
        style={{ right: `${-(getGapPx() / 2) - 6}px`, touchAction: 'none' }}
        className="absolute top-0 bottom-0 w-3 z-20 cursor-col-resize group/handle flex items-center justify-center"
      >
        <div className="w-1 h-10 max-h-full rounded-full bg-neo-violet/60 group-hover/handle:bg-neo-violet transition-colors" />
      </div>
    );
  };

  const getRatioGridClass = () => {
    if (isMobile) {
      return reverseOnMobile ? 'flex flex-col-reverse' : 'flex flex-col';
    }

    if (useCustomWidths) return 'grid';

    if (isTablet) {
      if (tabletColumns === '1') return 'flex flex-col';
      if (tabletColumns === '2') return 'grid grid-cols-2';
    }

    switch (desktopRatio) {
      case '60/40':
        return 'grid grid-cols-[3fr_2fr]';
      case '40/60':
        return 'grid grid-cols-[2fr_3fr]';
      case '70/30':
        return 'grid grid-cols-[7fr_3fr]';
      case '30/70':
        return 'grid grid-cols-[3fr_7fr]';
      case '33/33/33':
        return 'grid grid-cols-3';
      case '50/25/25':
        return 'grid grid-cols-[2fr_1fr_1fr]';
      case '25/50/25':
        return 'grid grid-cols-[1fr_2fr_1fr]';
      case '25/25/50':
        return 'grid grid-cols-[1fr_1fr_2fr]';
      case '25/25/25/25':
        return isTablet ? 'grid grid-cols-2' : 'grid grid-cols-4';
      case 'bento-2x2':
        return 'grid grid-cols-2';
      case '50/50':
      default:
        return 'grid grid-cols-2';
    }
  };

  const formatWidths = (w: number[]) => w.map((n) => Math.round(n)).join('/');

  const getLayoutLabel = () => {
    if (desktopRatio === 'bento-2x2') return 'Adaptive 2×2 Bento Grid';
    if (cellCount === 4) return 'Adaptive 4-Column Grid';
    if (cellCount === 3) return 'Adaptive 3-Column Spread';
    return 'Adaptive Split (2-Column)';
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-4 p-2 rounded-lg transition-all ${
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
      {/* Breakpoint tag indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
          {cellCount > 2 ? (
            <Grid className="w-3 h-3 text-neo-violet" />
          ) : (
            <Columns className="w-3 h-3 text-neo-violet" />
          )}
          {getLayoutLabel()}
        </span>

        <div className="flex items-center gap-1.5">
          {keepTogetherOnPageTurn && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
              <Bookmark className="w-2.5 h-2.5" />
              Keep on Page
            </span>
          )}
          {!isMobile ? (
            <span className="text-[10px] font-mono bg-neo-violet text-white px-2 py-0.5 rounded shadow-neo-sm font-bold">
              Spread: {useCustomWidths && activeWidths ? `Custom ${formatWidths(activeWidths)}` : desktopRatio}
            </span>
          ) : (
            <span className="text-[10px] font-mono bg-neo-bg text-neo-ink px-2 py-0.5 rounded border border-neo-ink font-semibold">
              Mobile Flow: 100% Stacked
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          ref={gridRef}
          className={`w-full ${getRatioGridClass()} ${getGapClass()} ${getAlignClass()} ${
            showDivider && !isMobile && desktopRatio !== 'bento-2x2'
              ? 'divide-x-2 divide-neo-ink/20'
              : ''
          } ${liveWidths || liveHeight ? '' : 'transition-all duration-300'}`}
          style={{
            ...(useCustomWidths && activeWidths
              ? { gridTemplateColumns: activeWidths.map((w) => `${w}fr`).join(' ') }
              : {}),
            ...(!isMobile && effectiveMinHeight > 0
              ? {
                  minHeight: `${effectiveMinHeight}px`,
                  ...(gridColCount > 1 ? { gridAutoRows: '1fr' } : {}),
                }
              : {}),
          }}
        >
          <div className="relative flex flex-col min-w-0">
            <Element is={SplitColumn} id="left-column" canvas />
            {renderColumnHandle(0)}
          </div>
          <div className="relative flex flex-col min-w-0">
            <Element is={SplitColumn} id="right-column" canvas />
            {renderColumnHandle(1)}
          </div>
          <div className={cellCount >= 3 ? 'relative flex flex-col min-w-0' : 'hidden'}>
            <Element is={SplitColumn} id="col-3" canvas />
            {renderColumnHandle(2)}
          </div>
          <div className={cellCount >= 4 ? 'relative flex flex-col min-w-0' : 'hidden'}>
            <Element is={SplitColumn} id="col-4" canvas />
          </div>
        </div>

        {/* Height resize grip (double-click resets to auto height) */}
        {!isMobile && (
          <div
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize height (double-click to reset to auto)"
            onPointerDown={handleHeightResizeStart}
            onMouseDown={(e) => e.preventDefault()}
            onDoubleClick={() =>
              setProp((p: SplitContainerProps) => {
                p.minHeight = 0;
              })
            }
            draggable={false}
            style={{ touchAction: 'none' }}
            className="absolute -bottom-3 left-0 right-0 h-3 z-20 cursor-row-resize group/hgrip flex items-center justify-center"
          >
            <div className="h-1 w-12 rounded-full bg-neo-violet/60 group-hover/hgrip:bg-neo-violet transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
};

export const SplitContainerSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as SplitContainerProps,
  }));

  const nativeCols = getNativeColumnCount(props.desktopRatio);
  const currentWidths =
    Array.isArray(props.columnWidths) && props.columnWidths.length === nativeCols
      ? props.columnWidths
      : getPresetWidths(props.desktopRatio);

  // Editing one column rebalances the remaining columns proportionally so the total stays 100%
  const handleWidthInput = (index: number, raw: number) => {
    if (!Number.isFinite(raw)) return;
    const maxForThis = 100 - MIN_COL_PCT * (nativeCols - 1);
    const value = Math.min(maxForThis, Math.max(MIN_COL_PCT, raw));
    const others = currentWidths.filter((_, i) => i !== index);
    const othersTotal = others.reduce((a, b) => a + b, 0) || 1;
    const remaining = 100 - value;
    const next = currentWidths.map((w, i) =>
      i === index ? value : Math.max(MIN_COL_PCT, Math.round((w / othersTotal) * remaining * 10) / 10)
    );
    setProp((p: SplitContainerProps) => {
      p.columnWidths = next;
    });
  };

  const twoColPresets: SplitDesktopLayout[] = ['50/50', '60/40', '40/60', '70/30', '30/70'];
  const threeColPresets: SplitDesktopLayout[] = ['33/33/33', '50/25/25', '25/50/25', '25/25/50'];
  const fourColPresets: { id: SplitDesktopLayout; label: string }[] = [
    { id: '25/25/25/25', label: '4-Col Row' },
    { id: 'bento-2x2', label: '2×2 Bento Grid' },
  ];

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div className="p-3 bg-neo-violet/10 border-neo border-neo-violet rounded-lg">
        <div className="font-heading font-bold text-neo-violet uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1">
          <Grid className="w-3.5 h-3.5" />
          Adaptive Multi-Column &amp; Grid
        </div>
        <p className="text-[11px] text-gray-700 leading-normal">
          Collapses to a single vertical stream on <strong>Mobile (390px)</strong> and expands into 2, 3, or 4 column grids on <strong>Tablet &amp; Desktop</strong>.
        </p>
      </div>

      {/* 2-Column Ratios */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          2-Column Asymmetric Ratios
        </label>
        <div className="grid grid-cols-3 gap-1">
          {twoColPresets.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => {
                  p.desktopRatio = ratio;
                  p.columnWidths = undefined;
                })}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.desktopRatio === ratio
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Ratios */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          3-Column Editorial Spreads
        </label>
        <div className="grid grid-cols-2 gap-1">
          {threeColPresets.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => {
                  p.desktopRatio = ratio;
                  p.columnWidths = undefined;
                })}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.desktopRatio === ratio
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Column & Bento Grid */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          4-Cell Grid &amp; Bento Layouts
        </label>
        <div className="grid grid-cols-2 gap-1">
          {fourColPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => {
                  p.desktopRatio = preset.id;
                  p.columnWidths = undefined;
                })}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.desktopRatio === preset.id
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Free-form sizing */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Custom Size (or drag handles on canvas)
        </label>
        <div className="p-2 border-neo border-neo-ink rounded bg-neo-bg/50 flex flex-col gap-2">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${nativeCols}, minmax(0, 1fr))` }}
          >
            {currentWidths.map((w, i) => (
              <label key={i} className="flex flex-col font-mono text-[10px] text-gray-500">
                Col {i + 1} %
                <input
                  type="number"
                  min={MIN_COL_PCT}
                  max={100 - MIN_COL_PCT * (nativeCols - 1)}
                  step={1}
                  value={Math.round(w * 10) / 10}
                  onChange={(e) => handleWidthInput(i, Number(e.target.value))}
                  className="w-full bg-white border border-neo-ink px-1.5 py-1 rounded font-mono text-xs"
                />
              </label>
            ))}
          </div>
          <label className="flex flex-col font-mono text-[10px] text-gray-500">
            Min height (px) — 0 = auto
            <input
              type="number"
              min={0}
              step={10}
              value={props.minHeight && props.minHeight > 0 ? props.minHeight : 0}
              onChange={(e) =>
                setProp((p: SplitContainerProps) => {
                  const v = Number(e.target.value);
                  p.minHeight = Number.isFinite(v) && v > 0 ? Math.max(80, v) : 0;
                })
              }
              className="w-full bg-white border border-neo-ink px-1.5 py-1 rounded font-mono text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setProp((p: SplitContainerProps) => {
                p.columnWidths = undefined;
                p.minHeight = 0;
              })
            }
            className="py-1 text-center font-mono border-neo border-neo-ink rounded bg-white hover:bg-neo-bg"
          >
            Reset to preset ratio &amp; auto height
          </button>
        </div>
      </div>

      {/* Tablet Breakpoint Behavior */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Tablet (768px) Columns
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'auto', label: 'Auto' },
              { id: '2', label: '2 Cols' },
              { id: '1', label: '1 Col Stack' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => (p.tabletColumns = t.id))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                (props.tabletColumns || 'auto') === t.id
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column Spacing */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Grid / Column Gap
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['none', 'sm', 'md', 'lg'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => (p.gap = g))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded capitalize transition-all ${
                props.gap === g ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Alignment */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Vertical Alignment
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['start', 'center', 'end', 'stretch'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setProp((p: SplitContainerProps) => (p.alignItems = a))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded capitalize transition-all ${
                props.alignItems === a
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Hairline Divider & Mobile Reverse */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.showDivider}
            onChange={(e) =>
              setProp((p: SplitContainerProps) => (p.showDivider = e.target.checked))
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink">
            Vertical Hairline Divider (Desktop)
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.reverseOnMobile}
            onChange={(e) =>
              setProp((p: SplitContainerProps) => (p.reverseOnMobile = e.target.checked))
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-neo-ink flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-neo-vermilion" />
              Reverse Stack on Mobile
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Invert cell order when stacked on phones
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.keepTogetherOnPageTurn}
            onChange={(e) =>
              setProp((p: SplitContainerProps) => (p.keepTogetherOnPageTurn = e.target.checked))
            }
            className="w-4 h-4 accent-neo-ink rounded mt-0.5"
          />
          <div className="flex flex-col">
            <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
              Keep on Same Page Turn
            </span>
            <span className="text-[10px] text-gray-500 font-mono mt-0.5">
              Avoids split pagination across columns in e-readers.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

SplitContainer.craft = {
  displayName: 'Adaptive Column / Grid',
  props: {
    desktopRatio: '60/40',
    tabletColumns: 'auto',
    gap: 'md',
    alignItems: 'stretch',
    showDivider: false,
    reverseOnMobile: false,
    keepTogetherOnPageTurn: false,
    columnWidths: undefined,
    minHeight: 0,
  },
  related: {
    toolbar: SplitContainerSettings,
  },
};
