import React from 'react';
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
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

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

  const getRatioGridClass = () => {
    if (isMobile) {
      return reverseOnMobile ? 'flex flex-col-reverse' : 'flex flex-col';
    }

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
              Spread: {desktopRatio}
            </span>
          ) : (
            <span className="text-[10px] font-mono bg-neo-bg text-neo-ink px-2 py-0.5 rounded border border-neo-ink font-semibold">
              Mobile Flow: 100% Stacked
            </span>
          )}
        </div>
      </div>

      <div
        className={`w-full ${getRatioGridClass()} ${getGapClass()} ${getAlignClass()} ${
          showDivider && !isMobile && desktopRatio !== 'bento-2x2'
            ? 'divide-x-2 divide-neo-ink/20'
            : ''
        } transition-all duration-300`}
      >
        <div className="flex flex-col min-w-0">
          <Element is={SplitColumn} id="left-column" canvas />
        </div>
        <div className="flex flex-col min-w-0">
          <Element is={SplitColumn} id="right-column" canvas />
        </div>
        <div className={cellCount >= 3 ? 'flex flex-col min-w-0' : 'hidden'}>
          <Element is={SplitColumn} id="col-3" canvas />
        </div>
        <div className={cellCount >= 4 ? 'flex flex-col min-w-0' : 'hidden'}>
          <Element is={SplitColumn} id="col-4" canvas />
        </div>
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
              onClick={() => setProp((p: SplitContainerProps) => (p.desktopRatio = ratio))}
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
              onClick={() => setProp((p: SplitContainerProps) => (p.desktopRatio = ratio))}
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
              onClick={() => setProp((p: SplitContainerProps) => (p.desktopRatio = preset.id))}
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
  },
  related: {
    toolbar: SplitContainerSettings,
  },
};
