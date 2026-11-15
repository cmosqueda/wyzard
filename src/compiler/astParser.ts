export interface ParsedBlockNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children: ParsedBlockNode[];
}

/**
 * Parses a Craft.js serialized JSON string into a hierarchical block tree.
 */
export function parseCraftState(craftJson: string): ParsedBlockNode[] {
  if (!craftJson || craftJson.trim() === '') {
    return [];
  }

  try {
    const rawTree = JSON.parse(craftJson);
    if (!rawTree || typeof rawTree !== 'object') return [];

    const rootNode = rawTree['ROOT'];
    if (!rootNode) return [];

    const getNodeChildren = (nodeId: string): ParsedBlockNode[] => {
      const node = rawTree[nodeId];
      if (!node) return [];

      const childIds: string[] = [];
      if (Array.isArray(node.nodes)) {
        childIds.push(...node.nodes);
      }
      if (node.linkedNodes && typeof node.linkedNodes === 'object') {
        childIds.push(...Object.values(node.linkedNodes) as string[]);
      }

      return childIds.map((cid) => {
        const childRaw = rawTree[cid];
        const typeName =
          childRaw?.type?.resolvedName ||
          (typeof childRaw?.type === 'string' ? childRaw.type : 'UnknownBlock');

        return {
          id: cid,
          type: typeName,
          props: childRaw?.props || {},
          children: getNodeChildren(cid),
        };
      });
    };

    return getNodeChildren('ROOT');
  } catch (err) {
    console.error('Failed to parse Craft.js state JSON:', err);
    return [];
  }
}
