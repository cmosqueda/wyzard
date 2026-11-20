import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { buildTocEntries, DEFAULT_ACCENT, type TocEntry } from '../../utils/pageLayout';

export interface TocBlockProps {
  /** Deepest level shown: 1 = parts / units, 2 = + chapters, 3 = + lessons */
  maxLevel?: 1 | 2 | 3;
  /** First entry shown (1-based). Use with `limit` to continue a long TOC on the next page. */
  from?: number;
  /** Number of entries on this page (0 = all remaining) */
  limit?: number;
  showPageNumbers?: boolean;
  leader?: 'dots' | 'none';
  accentColor?: string;
  fontSize?: number;
}

/** Entries after applying the block's level / range settings. */
export function selectTocEntries(all: TocEntry[], props: TocBlockProps): TocEntry[] {
  const filtered = all.filter((e) => e.level <= (props.maxLevel ?? 3));
  const from = Math.max(1, props.from ?? 1) - 1;
  const limit = props.limit ?? 0;
  return filtered.slice(from, limit > 0 ? from + limit : undefined);
}

/**
 * Automatic table of contents built from the book's sections and the pages marked "include in table of
 * contents". Page numbers follow the printed numbering, and every entry links to its page.
 */
export const TocBlock: UserComponent<TocBlockProps> = (props) => {
  const { showPageNumbers = true, leader = 'dots', accentColor, fontSize = 13 } = props;
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  const project = useEditorStore((s) => s.project);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);

  const all = buildTocEntries(project);
  const entries = selectTocEntries(all, props);
  const accent = accentColor || project.pageSetup?.accentColor || DEFAULT_ACCENT;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{ fontSize, color: '#111' }}
    >
      <span className="absolute -top-2 left-0 z-20 text-[9px] font-mono font-bold uppercase bg-neo-ink text-neo-yellow px-1.5 py-0.5 rounded pointer-events-none">
        Table of contents · {entries.length}/{all.length}
      </span>

      {entries.length === 0 ? (
        <div className="mt-3 p-3 border border-dashed border-gray-400 rounded text-[11px] font-mono text-gray-500 leading-snug">
          Nothing to list yet. Create sections (Page setup → Sections) and assign pages to them, or tick “Include in table of
          contents” for a page in the Pages panel.
        </div>
      ) : (
        <ol className="mt-3 flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {entries.map((e) => (
            <li key={e.id} style={{ paddingLeft: (e.level - 1) * 14, marginTop: e.level === 1 ? 8 : 0 }}>
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setActiveChapter(e.pageId);
                }}
                className="w-full flex items-baseline gap-1.5 py-[3px] text-left hover:bg-black/5 rounded-sm"
                style={{ fontWeight: e.level === 1 ? 700 : 400 }}
                title={`Go to page ${e.pageIndex + 1}`}
              >
                {e.label && (
                  <span
                    style={{
                      background: accent,
                      color: '#fff',
                      fontSize: Math.max(9, fontSize - 3),
                      fontWeight: 700,
                      padding: '0 6px',
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.label}
                  </span>
                )}
                <span>{e.title}</span>
                {leader === 'dots' && showPageNumbers ? (
                  <span style={{ flex: 1, borderBottom: '1.5px dotted currentColor', opacity: 0.45, transform: 'translateY(-3px)' }} />
                ) : (
                  <span style={{ flex: 1 }} />
                )}
                {showPageNumbers && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{e.printed}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export const TocSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as TocBlockProps }));
  const project = useEditorStore((s) => s.project);
  const all = buildTocEntries(project);
  const total = all.filter((e) => e.level <= (props.maxLevel ?? 3)).length;

  const label = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]';
  const field = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs shadow-neo-sm';

  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      <p className="text-[11px] text-gray-600 leading-snug">
        Built automatically from your sections and from pages marked “Include in table of contents”. <strong>{total}</strong> entr
        {total === 1 ? 'y' : 'ies'} at this depth.
      </p>

      <div>
        <label className={label}>Depth</label>
        <select
          value={props.maxLevel ?? 3}
          onChange={(e) => setProp((p: TocBlockProps) => (p.maxLevel = Number(e.target.value) as 1 | 2 | 3))}
          className={field}
        >
          <option value={1}>Parts / units only</option>
          <option value={2}>Parts and chapters</option>
          <option value={3}>Parts, chapters and lessons</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Start at entry
          <input
            type="number"
            min={1}
            value={props.from ?? 1}
            onChange={(e) => setProp((p: TocBlockProps) => (p.from = Math.max(1, Number(e.target.value) || 1)))}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Entries on this page (0 = all)
          <input
            type="number"
            min={0}
            value={props.limit ?? 0}
            onChange={(e) => setProp((p: TocBlockProps) => (p.limit = Math.max(0, Number(e.target.value) || 0)))}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
      </div>
      <p className="text-[10px] font-mono text-gray-500 leading-snug -mt-1">
        Long contents? Put the first 12 entries on one page, then add another table-of-contents page that starts at entry 13.
      </p>

      <div className="flex flex-col gap-1.5 border-neo border-neo-ink rounded bg-neo-bg/50 p-2.5">
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          <input
            type="checkbox"
            checked={props.showPageNumbers ?? true}
            onChange={(e) => setProp((p: TocBlockProps) => (p.showPageNumbers = e.target.checked))}
            className="w-4 h-4 accent-neo-ink"
          />
          Show page numbers
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          <input
            type="checkbox"
            checked={(props.leader ?? 'dots') === 'dots'}
            onChange={(e) => setProp((p: TocBlockProps) => (p.leader = e.target.checked ? 'dots' : 'none'))}
            className="w-4 h-4 accent-neo-ink"
          />
          Dot leaders
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Label colour
          <input
            type="color"
            value={props.accentColor || project.pageSetup?.accentColor || DEFAULT_ACCENT}
            onChange={(e) => setProp((p: TocBlockProps) => (p.accentColor = e.target.value))}
            className="mt-0.5 h-8 w-full p-0.5 bg-white border-neo border-neo-ink rounded cursor-pointer"
          />
        </label>
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Text size
          <input
            type="number"
            min={9}
            max={24}
            value={props.fontSize ?? 13}
            onChange={(e) => setProp((p: TocBlockProps) => (p.fontSize = Number(e.target.value)))}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
      </div>
    </div>
  );
};

TocBlock.craft = {
  displayName: 'Table of Contents',
  props: { maxLevel: 3, from: 1, limit: 0, showPageNumbers: true, leader: 'dots', fontSize: 13 },
  related: { toolbar: TocSettings },
};
