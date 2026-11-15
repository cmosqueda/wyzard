import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { runPreflightValidation } from '../../compiler/preflight';
import { exportToEpub } from '../../compiler/epubCompiler';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  BookOpen,
  FileCheck,
  Package,
  Loader2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWebReader: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onOpenWebReader,
}) => {
  const { project } = useEditorStore();
  const [isExportingEpub, setIsExportingEpub] = useState(false);

  if (!isOpen) return null;

  const preflight = runPreflightValidation(project);

  const handleExportEpub = async () => {
    setIsExportingEpub(true);
    try {
      await exportToEpub(project);
    } catch (err) {
      console.error('Failed to export EPUB:', err);
      alert('An error occurred during EPUB packaging.');
    } finally {
      setIsExportingEpub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <Package className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-neo-ink">
                Dual-Target Publication Exporter
              </h3>
              <p className="text-xs font-mono text-gray-500">
                Pre-Flight Validation &amp; Packaging Engine
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

        {/* Content Body: Preflight Report */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Status summary banner */}
          <div
            className={`p-3.5 rounded-lg border-neo border-neo-ink shadow-neo-sm flex items-center justify-between ${
              preflight.canExport ? 'bg-neo-teal/20 text-neo-ink' : 'bg-neo-vermilion/20 text-neo-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {preflight.canExport ? (
                <CheckCircle2 className="w-5 h-5 text-neo-teal" strokeWidth={3} />
              ) : (
                <AlertOctagon className="w-5 h-5 text-neo-vermilion" strokeWidth={3} />
              )}
              <div>
                <span className="font-heading font-bold text-sm block">
                  {preflight.canExport
                    ? 'Publication Pre-Flight Checklist Passed'
                    : 'Resolve Critical Errors Before EPUB Packaging'}
                </span>
                <span className="text-xs font-mono opacity-80">
                  {preflight.passCount} Passed • {preflight.warningCount} Warnings • {preflight.errorCount} Errors
                </span>
              </div>
            </div>

            <span className="font-mono text-xs font-bold px-2 py-1 rounded border border-neo-ink bg-white shadow-neo-sm">
              EPUB 3.3 Ready
            </span>
          </div>

          {/* Checklist Items */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">
              Pre-Flight Checks
            </span>
            {preflight.items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex items-start gap-3"
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
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs text-neo-ink">
                      {item.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border border-neo-ink ${
                        item.level === 'pass'
                          ? 'bg-neo-teal/20 text-neo-ink'
                          : item.level === 'warning'
                          ? 'bg-neo-yellow/30 text-neo-ink'
                          : 'bg-neo-vermilion/30 text-neo-vermilion'
                      }`}
                    >
                      {item.level}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-gray-600 mt-0.5">
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-white border-t-neo border-neo-ink flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenWebReader();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded border-neo border-neo-ink bg-white font-mono text-xs font-bold shadow-neo-sm hover:bg-neo-bg active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <BookOpen className="w-4 h-4 text-neo-teal" strokeWidth={2.5} />
            <span>Open Live Web Reader</span>
          </button>

          <button
            onClick={handleExportEpub}
            disabled={!preflight.canExport || isExportingEpub}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-neo border-neo-ink font-heading font-bold text-sm shadow-neo transition-all ${
              preflight.canExport && !isExportingEpub
                ? 'bg-neo-yellow text-neo-ink hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            {isExportingEpub ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neo-ink" />
                <span>Packaging EPUB 3.3...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-neo-ink" strokeWidth={2.5} />
                <span>Export &amp; Download .EPUB</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
