import React from 'react';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { WorkspaceManager } from './components/workspace/WorkspaceManager';
import { ToastContainer, WyzardErrorBoundary } from './components/ui/ToastContainer';
import { useEditorStore } from './store/editorStore';
import { BookOpen, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const isWorkspaceOpen = useEditorStore((state) => state.isWorkspaceOpen);
  const isTransitioning = useEditorStore((state) => state.isTransitioning);
  const transitionLabel = useEditorStore((state) => state.transitionLabel);

  return (
    <WyzardErrorBoundary>
      <ToastContainer />

      {isTransitioning && (
        <div className="fixed inset-0 z-[90] bg-neo-bg/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg px-6 py-5 flex items-center gap-3.5">
            <div className="p-2 bg-neo-yellow rounded-xl border-2 border-neo-ink shadow-neo-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-neo-ink animate-spin" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                <BookOpen className="w-4 h-4 text-neo-vermilion" />
                <span>Wyzard Studio</span>
              </div>
              <p className="font-mono text-xs text-gray-600 mt-0.5">
                {transitionLabel || 'Loading workspace...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isWorkspaceOpen ? <WorkspaceManager /> : <EditorWorkspace />}
    </WyzardErrorBoundary>
  );
};

export default App;
