import React from 'react';
import { useEditorStore } from '../../../store/editorStore';

export const ProjectInspector: React.FC = () => {
  const { project, updateProjectMetadata } = useEditorStore();

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto text-xs font-sans gap-4">
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Book Title
        </label>
        <input
          type="text"
          value={project.metadata.title}
          onChange={(e) => updateProjectMetadata({ title: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
        />
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Author / Publisher
        </label>
        <input
          type="text"
          value={project.metadata.author}
          onChange={(e) => updateProjectMetadata({ author: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
        />
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Language Code (ISO 639-1)
        </label>
        <input
          type="text"
          value={project.metadata.language}
          onChange={(e) => updateProjectMetadata({ language: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
        />
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Book Synopsis / Description
        </label>
        <textarea
          rows={4}
          value={project.metadata.description || ''}
          onChange={(e) => updateProjectMetadata({ description: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
          placeholder="Brief summary of publication..."
        />
      </div>

      <div className="p-3 bg-neo-bg border-neo border-neo-ink rounded-lg mt-2">
        <span className="font-heading font-bold text-[11px] uppercase tracking-wider block text-neo-ink mb-1">
          EPUB 3.3 Target Spec
        </span>
        <p className="text-[11px] font-mono text-gray-600 leading-normal">
          Strict XHTML5 packages are generated with semantic OPF manifests, NAV navigation docs, and CSS-only fallbacks for e-reader compatibility.
        </p>
      </div>
    </div>
  );
};
