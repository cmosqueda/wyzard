import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, RotateCw, FileText, PanelTop, Layers, BookA, Copy } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import type { HeaderFooterZone, PageMaster, PageNumberStyle, PageSetup, ZoneSlot } from '../../types/ast';
import {
  HEADER_FOOTER_PRESETS,
  PAGE_SIZE_PRESETS,
  PAGE_TOKENS,
  clampPageDimension,
  formatPageNumber,
  getPageContext,
  pxToUnit,
  unitToPx,
  type LengthUnit,
} from '../../utils/pageLayout';
import { PageZoneView } from './centerStage/FixedPage';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'page' | 'headerFooter' | 'masters' | 'sections' | 'terms';

const labelCls = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]';
const inputCls = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs focus:outline-none';
const btnCls = 'px-3 py-1.5 border-neo border-neo-ink rounded font-mono text-xs font-bold transition-all';

/** Number input that edits a pixel value in the chosen unit (px / mm / in). */
const LengthField: React.FC<{
  label: string;
  px: number;
  unit: LengthUnit;
  min?: number;
  onChange: (px: number) => void;
}> = ({ label, px, unit, min = 0, onChange }) => (
  <label className="flex flex-col font-mono text-[10px] text-gray-500">
    {label}
    <input
      type="number"
      step={unit === 'px' ? 1 : 0.1}
      min={min}
      value={pxToUnit(px, unit)}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(unitToPx(v, unit));
      }}
      className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
    />
  </label>
);

/** A colour that can also be "the section accent". */
const ColorField: React.FC<{
  label: string;
  value: string | undefined;
  allowAccent?: boolean;
  allowNone?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, allowAccent, allowNone, onChange }) => {
  const isAccent = value === 'accent';
  const isNone = !value || value === 'transparent';
  return (
    <div className="flex flex-col font-mono text-[10px] text-gray-500">
      {label}
      <div className="mt-0.5 flex items-center gap-1">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value || '') ? (value as string) : '#2563EB'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 p-0.5 bg-white border border-neo-ink rounded cursor-pointer"
        />
        {allowAccent && (
          <button
            type="button"
            onClick={() => onChange('accent')}
            title="Use the section colour"
            className={`px-1.5 py-1 border border-neo-ink rounded text-[10px] font-bold ${isAccent ? 'bg-neo-yellow' : 'bg-white'}`}
          >
            Accent
          </button>
        )}
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange('transparent')}
            className={`px-1.5 py-1 border border-neo-ink rounded text-[10px] font-bold ${isNone ? 'bg-neo-yellow' : 'bg-white'}`}
          >
            None
          </button>
        )}
      </div>
    </div>
  );
};

