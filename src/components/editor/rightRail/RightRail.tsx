import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { BlockInspector } from './BlockInspector';
import { ProjectInspector } from './ProjectInspector';
import { Sliders, BookKey } from 'lucide-react';

export const RightRail: React.FC = () => {
  const { activeInspectorTab, setActiveInspectorTab } = useEditorStore();

  return (
    <aside className="w-80 bg-neo-surface border-l-neo border-neo-ink flex flex-col h-full z-20 select-none shadow-neo">
      {/* Top Tabs */}
      <div className="grid grid-cols-2 border-b-neo border-neo-ink bg-neo-bg/70 p-1.5 gap-1.5">
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

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeInspectorTab === 'block' ? <BlockInspector /> : <ProjectInspector />}
      </div>
    </aside>
  );
};
