import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { BlockPalette } from './BlockPalette';
import { ChapterSpine } from './ChapterSpine';
import { Layers, Library } from 'lucide-react';

export const LeftRail: React.FC = () => {
  const { activeSidebarTab, setActiveSidebarTab } = useEditorStore();

  return (
    <aside className="w-80 bg-neo-surface border-r-neo border-neo-ink flex flex-col h-full z-20 select-none shadow-neo">
      {/* Top Tabs */}
      <div className="grid grid-cols-2 border-b-neo border-neo-ink bg-neo-bg/70 p-1.5 gap-1.5">
        <button
          onClick={() => setActiveSidebarTab('blocks')}
          className={`flex items-center justify-center gap-2 py-2 rounded font-heading font-bold text-xs uppercase tracking-wider border-neo transition-all ${
            activeSidebarTab === 'blocks'
              ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
              : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
          }`}
        >
          <Library className="w-4 h-4" strokeWidth={2.5} />
          <span>Blocks</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('spine')}
          className={`flex items-center justify-center gap-2 py-2 rounded font-heading font-bold text-xs uppercase tracking-wider border-neo transition-all ${
            activeSidebarTab === 'spine'
              ? 'bg-neo-yellow text-neo-ink border-neo-ink shadow-neo-sm'
              : 'border-transparent text-gray-600 hover:text-neo-ink hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4" strokeWidth={2.5} />
          <span>Spine</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSidebarTab === 'blocks' ? <BlockPalette /> : <ChapterSpine />}
      </div>
    </aside>
  );
};
