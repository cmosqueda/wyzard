import type { BookProject } from '../types/ast';

/**
 * Ambient information for block renderers during an export: the project (so smart blocks like the
 * table of contents can read the whole book) and how a link to another page is written for the
 * current output (`#page-3` inside one document, `chapter-3.html` in the HTML pack, `chapter-3.xhtml` in EPUB).
 */
export interface ExportContext {
  project?: BookProject;
  hrefFor: (pageIndex: number, pageId: string) => string;
}

let current: ExportContext = { hrefFor: (i) => `#page-${i + 1}` };

export function getExportContext(): ExportContext {
  return current;
}

export function withExportContext<T>(patch: Partial<ExportContext>, fn: () => T): T {
  const previous = current;
  current = { ...previous, ...patch };
  try {
    return fn();
  } finally {
    current = previous;
  }
}
