/**
 * Splitting a fixed page: blocks (top-level nodes of the page) that do not fit the page body move to new pages,
 * packed in order so every continuation page fits as well. Works on a serialized Craft.js state, so it needs no
 * live editor; the caller measures the blocks.
 */

interface SerializedNode {
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  parent?: string | null;
  [key: string]: unknown;
}

const ROOT = 'ROOT';

export interface OverflowSplit {
  /** The current page without the blocks that moved */
  keepJson: string;
  /** One serialized page per continuation, in reading order */
  movedPages: string[];
  movedCount: number;
}

/** Ids of `id` and everything below it. */
function subtree(all: Record<string, SerializedNode>, id: string, out: Set<string>): void {
  if (out.has(id) || !all[id]) return;
  out.add(id);
  (all[id].nodes || []).forEach((c) => subtree(all, c, out));
  Object.values(all[id].linkedNodes || {}).forEach((c) => subtree(all, c, out));
}

/** Which blocks go on which page: greedy packing by measured height. Page 0 is the current page. */
export function packBlocks(heights: number[], gap: number, limit: number): number[][] {
  const pages: number[][] = [[]];
  let used = 0;
  heights.forEach((h, i) => {
    const current = pages[pages.length - 1];
    const need = h + (current.length > 0 ? gap : 0);
    if (current.length > 0 && used + need > limit + 1) {
      pages.push([i]);
      used = h;
    } else {
      current.push(i);
      used += need;
    }
  });
  return pages;
}

/**
 * @param ids     top-level block ids in page order
 * @param tops    top edge of each block (any unit, as long as it matches `bottoms` and `bodyHeight`)
 * @param bottoms bottom edge of each block
 * @param bodyHeight height of the page body
 * @returns the page without the overflowing blocks plus the continuation pages, or null when everything fits
 */
export function splitOverflowNodes(
  ids: string[],
  tops: number[],
  bottoms: number[],
  bodyHeight: number,
  all: Record<string, SerializedNode>
): OverflowSplit | null {
  if (ids.length < 2) return null;
  const heights = ids.map((_, i) => Math.max(0, bottoms[i] - tops[i]));
  const gaps = ids.slice(1).map((_, i) => Math.max(0, tops[i + 1] - bottoms[i]));
  const gap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  const groups = packBlocks(heights, gap, bodyHeight);
  if (groups.length < 2) return null;

  const pageJson = (indexes: number[]): string => {
    const own = new Set<string>();
    indexes.forEach((i) => subtree(all, ids[i], own));
    const out: Record<string, SerializedNode> = {};
    for (const id of own) out[id] = all[id];
    indexes.forEach((i) => {
      out[ids[i]] = { ...out[ids[i]], parent: ROOT };
    });
    out[ROOT] = { ...all[ROOT], nodes: indexes.map((i) => ids[i]) };
    return JSON.stringify(out);
  };

  return {
    keepJson: pageJson(groups[0]),
    movedPages: groups.slice(1).map(pageJson),
    movedCount: groups.slice(1).reduce((a, g) => a + g.length, 0),
  };
}
