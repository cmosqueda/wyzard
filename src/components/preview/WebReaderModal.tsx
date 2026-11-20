import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { notify } from '../../store/toastStore';
import { FIXED_PAGE_CSS } from '../../compiler/fixedPage';
import {
  compileWebPublication,
  getWebPublicationStyles,
} from '../../compiler/webCompiler';
import {
  SCREEN_RATIO_PRESETS,
  type ScreenRatioKey,
  paginateProjectForViewport,
  renderPaginatedPageHtml,
  exportToHtmlZipPack,
  exportToPaginatedPdf,
  exportToCbz,
  renderPageGrabToCanvasDataUrl,
} from '../../compiler/multiFormatExporter';
import { exportToEpub } from '../../compiler/epubCompiler';
import { saveAs } from 'file-saver';
import {
  X,
  Smartphone,
  Tablet,
  Laptop,
  Square,
  Maximize2,
  Download,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  FileText,
  Film,
  Layers,
  Grid,
  Columns,
  ShieldCheck,
  Loader2,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export type ReaderEngineMode = 'web' | 'pdf' | 'cbz' | 'epub';

interface WebReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEngine?: ReaderEngineMode;
  initialRatio?: ScreenRatioKey;
}

export const WebReaderModal: React.FC<WebReaderModalProps> = ({
  isOpen,
  onClose,
  initialEngine = 'web',
  initialRatio = 'tablet',
}) => {
  const { project } = useEditorStore();

  // Default reader is always HTML Reader ('web') unless explicitly opened into another engine
  const [engine, setEngine] = useState<ReaderEngineMode>(initialEngine);
  const [activeChapterId, setActiveChapterId] = useState<string>(project.activeChapterId);

  // Table-of-contents links inside the reader iframe ask us to open another page
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const id = e.data && (e.data as { wyzardGoto?: string }).wyzardGoto;
      if (typeof id === 'string' && project.chapters.some((c) => c.id === id)) setActiveChapterId(id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [project.chapters]);

  // Unified Screen Ratio state across HTML Reader, Page-Grab PDF, and CBZ Comic Reader
  const [ratioKey, setRatioKey] = useState<ScreenRatioKey>(initialRatio);
  const [htmlFullWidth, setHtmlFullWidth] = useState<boolean>(false);

  // Paginated PDF & CBZ shared page index
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pdfViewMode, setPdfViewMode] = useState<'single' | 'grid'>('single');

  // CBZ Comic Reader state
  const [cbzSpreadMode, setCbzSpreadMode] = useState<'single' | 'spread'>('single');
  const [cbzPlates, setCbzPlates] = useState<Record<number, string>>({});
  const [isRenderingCbz, setIsRenderingCbz] = useState<boolean>(false);
  const cbzPlatesRef = useRef<Record<number, string>>({});

  // EPUB Reader state
  const [epubTheme, setEpubTheme] = useState<'day' | 'sepia' | 'night'>('day');
  const [epubFontScale, setEpubFontScale] = useState<number>(100);

  // Export busy indicator
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Track available reader stage width for responsive mobile/tablet scaling
  const [stageWidth, setStageWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => setStageWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      setEngine(initialEngine || 'web');
      setRatioKey(initialRatio || 'tablet');
      setHtmlFullWidth(false);
      setActiveChapterId(project.activeChapterId || project.chapters[0]?.id || 'ch-1');
      setPageIndex(0);
    }
  }, [isOpen, initialEngine, initialRatio, project.activeChapterId, project.chapters]);

  // Precompute discrete asset-safe pages when modal is open
  const paginatedPages = useMemo(() => {
    if (!isOpen) return [];
    try {
      return paginateProjectForViewport(project, ratioKey);
    } catch (err) {
      console.error('Pagination error:', err);
      return [];
    }
  }, [isOpen, project, ratioKey]);

  // Fixed-layout books preview at their real page size; reflowable books use the chosen screen ratio
  const fixedSetup = project.layoutMode === 'fixed' ? project.pageSetup : undefined;
  const preset = fixedSetup
    ? {
        ...SCREEN_RATIO_PRESETS.tablet,
        label: `Fixed page (${Math.round(fixedSetup.width)}×${Math.round(fixedSetup.height)})`,
        shortLabel: `${Math.round(fixedSetup.width)}×${Math.round(fixedSetup.height)}`,
        width: Math.round(fixedSetup.width),
        height: Math.round(fixedSetup.height),
        paddingX: fixedSetup.margins.left,
        paddingY: fixedSetup.margins.top,
      }
    : SCREEN_RATIO_PRESETS[ratioKey] || SCREEN_RATIO_PRESETS.tablet;

  // Reset pageIndex and CBZ plate cache when ratio or project changes
  useEffect(() => {
    setPageIndex(0);
    cbzPlatesRef.current = {};
    setCbzPlates({});
  }, [ratioKey, project]);

  // Render visible CBZ comic plates on demand when in CBZ engine
  useEffect(() => {
    if (!isOpen || engine !== 'cbz' || paginatedPages.length === 0) return;
    let cancelled = false;

    const indicesToRender: number[] = [pageIndex];
    if (pageIndex + 1 < paginatedPages.length) indicesToRender.push(pageIndex + 1);
    if (pageIndex - 1 >= 0) indicesToRender.push(pageIndex - 1);

    const missing = indicesToRender.filter((idx) => !cbzPlatesRef.current[idx]);
    if (missing.length === 0) return;

    setIsRenderingCbz(true);
    (async () => {
      for (const idx of missing) {
        const page = paginatedPages[idx];
        if (!page) continue;
        try {
          const url = await renderPageGrabToCanvasDataUrl(
            page,
            project,
            paginatedPages.length,
            1.4
          );
          if (cancelled) return;
          if (url) {
            cbzPlatesRef.current[idx] = url;
            setCbzPlates({ ...cbzPlatesRef.current });
          }
        } catch (err) {
          console.error('Failed to rasterize CBZ plate:', err);
        }
      }
      if (!cancelled) {
        setIsRenderingCbz(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, engine, pageIndex, paginatedPages, project]);

  // Keyboard navigation for PDF and CBZ reader engines
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (engine === 'pdf' || engine === 'cbz') {
        const step = engine === 'cbz' && cbzSpreadMode === 'spread' ? 2 : 1;
        if (e.key === 'ArrowRight') {
          setPageIndex((p) => Math.min(Math.max(0, paginatedPages.length - 1), p + step));
        } else if (e.key === 'ArrowLeft') {
          setPageIndex((p) => Math.max(0, p - step));
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, engine, cbzSpreadMode, paginatedPages.length]);

  // IMPORTANT: All hooks are above this early return!
  if (!isOpen) return null;

  const currentChapterIndex = Math.max(
    0,
    project.chapters.findIndex((c) => c.id === activeChapterId)
  );
  const compiledHtml = compileWebPublication(project, activeChapterId);

  const safeMovedCount = paginatedPages.reduce(
    (acc, pg) => acc + pg.items.filter((i) => i.movedToAvoidCut).length,
    0
  );

  // Build single-page preview HTML for the Paginated PDF Page-Grab Engine
  const currentPdfPage = paginatedPages[pageIndex] || paginatedPages[0];
  const singlePageGrabSrcDoc = currentPdfPage
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    ${getWebPublicationStyles(project.designSystem)}
    ${FIXED_PAGE_CSS}
    html, body {
      margin: 0;
      padding: 0;
      width: ${preset.width}px;
      height: ${preset.height}px;
      overflow: hidden;
      background: #FFFFFF;
    }
    .wyzard-page-grab {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .page-grab-folio {
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #141414;
      padding-bottom: 4px;
      margin-bottom: 10px;
      font-family: "JetBrains Mono", monospace;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #555;
      flex-shrink: 0;
    }
    .page-grab-body {
      flex: 1;
      overflow: hidden;
    }
    .page-grab-block .editorial-image-figure,
    .page-grab-block .editorial-hero-spread,
    .page-grab-block .editorial-callout,
    .page-grab-block .interactive-accordion,
    .page-grab-block .interactive-hotspot-pinboard,
    .page-grab-block .editorial-gallery,
    .page-grab-block .editorial-audio-player,
    .page-grab-block .adaptive-split-container {
      margin-top: 0.55rem !important;
      margin-bottom: 0.65rem !important;
    }
    .page-grab-block .editorial-image-figure.full-bleed {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .page-grab-block .image-aspect-wrapper {
      max-height: var(--max-asset-h, 500px);
    }
    .page-grab-footer {
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #ddd;
      padding-top: 4px;
      margin-top: 8px;
      font-family: "JetBrains Mono", monospace;
      font-size: 9.5px;
      font-weight: 700;
      color: #666;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  ${renderPaginatedPageHtml(currentPdfPage, project, paginatedPages.length)}
</body>
</html>`
    : '';

  // Build EPUB themed HTML (without calling hooks after early return)
  const epubThemeColors =
    epubTheme === 'night'
      ? { bg: '#121316', paper: '#1A1C20', fg: '#E6E4DF' }
      : epubTheme === 'sepia'
      ? { bg: '#E8DEC8', paper: '#F5ECD7', fg: '#2C221E' }
      : { bg: '#ECEAE4', paper: '#FFFFFF', fg: '#141414' };

  const epubSrcDoc = compiledHtml.replace(
    '</style>',
    `
    html { font-size: ${epubFontScale}% !important; }
    body { background-color: ${epubThemeColors.bg} !important; color: ${epubThemeColors.fg} !important; }
    .book-wrapper { background-color: ${epubThemeColors.paper} !important; color: ${epubThemeColors.fg} !important; max-width: 680px !important; font-family: Georgia, serif !important; }
    .editorial-h1, .editorial-h2, .editorial-h3, .editorial-body, .editorial-lead, .editorial-pullquote { color: ${epubThemeColors.fg} !important; }
    </style>`
  );

  const handleDownloadHtmlZip = async () => {
    setBusyAction('zip');
    try {
      await exportToHtmlZipPack(project);
      notify({
        type: 'success',
        title: 'HTML .ZIP Pack Downloaded',
        message: 'Packaged index.html, chapters, styles, runtime JS, and assets.',
      });
    } catch {
      notify({
        type: 'error',
        title: 'HTML Pack Export Failed',
        message: 'Could not generate the HTML .ZIP archive.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadSingleHtml = () => {
    const blob = new Blob([compiledHtml], { type: 'text/html;charset=utf-8' });
    const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'publication'}.html`;
    saveAs(blob, filename);
    notify({
      type: 'success',
      title: 'Standalone .HTML Downloaded',
      message: `Saved ${filename}.`,
    });
  };

  const handleExportPdf = () => {
    exportToPaginatedPdf(project, ratioKey);
    notify({
      type: 'success',
      title: 'Paginated PDF Page-Grab Ready',
      message: `${paginatedPages.length} asset-safe pages prepared for ${preset.shortLabel}.`,
    });
  };

  const handleExportCbz = async () => {
    setBusyAction('cbz');
    try {
      await exportToCbz(project, ratioKey);
      notify({
        type: 'success',
        title: '.CBZ Comic Archive Downloaded',
        message: `Packaged ${paginatedPages.length} high-DPI plates + ComicInfo.xml.`,
      });
    } catch {
      notify({
        type: 'error',
        title: 'CBZ Export Error',
        message: 'Failed to package the .CBZ comic archive.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportEpub = async () => {
    setBusyAction('epub');
    try {
      await exportToEpub(project);
      notify({
        type: 'success',
        title: 'EPUB 3.3 Downloaded',
        message: `"${project.title}" exported as .epub.`,
      });
    } catch {
      notify({
        type: 'error',
        title: 'EPUB Export Error',
        message: 'Failed to package the EPUB 3.3 archive.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const readerFitScale = Math.min(1, Math.max(260, stageWidth - 48) / preset.width);

  const getRatioButtonIcon = (key: ScreenRatioKey) => {
    switch (key) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'laptop':
        return <Laptop className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'comic':
        return <Film className="w-3.5 h-3.5" strokeWidth={2.5} />;
      case 'square':
        return <Square className="w-3.5 h-3.5" strokeWidth={2.5} />;
    }
  };

  const getRatioButtonLabel = (key: ScreenRatioKey) => {
    switch (key) {
      case 'mobile':
        return 'Mobile';
      case 'tablet':
        return 'Tablet';
      case 'laptop':
        return 'Laptop';
      case 'comic':
        return 'Comic 2:3';
      case 'square':
        return 'Square 1:1';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-7xl h-[94vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Top Bar: Reader Engine Switcher + Screen Ratio Switcher + Export Actions */}
        <div className="bg-white border-b-neo border-neo-ink px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* 4 Reader Engine Tabs (Default: HTML Reader) */}
          <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-xl shadow-neo-sm">
            <button
              onClick={() => setEngine('web')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                engine === 'web'
                  ? 'bg-neo-yellow text-neo-ink border border-neo-ink shadow-neo-sm'
                  : 'text-gray-600 hover:text-neo-ink'
              }`}
            >
              <FileArchive className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>HTML Reader</span>
            </button>

            <button
              onClick={() => setEngine('pdf')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                engine === 'pdf'
                  ? 'bg-neo-teal text-neo-ink border border-neo-ink shadow-neo-sm'
                  : 'text-gray-600 hover:text-neo-ink'
              }`}
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Page-Grab PDF</span>
            </button>

            <button
              onClick={() => setEngine('cbz')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                engine === 'cbz'
                  ? 'bg-neo-vermilion text-white border border-neo-ink shadow-neo-sm'
                  : 'text-gray-600 hover:text-neo-ink'
              }`}
            >
              <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>.CBZ Comic</span>
            </button>

            <button
              onClick={() => setEngine('epub')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                engine === 'epub'
                  ? 'bg-neo-violet text-white border border-neo-ink shadow-neo-sm'
                  : 'text-gray-600 hover:text-neo-ink'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>EPUB 3.3</span>
            </button>
          </div>

          {/* Center Top Panel: Screen Ratio Switcher (Mobile, Tablet, Laptop, Comic, Square, Full) */}
          {engine !== 'epub' && !fixedSetup && (
            <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-xl shadow-neo-sm">
              {(Object.keys(SCREEN_RATIO_PRESETS) as ScreenRatioKey[]).map((key) => {
                const cfg = SCREEN_RATIO_PRESETS[key];
                const isSelected = ratioKey === key && !(engine === 'web' && htmlFullWidth);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setRatioKey(key);
                      setHtmlFullWidth(false);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-neo-yellow text-neo-ink border border-neo-ink shadow-neo-sm'
                        : 'text-gray-600 hover:text-neo-ink hover:bg-white/70'
                    }`}
                    title={`${cfg.label} (${cfg.width}×${cfg.height}px)`}
                  >
                    {getRatioButtonIcon(key)}
                    <span>{getRatioButtonLabel(key)}</span>
                  </button>
                );
              })}

              {engine === 'web' && (
                <button
                  onClick={() => setHtmlFullWidth(true)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                    htmlFullWidth
                      ? 'bg-neo-yellow text-neo-ink border border-neo-ink shadow-neo-sm'
                      : 'text-gray-600 hover:text-neo-ink hover:bg-white/70'
                  }`}
                  title="Full Window Width"
                >
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Full</span>
                </button>
              )}
            </div>
          )}

          {/* Right Side Engine Actions & Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {engine === 'web' && (
              <>
                <button
                  onClick={handleDownloadHtmlZip}
                  disabled={busyAction === 'zip'}
                  className="flex items-center gap-1.5 bg-neo-yellow text-neo-ink px-3 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:bg-neo-yellow/80"
                >
                  {busyAction === 'zip' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileArchive className="w-3.5 h-3.5" />
                  )}
                  <span>Export .ZIP Pack</span>
                </button>

                <button
                  onClick={handleDownloadSingleHtml}
                  className="flex items-center gap-1 bg-white text-neo-ink px-2.5 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm"
                  title="Download single standalone HTML file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.HTML</span>
                </button>
              </>
            )}

            {engine === 'pdf' && (
              <>
                <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg">
                  <button
                    onClick={() => setPdfViewMode('single')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      pdfViewMode === 'single' ? 'bg-neo-teal text-neo-ink' : 'text-gray-600'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Page Grab</span>
                  </button>
                  <button
                    onClick={() => setPdfViewMode('grid')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      pdfViewMode === 'grid' ? 'bg-neo-teal text-neo-ink' : 'text-gray-600'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    <span>Sheet ({paginatedPages.length})</span>
                  </button>
                </div>

                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 bg-neo-teal text-neo-ink px-3 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:opacity-90"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .PDF</span>
                </button>
              </>
            )}

            {engine === 'cbz' && (
              <>
                <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg">
                  <button
                    onClick={() => setCbzSpreadMode('single')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold ${
                      cbzSpreadMode === 'single'
                        ? 'bg-neo-vermilion text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    1-Page
                  </button>
                  <button
                    onClick={() => setCbzSpreadMode('spread')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      cbzSpreadMode === 'spread'
                        ? 'bg-neo-vermilion text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>2-Page Spread</span>
                  </button>
                </div>

                <button
                  onClick={handleExportCbz}
                  disabled={busyAction === 'cbz'}
                  className="flex items-center gap-1.5 bg-neo-vermilion text-white px-3 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:opacity-90"
                >
                  {busyAction === 'cbz' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export .CBZ</span>
                </button>
              </>
            )}

            {engine === 'epub' && (
              <>
                <div className="flex items-center gap-1 bg-neo-bg p-1 border-neo border-neo-ink rounded-lg">
                  <button
                    onClick={() => setEpubTheme('day')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      epubTheme === 'day' ? 'bg-white text-neo-ink shadow-neo-sm' : 'text-gray-600'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>Day</span>
                  </button>
                  <button
                    onClick={() => setEpubTheme('sepia')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      epubTheme === 'sepia'
                        ? 'bg-[#F5ECD7] text-neo-ink shadow-neo-sm'
                        : 'text-gray-600'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sepia</span>
                  </button>
                  <button
                    onClick={() => setEpubTheme('night')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                      epubTheme === 'night'
                        ? 'bg-neo-ink text-white shadow-neo-sm'
                        : 'text-gray-600'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Night</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white px-2 py-1 border-neo border-neo-ink rounded-lg font-mono text-xs">
                  <button
                    onClick={() => setEpubFontScale((s) => Math.max(85, s - 10))}
                    className="px-1 font-bold hover:text-neo-vermilion"
                  >
                    A-
                  </button>
                  <span className="text-[11px] font-bold">{epubFontScale}%</span>
                  <button
                    onClick={() => setEpubFontScale((s) => Math.min(145, s + 10))}
                    className="px-1 font-bold hover:text-neo-vermilion"
                  >
                    A+
                  </button>
                </div>

                <button
                  onClick={handleExportEpub}
                  disabled={busyAction === 'epub'}
                  className="flex items-center gap-1.5 bg-neo-violet text-white px-3 py-1.5 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm"
                >
                  {busyAction === 'epub' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export .EPUB</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-neo-ink hover:bg-neo-vermilion hover:text-white rounded border-neo border-neo-ink shadow-neo-sm transition-all"
              title="Close Reader Suite"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Sub-Toolbar: Chapter Spine / Page Stepper & Active Ratio Badge */}
        <div className="bg-neo-bg border-b-neo border-neo-ink px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          {engine === 'web' || engine === 'epub' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-neo-ink">CHAPTER SPINE:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {project.chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapterId(ch.id)}
                    className={`px-2 py-0.5 rounded border border-neo-ink text-[11px] font-bold transition-all ${
                      ch.id === activeChapterId
                        ? 'bg-neo-ink text-white'
                        : 'bg-white text-neo-ink hover:bg-neo-yellow/40'
                    }`}
                  >
                    {idx + 1}. {ch.title}
                  </button>
                ))}
              </div>
              {engine === 'web' && (
                <span className="px-2 py-0.5 rounded bg-white border border-neo-ink text-[10px] font-bold text-gray-600">
                  Viewport: {htmlFullWidth ? 'Full Window (100%)' : `${preset.label}`}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neo-teal/25 border border-neo-ink text-neo-ink font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-neo-ink" />
                <span>
                  Smart Asset Guard ({paginatedPages.length} Page Grabs at {preset.shortLabel} •{' '}
                  {safeMovedCount} Assets Shifted to Prevent Page Cuts)
                </span>
              </span>
            </div>
          )}

          {/* Right side page or chapter stepper */}
          {engine === 'web' || engine === 'epub' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  currentChapterIndex > 0 &&
                  setActiveChapterId(project.chapters[currentChapterIndex - 1].id)
                }
                disabled={currentChapterIndex <= 0}
                className="px-2 py-0.5 bg-white border border-neo-ink rounded disabled:opacity-30 font-bold"
              >
                Prev Chapter
              </button>
              <span className="font-bold px-1">
                {currentChapterIndex + 1} / {project.chapters.length}
              </span>
              <button
                onClick={() =>
                  currentChapterIndex < project.chapters.length - 1 &&
                  setActiveChapterId(project.chapters[currentChapterIndex + 1].id)
                }
                disabled={currentChapterIndex >= project.chapters.length - 1}
                className="px-2 py-0.5 bg-white border border-neo-ink rounded disabled:opacity-30 font-bold"
              >
                Next Chapter
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setPageIndex((p) =>
                    Math.max(0, p - (engine === 'cbz' && cbzSpreadMode === 'spread' ? 2 : 1))
                  )
                }
                disabled={pageIndex <= 0}
                className="p-1 bg-white border border-neo-ink rounded disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold px-2">
                PAGE {pageIndex + 1} OF {Math.max(1, paginatedPages.length)}
              </span>
              <button
                onClick={() =>
                  setPageIndex((p) =>
                    Math.min(
                      Math.max(0, paginatedPages.length - 1),
                      p + (engine === 'cbz' && cbzSpreadMode === 'spread' ? 2 : 1)
                    )
                  )
                }
                disabled={pageIndex >= paginatedPages.length - 1}
                className="p-1 bg-white border border-neo-ink rounded disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Main Viewport Stage for Active Reader Engine */}
        <div className="flex-1 overflow-auto relative flex flex-col">
          {/* ENGINE 1: HTML READER WITH SCREEN RATIO FRAME */}
          {engine === 'web' && (
            <div className="flex-1 overflow-auto p-2 sm:p-6 flex justify-center items-start bg-neo-bg">
              <div
                style={
                  htmlFullWidth
                    ? { width: '100%', height: '100%' }
                    : {
                        transform: `scale(${readerFitScale})`,
                        transformOrigin: 'top center',
                      }
                }
                className={htmlFullWidth ? 'w-full h-full' : 'transition-transform duration-200'}
              >
                <div
                  className="bg-white border-neo-thick border-neo-ink rounded-xl shadow-neo-lg overflow-hidden transition-all duration-200 flex flex-col"
                  style={
                    htmlFullWidth
                      ? { width: '100%', height: '100%', minHeight: '72vh' }
                      : {
                          width: `${preset.width}px`,
                          height: `${preset.height}px`,
                        }
                  }
                >
                  <div className="h-7 bg-neo-ink text-white px-3 flex items-center justify-between font-mono text-[10px] shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neo-vermilion" />
                      <span className="w-2 h-2 rounded-full bg-neo-yellow" />
                      <span className="w-2 h-2 rounded-full bg-neo-teal" />
                    </div>
                    <span className="font-bold truncate px-2">
                      HTML READER • {htmlFullWidth ? 'FULL WINDOW' : preset.label.toUpperCase()}
                    </span>
                    <span className="shrink-0">
                      {htmlFullWidth ? '100%' : `${preset.width}×${preset.height}`}
                    </span>
                  </div>
                  <iframe
                    srcDoc={compiledHtml}
                    title="Web HTML Reader"
                    className="w-full flex-1 border-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ENGINE 2: PAGINATED PAGE-GRAB PDF READER */}
          {engine === 'pdf' && (
            <div className="flex-1 overflow-auto p-2 sm:p-6 bg-[#2A2A2A] flex flex-col items-center">
              {pdfViewMode === 'single' && currentPdfPage ? (
                <div className="flex flex-col items-center gap-3 my-auto">
                  {currentPdfPage.items.some((i) => i.movedToAvoidCut) && (
                    <div className="px-3 py-1 rounded-full bg-neo-yellow text-neo-ink border-2 border-neo-ink font-mono text-[11px] font-bold shadow-neo-sm text-center">
                      ✦ Visual Asset Protected: Placed at top of Page {currentPdfPage.pageNumber}{' '}
                      to avoid previous page cut-off
                    </div>
                  )}

                  <div
                    style={{
                      transform: `scale(${readerFitScale})`,
                      transformOrigin: 'top center',
                    }}
                    className="transition-transform duration-200"
                  >
                    <div
                      className="bg-white border-4 border-neo-ink shadow-[8px_8px_0px_#141414] overflow-hidden"
                      style={{
                        width: `${preset.width}px`,
                        height: `${preset.height}px`,
                      }}
                    >
                      <iframe
                        srcDoc={singlePageGrabSrcDoc}
                        title={`Page Grab ${currentPdfPage.pageNumber}`}
                        className="w-full h-full border-none pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Contact Sheet Grid View of All Page Grabs */
                <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPages.map((pg, idx) => (
                    <div
                      key={pg.pageNumber}
                      onClick={() => {
                        setPageIndex(idx);
                        setPdfViewMode('single');
                      }}
                      className={`cursor-pointer bg-white border-2 border-neo-ink rounded-xl p-4 shadow-neo transition-transform hover:-translate-y-1 flex flex-col justify-between ${
                        idx === pageIndex ? 'ring-4 ring-neo-yellow' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3 font-mono text-[11px] font-bold">
                          <span>PAGE {pg.pageNumber}</span>
                          <span className="text-gray-500 truncate max-w-[160px]">
                            {pg.chapterTitle}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {pg.items.map((item, iIdx) => (
                            <div
                              key={iIdx}
                              className={`px-2.5 py-1.5 rounded border text-xs font-mono flex items-center justify-between ${
                                item.isVisualAsset
                                  ? 'bg-neo-teal/20 border-neo-ink font-bold'
                                  : 'bg-neo-bg border-gray-300'
                              }`}
                            >
                              <span className="truncate">
                                {item.node.type.replace(/Block$/, '')}
                              </span>
                              <span className="text-[10px] opacity-75">
                                ~{item.estimatedHeight}px
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 pt-2 border-t border-gray-200 flex items-center justify-between font-mono text-[10px] text-gray-500">
                        <span>
                          Used {pg.usedHeight}px / {pg.usableHeight}px
                        </span>
                        {pg.items.some((i) => i.movedToAvoidCut) && (
                          <span className="bg-neo-yellow text-neo-ink px-1.5 py-0.5 rounded font-bold">
                            Asset-Safe Shift
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ENGINE 3: .CBZ COMIC ARCHIVE READER ENGINE */}
          {engine === 'cbz' && (
            <div className="flex-1 flex flex-col bg-[#121214] text-white overflow-hidden">
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center gap-6">
                {isRenderingCbz && !cbzPlates[pageIndex] ? (
                  <div className="flex flex-col items-center gap-2 font-mono text-xs text-neo-yellow">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span>Rasterizing High-DPI Comic Plate #{pageIndex + 1}...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4 my-auto">
                    {cbzPlates[pageIndex] && (
                      <div className="relative group">
                        <img
                          src={cbzPlates[pageIndex]}
                          alt={`Comic Plate ${pageIndex + 1}`}
                          className="max-h-[72vh] w-auto object-contain rounded border-2 border-neo-yellow shadow-[0_14px_40px_rgba(0,0,0,0.75)] bg-white"
                        />
                        <span className="absolute bottom-3 right-3 bg-neo-ink/90 text-neo-yellow font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-neo-yellow">
                          {String(pageIndex + 1).padStart(3, '0')}.png
                        </span>
                      </div>
                    )}

                    {cbzSpreadMode === 'spread' &&
                      pageIndex + 1 < paginatedPages.length &&
                      cbzPlates[pageIndex + 1] && (
                        <div className="relative group">
                          <img
                            src={cbzPlates[pageIndex + 1]}
                            alt={`Comic Plate ${pageIndex + 2}`}
                            className="max-h-[72vh] w-auto object-contain rounded border-2 border-neo-yellow shadow-[0_14px_40px_rgba(0,0,0,0.75)] bg-white"
                          />
                          <span className="absolute bottom-3 right-3 bg-neo-ink/90 text-neo-yellow font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-neo-yellow">
                            {String(pageIndex + 2).padStart(3, '0')}.png
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Bottom Comic Filmstrip Scrubber */}
              <div className="h-14 bg-[#1B1B1F] border-t border-white/15 px-4 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2 shrink-0">
                  CBZ PLATES:
                </span>
                {paginatedPages.map((pg, idx) => (
                  <button
                    key={pg.pageNumber}
                    onClick={() => setPageIndex(idx)}
                    className={`px-2.5 py-1 rounded font-mono text-xs font-bold shrink-0 border transition-all ${
                      idx === pageIndex ||
                      (cbzSpreadMode === 'spread' && idx === pageIndex + 1)
                        ? 'bg-neo-vermilion text-white border-white'
                        : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {String(pg.pageNumber).padStart(3, '0')}.png
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ENGINE 4: EPUB 3.3 E-READER ENGINE */}
          {engine === 'epub' && (
            <div
              className="flex-1 overflow-auto p-6 flex justify-center transition-colors duration-200"
              style={{ backgroundColor: epubThemeColors.bg }}
            >
              <div className="w-full max-w-3xl h-full rounded-xl border-neo-thick border-neo-ink shadow-neo-lg overflow-hidden">
                <iframe
                  srcDoc={epubSrcDoc}
                  title="EPUB 3.3 E-Reader Engine"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
