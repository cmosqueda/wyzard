import React, { useEffect } from 'react';
import { ExternalLink, Heart, X } from 'lucide-react';
import { CREDIT_GROUPS, AUTHOR_ALIAS, REPO_URL } from '../../data/credits';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Open-source credits: the projects, fonts and services Wyzard is built on. */
export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Open-source credits"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden"
      >
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base text-neo-ink flex items-center gap-2">
              <Heart className="w-4 h-4 text-neo-vermilion" strokeWidth={2.5} fill="currentColor" />
              Open-source credits
            </h3>
            <p className="text-xs font-mono text-gray-600 mt-1 max-w-xl">
              Wyzard is free and open source, made by {AUTHOR_ALIAS}. It stands on the work of the projects below. Thank
              you to every maintainer and contributor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neo-vermilion hover:text-white rounded border border-neo-ink transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
          {CREDIT_GROUPS.map((group) => (
            <section key={group.title}>
              <h4 className="font-heading font-bold text-[11px] uppercase tracking-wider text-neo-ink mb-2">
                {group.title}
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.entries.map((c) => (
                  <li key={c.name}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block h-full bg-white border-neo border-neo-ink rounded-lg p-2.5 shadow-neo-sm hover:bg-neo-yellow/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-bold text-xs text-neo-ink">{c.name}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-neo-ink shrink-0" />
                      </div>
                      <div className="text-[10px] font-mono text-neo-vermilion font-bold mt-0.5">{c.license}</div>
                      {c.note && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{c.note}</div>}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-white border-t-neo border-neo-ink flex items-center justify-between text-[10px] font-mono text-gray-600">
          <span>Each project remains under its own license.</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-neo-ink underline">
            Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
