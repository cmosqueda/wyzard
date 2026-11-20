import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { VIEWPORT_PRESETS } from '../../../types/ast';
import { CanvasFrame } from './CanvasFrame';
import { StageDockContext } from './StageDock';
import { FixedPageStage } from './FixedPage';
import { describePageSize } from '../../../utils/pageLayout';

// The Craft.js frame has no props; memoising it keeps pan / zoom from re-rendering every block
const StaticCanvasFrame = React.memo(CanvasFrame);
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
  const isPlain = project.designSystem === 'plain';
  // Fixed-layout book: the stage shows an exact-size page instead of a device preview
  const fixedSetup = project.layoutMode === 'fixed' && project.pageSetup ? project.pageSetup : null;
  const [showPageGuides, setShowPageGuides] = useState(true);

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

  // Docks for block tools (e.g. the Fixed Visual Canvas toolbar). They sit outside the scaled device frame,
  // so they stay full-width and readable in every viewport (including Mobile).
  const [topDock, setTopDock] = useState<HTMLDivElement | null>(null);
  const [drawerDock, setDrawerDock] = useState<HTMLDivElement | null>(null);
  const [bottomDock, setBottomDock] = useState<HTMLDivElement | null>(null);
  const dockValue = React.useMemo(
    () => ({ top: topDock, drawer: drawerDock, bottom: bottomDock }),
    [topDock, drawerDock, bottomDock]
  );

  // Collapsible stage tools panel (anchored to the left edge of the stage, beside the Tools sidebar)
  const [isStageToolsOpen, setIsStageToolsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wyzard-stage-tools-open');
      if (saved === '1' || saved === '0') return saved === '1';
    } catch {
      // ignore storage errors
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : true;
  });
  const toggleStageTools = () =>
    setIsStageToolsOpen((open) => {
      try {
        localStorage.setItem('wyzard-stage-tools-open', open ? '0' : '1');
      } catch {
        // ignore storage errors
      }
      return !open;
    });

  // Right-button (mouse 2) drag pans the whole canvas; a plain right-click still opens the context menu
  const rightPanRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number; moved: boolean } | null>(null);
  const suppressContextMenuRef = useRef(false);
  const [isRightPanning, setIsRightPanning] = useState(false);

  // During a drag the pan is written straight to the DOM (one write per animation frame) and React state
  // is updated once on release, so dragging never re-renders the stage or the page blocks.
  const panLayerRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const livePanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const paintPan = (x: number, y: number) => {
    livePanRef.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { x: px, y: py } = livePanRef.current;
      if (panLayerRef.current) {
        panLayerRef.current.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scaleRef.current})`;
      }
      if (stageRef.current && !stageRef.current.dataset.designSystem?.includes('plain')) {
        stageRef.current.style.backgroundPosition = `${px}px ${py}px`;
      }
    });
  };

  // Auto-scroll the page while a block (or asset) is being dragged near the top / bottom edge of the stage.
  // Native drag-and-drop never scrolls on its own, so reordering long pages needed manual scrolling.
  useEffect(() => {
    let raf = 0;
    let active = false;
    let x = 0;
    let y = 0;
    let lastOver = 0;

    const tick = () => {
      const el = stageRef.current;
      // dragover keeps firing while a drag is alive; if it stops (cursor left the window) stop scrolling
      if (!active || !el || performance.now() - lastOver > 300) {
        active = false;
        raf = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) {
        const zone = Math.min(110, r.height * 0.25);
        let dir = 0;
        let depth = 0;
        if (y < r.top + zone && y > r.top - 60) {
          dir = -1;
          depth = (r.top + zone - y) / zone;
        } else if (y > r.bottom - zone && y < r.bottom + 60) {
          dir = 1;
          depth = (y - (r.bottom - zone)) / zone;
        }
        if (dir !== 0) {
          // Ease in: slow near the edge of the zone, fast at the very edge
          el.scrollTop += dir * Math.round(4 + Math.min(1, depth) ** 2 * 26);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onDragOver = (e: DragEvent) => {
      x = e.clientX;
      y = e.clientY;
      lastOver = performance.now();
      if (!active) {
        active = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      active = false;
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragend', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragend', stop);
      window.removeEventListener('drop', stop);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  // Two-finger pinch zooms the page (the browser's own page-zoom is disabled on the stage via touch-action)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 100;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startZoom = useEditorStore.getState().zoomLevel;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !startDist) return;
      e.preventDefault();
      setZoomLevel(Math.max(25, Math.min(250, Math.round(startZoom * (dist(e.touches) / startDist)))));
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [setZoomLevel]);

  const canPanEverywhere = isPanMode || isSpacePressed;

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 2) return;
    if ((e.target as HTMLElement).closest('[data-stage-panel="true"]')) return;
    const state = { x: e.clientX, y: e.clientY, startPanX: pan.x, startPanY: pan.y, moved: false };
    rightPanRef.current = state;
    livePanRef.current = { x: pan.x, y: pan.y };
    suppressContextMenuRef.current = false;

    const onMove = (ev: PointerEvent) => {
      if (!state.moved && Math.hypot(ev.clientX - state.x, ev.clientY - state.y) < 5) return;
      if (!state.moved) {
        state.moved = true;
        setIsRightPanning(true);
      }
      paintPan(state.startPanX + (ev.clientX - state.x), state.startPanY + (ev.clientY - state.y));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      rightPanRef.current = null;
      if (state.moved) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setPan({ ...livePanRef.current });
      }
      setIsRightPanning(false);
      if (state.moved) {
        // Windows fires `contextmenu` right after the button is released: swallow it once
        suppressContextMenuRef.current = true;
        setTimeout(() => {
          suppressContextMenuRef.current = false;
        }, 150);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleContextMenuCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (suppressContextMenuRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressContextMenuRef.current = false;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const isInteractiveControl = Boolean(
      target.closest('[data-stage-ui="true"]')
    );
    if (isInteractiveControl) return;

    const isDragHandle = Boolean(
      target.closest('[data-canvas-drag-handle="true"]')
    );

    // The plain canvas has no bezel, so dragging empty stage space around the page pans instead
    const isEmptyStageSpace =
      (isPlain || !!fixedSetup) && e.button === 0 && target.getAttribute('data-stage-bg') === 'true';

    // Only intercept pointer for panning when Pan Mode / Spacebar is active, middle-click, dragging the device
    // top bezel, or (plain) empty stage background, so normal touch/scroll on the page works effortlessly!
    if (canPanEverywhere || e.button === 1 || isDragHandle || isEmptyStageSpace) {
      e.preventDefault();
      livePanRef.current = { x: pan.x, y: pan.y };
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
    paintPan(dragStartRef.current.startPanX + dx, dragStartRef.current.startPanY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (isDraggingCanvas) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (dragStartRef.current) setPan({ ...livePanRef.current });
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
  const autoFitScale = Math.min(1, availableW / (fixedSetup ? fixedSetup.width : preset.width));
  const effectiveScale = Number(((zoomLevel / 100) * autoFitScale).toFixed(3));

  scaleRef.current = effectiveScale;
  const shownPan = isDraggingCanvas || isRightPanning ? livePanRef.current : pan;
  const isPannedOrZoomed = pan.x !== 0 || pan.y !== 0 || zoomLevel !== 100;

  return (
    <StageDockContext.Provider value={dockValue}>
    <div className="flex-1 flex flex-col min-w-0 h-full min-h-0">
      <div
        ref={setTopDock}
        data-stage-ui="true"
        data-stage-panel="true"
        className="shrink-0 z-20 bg-neo-surface border-b-neo border-neo-ink px-2 sm:px-3 py-2 empty:hidden"
      />
    <main
      ref={stageRef}
      data-stage-bg="true"
      data-design-system={isPlain ? 'plain' : 'wyzard'}
      onPointerDownCapture={handlePointerDownCapture}
      onContextMenuCapture={handleContextMenuCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={
        isPlain
          ? undefined
          : {
              backgroundImage:
                'radial-gradient(rgba(20, 20, 20, 0.16) 1.25px, transparent 1.25px)',
              backgroundSize: '20px 20px',
              backgroundPosition: `${shownPan.x}px ${shownPan.y}px`,
            }
      }
      className={`flex-1 bg-neo-bg min-h-0 overflow-y-auto overflow-x-auto relative flex flex-col items-center py-3 sm:py-5 px-2 sm:px-4 select-none min-w-0 ${
        canPanEverywhere ? 'touch-none' : ''
      } ${
        isDraggingCanvas || isRightPanning
          ? 'cursor-grabbing'
          : canPanEverywhere
          ? 'cursor-grab'
          : 'cursor-default'
      }`}
    >
      {/* Collapsible stage tools panel, anchored beside the left Tools sidebar */}
      <div
        data-stage-panel="true"
        className="sticky top-0 self-start w-0 h-0 z-30 -ml-2 sm:-ml-4 -mt-3 sm:-mt-5 mb-3 sm:mb-5 overflow-visible"
      >
        <div data-stage-ui="true" data-stage-panel="true" className="absolute left-0 top-3 flex items-start">
          {isStageToolsOpen && (
            <div className="w-52 max-h-[calc(100dvh-9rem)] overflow-y-auto bg-white border-neo border-l-0 border-neo-ink rounded-r-xl shadow-neo-sm p-2.5 flex flex-col gap-3 text-[11px] font-mono animate-in fade-in slide-in-from-left-2 duration-150">
              {/* Mode */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Mode</span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setIsPanMode(false)}
                    className={`flex items-center justify-center gap-1 py-2 rounded-lg font-bold border border-neo-ink transition-all ${
                      !canPanEverywhere ? 'bg-neo-yellow text-neo-ink' : 'bg-white text-gray-600 hover:bg-neo-bg'
                    }`}
                    title="Select & edit blocks"
                  >
                    <MousePointer className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Edit
                  </button>
                  <button
                    onClick={() => setIsPanMode(true)}
                    className={`flex items-center justify-center gap-1 py-2 rounded-lg font-bold border border-neo-ink transition-all ${
                      canPanEverywhere ? 'bg-neo-vermilion text-white' : 'bg-white text-gray-600 hover:bg-neo-bg'
                    }`}
                    title="Pan / drag the canvas (or hold Space, or drag with the right mouse button)"
                  >
                    <Hand className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Pan
                  </button>
                </div>
              </div>

              {/* Chapter */}
              {activeChapter && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Chapter</span>
                  <div className="flex items-center gap-1 border border-neo-ink rounded-lg px-1 py-1">
                    <button
                      disabled={activeChapterIndex <= 0}
                      onClick={() => activeChapterIndex > 0 && setActiveChapter(project.chapters[activeChapterIndex - 1].id)}
                      className="p-1.5 rounded hover:bg-neo-bg disabled:opacity-30"
                      title="Previous chapter"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
                    </button>
                    <FileText className="w-3 h-3 text-neo-vermilion shrink-0" strokeWidth={2.5} />
                    <span className="flex-1 font-bold text-neo-ink truncate" title={activeChapter.title}>
                      {String(activeChapterIndex + 1).padStart(2, '0')}. {activeChapter.title}
                    </span>
                    <button
                      disabled={activeChapterIndex >= project.chapters.length - 1}
                      onClick={() =>
                        activeChapterIndex < project.chapters.length - 1 &&
                        setActiveChapter(project.chapters[activeChapterIndex + 1].id)
                      }
                      className="p-1.5 rounded hover:bg-neo-bg disabled:opacity-30"
                      title="Next chapter"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-neo-ink" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Viewport */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">
                  {fixedSetup ? 'Page' : 'Viewport'}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-neo-yellow shrink-0" />
                  {fixedSetup ? (
                    <span className="font-bold text-neo-ink">{describePageSize(fixedSetup)}</span>
                  ) : (
                    <>
                      <span className="font-bold text-neo-ink">{preset.name}</span>
                      <span className="text-gray-500">
                        {preset.width}×{preset.height}px
                      </span>
                    </>
                  )}
                  {autoFitScale < 0.99 && (
                    <span className="text-[10px] bg-neo-teal/25 text-neo-ink px-1.5 rounded border border-neo-ink font-bold">
                      Fit {Math.round(effectiveScale * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {fixedSetup && (
                <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
                  <input
                    type="checkbox"
                    checked={showPageGuides}
                    onChange={(e) => setShowPageGuides(e.target.checked)}
                    className="w-3.5 h-3.5 accent-neo-ink"
                  />
                  Margin guides
                </label>
              )}

              {/* Zoom */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Zoom</span>
                <div className="flex items-center justify-between border border-neo-ink rounded-lg px-1.5 py-1">
                  <button onClick={() => setZoomLevel(zoomLevel - 10)} className="p-1.5 hover:text-neo-vermilion" title="Zoom out (Ctrl + -)">
                    <ZoomOut className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="font-bold">{Math.round(effectiveScale * 100)}%</span>
                  <button onClick={() => setZoomLevel(zoomLevel + 10)} className="p-1.5 hover:text-neo-vermilion" title="Zoom in (Ctrl + +)">
                    <ZoomIn className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                <button
                  onClick={handleResetView}
                  disabled={!isPannedOrZoomed}
                  className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-neo-ink font-bold bg-neo-ink text-white hover:bg-neo-vermilion disabled:opacity-40 disabled:hover:bg-neo-ink transition-colors"
                  title="Center the canvas and reset zoom"
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                  Center
                </button>
              </div>

              <p className="text-[9px] leading-snug text-gray-500">
                Right-drag, Space+drag or Alt+arrows to pan • Ctrl+scroll to zoom
              </p>
            </div>
          )}

          <button
            onClick={toggleStageTools}
            className="mt-2 w-8 h-14 flex items-center justify-center bg-white border-neo border-l-0 border-neo-ink rounded-r-lg shadow-neo-sm text-neo-ink hover:bg-neo-yellow transition-colors"
            title={isStageToolsOpen ? 'Collapse canvas tools' : 'Open canvas tools (mode, chapter, zoom)'}
            aria-expanded={isStageToolsOpen}
          >
            {isStageToolsOpen ? (
              <ChevronLeft className="w-4 h-4" strokeWidth={3} />
            ) : (
              <ChevronRight className="w-4 h-4" strokeWidth={3} />
            )}
          </button>
        </div>
      </div>

      {/* Draggable & Responsively Scaled Device Viewport Frame */}
      <div
        data-stage-bg="true"
        className="flex-1 w-full flex justify-center items-start pb-16"
      >
        <div
          ref={panLayerRef}
          style={{
            transform: `translate3d(${shownPan.x}px, ${shownPan.y}px, 0) scale(${effectiveScale})`,
            transformOrigin: 'top center',
            willChange: isDraggingCanvas || isRightPanning ? 'transform' : undefined,
          }}
          className={
            isDraggingCanvas || isRightPanning
              ? 'transition-none'
              : 'transition-transform duration-150'
          }
        >
          {fixedSetup ? (
            <div className={canPanEverywhere ? 'pointer-events-none' : ''}>
              <FixedPageStage
                project={project}
                page={activeChapter}
                pageIndex={Math.max(0, activeChapterIndex)}
                setup={fixedSetup}
                showGuides={showPageGuides}
              >
                <StaticCanvasFrame />
              </FixedPageStage>
            </div>
          ) : (
          <div
            data-design-system={isPlain ? 'plain' : 'wyzard'}
            className={`bg-white overflow-hidden flex flex-col relative ${
              isPlain
                ? 'shadow-[0_1px_3px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.10)]'
                : 'border-neo-thick border-neo-ink shadow-neo-lg rounded-2xl'
            }`}
            style={{
              width: `${preset.width}px`,
              minHeight: `${preset.height}px`,
            }}
          >
            {/* Draggable Device Bezel / Top Handle Bar (Wyzard design system only; plain page is a bare sheet) */}
            {isPlain ? null : isMobile ? (
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
              <StaticCanvasFrame />
            </div>
          </div>
          )}
        </div>
      </div>
    </main>
      <div
        ref={setDrawerDock}
        data-stage-ui="true"
        data-stage-panel="true"
        className="shrink-0 z-20 bg-neo-surface border-t-neo border-neo-ink px-2 sm:px-3 py-2 max-h-[42dvh] overflow-y-auto empty:hidden"
      />
      <div
        ref={setBottomDock}
        data-stage-ui="true"
        data-stage-panel="true"
        className="shrink-0 z-20 bg-neo-surface border-t-neo border-neo-ink px-2 sm:px-3 py-2 empty:hidden"
      />
    </div>
    </StageDockContext.Provider>
  );
};
