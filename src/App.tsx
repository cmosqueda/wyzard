import React, { useEffect } from 'react';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { WorkspaceManager } from './components/workspace/WorkspaceManager';
import { ToastContainer, WyzardErrorBoundary } from './components/ui/ToastContainer';
import { useEditorStore } from './store/editorStore';
import { Loader2 } from 'lucide-react';
import { WyzardLogo } from './components/ui/WyzardLogo';

export const App: React.FC = () => {
  const isWorkspaceOpen = useEditorStore((state) => state.isWorkspaceOpen);
  const isTransitioning = useEditorStore((state) => state.isTransitioning);
  const transitionLabel = useEditorStore((state) => state.transitionLabel);
  const isRestoring = useEditorStore((state) => state.isRestoring);

  // Return to the same project / chapter / view after a refresh
  useEffect(() => {
    useEditorStore.getState().restoreSession();
  }, []);

  // Make sure the latest edits are written when the tab is hidden, closed or refreshed
  useEffect(() => {
    const flush = () => {
      const st = useEditorStore.getState();
      if (!st.isWorkspaceOpen && !st.isRestoring) st.saveProjectToDb();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flush();
      // Only interrupt if a save is still in flight
      if (useEditorStore.getState().isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <WyzardErrorBoundary>
      <ToastContainer />

      {(isTransitioning || isRestoring) && (
        <div className="fixed inset-0 z-[90] bg-neo-bg/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg px-6 py-5 flex items-center gap-3.5">
            <div className="relative">
              <WyzardLogo size={44} />
              <Loader2 className="absolute -right-2 -bottom-2 w-5 h-5 p-0.5 rounded-full bg-white border-2 border-neo-ink text-neo-ink animate-spin" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-heading font-bold text-sm text-neo-ink">
                <span>Wyzard Studio</span>
              </div>
              <p className="font-mono text-xs text-gray-600 mt-0.5">
                {isRestoring ? 'Restoring your session...' : transitionLabel || 'Loading workspace...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isRestoring ? (
        <div className="h-screen w-screen bg-neo-bg" aria-busy="true" />
      ) : isWorkspaceOpen ? (
        <WorkspaceManager />
      ) : (
        <EditorWorkspace />
      )}
    </WyzardErrorBoundary>
  );
};

export default App;
