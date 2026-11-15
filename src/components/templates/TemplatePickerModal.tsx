import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { STARTER_TEMPLATES, type StarterTemplate } from '../../data/templates';
import { X, Sparkles, Check, ArrowRight, LayoutTemplate } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ isOpen, onClose }) => {
  const { loadProjectFromDb, pushHistorySnapshot } = useEditorStore();

  if (!isOpen) return null;

  const handleSelectTemplate = async (template: StarterTemplate) => {
    if (confirm(`Load "${template.name}"? This will replace your current workspace project.`)) {
      pushHistorySnapshot();
      useEditorStore.setState({
        project: JSON.parse(JSON.stringify(template.project)),
      });
      await useEditorStore.getState().saveProjectToDb();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <LayoutTemplate className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-neo-ink">
                Editorial Starter Templates
              </h3>
              <p className="text-xs font-mono text-gray-500">
                Pre-configured mobile-first reflow layouts designed for real reading devices
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

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {STARTER_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl)}
              className="group bg-white border-neo border-neo-ink rounded-xl overflow-hidden shadow-neo hover:shadow-neo-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all flex flex-col"
            >
              {/* Thumbnail with Badge */}
              <div className="h-44 w-full overflow-hidden bg-gray-900 relative border-b-neo border-neo-ink">
                <img
                  src={tmpl.thumbnail}
                  alt={tmpl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                />
                <span className="absolute top-2.5 left-2.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-neo-yellow text-neo-ink px-2 py-0.5 rounded border border-neo-ink shadow-neo-sm">
                  {tmpl.badge}
                </span>
              </div>

              {/* Card Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase text-gray-400 block mb-1">
                    {tmpl.category}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-neo-ink mb-1.5 leading-snug group-hover:text-neo-vermilion transition-colors">
                    {tmpl.name}
                  </h4>
                  <p className="font-sans text-xs text-gray-600 leading-relaxed mb-4">
                    {tmpl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-neo-ink group-hover:text-neo-vermilion flex items-center gap-1">
                    Load Template
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {tmpl.project.chapters.length} Chapter
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
