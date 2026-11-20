import React, { useState } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { Award, Trash2, Plus, ExternalLink } from 'lucide-react';
import { saveAsset } from '../../../db/assets';

export const ProjectInspector: React.FC = () => {
  const {
    project,
    updateProjectMetadata,
    addAssetAttribution,
    removeAssetAttribution,
    setDesignSystem,
  } = useEditorStore();
  const designSystem = project.designSystem === 'plain' ? 'plain' : 'wyzard';

  const coverFileRef = React.useRef<HTMLInputElement>(null);
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      updateProjectMetadata({ coverImage: await saveAsset(project.id, file) });
    } catch {
      // saveAsset already reports the problem
    }
    e.target.value = '';
  };

  const [newTitle, setNewTitle] = useState('');
  const [newCreator, setNewCreator] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newLicense, setNewLicense] = useState('CC BY 4.0');
  const [newUrl, setNewUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const attributions = project.metadata.attributions || [];

  const handleAddCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreator.trim()) return;
    addAssetAttribution({
      title: newTitle.trim() || 'Visual Design Asset',
      creator: newCreator.trim(),
      sourceName: newSource.trim() || 'External Asset Pack',
      sourceUrl: newUrl.trim() || undefined,
      creatorUrl: newUrl.trim() || undefined,
      license: newLicense.trim() || 'CC BY 4.0',
    });
    setNewTitle('');
    setNewCreator('');
    setNewSource('');
    setNewUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto text-xs font-sans gap-4">
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Canvas Design System
        </label>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              { id: 'plain', label: 'Plain (Blank)' },
              { id: 'wyzard', label: 'Wyzard Editorial' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => designSystem !== opt.id && setDesignSystem(opt.id)}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                designSystem === opt.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-mono text-gray-500 leading-snug mt-1">
          Styles the page canvas only. Plain is an unthemed blank page; the app theme is unaffected.
        </p>
      </div>

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
          Subtitle
        </label>
        <input
          type="text"
          value={project.metadata.subtitle || ''}
          onChange={(e) => updateProjectMetadata({ subtitle: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
        />
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Cover Image (EPUB cover &amp; store thumbnail)
        </label>
        <div className="flex gap-2">
          <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            className="px-2.5 py-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm"
          >
            Upload
          </button>
          <input
            type="text"
            value={project.metadata.coverImage || ''}
            placeholder={project.layoutMode === 'fixed' ? 'Empty = rendered from your cover page' : 'https://…'}
            onChange={(e) => updateProjectMetadata({ coverImage: e.target.value })}
            className="flex-1 min-w-0 bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
          />
        </div>
      </div>

      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Short Title (running header / footer)
        </label>
        <input
          type="text"
          value={project.metadata.shortTitle || ''}
          onChange={(e) => updateProjectMetadata({ shortTitle: e.target.value })}
          placeholder={project.metadata.title}
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
          rows={3}
          value={project.metadata.description || ''}
          onChange={(e) => updateProjectMetadata({ description: e.target.value })}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-neo-ink shadow-neo-sm"
          placeholder="Brief summary of publication..."
        />
      </div>

      {/* Contributor Credits & Attributions Ledger */}
      <div className="pt-3 border-t-neo border-neo-ink/20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-neo-vermilion" strokeWidth={2.5} />
            <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-neo-ink">
              Contributor Credits ({attributions.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 bg-neo-yellow text-neo-ink border border-neo-ink px-2 py-0.5 rounded font-mono text-[10px] font-bold shadow-neo-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>

        <p className="text-[10px] font-mono text-gray-500 leading-snug">
          Assets inserted from the Open Asset Commons automatically log their creator and license here, and compile into the exported Web &amp; EPUB Colophon.
        </p>

        {showAddForm && (
          <form
            onSubmit={handleAddCredit}
            className="p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex flex-col gap-1.5"
          >
            <input
              type="text"
              required
              value={newCreator}
              onChange={(e) => setNewCreator(e.target.value)}
              placeholder="Contributor / Artist Name *"
              className="px-2 py-1 bg-neo-bg border border-neo-ink rounded font-mono text-[11px]"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Work / Asset Pack Title"
              className="px-2 py-1 bg-neo-bg border border-neo-ink rounded font-mono text-[11px]"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Source (e.g. Adamsdesk)"
                className="px-2 py-1 bg-neo-bg border border-neo-ink rounded font-mono text-[11px]"
              />
              <input
                type="text"
                value={newLicense}
                onChange={(e) => setNewLicense(e.target.value)}
                placeholder="License (CC BY 4.0)"
                className="px-2 py-1 bg-neo-bg border border-neo-ink rounded font-mono text-[11px]"
              />
            </div>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Attribution URL (https://...)"
              className="px-2 py-1 bg-neo-bg border border-neo-ink rounded font-mono text-[11px]"
            />
            <button
              type="submit"
              className="mt-1 py-1 bg-neo-ink text-white rounded font-mono text-[10px] font-bold hover:bg-neo-vermilion transition-colors"
            >
              Save Contributor Credit
            </button>
          </form>
        )}

        {attributions.length === 0 ? (
          <div className="p-3 bg-neo-bg/60 border border-dashed border-neo-ink/40 rounded text-[11px] font-mono text-gray-500 text-center">
            No asset credits logged yet. Insert visuals from the Assets tab to auto-credit contributors.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {attributions.map((attr) => (
              <div
                key={attr.id}
                className="p-2.5 bg-white border border-neo-ink rounded-lg shadow-neo-sm flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-bold text-xs text-neo-ink truncate">
                    {attr.title}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600">
                    By <span className="font-bold text-neo-ink">{attr.creator}</span> •{' '}
                    <span className="text-neo-vermilion font-bold">{attr.license}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <span>{attr.sourceName}</span>
                    {attr.sourceUrl && (
                      <a
                        href={attr.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neo-ink hover:text-neo-vermilion inline-flex items-center"
                        title="Open source link"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeAssetAttribution(attr.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Remove credit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-neo-bg border-neo border-neo-ink rounded-lg mt-2">
        <span className="font-heading font-bold text-[11px] uppercase tracking-wider block text-neo-ink mb-1">
          EPUB 3.3 Target Spec
        </span>
        <p className="text-[11px] font-mono text-gray-600 leading-normal">
          Strict XHTML5 packages are generated with semantic OPF manifests, NAV navigation docs, and contributor colophons.
        </p>
      </div>
    </div>
  );
};
