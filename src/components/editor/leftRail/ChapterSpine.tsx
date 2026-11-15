import React, { useState } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { Plus, Trash2, GripVertical, FileText, ChevronRight } from 'lucide-react';

export const ChapterSpine: React.FC = () => {
  const {
    project,
    setActiveChapter,
    addChapter,
    deleteChapter,
    renameChapter,
  } = useEditorStore();
  const activeChapterId = project.activeChapterId;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (id: string, currentTitle: string) => {
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
            {project.chapters.length} Document Chapters
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
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {project.chapters.map((chapter, idx) => {
          const isActive = chapter.id === activeChapterId;
          const isEditing = editingId === chapter.id;

          return (
            <div
              key={chapter.id}
              onClick={() => setActiveChapter(chapter.id)}
              className={`group relative flex items-center gap-2 p-2.5 rounded-lg border-neo border-neo-ink cursor-pointer transition-all ${
                isActive
                  ? 'bg-neo-yellow/20 border-neo-ink shadow-neo font-bold'
                  : 'bg-white hover:bg-neo-bg shadow-neo-sm'
              }`}
            >
              <span className="font-mono text-[11px] w-5 text-gray-400 group-hover:text-neo-ink">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <FileText className={`w-4 h-4 ${isActive ? 'text-neo-vermilion' : 'text-gray-400'}`} strokeWidth={2.5} />

              <div className="flex-1 min-w-0">
                {isEditing ? (
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
                    className="w-full text-xs font-heading font-semibold bg-white border border-neo-ink rounded px-1 py-0.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    onDoubleClick={() => handleStartRename(chapter.id, chapter.title)}
                    className="text-xs font-heading font-semibold truncate text-neo-ink"
                    title="Double click to rename"
                  >
                    {chapter.title}
                  </div>
                )}
              </div>

              {/* Actions on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {project.chapters.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${chapter.title}"?`)) {
                        deleteChapter(chapter.id);
                      }
                    }}
                    className="p-1 hover:text-red-600 rounded"
                    title="Delete chapter"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
