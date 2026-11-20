import React, { useMemo, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { notify } from '../../store/toastStore';
import { runPreflightValidation } from '../../compiler/preflight';
import { exportToEpub } from '../../compiler/epubCompiler';
import {
  SCREEN_RATIO_PRESETS,
  type ScreenRatioKey,
  paginateProjectForViewport,
  exportToHtmlZipPack,
  exportToPaginatedPdf,
  exportToCbz,
} from '../../compiler/multiFormatExporter';
import type { ReaderEngineMode } from '../preview/WebReaderModal';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  BookOpen,
  Package,
  Loader2,
  FileArchive,
  FileText,
  Film,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWebReader: (engine?: ReaderEngineMode, ratio?: ScreenRatioKey) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onOpenWebReader,
}) => {
  const { project } = useEditorStore();
  const [selectedRatio, setSelectedRatio] = useState<ScreenRatioKey>('tablet');
  const isFixed = project.layoutMode === 'fixed';
  const ratioShortLabel =
    isFixed && project.pageSetup
      ? `Page ${Math.round(project.pageSetup.width)}×${Math.round(project.pageSetup.height)}`
      : SCREEN_RATIO_PRESETS[selectedRatio].shortLabel;
  const ratioLongLabel =
    isFixed && project.pageSetup
      ? `your ${Math.round(project.pageSetup.width)}×${Math.round(project.pageSetup.height)} px page size`
      : SCREEN_RATIO_PRESETS[selectedRatio].label;
  const [busyFormat, setBusyFormat] = useState<'epub' | 'zip' | 'pdf' | 'cbz' | null>(null);
  const [cbzProgress, setCbzProgress] = useState<string>('');

  const paginatedPages = useMemo(() => {
    if (!isOpen) return [];
    return paginateProjectForViewport(project, selectedRatio);
  }, [isOpen, project, selectedRatio]);

  if (!isOpen) return null;

  const preflight = runPreflightValidation(project);
  const protectedAssetsCount = paginatedPages.reduce(
    (acc, pg) => acc + pg.items.filter((i) => i.movedToAvoidCut).length,
    0
  );

  const handleExportEpub = async () => {
    if (!preflight.canExport) {
      notify({
        type: 'error',
        title: 'Pre-Flight Validation Failed',
        message: 'Please resolve critical EPUB validation errors before packaging.',
      });
      return;
    }
    setBusyFormat('epub');
    try {
      await exportToEpub(project);
      notify({
        type: 'success',
        title: 'EPUB 3.3 Export Complete',
        message: `"${project.title}" has been packaged as a valid .epub file.`,
      });
    } catch (err) {
      console.error('Failed to export EPUB:', err);
      notify({
        type: 'error',
        title: 'EPUB Export Error',
        message: 'An error occurred during EPUB packaging.',
      });
    } finally {
      setBusyFormat(null);
    }
  };

  const handleExportHtmlZip = async () => {
    setBusyFormat('zip');
    try {
      await exportToHtmlZipPack(project);
      notify({
        type: 'success',
        title: 'HTML .ZIP Pack Exported',
        message: 'Included index.html, chapters, stylesheet, reader runtime, and assets.',
      });
    } catch (err) {
      console.error('Failed to export HTML ZIP Pack:', err);
      notify({
        type: 'error',
        title: 'HTML Pack Export Error',
        message: 'An error occurred while packaging the HTML ZIP Pack.',
      });
    } finally {
      setBusyFormat(null);
    }
  };

  const handleExportPdf = () => {
    setBusyFormat('pdf');
    try {
      exportToPaginatedPdf(project, selectedRatio);
      notify({
        type: 'success',
        title: 'Paginated PDF Page-Grab Ready',
        message: `Generated ${paginatedPages.length} asset-safe pages for ${ratioShortLabel}.`,
      });
    } finally {
      setBusyFormat(null);
    }
  };

  const handleExportCbz = async () => {
    setBusyFormat('cbz');
    setCbzProgress('Starting...');
    try {
      await exportToCbz(project, selectedRatio, (cur, total) => {
        setCbzProgress(`Plate ${cur}/${total}`);
      });
      notify({
        type: 'success',
        title: '.CBZ Comic Archive Exported',
        message: `Packaged ${paginatedPages.length} high-DPI comic plates + ComicInfo.xml.`,
      });
    } catch (err) {
      console.error('Failed to export CBZ:', err);
      notify({
        type: 'error',
        title: 'CBZ Export Error',
        message: 'An error occurred during CBZ comic packaging.',
      });
    } finally {
      setBusyFormat(null);
      setCbzProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <Package className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-neo-ink">
                Multi-Target Publication Exporter &amp; Reader Engines
              </h3>
              <p className="text-xs font-mono text-gray-500">
                Export to HTML .ZIP Pack, Paginated Page-Grab PDF, .CBZ Comic Archive, or .EPUB 3.3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neo-ink hover:bg-neo-vermilion hover:text-white rounded border-neo border-neo-ink shadow-neo-sm transition-all"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5">
          {isFixed && project.pageSetup ? (
            <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-heading font-bold text-sm text-neo-ink block">
                    Fixed-layout book · {Math.round(project.pageSetup.width)} × {Math.round(project.pageSetup.height)} px pages
                  </span>
                  <span className="font-mono text-[11px] text-gray-500">
                    Every page you designed exports exactly as laid out, with its header, footer and margins. Change the size in Page setup.
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neo-teal/20 border border-neo-ink font-mono text-[11px] font-bold text-neo-ink">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{project.chapters.length} Pages</span>
                </span>
              </div>
              <p className="font-mono text-[10px] text-gray-500 leading-snug">
                HTML, PDF and CBZ keep the fixed pages. EPUB currently exports each page as a reflowable chapter; fixed-layout EPUB is planned.
              </p>
            </div>
          ) : (
          <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-heading font-bold text-sm text-neo-ink block">
                  Target Viewport Ratio (For Page-Grab PDF &amp; .CBZ Comic Plates)
                </span>
                <span className="font-mono text-[11px] text-gray-500">
                  Exports discrete per-page grabs rather than a continuous scroll. Assets never clip across page breaks.
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neo-teal/20 border border-neo-ink font-mono text-[11px] font-bold text-neo-ink">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {paginatedPages.length} Pages • {protectedAssetsCount} Assets Protected from Page Cuts
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.values(SCREEN_RATIO_PRESETS).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedRatio(preset.key)}
                  className={`p-2.5 rounded-lg border-neo border-neo-ink text-left transition-all ${
                    selectedRatio === preset.key
                      ? 'bg-neo-yellow text-neo-ink shadow-neo-sm font-bold'
                      : 'bg-neo-bg text-gray-700 hover:bg-white'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">{preset.shortLabel}</div>
                  <div className="font-mono text-[10px] opacity-75">
                    {preset.width} × {preset.height}px
                  </div>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* 4 Export Format Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. HTML .ZIP Pack */}
            <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                    <FileArchive className="w-4 h-4 text-neo-ink" />
                    <span>1. HTML .ZIP Publication Pack</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neo-yellow border border-neo-ink">
                    OFFLINE WEB BUNDLE
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Packages <code>index.html</code>, individual <code>chapters/*.html</code>,{' '}
                  <code>assets/style.css</code>, <code>assets/reader.js</code>,{' '}
                  <code>assets/credits.json</code>, and local media assets into a portable{' '}
                  <code>.zip</code> folder.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onClose();
                    onOpenWebReader('web', selectedRatio);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-bg hover:bg-white font-mono text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>In-App Reader</span>
                </button>
                <button
                  onClick={handleExportHtmlZip}
                  disabled={busyFormat !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-yellow text-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  {busyFormat === 'zip' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export .ZIP Pack</span>
                </button>
              </div>
            </div>

            {/* 2. Paginated Page-Grab PDF */}
            <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                    <FileText className="w-4 h-4 text-neo-teal" />
                    <span>2. Paginated Page-Grab .PDF</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neo-teal/30 border border-neo-ink">
                    {ratioShortLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Captures discrete per-page grabs calibrated to{' '}
                  <strong>{ratioLongLabel}</strong>. Smart asset
                  placement guarantees illustrations and artboards are pushed to the next page if
                  they would be cut off.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onClose();
                    onOpenWebReader('pdf', selectedRatio);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-bg hover:bg-white font-mono text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Page-Grab Engine</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={busyFormat !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-teal text-neo-ink font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .PDF ({paginatedPages.length}p)</span>
                </button>
              </div>
            </div>

            {/* 3. .CBZ Comic Book Archive */}
            <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                    <Film className="w-4 h-4 text-neo-vermilion" />
                    <span>3. .CBZ Comic Book Archive</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neo-vermilion text-white border border-neo-ink">
                    COMIC READER FORMAT
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Rasterizes each non-cut page grab into high-DPI comic plates (
                  <code>001.png</code>, <code>002.png</code>, ...) bundled with{' '}
                  <code>ComicInfo.xml</code> metadata inside a standard <code>.cbz</code> archive.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onClose();
                    onOpenWebReader('cbz', selectedRatio);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-bg hover:bg-white font-mono text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Comic Reader</span>
                </button>
                <button
                  onClick={handleExportCbz}
                  disabled={busyFormat !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-vermilion text-white font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  {busyFormat === 'cbz' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{cbzProgress || 'Rendering...'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export .CBZ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. .EPUB 3.3 Standard E-Book */}
            <div className="p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                    <BookOpen className="w-4 h-4 text-neo-violet" />
                    <span>4. Standard .EPUB 3.3 E-Book</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neo-violet text-white border border-neo-ink">
                    REFLOWABLE E-INK
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Compiles strict XHTML 1.1 chapters, OPF package manifest, NCX/Nav spine, and
                  static fallbacks for Apple Books, Kindle, and Kobo devices.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onClose();
                    onOpenWebReader('epub', selectedRatio);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink bg-neo-bg hover:bg-white font-mono text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>EPUB E-Reader</span>
                </button>
                <button
                  onClick={handleExportEpub}
                  disabled={!preflight.canExport || busyFormat !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border-neo border-neo-ink font-mono text-xs font-bold shadow-neo-sm transition-all ${
                    preflight.canExport
                      ? 'bg-neo-violet text-white hover:translate-x-[-1px] hover:translate-y-[-1px]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {busyFormat === 'epub' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export .EPUB</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pre-Flight Validation Checklist */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">
                Pre-Flight Validation ({preflight.passCount} Passed • {preflight.warningCount}{' '}
                Warnings • {preflight.errorCount} Errors)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {preflight.items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex items-start gap-2.5"
                >
                  {item.level === 'pass' && (
                    <CheckCircle2 className="w-4 h-4 text-neo-teal shrink-0 mt-0.5" strokeWidth={2.5} />
                  )}
                  {item.level === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-neo-yellow shrink-0 mt-0.5" strokeWidth={2.5} />
                  )}
                  {item.level === 'error' && (
                    <AlertOctagon className="w-4 h-4 text-neo-vermilion shrink-0 mt-0.5" strokeWidth={2.5} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-bold text-xs text-neo-ink block">
                      {item.title}
                    </span>
                    <p className="font-sans text-[11px] text-gray-600 mt-0.5">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
