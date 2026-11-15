import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { VIEWPORT_PRESETS, type ViewportMode } from '../../types/ast';
import {
  Smartphone,
  Tablet,
  Laptop,
  Undo2,
  Redo2,
  CheckCircle2,
  Loader2,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from 'lucide-react';

interface HeaderProps {
  onOpenExportModal?: () => void;
  onOpenWebReader?: () => void;
  onOpenTemplates?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExportModal,
  onOpenWebReader,
  onOpenTemplates,
}) => {
  const {
    project,
    viewportMode,
    setViewportMode,
    zoomLevel,
    setZoomLevel,
    isSaving,
    lastSavedAt,
    undo,
    redo,
    historyPointer,
    history,
    updateProjectMetadata,
  } = useEditorStore();

  const getViewportIcon = (mode: ViewportMode) => {
    switch (mode) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" strokeWidth={2.5} />;
      case 'tablet':
        return <Tablet className="w-4 h-4" strokeWidth={2.5} />;
      case 'desktop':
        return <Laptop className="w-4 h-4" strokeWidth={2.5} />;
    }
  };

  return (
    <header className="h-16 bg-neo-surface border-b-neo border-neo-ink px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-neo-ink text-white px-3 py-1.5 rounded-md shadow-neo-sm">
          <BookOpen className="w-5 h-5 text-neo-yellow" strokeWidth={2.5} />
          <span className="font-heading font-bold text-lg tracking-tight">WYZARD</span>
          <span className="text-[10px] font-mono uppercase bg-neo-vermilion text-white px-1.5 py-0.2 rounded font-bold">
            MVP
          </span>
        </div>

        <div className="h-6 w-[2px] bg-neo-ink/20 mx-1" />

        {/* Templates Button */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 bg-white border-neo border-neo-ink px-2.5 py-1 rounded shadow-neo-sm text-xs font-mono font-bold hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Browse starter templates"
        >
          <BookOpen className="w-3.5 h-3.5 text-neo-vermilion" strokeWidth={2.5} />
          <span>Templates</span>
        </button>

        <div className="h-6 w-[2px] bg-neo-ink/20 mx-1" />

        <div className="flex flex-col">
          <input
            type="text"
            value={project.title}
            onChange={(e) => updateProjectMetadata({ title: e.target.value })}
            className="font-heading font-bold text-sm bg-transparent border-b border-transparent hover:border-neo-ink focus:border-neo-ink focus:outline-none px-1 text-neo-ink w-64 truncate"
            title="Click to edit project title"
          />
          <span className="text-[10px] font-mono text-gray-500 px-1">
            {project.chapters.length} Chapters • Mobile-First Reflow
          </span>
        </div>
      </div>

      {/* Viewport Presets Selector (Mobile / Tablet / Desktop) */}
      <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg shadow-neo-sm">
        {(Object.keys(VIEWPORT_PRESETS) as ViewportMode[]).map((mode) => {
          const config = VIEWPORT_PRESETS[mode];
          const isActive = viewportMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setViewportMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-neo-yellow text-neo-ink shadow-neo-sm border-neo border-neo-ink'
                  : 'text-gray-700 hover:text-neo-ink hover:bg-white/60'
              }`}
              title={`${config.name} (${config.width}x${config.height})`}
            >
              {getViewportIcon(mode)}
              <span>{config.width}px</span>
            </button>
          );
        })}
      </div>

      {/* Action Controls & Autosave Indicator */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyPointer <= 0}
            className={`p-1.5 rounded border-neo border-neo-ink shadow-neo-sm transition-all ${
              historyPointer > 0
                ? 'bg-white hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px]'
                : 'bg-gray-100 opacity-40 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          </button>
          <button
            onClick={redo}
            disabled={historyPointer >= history.length - 1}
            className={`p-1.5 rounded border-neo border-neo-ink shadow-neo-sm transition-all ${
              historyPointer < history.length - 1
                ? 'bg-white hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px]'
                : 'bg-gray-100 opacity-40 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white border-neo border-neo-ink rounded px-2 py-1 shadow-neo-sm text-xs font-mono">
          <button
            onClick={() => setZoomLevel(zoomLevel - 10)}
            className="hover:text-neo-vermilion"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <span className="w-10 text-center font-bold">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(zoomLevel + 10)}
            className="hover:text-neo-vermilion"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="ml-1 text-gray-500 hover:text-neo-ink"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>

        {/* Autosave Status */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-600 bg-neo-bg px-2.5 py-1.5 rounded border border-neo-ink">
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neo-vermilion" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-neo-teal" strokeWidth={2.5} />
              <span>Synced</span>
            </>
          )}
        </div>

        {/* Live Web Preview Trigger */}
        <button
          onClick={onOpenWebReader}
          className="flex items-center gap-1.5 bg-white text-neo-ink border-neo border-neo-ink px-3 py-1.5 rounded-md font-mono text-xs font-bold shadow-neo-sm hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Open live web reader preview"
        >
          <BookOpen className="w-4 h-4 text-neo-teal" strokeWidth={2.5} />
          <span>Reader</span>
        </button>

        {/* Export Modal Trigger */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink px-3.5 py-1.5 rounded-md font-heading font-bold text-xs shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Open pre-flight validation and export options"
        >
          <Download className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          <span>Export...</span>
        </button>
      </div>
    </header>
  );
};
