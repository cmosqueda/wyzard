import { useEditor } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';

/**
 * Undo / redo for the page canvas. Block and layer edits (including everything inside a Fixed Visual
 * Canvas) are recorded by Craft.js, so those are undone first; once that history is empty the
 * project-level history (chapters, metadata, templates …) takes over.
 */
export function useCanvasHistory() {
  const { actions, query, craftCanUndo, craftCanRedo } = useEditor((_, q) => ({
    craftCanUndo: q.history.canUndo(),
    craftCanRedo: q.history.canRedo(),
  }));
  const { undo: storeUndo, redo: storeRedo, history, historyPointer } = useEditorStore();

  const canUndo = craftCanUndo || historyPointer > 0;
  const canRedo = craftCanRedo || historyPointer < history.length - 1;

  const undo = () => {
    if (query.history.canUndo()) actions.history.undo();
    else storeUndo();
  };
  const redo = () => {
    if (query.history.canRedo()) actions.history.redo();
    else storeRedo();
  };

  return { undo, redo, canUndo, canRedo };
}
