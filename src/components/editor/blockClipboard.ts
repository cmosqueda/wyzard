/**
 * Serialising / re-inserting Craft.js blocks (with their whole subtree) for copy, paste and duplicate.
 * The clipboard payload travels as JSON under a custom MIME type, so it also works between projects
 * and browser tabs; plain text of the block is placed on the clipboard for other apps.
 */
export const BLOCK_MIME = 'application/x-wyzard-blocks';
export const LAYER_MIME = 'application/x-wyzard-layers';

export interface BlockClip {
  version: 1;
  rootId: string;
  /** Serialized nodes keyed by their original ids (children / linkedNodes reference those ids) */
  nodes: Record<string, any>;
}

/** Deep, self-contained snapshot of a block and everything nested inside it. */
export function serializeBlock(query: any, id: string): BlockClip {
  const all = query.getNodes();
  const nodes: Record<string, any> = {};
  const collect = (nid: string) => {
    const serialized = query.node(nid).toSerializedNode();
    nodes[nid] = JSON.parse(JSON.stringify(serialized));
    (serialized.nodes || []).forEach(collect);
    Object.values(serialized.linkedNodes || {}).forEach((lid) => collect(lid as string));
  };
  collect(id);
  void all;
  return { version: 1, rootId: id, nodes };
}

/** Inserts a snapshot under `parentId` at `index` with fresh ids. Returns the new root id. */
export function insertBlock(
  actions: any,
  query: any,
  clip: BlockClip,
  parentId: string,
  index: number
): string {
  const stamp = Date.now().toString(36);
  const idMap: Record<string, string> = {};
  Object.keys(clip.nodes).forEach((old, i) => {
    idMap[old] = `${old === clip.rootId ? 'blk' : 'blk-child'}-${stamp}-${i}-${Math.random()
      .toString(36)
      .slice(2, 5)}`;
  });

  const parentOf: Record<string, string> = {};
  Object.entries(clip.nodes).forEach(([nid, s]: [string, any]) => {
    (s.nodes || []).forEach((c: string) => (parentOf[c] = nid));
    Object.values(s.linkedNodes || {}).forEach((c) => (parentOf[c as string] = nid));
  });

  const copyNodes: Record<string, any> = {};
  Object.entries(clip.nodes).forEach(([old, s]: [string, any]) => {
    const remapped = {
      ...s,
      props: JSON.parse(JSON.stringify(s.props || {})),
      parent: old === clip.rootId ? parentId : idMap[parentOf[old]],
      nodes: (s.nodes || []).map((c: string) => idMap[c]),
      linkedNodes: Object.fromEntries(
        Object.entries(s.linkedNodes || {}).map(([k, v]) => [k, idMap[v as string]])
      ),
    };
    copyNodes[idMap[old]] = query.parseSerializedNode(remapped).toNode((n: any) => {
      n.id = idMap[old];
    });
  });

  actions.addNodeTree({ rootNodeId: idMap[clip.rootId], nodes: copyNodes }, parentId, index);
  return idMap[clip.rootId];
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable ||
    !!el.closest?.('[contenteditable=""], [contenteditable="true"]')
  );
}

/** True while a modal dialog (export, settings, reader …) is open over the editor. */
export function isModalOpen(): boolean {
  return !!document.querySelector('.fixed.inset-0.z-50');
}
