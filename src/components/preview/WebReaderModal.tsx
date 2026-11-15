import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { compileWebPublication } from '../../compiler/webCompiler';
import { saveAs } from 'file-saver';
import {
  X,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  Download,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WebReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebReaderModal: React.FC<WebReaderModalProps> = ({ isOpen, onClose }) => {
  const { project } = useEditorStore();
  const [activeChapterId, setActiveChapterId] = useState(project.activeChapterId);
  const [readerWidth, setReaderWidth] = useState<'390px' | '768px' | '100%'>('390px');

  if (!isOpen) return null;

  const currentChapterIndex = project.chapters.findIndex((c) => c.id === activeChapterId);
  const currentChapter = project.chapters[currentChapterIndex] || project.chapters[0];

  const compiledHtml = compileWebPublication(project, activeChapterId);

  const handleDownloadHtml = () => {
    const blob = new Blob([compiledHtml], { type: 'text/html;charset=utf-8' });
    const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'publication'}.html`;
    saveAs(blob, filename);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setActiveChapterId(project.chapters[currentChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < project.chapters.length - 1) {
      setActiveChapterId(project.chapters[currentChapterIndex + 1].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-6xl h-[92vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="h-14 bg-white border-b-neo border-neo-ink px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-neo-ink text-white px-2.5 py-1 rounded shadow-neo-sm font-mono text-xs font-bold">
              <BookOpen className="w-4 h-4 text-neo-teal" />
              <span>LIVE WEB READER</span>
            </div>
            <span className="font-heading font-bold text-sm text-neo-ink truncate max-w-xs">
              {currentChapter?.title}
            </span>
          </div>

          {/* Reader Viewport Toggle */}
          <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg shadow-neo-sm">
            <button
              onClick={() => setReaderWidth('390px')}
              className={`p-1.5 rounded transition-all ${
                readerWidth === '390px' ? 'bg-neo-yellow text-neo-ink font-bold shadow-neo-sm' : 'text-gray-500 hover:text-neo-ink'
              }`}
              title="Mobile View (390px)"
            >
              <Smartphone className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setReaderWidth('768px')}
              className={`p-1.5 rounded transition-all ${
                readerWidth === '768px' ? 'bg-neo-yellow text-neo-ink font-bold shadow-neo-sm' : 'text-gray-500 hover:text-neo-ink'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setReaderWidth('100%')}
              className={`p-1.5 rounded transition-all ${
                readerWidth === '100%' ? 'bg-neo-yellow text-neo-ink font-bold shadow-neo-sm' : 'text-gray-500 hover:text-neo-ink'
              }`}
              title="Full Window View"
            >
              <Maximize2 className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Chapter Navigation & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-neo border-neo-ink rounded bg-white px-2 py-1 shadow-neo-sm text-xs font-mono">
              <button
                onClick={handlePrevChapter}
                disabled={currentChapterIndex <= 0}
                className="hover:text-neo-vermilion disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold px-1">
                {currentChapterIndex + 1} / {project.chapters.length}
              </span>
              <button
                onClick={handleNextChapter}
                disabled={currentChapterIndex >= project.chapters.length - 1}
                className="hover:text-neo-vermilion disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink px-3 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Download HTML</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neo-ink hover:bg-neo-vermilion hover:text-white rounded border-neo border-neo-ink shadow-neo-sm transition-all ml-1"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Live Reader Canvas Frame */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-neo-bg">
          <div
            className="h-full bg-white border-neo-thick border-neo-ink rounded-xl shadow-neo-lg overflow-hidden transition-all duration-300"
            style={{ width: readerWidth }}
          >
            <iframe
              srcDoc={compiledHtml}
              title="Publication Web Reader"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
