import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { BlockPalette } from './BlockPalette';
import { ChapterSpine } from './ChapterSpine';
import { AssetLibrary } from './AssetLibrary';
import { Layers, Library, Sparkles, X } from 'lucide-react';

export const LeftRail: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    isLeftRailOpen,
    setLeftRailOpen,
  } = useEditorStore();

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isLeftRailOpen && (
        <div
          onClick={() => setLeftRailOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-30 xl:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Left Tools Panel"
        className={`bg-neo-surface border-neo-ink flex flex-col h-full select-none transition-all duration-200 ease-in-out shrink-0 ${
          isLeftRailOpen
            ? 'fixed xl:static inset-y-0 left-0 z-40 w-[86vw] max-w-[340px] xl:w-80 border-r-neo shadow-neo-lg xl:shadow-neo translate-x-0'
            : 'fixed xl:static inset-y-0 left-0 z-40 w-0 max-w-0 border-r-0 overflow-hidden -translate-x-full xl:translate-x-0 opacity-0 xl:opacity-100 pointer-events-none'
        }`}
      >
        <div className="w-[86vw] max-w-[340px] xl:w-80 h-full min-h-0 flex flex-col">
          {/* Top Tabs + Mobile Close Button */}
          <div className="flex items-center border-b-neo border-neo-ink bg-neo-bg/70 p-1.5 gap-1">
            <div className="grid grid-cols-3 flex-1 gap-1">
              <button
                onClick={() => setActiveSidebarTab('blocks')}
                className={`flex items-center justify-center gap-1.5 py-3 xl:py-2 rounded font-heading font-bold text-[11px] uppercase tracking-wider border-neo transition-all ${
                  activeSidebarTab === 'blocks'
                    ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
                    : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
                }`}
              >
                <Library className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Blocks</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('assets')}
                className={`flex items-center justify-center gap-1.5 py-3 xl:py-2 rounded font-heading font-bold text-[11px] uppercase tracking-wider border-neo transition-all ${
                  activeSidebarTab === 'assets'
                    ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
                    : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-neo-vermilion" strokeWidth={2.5} />
                <span>Assets</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('spine')}
                className={`flex items-center justify-center gap-1.5 py-3 xl:py-2 rounded font-heading font-bold text-[11px] uppercase tracking-wider border-neo transition-all ${
                  activeSidebarTab === 'spine'
                    ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
                    : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Spine</span>
              </button>
            </div>

            <button
              onClick={() => setLeftRailOpen(false)}
              className="p-2.5 rounded border border-neo-ink bg-white hover:bg-neo-vermilion hover:text-white transition-colors xl:hidden shrink-0"
              title="Close Left Panel"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeSidebarTab === 'blocks' ? (
              <BlockPalette />
            ) : activeSidebarTab === 'assets' ? (
              <AssetLibrary />
            ) : (
              <ChapterSpine />
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
