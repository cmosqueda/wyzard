import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { BlockInspector } from './BlockInspector';
import { Sliders, X } from 'lucide-react';

export const RightRail: React.FC = () => {
  const {
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
          {/* Title + Mobile Close Button */}
          <div className="flex items-center justify-between border-b-neo border-neo-ink bg-neo-bg/70 px-3 py-2.5">
            <span className="flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-wider text-neo-ink">
              <Sliders className="w-4 h-4" strokeWidth={2.5} />
              Inspector
            </span>
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
            <BlockInspector />
          </div>
        </div>
      </aside>
    </>
  );
};
