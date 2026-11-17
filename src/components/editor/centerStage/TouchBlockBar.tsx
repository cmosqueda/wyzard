import React from 'react';
import { useEditor, ROOT_NODE } from '@craftjs/core';
import { ArrowUp, ArrowDown, Copy, Trash2, CornerLeftUp, X } from 'lucide-react';
import { insertBlock, serializeBlock } from '../blockClipboard';

/**
 * Floating action bar for the selected block. Touch screens have no hover, right-click or keyboard
 * shortcuts and no HTML5 drag-and-drop, so this gives tap targets for reorder / duplicate / delete /
 * select-parent. Only shown for coarse pointers (phones & tablets).
 */
export const TouchBlockBar: React.FC = () => {
  const { actions, query, selectedId, canMoveUp, canMoveDown, canDelete, parentId } = useEditor(
    (state, q) => {
      const [id] = Array.from(state.events.selected) as string[];
      if (!id || id === ROOT_NODE || !state.nodes[id]) {
        return { selectedId: null, canMoveUp: false, canMoveDown: false, canDelete: false, parentId: null };
      }
      const parent = state.nodes[id].data.parent as string | null;
      const siblings = parent ? state.nodes[parent]?.data.nodes || [] : [];
      const i = siblings.indexOf(id);
      return {
        selectedId: id as string,
        canMoveUp: i > 0,
        canMoveDown: i !== -1 && i < siblings.length - 1,
        canDelete: q.node(id).isDeletable(),
        parentId: parent && parent !== ROOT_NODE && q.node(parent).isDraggable() ? parent : null,
      };
    }
  );
  const [coarse, setCoarse] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  if (!coarse || !selectedId) return null;

  const name = (() => {
    const d = query.node(selectedId).get().data;
    return d.displayName || d.name || 'Block';
  })();

  const move = (dir: -1 | 1) => {
    const p = query.node(selectedId).get().data.parent;
    if (!p) return;
    const siblings = query.node(p).get().data.nodes || [];
    const to = siblings.indexOf(selectedId) + dir;
    if (to < 0 || to >= siblings.length) return;
    actions.move(selectedId, p, dir === 1 ? to + 1 : to);
    requestAnimationFrame(() =>
      (query.node(selectedId).get().dom as HTMLElement | null)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    );
  };

  const duplicate = () => {
    const p = query.node(selectedId).get().data.parent;
    if (!p) return;
    const index = (query.node(p).get().data.nodes || []).indexOf(selectedId);
    const id = insertBlock(actions, query, serializeBlock(query, selectedId), p, index + 1);
    actions.selectNode(id);
  };

  const btn =
    'w-11 h-11 flex items-center justify-center rounded-lg border-neo border-neo-ink bg-white text-neo-ink active:bg-neo-yellow disabled:opacity-30 disabled:active:bg-white';

  return (
    <div
      data-stage-ui="true"
      data-touch-bar="true"
      className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-neo-surface border-neo border-neo-ink rounded-2xl shadow-neo max-w-[96vw]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      role="toolbar"
      aria-label={`${name} actions`}
    >
      <span className="hidden sm:block max-w-[120px] truncate px-2 text-[11px] font-mono font-bold text-neo-ink">{name}</span>
      <button className={btn} disabled={!canMoveUp} onClick={() => move(-1)} aria-label="Move up" title="Move up">
        <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button className={btn} disabled={!canMoveDown} onClick={() => move(1)} aria-label="Move down" title="Move down">
        <ArrowDown className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button className={btn} onClick={duplicate} aria-label="Duplicate" title="Duplicate">
        <Copy className="w-5 h-5" strokeWidth={2.5} />
      </button>
      {parentId && (
        <button className={btn} onClick={() => actions.selectNode(parentId)} aria-label="Select parent" title="Select parent">
          <CornerLeftUp className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
      <button
        className={`${btn} text-neo-vermilion`}
        disabled={!canDelete}
        onClick={() => canDelete && actions.delete(selectedId)}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button className={btn} onClick={() => actions.clearEvents()} aria-label="Deselect" title="Deselect">
        <X className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
};
