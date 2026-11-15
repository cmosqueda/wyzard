import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { notify } from '../../store/toastStore';
import { VIEWPORT_PRESETS, type ViewportMode } from '../../types/ast';
import {
  Smartphone,
  Tablet,
  Laptop,
  Film,
  Square,
  Undo2,
  Redo2,
  CheckCircle2,
  Loader2,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FolderKanban,
  ArrowLeft,
  Settings,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  onOpenExportModal?: () => void;
  onOpenWebReader?: () => void;
  onOpenTemplates?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExportModal,
  onOpenWebReader,
  onOpenTemplates,
  onOpenSettings,
}) => {
  const {
    project,
    viewportMode,
    setViewportMode,
    zoomLevel,
    setZoomLevel,
    isSaving,
    undo,
    redo,
    historyPointer,
    history,
    updateProjectMetadata,
    openWorkspace,
    isLeftRailOpen,
    toggleLeftRail,
    isRightRailOpen,
    toggleRightRail,
    themeMode,
    toggleThemeMode,
  } = useEditorStore();

  const getViewportIcon = (mode: ViewportMode) => {
    switch (mode) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />;
      case 'desktop':
        return <Laptop className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />;
      case 'comic':
        return <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />;
      case 'square':
        return <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />;
    }
  };

  const getViewportShortLabel = (mode: ViewportMode) => {
    switch (mode) {
      case 'mobile':
        return 'Mobile';
      case 'tablet':
        return 'Tablet';
      case 'desktop':
        return 'Laptop';
      case 'comic':
        return 'Comic';
      case 'square':
        return 'Square';
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (!val) {
      updateProjectMetadata({ title: 'Untitled Layout Project' });
      notify({
        type: 'warning',
        title: 'Title Required',
        message: 'Project title cannot be empty. Reverted to default.',
      });
    }
  };

  return (
    <header className="min-h-14 bg-neo-surface border-b-neo border-neo-ink px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 z-30 select-none shrink-0">
      {/* Left Cluster: Left Rail Hamburger + Workspace Back + Brand + Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Left Side Panel Hamburger / Toggle Button */}
        <button
          onClick={toggleLeftRail}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm transition-all ${
            isLeftRailOpen
              ? 'bg-neo-yellow text-neo-ink'
              : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
          title={
            isLeftRailOpen
              ? 'Hide Left Panel (Blocks, Assets & Spine)'
              : 'Show Left Panel (Blocks, Assets & Spine)'
          }
          aria-label="Toggle Left Side Panel"
        >
          {isLeftRailOpen ? (
            <PanelLeftClose className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          ) : (
            <Menu className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          )}
          <span className="hidden xl:inline">Tools</span>
        </button>

        {/* Back to Workspace */}
        <button
          onClick={openWorkspace}
          className="flex items-center gap-1 bg-white border-neo border-neo-ink px-2 sm:px-2.5 py-1.5 rounded-md shadow-neo-sm text-xs font-mono font-bold hover:bg-neo-yellow active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Back to Workspace Management"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
          <FolderKanban className="w-3.5 h-3.5 text-neo-vermilion hidden sm:inline" strokeWidth={2.5} />
          <span className="hidden md:inline">Workspace</span>
        </button>

        {/* Brand Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-neo-ink text-white px-2.5 py-1.5 rounded-md shadow-neo-sm">
          <BookOpen className="w-4 h-4 text-neo-yellow" strokeWidth={2.5} />
          <span className="font-heading font-bold text-sm lg:text-base tracking-tight">WYZARD</span>
        </div>

        {/* Templates Button */}
        <button
          onClick={onOpenTemplates}
          className="hidden lg:flex items-center gap-1.5 bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded-md shadow-neo-sm text-xs font-mono font-bold hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Browse starter templates"
        >
          <BookOpen className="w-3.5 h-3.5 text-neo-vermilion" strokeWidth={2.5} />
          <span>Templates</span>
        </button>

        {/* Editable Project Title */}
        <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px] xl:max-w-[240px]">
          <input
            type="text"
            value={project.title}
            onChange={(e) => updateProjectMetadata({ title: e.target.value })}
            onBlur={handleTitleBlur}
            className="font-heading font-bold text-xs sm:text-sm bg-transparent border-b border-transparent hover:border-neo-ink focus:border-neo-ink focus:outline-none px-1 text-neo-ink truncate"
            title="Click to edit project title"
          />
          <span className="hidden sm:block text-[10px] font-mono text-gray-500 px-1 truncate">
            {project.chapters.length} Ch • {VIEWPORT_PRESETS[viewportMode].name}
          </span>
        </div>
      </div>

      {/* Center Cluster: Dynamic Screen Ratio Switcher */}
      <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg shadow-neo-sm overflow-x-auto max-w-full">
        {(Object.keys(VIEWPORT_PRESETS) as ViewportMode[]).map((mode) => {
          const config = VIEWPORT_PRESETS[mode];
          const isActive = viewportMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setViewportMode(mode)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded font-mono text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-neo-yellow text-neo-ink shadow-neo-sm border border-neo-ink font-bold'
                  : 'text-gray-700 hover:text-neo-ink hover:bg-white/60'
              }`}
              title={`${config.name} (${config.width}×${config.height}px)`}
            >
              {getViewportIcon(mode)}
              <span className="hidden md:inline">{getViewportShortLabel(mode)}</span>
            </button>
          );
        })}
      </div>

      {/* Right Cluster: Undo/Redo, Zoom, Sync Status, Reader, Export, Settings, Right Rail Hamburger */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-1">
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
            <Undo2 className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
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
            <Redo2 className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden xl:flex items-center gap-1 bg-white border-neo border-neo-ink rounded px-2 py-1 shadow-neo-sm text-xs font-mono">
          <button
            onClick={() => setZoomLevel(zoomLevel - 10)}
            className="hover:text-neo-vermilion"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <span className="w-9 text-center font-bold text-[11px]">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(zoomLevel + 10)}
            className="hover:text-neo-vermilion"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="ml-0.5 text-gray-500 hover:text-neo-ink"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>

        {/* Autosave Status */}
        <div
          className="hidden md:flex items-center gap-1 text-[11px] font-mono text-gray-600 bg-neo-bg px-2 py-1.5 rounded border border-neo-ink"
          title="Local database sync status"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neo-vermilion" />
              <span className="hidden lg:inline">Saving</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-neo-teal" strokeWidth={2.5} />
              <span className="hidden lg:inline">Synced</span>
            </>
          )}
        </div>

        {/* Default HTML Reader Trigger */}
        <button
          onClick={onOpenWebReader}
          className="flex items-center gap-1.5 bg-white text-neo-ink border-neo border-neo-ink px-2.5 sm:px-3 py-1.5 rounded-md font-mono text-xs font-bold shadow-neo-sm hover:bg-neo-yellow/40 active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Open HTML Reader with Screen Ratio Switcher"
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neo-teal" strokeWidth={2.5} />
          <span className="hidden sm:inline">Reader</span>
        </button>

        {/* Quick Dark / Light Theme Toggle */}
        <button
          onClick={toggleThemeMode}
          className="p-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded-md shadow-neo-sm hover:bg-neo-yellow active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title={`Switch Wyzard Theme (Current: ${themeMode})`}
          aria-label="Toggle Dark or Light Theme"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-neo-yellow" strokeWidth={2.5} />
          ) : (
            <Moon className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          )}
        </button>

        {/* Settings Modal Trigger */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded-md shadow-neo-sm hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Settings, Theme Appearance & Local Storage Management"
        >
          <Settings className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
        </button>

        {/* Export Modal Trigger */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink px-2.5 sm:px-3.5 py-1.5 rounded-md font-heading font-bold text-xs shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          title="Open Multi-Target Exporter (.ZIP, .PDF, .CBZ, .EPUB)"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neo-ink" strokeWidth={2.5} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Right Side Panel Hamburger / Inspector Toggle Button */}
        <button
          onClick={toggleRightRail}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm transition-all ${
            isRightRailOpen
              ? 'bg-neo-yellow text-neo-ink'
              : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
          title={
            isRightRailOpen
              ? 'Hide Right Panel (Inspector & Metadata)'
              : 'Show Right Panel (Inspector & Metadata)'
          }
          aria-label="Toggle Right Side Panel"
        >
          {isRightRailOpen ? (
            <PanelRightClose className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          ) : (
            <SlidersHorizontal className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          )}
          <span className="hidden xl:inline">Inspect</span>
        </button>
      </div>
    </header>
  );
};
