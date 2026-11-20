import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  SlidersHorizontal,
  Maximize,
  PanelTop,
  PanelBottom,
} from 'lucide-react';
import { useEditorStore } from '../../../store/editorStore';
import { DEFAULT_ACCENT, formatPageNumber } from '../../../utils/pageLayout';

/**
 * Page list for fixed-layout books: every page is one fixed-size canvas. Pages are grouped under their
 * section, and the selected page's options (section, header / footer, full bleed) sit at the bottom.
 */
export const PageRail: React.FC<{ onOpenPageSetup: () => void }> = ({ onOpenPageSetup }) => {
  const project = useEditorStore((s) => s.project);
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter);
  const addChapter = useEditorStore((s) => s.addChapter);
  const duplicateChapter = useEditorStore((s) => s.duplicateChapter);
  const deleteChapter = useEditorStore((s) => s.deleteChapter);
  const reorderChapters = useEditorStore((s) => s.reorderChapters);
  const renameChapter = useEditorStore((s) => s.renameChapter);
  const updateChapterMeta = useEditorStore((s) => s.updateChapterMeta);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const pages = project.chapters;
  const sections = project.sections || [];
  const numbering = project.pageSetup?.numbering;
  const active = pages.find((p) => p.id === project.activeChapterId) || pages[0];
  const activeIndex = pages.findIndex((p) => p.id === active?.id);

  const sectionOf = (id?: string) => sections.find((s) => s.id === id);

  const finishRename = () => {
    if (renamingId && draftTitle.trim()) renameChapter(renamingId, draftTitle.trim());
    setRenamingId(null);
  };

  const iconBtn = 'p-1 rounded border border-neo-ink bg-white hover:bg-neo-yellow transition-colors disabled:opacity-30 disabled:hover:bg-white';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b-neo border-neo-ink bg-white flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-bold text-sm text-neo-ink uppercase tracking-wider">Pages</h3>
          <p className="text-[10px] font-mono text-gray-500">
            {pages.length} page{pages.length === 1 ? '' : 's'} · fixed layout
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenPageSetup}
            className="p-1.5 rounded border-neo border-neo-ink bg-white hover:bg-neo-bg shadow-neo-sm"
            title="Page setup: size, margins, header & footer, sections"
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => addChapter()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded border-neo border-neo-ink bg-neo-yellow font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Page
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1">
        {pages.map((pg, i) => {
          const sec = sectionOf(pg.sectionId);
          const prevSec = i > 0 ? sectionOf(pages[i - 1].sectionId) : undefined;
          const showHeading = (sec?.id || '') !== (prevSec?.id || '') || i === 0;
          const isActive = pg.id === active?.id;
          const accent = sec?.color || project.pageSetup?.accentColor || DEFAULT_ACCENT;
          const printed = formatPageNumber(i, numbering);
          return (
            <React.Fragment key={pg.id}>
              {showHeading && (sec || i > 0) && (
                <div className="mt-2 px-1 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm border border-neo-ink" style={{ background: sec ? accent : 'transparent' }} />
                  <span className="truncate">{sec ? `${sec.number ? sec.number + ' · ' : ''}${sec.title}` : 'No section'}</span>
                </div>
              )}
              <div
                onClick={() => setActiveChapter(pg.id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg border-neo cursor-pointer transition-all ${
                  isActive ? 'bg-neo-yellow border-neo-ink shadow-neo-sm' : 'bg-white border-neo-ink/30 hover:border-neo-ink'
                }`}
              >
                <div
                  className="w-7 shrink-0 text-center rounded border border-neo-ink bg-white text-neo-ink font-mono text-[10px] font-bold py-0.5"
                  title={printed ? `Printed page number ${printed}` : 'No printed number'}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {renamingId === pg.id ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={finishRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="w-full bg-white border border-neo-ink rounded px-1 py-0.5 text-xs font-heading font-bold"
                    />
                  ) : (
                    <div
                      className="font-heading font-bold text-xs text-neo-ink truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(pg.id);
                        setDraftTitle(pg.title);
                      }}
                      title="Double-click to rename"
                    >
                      {pg.title}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[9px] font-mono text-gray-500">
                    {pg.fullBleed && <span className="px-1 rounded bg-neo-ink text-white">BLEED</span>}
                    {pg.hideHeader && !pg.fullBleed && <span>no header</span>}
                    {pg.hideFooter && !pg.fullBleed && <span>no footer</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <button className={iconBtn} disabled={i === 0} onClick={() => reorderChapters(i, i - 1)} title="Move page up">
                    <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                  <button className={iconBtn} disabled={i === pages.length - 1} onClick={() => reorderChapters(i, i + 1)} title="Move page down">
                    <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                  <button className={iconBtn} onClick={() => duplicateChapter(pg.id)} title="Duplicate page">
                    <Copy className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                  <button
                    className={iconBtn + ' hover:!bg-neo-vermilion hover:text-white'}
                    disabled={pages.length <= 1}
                    onClick={() => {
                      if (confirm(`Delete "${pg.title}"?`)) deleteChapter(pg.id);
                    }}
                    title="Delete page"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {active && (
        <div className="border-t-neo border-neo-ink bg-white p-3 flex flex-col gap-2 text-[11px] font-mono">
          <div className="font-heading font-bold text-[11px] uppercase tracking-wider text-neo-ink">
            Page {activeIndex + 1} options
          </div>
          <label className="flex flex-col text-[10px] text-gray-500">
            Section
            <select
              value={active.sectionId || ''}
              onChange={(e) => updateChapterMeta(active.id, { sectionId: e.target.value || undefined })}
              className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs text-neo-ink"
            >
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number ? `${s.number} · ` : ''}
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          {sections.length === 0 && (
            <button onClick={onOpenPageSetup} className="text-left text-[10px] underline text-gray-600 hover:text-neo-vermilion">
              Create sections in Page setup →
            </button>
          )}
          <div className="grid grid-cols-1 gap-1">
            <label className="flex items-center gap-2 text-neo-ink cursor-pointer">
              <input
                type="checkbox"
                checked={!!active.fullBleed}
                onChange={(e) => updateChapterMeta(active.id, { fullBleed: e.target.checked })}
                className="accent-neo-ink"
              />
              <Maximize className="w-3 h-3" /> Full bleed (no margins, header or footer)
            </label>
            <label className={`flex items-center gap-2 text-neo-ink cursor-pointer ${active.fullBleed ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={!!active.hideHeader}
                disabled={active.fullBleed}
                onChange={(e) => updateChapterMeta(active.id, { hideHeader: e.target.checked })}
                className="accent-neo-ink"
              />
              <PanelTop className="w-3 h-3" /> Hide header on this page
            </label>
            <label className={`flex items-center gap-2 text-neo-ink cursor-pointer ${active.fullBleed ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={!!active.hideFooter}
                disabled={active.fullBleed}
                onChange={(e) => updateChapterMeta(active.id, { hideFooter: e.target.checked })}
                className="accent-neo-ink"
              />
              <PanelBottom className="w-3 h-3" /> Hide footer on this page
            </label>
          </div>
          <span className="sr-only">
            <Check />
          </span>
        </div>
      )}
    </div>
  );
};
