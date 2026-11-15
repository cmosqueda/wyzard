import React, { useState } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import {
  Plus,
  Trash2,
  FileText,
  Edit3,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';

export const ChapterSpine: React.FC = () => {
  const {
    project,
    setActiveChapter,
    addChapter,
    deleteChapter,
    renameChapter,
    reorderChapters,
  } = useEditorStore();
  const activeChapterId = project.activeChapterId;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (id: string, currentTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleFinishRename = (id: string) => {
    if (editingTitle.trim()) {
      renameChapter(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header & Add Button */}
      <div className="p-3 border-b-neo border-neo-ink bg-neo-bg flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-neo-ink">
            Publication Spine
          </h3>
          <p className="text-[10px] font-mono text-gray-500">
            {project.chapters.length} Document {project.chapters.length === 1 ? 'Chapter' : 'Chapters'}
          </p>
        </div>
        <button
          onClick={() => addChapter()}
          className="flex items-center gap-1 bg-neo-yellow text-neo-ink text-xs font-mono font-bold px-2.5 py-1.5 rounded border-neo border-neo-ink shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          <span>Add</span>
        </button>
      </div>

      {/* Chapter Spine List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {project.chapters.map((chapter, idx) => {
          const isActive = chapter.id === activeChapterId;
          const isEditing = editingId === chapter.id;

          return (
            <div
              key={chapter.id}
              onClick={() => {
                if (!isEditing) {
                  setActiveChapter(chapter.id);
                }
              }}
              className={`group relative flex flex-col gap-1.5 p-2.5 rounded-lg border-neo border-neo-ink cursor-pointer transition-all ${
                isActive
                  ? 'bg-neo-yellow/35 border-neo-ink shadow-neo'
                  : 'bg-white hover:bg-neo-bg shadow-neo-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded border border-neo-ink font-bold ${
                    isActive ? 'bg-neo-ink text-neo-yellow' : 'bg-neo-bg text-gray-600'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <FileText
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-neo-vermilion' : 'text-gray-400'
                  }`}
                  strokeWidth={2.5}
                />

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        autoFocus
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleFinishRename(chapter.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(chapter.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full text-xs font-heading font-semibold bg-white border border-neo-ink rounded px-1.5 py-0.5 focus:outline-none"
                      />
                      <button
                        onClick={() => handleFinishRename(chapter.id)}
                        className="p-1 bg-neo-teal border border-neo-ink rounded"
                        title="Save title"
                      >
                        <Check className="w-3 h-3 text-neo-ink" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={(e) => handleStartRename(chapter.id, chapter.title, e)}
                      className="text-xs font-heading font-bold truncate text-neo-ink"
                      title={chapter.title}
                    >
                      {chapter.title}
                    </div>
                  )}
                </div>

                {isActive && !isEditing && (
                  <span className="text-[9px] font-mono font-bold uppercase bg-neo-vermilion text-white px-1.5 py-0.5 rounded border border-neo-ink">
                    Loaded
                  </span>
                )}
              </div>

              {/* Action Row */}
              <div
                className="flex items-center justify-between pt-1.5 border-t border-neo-ink/10 text-[10px] font-mono text-gray-500"
                onClick={(e) => e.stopPropagation()}
              >
                <span>/{chapter.slug}</span>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => reorderChapters(idx, idx - 1)}
                      className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink/30 hover:border-neo-ink rounded transition-colors"
                      title="Move chapter up"
                    >
                      <ArrowUp className="w-3 h-3 text-neo-ink" />
                    </button>
                  )}
                  {idx < project.chapters.length - 1 && (
                    <button
                      onClick={() => reorderChapters(idx, idx + 1)}
                      className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink/30 hover:border-neo-ink rounded transition-colors"
                      title="Move chapter down"
                    >
                      <ArrowDown className="w-3 h-3 text-neo-ink" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleStartRename(chapter.id, chapter.title, e)}
                    className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink/30 hover:border-neo-ink rounded transition-colors"
                    title="Rename chapter"
                  >
                    <Edit3 className="w-3 h-3 text-neo-ink" />
                  </button>
                  {project.chapters.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${chapter.title}"?`)) {
                          deleteChapter(chapter.id);
                        }
                      }}
                      className="p-1 bg-white hover:bg-neo-vermilion hover:text-white border border-neo-ink/30 hover:border-neo-ink rounded transition-colors"
                      title="Delete chapter"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
