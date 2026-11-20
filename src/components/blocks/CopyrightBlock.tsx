import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { getCopyrightData, DEFAULT_RIGHTS_STATEMENT } from '../../utils/bookFeatures';
import type { BookMetadata } from '../../types/ast';

export interface CopyrightBlockProps {
  fontSize?: number;
  align?: 'left' | 'center';
  showLegalBox?: boolean;
  showDisclaimer?: boolean;
}

/**
 * The copyright / imprint page. Every line is filled from the book metadata (publisher, ISBN, edition,
 * rights statement …) which you edit in this block's inspector or in Book Metadata.
 */
export const CopyrightBlock: UserComponent<CopyrightBlockProps> = ({
  fontSize = 11,
  align = 'left',
  showLegalBox = true,
  showDisclaimer = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  const project = useEditorStore((s) => s.project);
  const c = getCopyrightData(project);

  const plain = [c.publisherLine, c.isbnLine, c.editionLine, c.classification].filter(Boolean);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative flex flex-col gap-3 ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{ fontSize, lineHeight: 1.45, textAlign: align, color: '#111' }}
    >
      <span className="absolute -top-2 left-0 z-20 text-[9px] font-mono font-bold uppercase bg-neo-ink text-neo-yellow px-1.5 py-0.5 rounded pointer-events-none">
        Copyright page
      </span>
      <p style={{ fontWeight: 700, margin: '8px 0 0' }}>{c.copyrightLine}</p>
      {c.author && <p style={{ margin: 0 }}>Written by {c.author}</p>}
      {plain.map((line) => (
        <p key={line} style={{ margin: 0 }}>
          {line}
        </p>
      ))}
      {showLegalBox && (c.rightsStatement || true) && (
        <div style={{ border: '1.5px solid #111', padding: 10, margin: '6px 0' }}>
          {c.rightsStatement || DEFAULT_RIGHTS_STATEMENT}
        </div>
      )}
      {c.contact && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{c.contact}</p>}
      {showDisclaimer && c.disclaimer && (
        <div>
          <p style={{ fontWeight: 700, margin: '6px 0 2px' }}>Disclaimer</p>
          <p style={{ margin: 0, whiteSpace: 'pre-line', opacity: 0.85 }}>{c.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

type MetaKey = keyof Pick<
  BookMetadata,
  'publisher' | 'copyrightHolder' | 'copyrightYear' | 'isbn' | 'edition' | 'classification' | 'contact' | 'rightsStatement' | 'disclaimer'
>;

export const CopyrightSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as CopyrightBlockProps }));
  const metadata = useEditorStore((s) => s.project.metadata);
  const updateProjectMetadata = useEditorStore((s) => s.updateProjectMetadata);

  const input = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs shadow-neo-sm';
  const label = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[10px]';
  const bind = (key: MetaKey) => ({
    value: metadata[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateProjectMetadata({ [key]: e.target.value }),
  });

  return (
    <div className="flex flex-col gap-2.5 text-xs font-sans">
      <p className="text-[11px] text-gray-600 leading-snug">
        These details are saved with the book and fill the copyright page everywhere it appears.
      </p>
      <div>
        <label className={label}>Publisher / imprint</label>
        <input type="text" {...bind('publisher')} className={input} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Copyright holder</label>
          <input type="text" {...bind('copyrightHolder')} placeholder={metadata.publisher || metadata.author} className={input} />
        </div>
        <div>
          <label className={label}>Year</label>
          <input type="text" {...bind('copyrightYear')} placeholder={String(new Date().getFullYear())} className={input} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>ISBN</label>
          <input type="text" {...bind('isbn')} className={input} />
        </div>
        <div>
          <label className={label}>Edition</label>
          <input type="text" {...bind('edition')} placeholder="First edition" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Classification</label>
        <input type="text" {...bind('classification')} placeholder="e.g. eBook and Workbook" className={input} />
      </div>
      <div>
        <label className={label}>Contact (address, phone, e-mail, website)</label>
        <textarea rows={3} {...bind('contact')} className={input} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Rights statement (boxed)</label>
          <button
            type="button"
            onClick={() => updateProjectMetadata({ rightsStatement: DEFAULT_RIGHTS_STATEMENT })}
            className="text-[10px] font-mono underline text-gray-600 hover:text-neo-vermilion mb-1"
          >
            Use default
          </button>
        </div>
        <textarea rows={4} {...bind('rightsStatement')} placeholder={DEFAULT_RIGHTS_STATEMENT} className={input} />
      </div>
      <div>
        <label className={label}>Disclaimer</label>
        <textarea rows={3} {...bind('disclaimer')} className={input} />
      </div>

      <div className="flex flex-col gap-1.5 border-neo border-neo-ink rounded bg-neo-bg/50 p-2.5">
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          <input
            type="checkbox"
            checked={props.showLegalBox ?? true}
            onChange={(e) => setProp((p: CopyrightBlockProps) => (p.showLegalBox = e.target.checked))}
            className="w-4 h-4 accent-neo-ink"
          />
          Boxed rights statement
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
          <input
            type="checkbox"
            checked={props.showDisclaimer ?? true}
            onChange={(e) => setProp((p: CopyrightBlockProps) => (p.showDisclaimer = e.target.checked))}
            className="w-4 h-4 accent-neo-ink"
          />
          Show disclaimer
        </label>
        <label className="flex items-center justify-between gap-2 text-neo-ink font-mono text-[10px]">
          Text size
          <input
            type="number"
            min={8}
            max={18}
            value={props.fontSize ?? 11}
            onChange={(e) => setProp((p: CopyrightBlockProps) => (p.fontSize = Number(e.target.value)))}
            className="w-16 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
      </div>
    </div>
  );
};

CopyrightBlock.craft = {
  displayName: 'Copyright Page',
  props: { fontSize: 11, align: 'left', showLegalBox: true, showDisclaimer: true },
  related: { toolbar: CopyrightSettings },
};
