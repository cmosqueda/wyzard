import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { VIEWPORT_PRESETS } from '../../../types/ast';
import { CanvasFrame } from './CanvasFrame';
import {
  Wifi,
  BatteryMedium,
  Signal,
  Hand,
  MousePointer,
  RotateCcw,
  Move,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export const CenterStage: React.FC = () => {
  const {
    project,
    setActiveChapter,
    viewportMode,
    zoomLevel,
    setZoomLevel,
  } = useEditorStore();
  const preset = VIEWPORT_PRESETS[viewportMode] || VIEWPORT_PRESETS.mobile;

  const isMobile = viewportMode === 'mobile';

  const activeChapterIndex = project.chapters.findIndex(
    (c) => c.id === project.activeChapterId
  );
  const activeChapter =
    project.chapters[activeChapterIndex] || project.chapters[0];

  // Draggable canvas pan state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [stageWidth, setStageWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const stageRef = useRef<HTMLElement | null>(null);

  // Track stage container width so wide viewports (Tablet/Laptop/Comic/Square)
  // automatically scale to fit on mobile and tablet screens without horizontal clipping
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      if (stageRef.current) {
        setStageWidth(stageRef.current.clientWidth);
      }
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Hold Spacebar to temporarily pan canvas, plus Ctrl + Plus/Minus/0 and Alt + Arrow hotkeys for zooming & panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl/Cmd + Plus/Minus/0 Zoom Hotkeys
      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
          e.preventDefault();
          const currentZoom = useEditorStore.getState().zoomLevel;
          setZoomLevel(Math.min(250, currentZoom + 10));
          return;
        }
        if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          const currentZoom = useEditorStore.getState().zoomLevel;
          setZoomLevel(Math.max(25, currentZoom - 10));
          return;
        }
        if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          setZoomLevel(100);
          setPan({ x: 0, y: 0 });
          return;
        }
      }

      // Alt + Arrow Keys to Pan Canvas In/Out/Around
      if (e.altKey && !isInput) {
        const step = e.shiftKey ? 80 : 36;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y + step }));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y - step }));
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x + step }));
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x - step }));
          return;
        }
      }

      if (!isInput && e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsDraggingCanvas(false);
        dragStartRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setZoomLevel]);

  // Ctrl + Mouse Wheel to Zoom In/Out smoothly, or Shift + Wheel to Pan Horizontally
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const currentZoom = useEditorStore.getState().zoomLevel;
        const delta = e.deltaY < 0 ? 10 : -10;
        setZoomLevel(Math.max(25, Math.min(250, currentZoom + delta)));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setZoomLevel]);

  const canPanEverywhere = isPanMode || isSpacePressed;

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const isInteractiveControl = Boolean(
      target.closest('[data-stage-ui="true"]')
    );
    if (isInteractiveControl) return;

    const isDragHandle = Boolean(
      target.closest('[data-canvas-drag-handle="true"]')
    );

    // Only intercept pointer for panning when Pan Mode / Spacebar is active, middle-click, or dragging the device top bezel
    // so normal touch/scroll on the page works effortlessly!
    if (canPanEverywhere || e.button === 1 || isDragHandle) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDraggingCanvas || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    setPan({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      dragStartRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoomLevel(100);
  };

  // Compute responsive auto-fit scale when screen is narrower than preset.width
  const availableW = Math.max(260, stageWidth - 24);
  const autoFitScale = Math.min(1, availableW / preset.width);
  const effectiveScale = Number(((zoomLevel / 100) * autoFitScale).toFixed(3));

  const isPannedOrZoomed = pan.x !== 0 || pan.y !== 0 || zoomLevel !== 100;

  return (
    <main
      ref={stageRef}
      data-stage-bg="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        backgroundImage:
          'radial-gradient(rgba(20, 20, 20, 0.16) 1.25px, transparent 1.25px)',
        backgroundSize: '20px 20px',
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      className={`flex-1 bg-neo-bg h-full min-h-0 overflow-y-auto overflow-x-auto relative flex flex-col items-center py-3 sm:py-5 px-2 sm:px-4 select-none min-w-0 ${
        isDraggingCanvas
          ? 'cursor-grabbing'
          : canPanEverywhere
          ? 'cursor-grab'
          : 'cursor-default'
      }`}
    >
      {/* Floating Top Stage Bar: Tool Mode, Active Chapter, Viewport Info & Mobile Zoom */}
      <div
        data-stage-ui="true"
        className="z-20 mb-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full"
      >
        {/* Select vs Pan/Drag Canvas Mode Toggle */}
        <div className="flex items-center bg-white border-neo border-neo-ink p-0.5 rounded-full shadow-neo-sm text-[11px] sm:text-xs font-mono">
          <button
            onClick={() => setIsPanMode(false)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full font-bold transition-all ${
              !canPanEverywhere
                ? 'bg-neo-yellow text-neo-ink border border-neo-ink'
                : 'text-gray-600 hover:text-neo-ink'
            }`}
            title="Select & Edit Blocks"
          >
            <MousePointer className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setIsPanMode(true)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full font-bold transition-all ${
              canPanEverywhere
                ? 'bg-neo-vermilion text-white border border-neo-ink'
                : 'text-gray-600 hover:text-neo-ink'
            }`}
            title="Pan / Drag Canvas Space (or drag background / hold Space)"
          >
            <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
            <span>Pan</span>
          </button>
        </div>

        {/* Active Spine Chapter Indicator & Quick Switcher */}
        {activeChapter && (
          <div className="flex items-center gap-1 bg-white border-neo border-neo-ink px-2 py-1 rounded-full shadow-neo-sm text-[11px] sm:text-xs font-mono">
            <button
              disabled={activeChapterIndex <= 0}
              onClick={() =>
                activeChapterIndex > 0 &&
                setActiveChapter(project.chapters[activeChapterIndex - 1].id)
              }
              className="p-0.5 rounded hover:bg-neo-bg disabled:opacity-30"
              title="Previous Spine Chapter"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
            </button>
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-vermilion shrink-0" strokeWidth={2.5} />
            <span className="font-bold text-neo-ink max-w-[120px] sm:max-w-[200px] truncate">
              {String(activeChapterIndex + 1).padStart(2, '0')}. {activeChapter.title}
            </span>
            <button
              disabled={activeChapterIndex >= project.chapters.length - 1}
              onClick={() =>
                activeChapterIndex < project.chapters.length - 1 &&
                setActiveChapter(project.chapters[activeChapterIndex + 1].id)
              }
              className="p-0.5 rounded hover:bg-neo-bg disabled:opacity-30"
              title="Next Spine Chapter"
            >
              <ChevronRight className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Viewport Dimension Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white border-neo border-neo-ink px-2.5 py-1 rounded-full shadow-neo-sm text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-neo-yellow" />
          <span className="font-bold text-neo-ink">{preset.name}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">
            {preset.width}×{preset.height}px
          </span>
          {autoFitScale < 0.99 && (
            <span className="text-[10px] bg-neo-teal/25 text-neo-ink px-1.5 py-0.2 rounded border border-neo-ink font-bold">
              Fit {Math.round(effectiveScale * 100)}%
            </span>
          )}
        </div>

        {/* Compact Zoom Controls for Mobile / Tablet */}
        <div className="flex xl:hidden items-center gap-1 bg-white border-neo border-neo-ink px-2 py-0.5 rounded-full shadow-neo-sm text-[11px] font-mono">
          <button
            onClick={() => setZoomLevel(zoomLevel - 10)}
            className="p-0.5 hover:text-neo-vermilion"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" strokeWidth={2.5} />
          </button>
          <span className="font-bold">{Math.round(effectiveScale * 100)}%</span>
          <button
            onClick={() => setZoomLevel(zoomLevel + 10)}
            className="p-0.5 hover:text-neo-vermilion"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>

        {/* Reset Pan/Zoom Button */}
        {isPannedOrZoomed && (
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 bg-neo-ink text-white border-neo border-neo-ink px-2.5 py-1 rounded-full shadow-neo-sm text-[11px] font-mono font-bold hover:bg-neo-vermilion transition-colors"
            title="Center canvas and reset zoom"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
            <span>Center</span>
          </button>
        )}
      </div>

      {/* Draggable & Responsively Scaled Device Viewport Frame */}
      <div
        data-stage-bg="true"
        className="flex-1 w-full flex justify-center items-start pb-16"
      >
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${effectiveScale})`,
            transformOrigin: 'top center',
          }}
          className={
            isDraggingCanvas
              ? 'transition-none'
              : 'transition-transform duration-150'
          }
        >
          <div
            className="bg-white border-neo-thick border-neo-ink shadow-neo-lg rounded-2xl overflow-hidden flex flex-col relative"
            style={{
              width: `${preset.width}px`,
              minHeight: `${preset.height}px`,
            }}
          >
            {/* Draggable Device Bezel / Top Handle Bar */}
            {isMobile ? (
              <div
                data-canvas-drag-handle="true"
                title="Drag bar to move canvas"
                className="h-10 bg-neo-ink text-white px-6 flex items-center justify-between text-[11px] font-mono select-none cursor-grab active:cursor-grabbing shrink-0"
              >
                <span className="font-bold flex items-center gap-1.5">
                  <Move className="w-3 h-3 text-neo-yellow" />
                  9:41
                </span>
                <div className="w-20 h-4 bg-black rounded-full border border-gray-800" />
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3 h-3 text-white" strokeWidth={2.5} />
                  <Wifi className="w-3 h-3 text-white" strokeWidth={2.5} />
                  <BatteryMedium className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
              </div>
            ) : (
              <div
                data-canvas-drag-handle="true"
                title="Drag bar to move canvas"
                className="h-8 bg-neo-ink text-white px-4 flex items-center justify-between text-[11px] font-mono select-none cursor-grab active:cursor-grabbing shrink-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neo-vermilion" />
                  <span className="w-2.5 h-2.5 rounded-full bg-neo-yellow" />
                  <span className="w-2.5 h-2.5 rounded-full bg-neo-teal" />
                </div>
                <span className="text-[10px] text-gray-300 flex items-center gap-1 truncate max-w-[360px]">
                  <Move className="w-3 h-3 text-neo-yellow shrink-0" />
                  Drag Bezel to Move • {activeChapter?.title}
                </span>
                <span className="text-[10px] text-gray-400">
                  {preset.width}×{preset.height}px
                </span>
              </div>
            )}

            {/* Chapter Content Canvas Frame */}
            <div
              className={`flex-1 w-full overflow-y-auto ${
                canPanEverywhere ? 'pointer-events-none' : ''
              }`}
            >
              <CanvasFrame />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
