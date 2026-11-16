import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createStarterProject, createBlankProject } from '../../db';
import { WyzardLogo } from '../ui/WyzardLogo';
import { syncAllWithLocalFs } from '../../db/localFs';
import { useEditorStore } from '../../store/editorStore';
import { notify } from '../../store/toastStore';
import { STARTER_TEMPLATES, type StarterTemplate } from '../../data/templates';
import { SettingsModal } from '../settings/SettingsModal';
import {
  BookOpen,
  Plus,
  FolderKanban,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  Clock,
  Layers,
  Search,
  Sparkles,
  Check,
  X,
  FilePlus2,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';

export const WorkspaceManager: React.FC = () => {
  const {
    openProject,
    createNewProject,
    duplicateProject,
    deleteProjectFromDb,
    renameProjectInDb,
    themeMode,
    toggleThemeMode,
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New blank layout modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync with local machine filesystem & seed default starter project if completely empty
  useEffect(() => {
    const initWorkspace = async () => {
      await syncAllWithLocalFs();
      const count = await db.projects.count();
      const seededFlag = localStorage.getItem('wyzard_seeded_v1');
      if (count === 0 && !seededFlag) {
        const starter = createStarterProject();
        await db.projects.put(starter);
        localStorage.setItem('wyzard_seeded_v1', 'true');
        await syncAllWithLocalFs();
      }
    };
    initWorkspace();
  }, []);

  const projects = useLiveQuery(
    () => db.projects.orderBy('updatedAt').reverse().toArray(),
    []
  );

  const filteredProjects = (projects || []).filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.metadata?.author || '').toLowerCase().includes(q) ||
      (p.metadata?.description || '').toLowerCase().includes(q)
    );
  });

  const handleCreateBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a layout or book title before creating.');
      notify({
        type: 'warning',
        title: 'Title Required',
        message: 'Please enter a title for your new layout project.',
      });
      return;
    }
    if (trimmedTitle.length > 100) {
      setFormError('Title must be 100 characters or fewer.');
      return;
    }
    setFormError(null);
    const blank = createBlankProject(
      trimmedTitle,
      newAuthor.trim() || 'Wyzard Author',
      newDescription.trim() || 'A custom reflowable layout created in Wyzard.'
    );
    setIsNewModalOpen(false);
    setNewTitle('');
    setNewAuthor('');
    setNewDescription('');
    await createNewProject(blank);
  };

  const handleCreateFromTemplate = async (tmpl: StarterTemplate) => {
    await createNewProject(tmpl.project);
  };

  const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const saveRename = async (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      await renameProjectInDb(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const formatTimestamp = (ts: number) => {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-screen w-full bg-neo-bg text-neo-ink flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Top Header */}
      <header className="min-h-16 bg-neo-surface border-b-neo border-neo-ink px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <WyzardLogo size={36} />
            <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-neo-ink">WYZARD</span>
            <span className="text-[10px] font-mono uppercase bg-neo-vermilion text-white px-1.5 py-0.2 rounded font-bold">
              STUDIO
            </span>
          </div>
          <div className="h-6 w-[2px] bg-neo-ink/20 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-gray-600">
            <FolderKanban className="w-4 h-4 text-neo-vermilion" strokeWidth={2.5} />
            <span className="font-bold text-neo-ink">Workspace Management</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline-block text-xs font-mono bg-neo-bg border border-neo-ink px-2.5 py-1 rounded">
            {projects?.length ?? 0} Saved {projects?.length === 1 ? 'Layout' : 'Layouts'}
          </span>
          <button
            onClick={toggleThemeMode}
            className="p-2 bg-white text-neo-ink border-neo border-neo-ink rounded-md shadow-neo-sm hover:bg-neo-yellow active:translate-x-[1px] active:translate-y-[1px] transition-all"
            title={`Switch Wyzard Theme (Current: ${themeMode})`}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-neo-yellow" strokeWidth={2.5} />
            ) : (
              <Moon className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
            )}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 bg-white text-neo-ink border-neo border-neo-ink px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md font-mono font-bold text-xs shadow-neo-sm hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
            title="Wyzard Settings & Local Storage Management"
          >
            <Settings className="w-4 h-4 text-neo-vermilion" strokeWidth={2.5} />
            <span className="hidden sm:inline">Settings &amp; Data</span>
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-heading font-bold text-xs shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden xs:inline">New Blank Layout</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 flex-1 flex flex-col gap-8 sm:gap-10">
        {/* Section 1: Saved Layouts (Workspace Projects) */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="font-heading font-bold text-2xl text-neo-ink flex items-center gap-2">
                <FolderKanban className="w-6 h-6 text-neo-vermilion" strokeWidth={2.5} />
                <span>Saved Layouts</span>
              </h1>
              <p className="text-xs font-mono text-gray-600 mt-0.5">
                Open an existing layout to edit, duplicate a version, or manage your local workspace
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved layouts..."
                className="w-full pl-9 pr-3 py-2 bg-white border-neo border-neo-ink rounded-lg text-xs font-mono shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-neo-yellow"
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Quick Create Blank Card */}
            <div
              onClick={() => setIsNewModalOpen(true)}
              className="group bg-neo-surface/70 hover:bg-white border-neo border-dashed border-neo-ink rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[220px] cursor-pointer hover:shadow-neo transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-neo-yellow border-neo border-neo-ink shadow-neo-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-6 h-6 text-neo-ink" strokeWidth={2.5} />
              </div>
              <h3 className="font-heading font-bold text-base text-neo-ink mb-1">
                + Create New Layout
              </h3>
              <p className="text-xs font-sans text-gray-600 max-w-[220px]">
                Start from a clean mobile-first reflow canvas with custom book metadata
              </p>
            </div>

            {/* Existing Saved Layout Cards */}
            {filteredProjects.map((proj) => {
              const isEditing = editingId === proj.id;
              const isConfirmingDelete = deletingId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => !isEditing && !isConfirmingDelete && openProject(proj.id)}
                  className="group bg-white border-neo border-neo-ink rounded-xl shadow-neo hover:shadow-neo-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Top Accent Banner */}
                  <div>
                    <div className="h-3 bg-neo-ink border-b-neo border-neo-ink flex items-center px-3 gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neo-vermilion" />
                      <span className="w-2 h-2 rounded-full bg-neo-yellow" />
                      <span className="w-2 h-2 rounded-full bg-neo-teal" />
                    </div>

                    <div className="p-5">
                      {/* Meta Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-neo-bg border border-neo-ink px-2 py-0.5 rounded">
                          <Layers className="w-3 h-3 text-neo-vermilion" />
                          {proj.chapters?.length || 1}{' '}
                          {(proj.chapters?.length || 1) === 1 ? 'Chapter' : 'Chapters'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(proj.updatedAt)}
                        </span>
                      </div>

                      {/* Title or Rename Input */}
                      {isEditing ? (
                        <form
                          onSubmit={(e) => saveRename(proj.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 mb-2"
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            autoFocus
                            className="flex-1 bg-neo-bg border-neo border-neo-ink rounded px-2 py-1 text-sm font-heading font-bold focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="p-1.5 bg-neo-teal border border-neo-ink rounded shadow-neo-sm"
                            title="Save title"
                          >
                            <Check className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-white border border-neo-ink rounded shadow-neo-sm"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
                          </button>
                        </form>
                      ) : (
                        <h3 className="font-heading font-bold text-base text-neo-ink group-hover:text-neo-vermilion transition-colors line-clamp-1 mb-1">
                          {proj.title}
                        </h3>
                      )}

                      <p className="text-[11px] font-mono text-gray-500 mb-2">
                        By {proj.metadata?.author || 'Wyzard Author'}
                      </p>

                      <p className="text-xs font-sans text-gray-600 line-clamp-2 leading-relaxed">
                        {proj.metadata?.description || 'Reflowable e-book layout project.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-5 py-3 bg-neo-bg/60 border-t-neo border-neo-ink flex items-center justify-between gap-2"
                  >
                    {isConfirmingDelete ? (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-[11px] font-mono font-bold text-neo-vermilion">
                          Delete this layout?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              await deleteProjectFromDb(proj.id);
                              setDeletingId(null);
                            }}
                            className="px-2.5 py-1 bg-neo-vermilion text-white border border-neo-ink rounded text-[11px] font-mono font-bold shadow-neo-sm"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 bg-white text-neo-ink border border-neo-ink rounded text-[11px] font-mono font-bold shadow-neo-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => openProject(proj.id)}
                          className="flex items-center gap-1.5 bg-neo-ink text-white px-3 py-1.5 rounded border border-neo-ink text-xs font-mono font-bold hover:bg-neo-vermilion transition-colors"
                        >
                          <span>Edit Layout</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => startRename(proj.id, proj.title, e)}
                            className="p-1.5 bg-white hover:bg-neo-yellow border border-neo-ink rounded shadow-neo-sm transition-colors"
                            title="Rename Layout"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => duplicateProject(proj.id)}
                            className="p-1.5 bg-white hover:bg-neo-teal border border-neo-ink rounded shadow-neo-sm transition-colors"
                            title="Duplicate Layout"
                          >
                            <Copy className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => setDeletingId(proj.id)}
                            className="p-1.5 bg-white hover:bg-neo-vermilion hover:text-white border border-neo-ink rounded shadow-neo-sm transition-colors"
                            title="Delete Layout"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Create from Starter Template */}
        <section className="pt-4 border-t-neo border-neo-ink/15">
          <div className="mb-4">
            <h2 className="font-heading font-bold text-lg text-neo-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neo-vermilion" strokeWidth={2.5} />
              <span>Start New Layout from Template</span>
            </h2>
            <p className="text-xs font-mono text-gray-600">
              Launch a brand-new project pre-populated with responsive editorial blocks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STARTER_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => handleCreateFromTemplate(tmpl)}
                className="group bg-white border-neo border-neo-ink rounded-xl overflow-hidden shadow-neo hover:shadow-neo-lg hover:translate-x-[-2px] hover:translate-y-[-2px] cursor-pointer transition-all flex flex-col"
              >
                <div className="h-36 w-full overflow-hidden bg-gray-900 relative border-b-neo border-neo-ink">
                  <img
                    src={tmpl.thumbnail}
                    alt={tmpl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-neo-yellow text-neo-ink px-2 py-0.5 rounded border border-neo-ink shadow-neo-sm">
                    {tmpl.badge}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-semibold uppercase text-gray-400 block mb-1">
                      {tmpl.category}
                    </span>
                    <h4 className="font-heading font-bold text-sm text-neo-ink mb-1 group-hover:text-neo-vermilion transition-colors">
                      {tmpl.name}
                    </h4>
                    <p className="font-sans text-xs text-gray-600 leading-relaxed mb-3">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-neo-ink group-hover:text-neo-vermilion flex items-center gap-1">
                      Create from Template
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {tmpl.project.chapters.length} Ch
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Create New Blank Layout Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg overflow-hidden">
            <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-neo-yellow rounded border border-neo-ink shadow-neo-sm">
                  <FilePlus2 className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
                </div>
                <h3 className="font-heading font-bold text-base text-neo-ink">
                  Create New Layout
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 hover:bg-neo-vermilion hover:text-white rounded border border-neo-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlank} className="p-5 flex flex-col gap-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-neo-vermilion/15 border border-neo-vermilion text-neo-vermilion font-mono text-xs font-bold">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-neo-ink mb-1">
                  Layout / Book Title <span className="text-neo-vermilion">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Modern Architecture Monograph"
                  autoFocus
                  className="w-full px-3 py-2 bg-white border-neo border-neo-ink rounded-lg text-sm font-sans shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-neo-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-neo-ink mb-1">
                  Author / Studio
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g. Studio Wyzard"
                  className="w-full px-3 py-2 bg-white border-neo border-neo-ink rounded-lg text-sm font-sans shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-neo-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-neo-ink mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief summary of this publication..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border-neo border-neo-ink rounded-lg text-xs font-sans shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-neo-yellow resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-white text-neo-ink border-neo border-neo-ink rounded-lg font-mono text-xs font-bold shadow-neo-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neo-yellow text-neo-ink border-neo border-neo-ink rounded-lg font-heading text-xs font-bold shadow-neo flex items-center gap-1.5 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  <span>Create & Open Layout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings & Data Management Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