const SlotEditor: React.FC<{
  title: string;
  slot: ZoneSlot | undefined;
  onChange: (slot: ZoneSlot | undefined) => void;
}> = ({ title, slot, onChange }) => {
  const s: ZoneSlot = slot || { text: '' };
  const set = (patch: Partial<ZoneSlot>) => onChange({ ...s, ...patch });
  return (
    <div className="border border-neo-ink/40 rounded-lg p-2 bg-neo-bg/40 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-neo-ink">{title}</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) set({ text: `${s.text}${e.target.value}` });
          }}
          className="bg-white border border-neo-ink rounded text-[10px] font-mono px-1 py-0.5 max-w-[120px]"
          title="Insert a token that fills in automatically"
        >
          <option value="">+ Token</option>
          {PAGE_TOKENS.map((t) => (
            <option key={t.token} value={t.token}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        value={s.text}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="Empty = nothing. Extra lines are smaller."
        className="w-full bg-white border border-neo-ink rounded px-2 py-1 font-mono text-xs resize-y"
      />
      <div className="grid grid-cols-3 gap-2 items-end">
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Size
          <input
            type="number"
            min={6}
            max={72}
            value={s.size ?? 12}
            onChange={(e) => set({ size: Number(e.target.value) })}
            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
          />
        </label>
        <label className="flex items-center gap-1 font-mono text-[10px] text-neo-ink pb-1.5">
          <input type="checkbox" checked={!!s.bold} onChange={(e) => set({ bold: e.target.checked })} className="accent-neo-ink" />
          Bold
        </label>
        <ColorField label="Text" value={s.color} allowAccent onChange={(v) => set({ color: v })} />
      </div>
      <ColorField
        label="Box behind text"
        value={s.bg}
        allowAccent
        allowNone
        onChange={(v) => set({ bg: v === 'transparent' ? undefined : v })}
      />
    </div>
  );
};

const ZoneEditor: React.FC<{
  title: string;
  zone: HeaderFooterZone;
  onChange: (zone: HeaderFooterZone) => void;
}> = ({ title, zone, onChange }) => {
  const set = (patch: Partial<HeaderFooterZone>) => onChange({ ...zone, ...patch });
  const setSlot = (key: 'left' | 'center' | 'right', slot: ZoneSlot | undefined) => {
    const next = { ...zone, [key]: slot && slot.text.trim() ? slot : slot };
    if (!slot || !slot.text.trim()) delete (next as Partial<HeaderFooterZone>)[key];
    onChange(next as HeaderFooterZone);
  };
  return (
    <div className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-heading font-bold text-sm text-neo-ink cursor-pointer">
          <input type="checkbox" checked={zone.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="w-4 h-4 accent-neo-ink" />
          {title}
        </label>
      </div>
      {zone.enabled && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <label className="flex flex-col font-mono text-[10px] text-gray-500">
              Height (px)
              <input
                type="number"
                min={12}
                max={200}
                value={zone.height}
                onChange={(e) => set({ height: Math.max(12, Number(e.target.value) || 12) })}
                className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
              />
            </label>
            <ColorField label="Background" value={zone.background} allowAccent allowNone onChange={(v) => set({ background: v })} />
            <ColorField label="Text" value={zone.color} allowAccent onChange={(v) => set({ color: v })} />
            <ColorField label="Border" value={zone.borderColor} allowAccent allowNone onChange={(v) => set({ borderColor: v })} />
          </div>
          <label className="flex items-center gap-2 font-mono text-[10px] text-gray-500">
            Border width
            <input
              type="number"
              min={0}
              max={8}
              value={zone.borderWidth}
              onChange={(e) => set({ borderWidth: Math.max(0, Number(e.target.value) || 0) })}
              className="w-16 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <SlotEditor title="Left" slot={zone.left} onChange={(s) => setSlot('left', s)} />
            <SlotEditor title="Centre" slot={zone.center} onChange={(s) => setSlot('center', s)} />
            <SlotEditor title="Right" slot={zone.right} onChange={(s) => setSlot('right', s)} />
          </div>
        </>
      )}
    </div>
  );
};

export const PageSetupModal: React.FC<PageSetupModalProps> = ({ isOpen, onClose }) => {
  const project = useEditorStore((s) => s.project);
  const updatePageSetup = useEditorStore((s) => s.updatePageSetup);
  const addSection = useEditorStore((s) => s.addSection);
  const updateSection = useEditorStore((s) => s.updateSection);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const addTerm = useEditorStore((s) => s.addTerm);
  const updateTerm = useEditorStore((s) => s.updateTerm);
  const deleteTerm = useEditorStore((s) => s.deleteTerm);
  const updateChapterMeta = useEditorStore((s) => s.updateChapterMeta);

  const [tab, setTab] = useState<Tab>('page');
  const [unit, setUnit] = useState<LengthUnit>('px');
  const [draft, setDraft] = useState<PageSetup | null>(null);
  const [linkMargins, setLinkMargins] = useState(false);

  // Edit a draft copy; "Apply" writes it once so the undo history isn't flooded by typing
  useEffect(() => {
    if (isOpen && project.pageSetup) setDraft(JSON.parse(JSON.stringify(project.pageSetup)));
  }, [isOpen, project.id]);

  const activeIndex = Math.max(
    0,
    project.chapters.findIndex((c) => c.id === project.activeChapterId)
  );
  const previewCtx = useMemo(() => getPageContext(project, activeIndex), [project, activeIndex]);

  if (!isOpen || !draft) return null;

  const set = (patch: Partial<PageSetup>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setMargin = (side: 'top' | 'right' | 'bottom' | 'left', px: number) =>
    setDraft((d) => {
      if (!d) return d;
      const v = Math.max(0, px);
      return { ...d, margins: linkMargins ? { top: v, right: v, bottom: v, left: v } : { ...d.margins, [side]: v } };
    });

  const dirty = JSON.stringify(draft) !== JSON.stringify(project.pageSetup);
  const apply = () => {
    updatePageSetup({
      ...draft,
      width: clampPageDimension(draft.width),
      height: clampPageDimension(draft.height),
    });
    onClose();
  };

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border-neo font-heading font-bold text-xs uppercase tracking-wider transition-all ${
        tab === id ? 'bg-neo-yellow border-neo-ink shadow-neo-sm' : 'border-transparent text-gray-600 hover:bg-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Page setup"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden"
      >
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <FileText className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-neo-ink">Page setup</h3>
              <p className="text-[11px] font-mono text-gray-500">Page size, margins, numbering, running header &amp; footer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neo-vermilion hover:text-white rounded border border-neo-ink transition-colors" title="Close">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
          {tabBtn('page', 'Page', <FileText className="w-3.5 h-3.5" />)}
          {tabBtn('headerFooter', 'Header & footer', <PanelTop className="w-3.5 h-3.5" />)}
          {tabBtn('masters', 'Masters', <Copy className="w-3.5 h-3.5" />)}
          {tabBtn('sections', 'Sections', <Layers className="w-3.5 h-3.5" />)}
          {tabBtn('terms', 'Index & glossary', <BookA className="w-3.5 h-3.5" />)}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
          {tab === 'page' && (
            <>
              <div>
                <label className={labelCls}>Page size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAGE_SIZE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={p.note}
                      onClick={() =>
                        set(
                          p.key === 'custom'
                            ? { sizeKey: 'custom' }
                            : { sizeKey: p.key, width: p.width, height: p.height }
                        )
                      }
                      className={`${btnCls} text-left ${draft.sizeKey === p.key ? 'bg-neo-yellow shadow-neo-sm' : 'bg-white hover:bg-neo-bg'}`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal text-gray-500">{p.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={labelCls + ' mb-0'}>Exact size</span>
                  <div className="flex items-center gap-1">
                    {(['px', 'mm', 'in'] as LengthUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={`px-2 py-0.5 border border-neo-ink rounded font-mono text-[10px] font-bold ${unit === u ? 'bg-neo-yellow' : 'bg-white'}`}
                      >
                        {u}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => set({ width: draft.height, height: draft.width, sizeKey: 'custom' })}
                      className="ml-2 flex items-center gap-1 px-2 py-0.5 border border-neo-ink rounded font-mono text-[10px] font-bold bg-white hover:bg-neo-yellow/40"
                      title="Swap width and height"
                    >
                      <RotateCw className="w-3 h-3" /> Rotate
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LengthField label="Width" px={draft.width} unit={unit} min={1} onChange={(px) => set({ width: px, sizeKey: 'custom' })} />
                  <LengthField label="Height" px={draft.height} unit={unit} min={1} onChange={(px) => set({ height: px, sizeKey: 'custom' })} />
                </div>
                <p className="text-[10px] font-mono text-gray-500">
                  Stored as {Math.round(draft.width)} × {Math.round(draft.height)} px (96 px = 1 in). Allowed range{' '}
                  {200}–{3000} px.
                </p>
              </div>

              <div className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className={labelCls + ' mb-0'}>Margins</span>
                  <label className="flex items-center gap-1.5 font-mono text-[10px] text-neo-ink cursor-pointer">
                    <input type="checkbox" checked={linkMargins} onChange={(e) => setLinkMargins(e.target.checked)} className="accent-neo-ink" />
                    Same on all sides
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <LengthField label="Top" px={draft.margins.top} unit={unit} onChange={(px) => setMargin('top', px)} />
                  <LengthField label="Right" px={draft.margins.right} unit={unit} onChange={(px) => setMargin('right', px)} />
                  <LengthField label="Bottom" px={draft.margins.bottom} unit={unit} onChange={(px) => setMargin('bottom', px)} />
                  <LengthField label="Left" px={draft.margins.left} unit={unit} onChange={(px) => setMargin('left', px)} />
                </div>
              </div>

              <div className="border-neo border-neo-ink rounded-xl p-3 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label className="flex flex-col font-mono text-[10px] text-gray-500">
                  First page number
                  <input
                    type="number"
                    value={draft.numbering.start}
                    onChange={(e) => set({ numbering: { ...draft.numbering, start: Number(e.target.value) || 1 } })}
                    className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                  />
                </label>
                <label className="flex flex-col font-mono text-[10px] text-gray-500">
                  Number style
                  <select
                    value={draft.numbering.style}
                    onChange={(e) => set({ numbering: { ...draft.numbering, style: e.target.value as PageNumberStyle } })}
                    className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                  >
                    <option value="arabic">1, 2, 3</option>
                    <option value="roman">i, ii, iii</option>
                    <option value="roman-upper">I, II, III</option>
                    <option value="none">No numbers</option>
                  </select>
                </label>
                <ColorField
                  label="Default accent colour"
                  value={draft.accentColor || '#2563EB'}
                  onChange={(v) => set({ accentColor: v })}
                />
                <p className="sm:col-span-3 text-[10px] font-mono text-gray-500">
                  Page {activeIndex + 1} prints as “{formatPageNumber(activeIndex, draft.numbering) || '—'}”. Use{' '}
                  <code>{'{pageNumber}'}</code> in the header or footer to show it.
                </p>
              </div>
              <div className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2">
                <span className={labelCls}>Master pages</span>
                <label className="flex items-start gap-2 cursor-pointer text-xs text-neo-ink">
                  <input
                    type="checkbox"
                    checked={!!draft.facing}
                    onChange={(e) => set({ facing: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-neo-ink"
                  />
                  <span>
                    Facing pages (left / right)
                    <span className="block text-[10px] font-mono text-gray-500 leading-snug">
                      The first page is a right-hand page. The left margin becomes the inner (binding) margin, and on left-hand pages the
                      margins and the header / footer slots are mirrored, so page numbers sit on the outside. Print PDF can lay pages out as spreads.
                    </span>
                  </span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neo-ink">
                    <input
                      type="checkbox"
                      checked={!!draft.sectionStart?.hideHeader}
                      onChange={(e) => set({ sectionStart: { ...draft.sectionStart, hideHeader: e.target.checked } })}
                      className="w-4 h-4 accent-neo-ink"
                    />
                    Hide the header on the first page of each section
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neo-ink">
                    <input
                      type="checkbox"
                      checked={!!draft.sectionStart?.hideFooter}
                      onChange={(e) => set({ sectionStart: { ...draft.sectionStart, hideFooter: e.target.checked } })}
                      className="w-4 h-4 accent-neo-ink"
                    />
                    Hide the footer on the first page of each section
                  </label>
                </div>
              </div>
            </>
          )}

          {tab === 'headerFooter' && (
            <>
              <div>
                <label className={labelCls}>Start from a preset</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {HEADER_FOOTER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        set({ header: JSON.parse(JSON.stringify(p.header)), footer: JSON.parse(JSON.stringify(p.footer)) })
                      }
                      className={`${btnCls} text-left bg-white hover:bg-neo-yellow/40`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal text-gray-500">{p.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-neo border-neo-ink rounded-xl p-3 bg-white">
                <span className={labelCls}>Live preview (current page)</span>
                <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded">
                  {draft.header.enabled && (
                    <div style={{ height: draft.header.height }}>
                      <PageZoneView zone={draft.header} ctx={previewCtx} />
                    </div>
                  )}
                  {draft.footer.enabled && (
                    <div style={{ height: draft.footer.height }}>
                      <PageZoneView zone={draft.footer} ctx={previewCtx} />
                    </div>
                  )}
                  {!draft.header.enabled && !draft.footer.enabled && (
                    <span className="text-[11px] font-mono text-gray-500">No header or footer on pages.</span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-gray-500 mt-1.5">
                  Hide them on a single page (covers, art pages) from the Pages list, or mark that page “full bleed”.
                </p>
              </div>

              <ZoneEditor title="Header" zone={draft.header} onChange={(header) => set({ header })} />
              <ZoneEditor title="Footer" zone={draft.footer} onChange={(footer) => set({ footer })} />
            </>
          )}

          {tab === 'masters' && (
            <>
              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                A master page has its own header, footer and / or margins; anything you leave off follows the book's page setup. A master made for the
                <strong> left</strong> or <strong>right</strong> side applies automatically to those pages when Facing pages is on (it replaces the
                mirroring). Any master can also be picked for a section or a single page. Changes apply with “Apply to all pages”.
              </p>
              {(draft.masters || []).length === 0 && (
                <div className="border border-dashed border-neo-ink/50 rounded-xl p-4 text-center text-[11px] font-mono text-gray-500">
                  No master pages yet.
                </div>
              )}
              {(draft.masters || []).map((m) => {
                const patch = (p: Partial<PageMaster>) =>
                  set({ masters: (draft.masters || []).map((x) => (x.id === m.id ? { ...x, ...p } : x)) });
                const drop = (key: 'header' | 'footer' | 'margins') => {
                  const next = { ...m };
                  delete next[key];
                  set({ masters: (draft.masters || []).map((x) => (x.id === m.id ? next : x)) });
                };
                return (
                  <div key={m.id} className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2.5" data-master={m.name}>
                    <div className="flex items-center gap-2">
                      <input
                        value={m.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        aria-label="Master name"
                        className={`${inputCls} flex-1 font-bold`}
                      />
                      <select
                        value={m.side || ''}
                        onChange={(e) => {
                          const side = (e.target.value || undefined) as PageMaster['side'];
                          const next = { ...m };
                          if (side) next.side = side;
                          else delete next.side;
                          set({ masters: (draft.masters || []).map((x) => (x.id === m.id ? next : x)) });
                        }}
                        aria-label="Master side"
                        className="bg-white border border-neo-ink px-1.5 py-1.5 rounded text-xs font-mono"
                      >
                        <option value="">Pick manually</option>
                        <option value="left">Left pages</option>
                        <option value="right">Right pages</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => set({ masters: (draft.masters || []).filter((x) => x.id !== m.id) })}
                        className="p-1.5 border-neo border-neo-ink rounded hover:bg-neo-vermilion hover:text-white"
                        title="Delete master"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-neo-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!m.header}
                        onChange={(e) => (e.target.checked ? patch({ header: JSON.parse(JSON.stringify(draft.header)) }) : drop('header'))}
                        className="w-4 h-4 accent-neo-ink"
                      />
                      Own header
                    </label>
                    {m.header && <ZoneEditor title={`${m.name} · header`} zone={m.header} onChange={(header) => patch({ header })} />}
                    <label className="flex items-center gap-2 text-xs text-neo-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!m.footer}
                        onChange={(e) => (e.target.checked ? patch({ footer: JSON.parse(JSON.stringify(draft.footer)) }) : drop('footer'))}
                        className="w-4 h-4 accent-neo-ink"
                      />
                      Own footer
                    </label>
                    {m.footer && <ZoneEditor title={`${m.name} · footer`} zone={m.footer} onChange={(footer) => patch({ footer })} />}
                    <label className="flex items-center gap-2 text-xs text-neo-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!m.margins}
                        onChange={(e) => (e.target.checked ? patch({ margins: { ...draft.margins } }) : drop('margins'))}
                        className="w-4 h-4 accent-neo-ink"
                      />
                      Own margins
                    </label>
                    {m.margins && (
                      <div className="grid grid-cols-4 gap-2">
                        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                          <label key={side} className="flex flex-col font-mono text-[10px] text-gray-500 capitalize">
                            {side}
                            <input
                              type="number"
                              min={0}
                              value={Math.round(m.margins![side])}
                              onChange={(e) => patch({ margins: { ...m.margins!, [side]: Math.max(0, Number(e.target.value) || 0) } })}
                              className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    set({
                      masters: [
                        ...(draft.masters || []),
                        { id: 'mst-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), name: `Master ${(draft.masters || []).length + 1}` },
                      ],
                    })
                  }
                  className={`${btnCls} bg-neo-yellow shadow-neo-sm flex items-center gap-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add master page
                </button>
              </div>
            </>
          )}

          {tab === 'sections' && (
            <>
              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                Sections group pages (for example Unit 1 or Chapter 2). Their title, subtitle, number and colour fill the{' '}
                <code>{'{sectionTitle}'}</code>, <code>{'{sectionSubtitle}'}</code>, <code>{'{sectionNumber}'}</code> tokens and the accent colour of
                the header and footer. Assign pages to a section from the Pages list.
              </p>
              {(project.sections || []).length === 0 && (
                <div className="border border-dashed border-neo-ink/50 rounded-xl p-4 text-center text-[11px] font-mono text-gray-500">
                  No sections yet.
                </div>
              )}
              {(project.sections || []).map((sec) => {
                const count = project.chapters.filter((c) => c.sectionId === sec.id).length;
                return (
                  <div key={sec.id} className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_auto] gap-2 items-end">
                      <label className="flex flex-col font-mono text-[10px] text-gray-500">
                        Number
                        <input
                          value={sec.number || ''}
                          onChange={(e) => updateSection(sec.id, { number: e.target.value })}
                          className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                          placeholder="1"
                        />
                      </label>
                      <label className="flex flex-col font-mono text-[10px] text-gray-500">
                        Title
                        <input
                          value={sec.title}
                          onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                          className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                        />
                      </label>
                      <label className="flex flex-col font-mono text-[10px] text-gray-500">
                        Subtitle
                        <input
                          value={sec.subtitle || ''}
                          onChange={(e) => updateSection(sec.id, { subtitle: e.target.value })}
                          className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                        />
                      </label>
                      <ColorField label="Colour" value={sec.color || draft.accentColor || '#2563EB'} onChange={(v) => updateSection(sec.id, { color: v })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
                      <label className="flex flex-col font-mono text-[10px] text-gray-500">
                        Contents label (e.g. “Chapter 1”)
                        <input
                          value={sec.tocLabel || ''}
                          onChange={(e) => updateSection(sec.id, { tocLabel: e.target.value })}
                          className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                          placeholder="optional"
                        />
                      </label>
                      <label className="flex flex-col font-mono text-[10px] text-gray-500">
                        Contents level
                        <select
                          value={sec.level ?? 1}
                          onChange={(e) => updateSection(sec.id, { level: Number(e.target.value) as 1 | 2 | 3 })}
                          className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                        >
                          <option value={1}>1 · Part / unit</option>
                          <option value={2}>2 · Chapter</option>
                          <option value={3}>3 · Lesson</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-1.5 font-mono text-[10px] text-neo-ink pb-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sec.inToc !== false}
                          onChange={(e) => updateSection(sec.id, { inToc: e.target.checked })}
                          className="accent-neo-ink"
                        />
                        In contents
                      </label>
                      {(project.pageSetup?.masters || []).length > 0 && (
                        <label className="flex flex-col font-mono text-[10px] text-gray-500">
                          Master page
                          <select
                            value={sec.masterId || ''}
                            onChange={(e) => updateSection(sec.id, { masterId: e.target.value || undefined })}
                            aria-label="Section master"
                            className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                          >
                            <option value="">Automatic</option>
                            {(project.pageSetup?.masters || []).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                      <span>{count} page{count === 1 ? '' : 's'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateChapterMeta(project.activeChapterId, { sectionId: sec.id })}
                          className="px-2 py-0.5 border border-neo-ink rounded font-bold bg-white hover:bg-neo-yellow/40"
                        >
                          Put current page here
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSection(sec.id)}
                          className="p-1 border border-neo-ink rounded hover:bg-neo-vermilion hover:text-white"
                          title="Delete section (pages are kept)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div>
                <button
                  type="button"
                  onClick={() => addSection({ number: String((project.sections || []).length + 1), title: 'New section' })}
                  className={`${btnCls} bg-neo-yellow shadow-neo-sm flex items-center gap-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add section
                </button>
              </div>
            </>
          )}
          {tab === 'terms' && (
            <>
              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                Terms feed the <strong>Index</strong> and <strong>Glossary</strong> pages (add them from Book pages or the block palette). A term appears in
                the index with every page whose text contains it, and with its definition in the glossary. Changes save immediately.
              </p>
              {(project.terms || []).length === 0 && (
                <div className="border border-dashed border-neo-ink/50 rounded-xl p-4 text-center text-[11px] font-mono text-gray-500">
                  No terms yet.
                </div>
              )}
              {(project.terms || []).map((t) => (
                <div key={t.id} className="border-neo border-neo-ink rounded-xl p-3 bg-white flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={t.term}
                      onChange={(e) => updateTerm(t.id, { term: e.target.value })}
                      placeholder="Term"
                      aria-label="Term"
                      className={`${inputCls} flex-1 font-bold`}
                    />
                    <label className="flex items-center gap-1 text-[10px] font-mono text-gray-600 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.inIndex !== false}
                        onChange={(e) => updateTerm(t.id, { inIndex: e.target.checked })}
                        className="w-3.5 h-3.5 accent-neo-ink"
                      />
                      In index
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteTerm(t.id)}
                      className="p-1.5 border-neo border-neo-ink rounded hover:bg-neo-vermilion hover:text-white"
                      title="Delete term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={t.definition || ''}
                    onChange={(e) => updateTerm(t.id, { definition: e.target.value })}
                    placeholder="Definition (optional, shown in the glossary)"
                    aria-label="Definition"
                    rows={2}
                    className={`${inputCls} resize-y`}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex flex-col font-mono text-[10px] text-gray-500">
                      Sub-entry of
                      <select
                        value={t.parent || ''}
                        onChange={(e) => updateTerm(t.id, { parent: e.target.value || undefined })}
                        aria-label="Sub-entry of"
                        className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                      >
                        <option value="">Main entry</option>
                        {(project.terms || [])
                          .filter((o) => o.id !== t.id && !o.parent && o.term.trim() && !(project.terms || []).some((c) => c.parent === t.id))
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.term}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="flex flex-col font-mono text-[10px] text-gray-500">
                      Also look for
                      <input
                        value={t.aliases || ''}
                        onChange={(e) => updateTerm(t.id, { aliases: e.target.value || undefined })}
                        placeholder="rhymes, rhyming"
                        aria-label="Also look for"
                        className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                      />
                    </label>
                    <label className="flex flex-col font-mono text-[10px] text-gray-500">
                      See also
                      <input
                        value={t.seeAlso || ''}
                        onChange={(e) => updateTerm(t.id, { seeAlso: e.target.value || undefined })}
                        placeholder="meter, verse"
                        aria-label="See also"
                        className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.auto !== false}
                      onChange={(e) => updateTerm(t.id, { auto: e.target.checked ? undefined : false })}
                      className="w-3.5 h-3.5 accent-neo-ink"
                    />
                    Find in the text automatically (turn off to list the term only on pages you tag)
                  </label>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() => addTerm({ term: 'New term' })}
                  className={`${btnCls} bg-neo-yellow shadow-neo-sm flex items-center gap-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add term
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 bg-white border-t-neo border-neo-ink flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-gray-500">
            {tab === 'sections' || tab === 'terms' ? 'Edits here save immediately.' : dirty ? 'Unsaved page changes' : 'No changes'}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={`${btnCls} bg-white hover:bg-neo-bg`}>
              {dirty ? 'Cancel' : 'Close'}
            </button>
            <button
              onClick={apply}
              disabled={!dirty}
              className={`${btnCls} bg-neo-yellow shadow-neo-sm disabled:opacity-40 disabled:shadow-none`}
            >
              Apply to all pages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
