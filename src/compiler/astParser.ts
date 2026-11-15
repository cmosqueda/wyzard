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
  if (!craftJson || craftJson.trim() === '' || craftJson.trim() === '{}') {
    return [
      {
        id: 'fallback-hero',
        type: 'HeroSpreadBlock',
        props: {
          kicker: 'CHAPTER OPENER',
          title: 'The Art of Reflowable Design',
          subtitle:
            'Bridging the chasm between responsive mobile readability and rich magazine art-direction.',
          author: 'Wyzard Editorial',
          backgroundImage:
            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
          overlayOpacity: 45,
          height: 'md',
          cardTheme: 'neo-white',
        },
        children: [],
      },
      {
        id: 'fallback-body',
        type: 'TypographyBlock',
        props: {
          variant: 'body',
          fontFamily: 'serif',
          dropCap: true,
          text: 'Digital publishing has long been stranded between two extremes. On one hand, fixed-layout formats lock designs to rigid screen proportions. On the other hand, traditional reflowable e-books strip away every trace of visual art direction.',
        },
        children: [],
      },
      {
        id: 'fallback-callout',
        type: 'CalloutCardBlock',
        props: {
          accent: 'yellow',
          title: 'EDITORIAL FIELD NOTE',
          content:
            'Switch between Mobile, Tablet, Laptop, Comic, and Square ratios in the top bar to preview how your layout adapts.',
        },
        children: [],
      },
    ];
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
