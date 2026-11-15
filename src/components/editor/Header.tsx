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
  Keyboard,
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
    activeSidebarTab,
    activeInspectorTab,
    themeMode,
    toggleThemeMode,
  } = useEditorStore();

  const getViewportIcon = (mode: ViewportMode) => {
    switch (mode) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'desktop':
        return <Laptop className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'comic':
        return <Film className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'square':
        return <Square className="w-3.5 h-3.5" strokeWidth={2.5} />;
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
    <div className="flex flex-col z-30 select-none shrink-0">
      {/* ====================================================================
          ROW 1: MAIN TOP PANEL
          - Topmost Left Corner: Workspace Back Button + Brand + Project Title
          - Center: Viewport / Screen Ratio Switcher
          - Right: Undo/Redo, Zoom, Reader, Theme & Settings
         ==================================================================== */}
      <header className="min-h-14 bg-neo-surface border-b-neo border-neo-ink px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left Zone: Topmost Left Workspace Back Button + Brand + Project Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Topmost Left Corner: Workspace Back Button */}
          <button
            onClick={openWorkspace}
            className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink px-2.5 sm:px-3 py-1.5 rounded-lg shadow-neo-sm text-xs font-mono font-bold hover:bg-neo-vermilion hover:text-white active:translate-x-[1px] active:translate-y-[1px] transition-all shrink-0"
            title="Return to Workspace Management"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            <FolderKanban className="w-3.5 h-3.5 hidden sm:inline" strokeWidth={2.5} />
            <span>Workspace</span>
          </button>

          {/* Brand Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-neo-ink text-white px-2.5 py-1.5 rounded-lg shadow-neo-sm shrink-0">
            <BookOpen className="w-4 h-4 text-neo-yellow" strokeWidth={2.5} />
            <span className="font-heading font-bold text-sm tracking-tight">WYZARD</span>
          </div>

          {/* Editable Project Title */}
          <div className="flex flex-col min-w-0 max-w-[150px] sm:max-w-[220px] lg:max-w-[260px]">
            <input
              type="text"
              value={project.title}
              onChange={(e) => updateProjectMetadata({ title: e.target.value })}
              onBlur={handleTitleBlur}
              className="font-heading font-bold text-xs sm:text-sm bg-transparent border-b border-transparent hover:border-neo-ink focus:border-neo-ink focus:outline-none px-1 text-neo-ink truncate"
              title="Click to rename project"
            />
            <span className="hidden sm:block text-[10px] font-mono text-gray-500 px-1 truncate">
              {project.chapters.length} {project.chapters.length === 1 ? 'Chapter' : 'Chapters'} •{' '}
              {VIEWPORT_PRESETS[viewportMode].name}
            </span>
          </div>

          {/* Templates Picker */}
          <button
            onClick={onOpenTemplates}
            className="hidden xl:flex items-center gap-1.5 bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded-lg shadow-neo-sm text-xs font-mono font-bold hover:bg-neo-bg transition-all shrink-0"
            title="Switch or apply starter layout template"
          >
            <BookOpen className="w-3.5 h-3.5 text-neo-vermilion" strokeWidth={2.5} />
            <span>Templates</span>
          </button>
        </div>

        {/* Center Zone: Screen Ratio / Viewport Switcher */}
        <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
          {(Object.keys(VIEWPORT_PRESETS) as ViewportMode[]).map((mode) => {
            const config = VIEWPORT_PRESETS[mode];
            const isActive = viewportMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewportMode(mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all shrink-0 ${
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

        {/* Right Zone: Undo/Redo, Zoom, Reader, Theme & Settings */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={undo}
              disabled={historyPointer <= 0}
              className={`p-1.5 rounded-lg border-neo border-neo-ink shadow-neo-sm transition-all ${
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
              className={`p-1.5 rounded-lg border-neo border-neo-ink shadow-neo-sm transition-all ${
                historyPointer < history.length - 1
                  ? 'bg-white hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px]'
                  : 'bg-gray-100 opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
            </button>
          </div>

          {/* Zoom Controls (Also supports Ctrl+Wheel and Ctrl+Plus/Minus) */}
          <div
            className="hidden lg:flex items-center gap-1 bg-white border-neo border-neo-ink rounded-lg px-2 py-1 shadow-neo-sm text-xs font-mono"
            title="Zoom Hotkeys: Ctrl + Mouse Wheel, Ctrl + Plus/Minus, or Ctrl + 0"
          >
            <button
              onClick={() => setZoomLevel(Math.max(25, zoomLevel - 10))}
              className="hover:text-neo-vermilion p-0.5"
              title="Zoom Out (Ctrl + -)"
            >
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <span className="w-10 text-center font-bold text-[11px]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(250, zoomLevel + 10))}
              className="hover:text-neo-vermilion p-0.5"
              title="Zoom In (Ctrl + +)"
            >
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="ml-0.5 text-gray-500 hover:text-neo-ink p-0.5"
              title="Reset Zoom (Ctrl + 0)"
            >
              <Maximize2 className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>

          {/* In-App HTML / Multi-Format Reader */}
          <button
            onClick={onOpenWebReader}
            className="flex items-center gap-1.5 bg-white text-neo-ink border-neo border-neo-ink px-3 py-1.5 rounded-lg font-mono text-xs font-bold shadow-neo-sm hover:bg-neo-teal/30 active:translate-x-[1px] active:translate-y-[1px] transition-all"
            title="Open In-App Reader (HTML, PDF, CBZ, EPUB)"
          >
            <BookOpen className="w-4 h-4 text-neo-teal" strokeWidth={2.5} />
            <span className="hidden sm:inline">Reader</span>
          </button>

          {/* Quick Dark / Light Theme Toggle */}
          <button
            onClick={toggleThemeMode}
            className="p-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded-lg shadow-neo-sm hover:bg-neo-yellow active:translate-x-[1px] active:translate-y-[1px] transition-all"
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
            className="p-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded-lg shadow-neo-sm hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
            title="Settings, Theme Appearance & Local Storage Management"
          >
            <Settings className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ====================================================================
          ROW 2: DOCKED SUB-HEADER BAR (Placed Below Top Panel, Above Side Panels)
          - Left Dock (Above Left Side Panel): Tools Hamburger Toggle (Blocks / Assets / Spine)
          - Center Dock: Sync Status & Zoom/Pan Hotkey Guide
          - Right Dock (Above Right Side Panel): Export Button + Inspector Toggle
         ==================================================================== */}
      <div className="bg-neo-bg border-b-neo border-neo-ink px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 text-xs font-mono">
        {/* Left Dock: Directly Above Left Side Panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLeftRail}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-neo border-neo-ink font-bold shadow-neo-sm transition-all ${
              isLeftRailOpen
                ? 'bg-neo-yellow text-neo-ink'
                : 'bg-white text-neo-ink hover:bg-neo-yellow/40'
            }`}
            title={
              isLeftRailOpen
                ? 'Hide Left Tools Panel (Blocks, Assets & Spine)'
                : 'Show Left Tools Panel (Blocks, Assets & Spine)'
            }
          >
            {isLeftRailOpen ? (
              <PanelLeftClose className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
            ) : (
              <Menu className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
            )}
            <span>Tools</span>
            <span className="hidden sm:inline text-[10px] uppercase opacity-75">
              ({activeSidebarTab})
            </span>
          </button>
        </div>

        {/* Center Dock: Sync Status + Hotkeys Hint */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-gray-600">
          <div className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-neo-ink/40">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-neo-vermilion" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-neo-teal" strokeWidth={2.5} />
                <span>Synced</span>
              </>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-gray-500">
            <Keyboard className="w-3.5 h-3.5 text-neo-vermilion" />
            <span>Zoom: Ctrl+Scroll or Ctrl± • Pan: Space+Drag or Alt+Arrows</span>
          </div>
        </div>

        {/* Right Dock: Directly Above Right Side Panel (Export + Inspector Toggle) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 bg-neo-vermilion text-white border-neo border-neo-ink px-3 py-1 rounded-lg font-heading font-bold text-xs shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            title="Export Publication (.ZIP, .PDF, .CBZ, .EPUB)"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Export</span>
          </button>

          <button
            onClick={toggleRightRail}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border-neo border-neo-ink font-bold shadow-neo-sm transition-all ${
              isRightRailOpen
                ? 'bg-neo-yellow text-neo-ink'
                : 'bg-white text-neo-ink hover:bg-neo-yellow/40'
            }`}
            title={
              isRightRailOpen
                ? 'Hide Right Inspector Panel'
                : 'Show Right Inspector Panel'
            }
          >
            {isRightRailOpen ? (
              <PanelRightClose className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
            ) : (
              <SlidersHorizontal className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
            )}
            <span>Inspector</span>
            <span className="hidden sm:inline text-[10px] uppercase opacity-75">
              ({activeInspectorTab === 'project' ? 'meta' : 'block'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
