import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, ROOT_NODE } from '@craftjs/core';
import { insertBlock, serializeBlock } from '../blockClipboard';
import { useCanvasHistory } from '../useCanvasHistory';
import { notify } from '../../../store/toastStore';
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu';
import {
  Copy,
  Trash2,
  Undo2,
  Redo2,
  ArrowUp,
  ArrowDown,
  Scissors,
  ClipboardPaste,
  ClipboardCopy,
} from 'lucide-react';

interface MenuState {
  x: number;
  y: number;
  nodeId: string | null;
  inEditable: boolean;
  hasSelection: boolean;
}

/**
 * Right-click menu for the page canvas: remove / duplicate / move / undo / redo for the block
 * under the cursor, plus cut / copy / paste while right-clicking inside editable text.
 * (Layers inside a Fixed Visual Canvas open their own menu with send-to-back / bring-to-front.)
 */
export const CanvasContextMenu: React.FC = () => {
  const { actions, query } = useEditor();
  const { undo, redo, canUndo, canRedo } = useCanvasHistory();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const close = useCallback(() => setMenu(null), []);

  /** Deepest draggable Craft node whose DOM contains `target` (null when only the page root). */
  const findNodeAt = useCallback(
    (target: HTMLElement): string | null => {
      const nodes = query.getNodes();
      let best: { id: string; dom: HTMLElement } | null = null;
      Object.keys(nodes).forEach((id) => {
        const dom = nodes[id].dom as HTMLElement | null;
        if (!dom || !dom.contains(target)) return;
        if (!best || best.dom.contains(dom)) best = { id, dom };
      });
      let id: string | null = (best as { id: string } | null)?.id ?? null;
      // Cells / containers that can't be moved themselves resolve to their parent block
      while (id && id !== ROOT_NODE && !query.node(id).isDraggable()) {
        id = nodes[id].data.parent ?? null;
      }
      return id && id !== ROOT_NODE ? id : null;
    },
    [query]
  );

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest) return;
      if (target.closest('[data-context-menu="true"]')) return;
      if (!target.closest('[data-book-page-sheet="true"]')) return;
      e.preventDefault();

      const nodeId = findNodeAt(target);
      if (nodeId) actions.selectNode(nodeId);
      const sel = window.getSelection();
      setMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId,
        inEditable: !!target.closest('[contenteditable=""], [contenteditable="true"], input, textarea'),
        hasSelection: !!sel && !sel.isCollapsed && sel.toString().length > 0,
      });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [actions, findNodeAt]);

  // ---- actions ----
  const duplicate = (id: string) => {
    try {
      const nodes = query.getNodes();
      const parentId = nodes[id].data.parent;
      if (!parentId) return;
      const index = (nodes[parentId].data.nodes || []).indexOf(id);
      const newId = insertBlock(actions, query, serializeBlock(query, id), parentId, index + 1);
      actions.selectNode(newId);
      notify({ type: 'info', title: 'Block duplicated', duration: 1600 });
    } catch (err) {
      console.warn('Could not duplicate block:', err);
      notify({ type: 'error', title: 'Could not duplicate this block' });
    }
  };

  const remove = (id: string) => {
    if (!query.node(id).isDeletable()) return;
    actions.delete(id);
  };

  const move = (id: string, dir: -1 | 1) => {
    const nodes = query.getNodes();
    const parentId = nodes[id].data.parent;
    if (!parentId) return;
    const siblings = nodes[parentId].data.nodes || [];
    const index = siblings.indexOf(id);
    const to = index + dir;
    if (to < 0 || to >= siblings.length) return;
    // Craft's move() inserts before the node at the index, so moving down needs +1
    actions.move(id, parentId, dir === 1 ? to + 1 : to);
  };

  const cut = () => document.execCommand('cut');
  const copy = () => document.execCommand('copy');
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand('insertText', false, text);
    } catch {
      notify({ type: 'info', title: 'Press Ctrl+V to paste', duration: 1800 });
    }
  };

  if (!menu) return null;

  const { nodeId } = menu;
  const nodes = query.getNodes();
  const parentId = nodeId ? nodes[nodeId]?.data.parent : null;
  const siblings = parentId ? nodes[parentId]?.data.nodes || [] : [];
  const index = nodeId ? siblings.indexOf(nodeId) : -1;
  const iconCls = 'w-3.5 h-3.5';

  const items: ContextMenuItem[] = [];

  if (menu.inEditable) {
    items.push(
      { id: 'cut', label: 'Cut', icon: <Scissors className={iconCls} />, shortcut: 'Ctrl+X', disabled: !menu.hasSelection, onClick: cut },
      { id: 'copy', label: 'Copy', icon: <ClipboardCopy className={iconCls} />, shortcut: 'Ctrl+C', disabled: !menu.hasSelection, onClick: copy },
      { id: 'paste', label: 'Paste', icon: <ClipboardPaste className={iconCls} />, shortcut: 'Ctrl+V', onClick: paste },
      { id: 'sep-text', separator: true }
    );
  }

  if (nodeId) {
    const name = nodes[nodeId]?.data.displayName || nodes[nodeId]?.data.name || 'Block';
    items.push(
      { id: 'h-block', heading: name },
      { id: 'duplicate', label: 'Copy / duplicate', icon: <Copy className={iconCls} />, onClick: () => duplicate(nodeId) },
      { id: 'up', label: 'Move up', icon: <ArrowUp className={iconCls} />, disabled: index <= 0, onClick: () => move(nodeId, -1) },
      { id: 'down', label: 'Move down', icon: <ArrowDown className={iconCls} />, disabled: index === -1 || index >= siblings.length - 1, onClick: () => move(nodeId, 1) },
      {
        id: 'remove',
        label: 'Remove element',
        icon: <Trash2 className={iconCls} />,
        shortcut: 'Del',
        danger: true,
        disabled: !query.node(nodeId).isDeletable(),
        onClick: () => remove(nodeId),
      },
      { id: 'sep-block', separator: true }
    );
  }

  items.push(
    { id: 'undo', label: 'Undo', icon: <Undo2 className={iconCls} />, shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: undo },
    { id: 'redo', label: 'Redo', icon: <Redo2 className={iconCls} />, shortcut: 'Ctrl+Y', disabled: !canRedo, onClick: redo }
  );

  return <ContextMenu x={menu.x} y={menu.y} items={items} onClose={close} />;
};
