import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { BlockInspector } from './BlockInspector';
import { ProjectInspector } from './ProjectInspector';
import { Sliders, BookKey, X } from 'lucide-react';

export const RightRail: React.FC = () => {
  const {
    activeInspectorTab,
    setActiveInspectorTab,
    isRightRailOpen,
    setRightRailOpen,
  } = useEditorStore();

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isRightRailOpen && (
        <div
          onClick={() => setRightRailOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-30 lg:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Right Inspector Panel"
        className={`bg-neo-surface border-neo-ink flex flex-col h-full select-none transition-all duration-200 ease-in-out shrink-0 ${
          isRightRailOpen
            ? 'fixed lg:static inset-y-0 right-0 z-40 w-[86vw] max-w-[320px] lg:w-80 border-l-neo shadow-neo-lg lg:shadow-neo translate-x-0'
            : 'fixed lg:static inset-y-0 right-0 z-40 w-0 max-w-0 border-l-0 overflow-hidden translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100 pointer-events-none'
        }`}
      >
        <div className="w-[86vw] max-w-[320px] lg:w-80 h-full min-h-0 flex flex-col">
          {/* Top Tabs + Mobile Close Button */}
          <div className="flex items-center border-b-neo border-neo-ink bg-neo-bg/70 p-1.5 gap-1.5">
            <div className="grid grid-cols-2 flex-1 gap-1.5">
              <button
                onClick={() => setActiveInspectorTab('block')}
                className={`flex items-center justify-center gap-2 py-2 rounded font-heading font-bold text-xs uppercase tracking-wider border-neo transition-all ${
                  activeInspectorTab === 'block'
                    ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
                    : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
                }`}
              >
                <Sliders className="w-4 h-4" strokeWidth={2.5} />
                <span>Inspector</span>
              </button>

              <button
                onClick={() => setActiveInspectorTab('project')}
                className={`flex items-center justify-center gap-2 py-2 rounded font-heading font-bold text-xs uppercase tracking-wider border-neo transition-all ${
                  activeInspectorTab === 'project'
                    ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
                    : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
                }`}
              >
                <BookKey className="w-4 h-4" strokeWidth={2.5} />
                <span>Metadata</span>
              </button>
            </div>

            <button
              onClick={() => setRightRailOpen(false)}
              className="p-1.5 rounded border border-neo-ink bg-white hover:bg-neo-vermilion hover:text-white transition-colors lg:hidden shrink-0"
              title="Close Inspector Panel"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeInspectorTab === 'block' ? <BlockInspector /> : <ProjectInspector />}
          </div>
        </div>
      </aside>
    </>
  );
};
