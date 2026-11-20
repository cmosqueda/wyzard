import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { buildIndexEntries, getGlossaryEntries } from '../../utils/bookFeatures';

export interface TermsBlockProps {
  /** `index`: terms with the pages they appear on. `glossary`: terms with their definitions. */
  variant?: 'index' | 'glossary';
  fontSize?: number;
  /** Index only: group entries under A, B, C … letters */
  groupByLetter?: boolean;
  columns?: 1 | 2;
}

/**
 * The book's index or glossary, generated from the terms list (Page setup → Index & glossary).
 * Index page numbers are found by scanning the pages' text and follow the printed numbering; each links to its page.
 */
export const TermsBlock: UserComponent<TermsBlockProps> = ({ variant = 'index', fontSize = 12, groupByLetter = true, columns = 1 }) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  const project = useEditorStore((s) => s.project);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);

  const index = variant === 'index' ? buildIndexEntries(project) : [];
  const glossary = variant === 'glossary' ? getGlossaryEntries(project) : [];
  const count = variant === 'index' ? index.length : glossary.length;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative ${selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''}`}
      style={{ fontSize, color: '#111', columnCount: columns, columnGap: 20 }}
    >
      <span className="absolute -top-2 left-0 z-20 text-[9px] font-mono font-bold uppercase bg-neo-ink text-neo-yellow px-1.5 py-0.5 rounded pointer-events-none">
        {variant === 'index' ? 'Index' : 'Glossary'} · {count}
      </span>
      {count === 0 && (
        <div className="mt-3 p-3 border border-dashed border-gray-400 rounded text-[11px] font-mono text-gray-500 leading-snug">
          {variant === 'index'
            ? 'No index entries yet. Add terms in Page setup → Index & glossary; a term is listed once it appears in the text of a page.'
            : 'No glossary entries yet. Add terms with a definition in Page setup → Index & glossary.'}
        </div>
      )}
      {variant === 'glossary' &&
        glossary.map((g) => (
          <p key={g.id} style={{ margin: '8px 0 0', breakInside: 'avoid' }}>
            <strong>{g.term}</strong> — {g.definition}
          </p>
        ))}
      {variant === 'index' &&
        index.map((e, i) => {
          const letter = e.term[0]?.toUpperCase() || '';
          let prevMain = '';
          for (let k = i - 1; k >= 0; k--) {
            if (index[k].level === 0) {
              prevMain = index[k].term[0]?.toUpperCase() || '';
              break;
            }
          }
          const showLetter = groupByLetter && e.level === 0 && (i === 0 || prevMain !== letter);
          return (
            <div key={e.id} style={{ breakInside: 'avoid' }}>
              {showLetter && <div style={{ fontWeight: 800, marginTop: 10, fontSize: fontSize + 2 }}>{letter}</div>}
              <div style={{ margin: '2px 0', paddingLeft: e.level === 1 ? 14 : 0 }}>
                {e.term}
                {e.ranges.length > 0 && ', '}
                {e.ranges.map((r, k) => (
                  <span key={r.pageId}>
                    {k > 0 && ', '}
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setActiveChapter(r.pageId);
                      }}
                      className="underline decoration-dotted hover:bg-black/5"
                      title={`Go to page ${r.pageIndex + 1}`}
                    >
                      {r.label}
                    </button>
                  </span>
                ))}
                {e.seeAlso.length > 0 && (
                  <span>
                    {e.ranges.length > 0 ? '. ' : ', '}
                    <em>See also</em> {e.seeAlso.join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export const TermsSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as TermsBlockProps }));
  const field = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs shadow-neo-sm';
  const label = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]';
  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      <p className="text-[11px] text-gray-600 leading-snug">Built from the terms list in Page setup → Index &amp; glossary.</p>
      <div>
        <label className={label}>Shows</label>
        <select
          value={props.variant ?? 'index'}
          onChange={(e) => setProp((p: TermsBlockProps) => (p.variant = e.target.value as 'index' | 'glossary'))}
          className={field}
        >
          <option value="index">Index (terms and page numbers)</option>
          <option value="glossary">Glossary (terms and definitions)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Columns
          <select
            value={props.columns ?? 1}
            onChange={(e) => setProp((p: TermsBlockProps) => (p.columns = Number(e.target.value) as 1 | 2))}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Text size
          <input
            type="number"
            min={9}
            max={24}
            value={props.fontSize ?? 12}
            onChange={(e) => setProp((p: TermsBlockProps) => (p.fontSize = Number(e.target.value)))}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
      </div>
      {(props.variant ?? 'index') === 'index' && (
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          <input
            type="checkbox"
            checked={props.groupByLetter ?? true}
            onChange={(e) => setProp((p: TermsBlockProps) => (p.groupByLetter = e.target.checked))}
            className="w-4 h-4 accent-neo-ink"
          />
          Group under letters
        </label>
      )}
    </div>
  );
};

TermsBlock.craft = {
  displayName: 'Index / Glossary',
  props: { variant: 'index', fontSize: 12, groupByLetter: true, columns: 1 },
  related: { toolbar: TermsSettings },
};
