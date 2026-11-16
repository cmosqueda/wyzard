import React, { useEffect } from 'react';
import { BookKey, X } from 'lucide-react';
import { ProjectInspector } from './rightRail/ProjectInspector';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Book metadata, credits and canvas design system — opened from the top panel. */
export const MetadataModal: React.FC<MetadataModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Book metadata"
      >
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <BookKey className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <h3 className="font-heading font-bold text-base text-neo-ink">Book Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neo-vermilion hover:text-white rounded border border-neo-ink transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ProjectInspector />
        </div>
      </div>
    </div>
  );
};
