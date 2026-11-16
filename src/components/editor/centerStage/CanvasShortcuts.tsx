import React, { useEffect, useRef } from 'react';
import { useEditor, ROOT_NODE } from '@craftjs/core';
import { useEditorStore } from '../../../store/editorStore';
import { notify } from '../../../store/toastStore';
import { saveAsset } from '../../../db/assets';
import { TypographyBlock } from '../../blocks/TypographyBlock';
import { ImageBlock } from '../../blocks/ImageBlock';
import {
  BLOCK_MIME,
  insertBlock,
  isModalOpen,
  isTypingTarget,
  serializeBlock,
} from '../blockClipboard';
import { useCanvasHistory } from '../useCanvasHistory';

const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const IMAGE_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i;

/**
 * Keyboard shortcuts for the page canvas (rendered inside <Editor>):
 *   Delete / Backspace  remove the selected block
 *   Ctrl+C / Ctrl+V     copy / paste blocks (also pastes text and images from the system clipboard)
 *   Ctrl+D              duplicate the selected block
 *   Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y)  undo / redo
 * Shortcuts stay out of the way while you type in a text field, and inside a Fixed Visual Canvas
 * the canvas handles layer-level versions of these itself.
 */
export const CanvasShortcuts: React.FC = () => {
  const { actions, query } = useEditor();
  const { undo, redo } = useCanvasHistory();
  const projectId = useEditorStore((s) => s.project.id);

  // Keep the latest callbacks without re-binding listeners on every render
  const latest = useRef({ actions, query, undo, redo, projectId });
  latest.current = { actions, query, undo, redo, projectId };

  useEffect(() => {
    const selectedBlockId = (): string | null => {
      const { query: q } = latest.current;
      const [id] = Array.from(q.getEvent('selected').all()) as string[];
      return id && id !== ROOT_NODE ? id : null;
    };

    /** Where pasted / duplicated content goes: right after the selected block, else the end of the page */
    const insertionPoint = (): { parentId: string; index: number } => {
      const { query: q } = latest.current;
      const nodes = q.getNodes();
      const sel = selectedBlockId();
      if (sel && nodes[sel]?.data.parent) {
        const parentId = nodes[sel].data.parent as string;
        return { parentId, index: (nodes[parentId].data.nodes || []).indexOf(sel) + 1 };
      }
      return { parentId: ROOT_NODE, index: (nodes[ROOT_NODE]?.data.nodes || []).length };
    };

    const canvasHasFocus = (target: EventTarget | null) =>
      !isTypingTarget(target) && !isModalOpen();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!canvasHasFocus(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const { actions: a, query: q } = latest.current;

      if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
        const id = selectedBlockId();
        if (id && q.node(id).isDeletable()) {
          e.preventDefault();
          a.delete(id);
        }
        return;
      }

      if (mod && key === 'd') {
        e.preventDefault(); // browsers use Ctrl+D for "bookmark"
        const id = selectedBlockId();
        if (!id) return;
        try {
          const { parentId, index } = insertionPoint();
          const newId = insertBlock(a, q, serializeBlock(q, id), parentId, index);
          a.selectNode(newId);
        } catch (err) {
          console.warn('Could not duplicate block:', err);
          notify({ type: 'error', title: 'Could not duplicate this block' });
        }
        return;
      }

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) latest.current.redo();
        else latest.current.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        latest.current.redo();
      }
    };

    // Copy / paste use the real clipboard events so the system clipboard stays in sync
    const onCopy = (e: ClipboardEvent) => {
      if (!canvasHasFocus(e.target)) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString()) return; // let the browser copy highlighted text
      const id = selectedBlockId();
      if (!id || !e.clipboardData) return;
      const { query: q } = latest.current;
      e.preventDefault();
      e.clipboardData.setData(BLOCK_MIME, JSON.stringify(serializeBlock(q, id)));
      e.clipboardData.setData('text/plain', (q.node(id).get().dom as HTMLElement | null)?.innerText || '');
      notify({ type: 'info', title: 'Block copied', duration: 1200 });
    };

    const onPaste = async (e: ClipboardEvent) => {
      if (!canvasHasFocus(e.target) || !e.clipboardData) return;
      const { actions: a, query: q, projectId: pid } = latest.current;
      const data = e.clipboardData;

      // 1. Blocks copied inside Wyzard (this or another project)
      const raw = data.getData(BLOCK_MIME);
      if (raw) {
        e.preventDefault();
        try {
          const clip = JSON.parse(raw);
          if (clip?.version !== 1 || !clip.nodes?.[clip.rootId]) throw new Error('bad clip');
          const { parentId, index } = insertionPoint();
          const newId = insertBlock(a, q, clip, parentId, index);
          a.selectNode(newId);
        } catch (err) {
          console.warn('Could not paste block:', err);
          notify({ type: 'error', title: 'Could not paste that block' });
        }
        return;
      }

      // 2. Images from the system clipboard
      const imageFile = Array.from(data.files || []).find((f) => f.type.startsWith('image/'));
      if (imageFile) {
        e.preventDefault();
        try {
          const src = await saveAsset(pid, imageFile);
          const tree = q.parseReactElement(<ImageBlock src={src} alt={imageFile.name} aspectRatio="16/9" />).toNodeTree();
          const { parentId, index } = insertionPoint();
          a.addNodeTree(tree, parentId, index);
          notify({ type: 'success', title: 'Pasted image', duration: 1600 });
        } catch (err) {
          console.warn('Could not paste image:', err);
        }
        return;
      }

      // 3. Plain text: an image URL becomes an image block, anything else text blocks
      const text = data.getData('text/plain').trim();
      if (!text) return;
      e.preventDefault();
      const { parentId, index } = insertionPoint();
      if (IMAGE_URL_RE.test(text)) {
        const tree = q.parseReactElement(<ImageBlock src={text} aspectRatio="16/9" />).toNodeTree();
        a.addNodeTree(tree, parentId, index);
        return;
      }
      text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((para, i) => {
          const html = escapeHtml(para).replace(/\n/g, '<br>');
          const tree = q.parseReactElement(<TypographyBlock htmlContent={html} variant="body" />).toNodeTree();
          a.addNodeTree(tree, parentId, index + i);
        });
      notify({ type: 'success', title: 'Pasted text', duration: 1600 });
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
  }, []);

  return null;
};
