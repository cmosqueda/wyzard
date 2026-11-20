import type { BookProject } from '../types/ast';
import { getPrintedNumber } from './pageLayout';

/** Content for the smart "book feature" blocks, derived from the project metadata. */

export interface TitlePageData {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  description: string;
  isbn: string;
}

export function getTitlePageData(project: BookProject): TitlePageData {
  const m = project.metadata;
  return {
    title: m.title || project.title,
    subtitle: m.subtitle || '',
    author: m.author || '',
    publisher: m.publisher || '',
    description: m.description || '',
    isbn: m.isbn || '',
  };
}

export interface CopyrightData {
  copyrightLine: string;
  publisherLine: string;
  isbnLine: string;
  editionLine: string;
  classification: string;
  contact: string;
  rightsStatement: string;
  disclaimer: string;
  author: string;
}

export function getCopyrightData(project: BookProject): CopyrightData {
  const m = project.metadata;
  const holder = m.copyrightHolder || m.publisher || m.author || '';
  const year = m.copyrightYear || String(new Date(project.createdAt || Date.now()).getFullYear());
  return {
    copyrightLine: holder ? `© ${year} ${holder}` : `© ${year}`,
    publisherLine: m.publisher ? `Published by ${m.publisher}` : '',
    isbnLine: m.isbn ? `ISBN ${m.isbn}` : '',
    editionLine: m.edition || '',
    classification: m.classification || '',
    contact: m.contact || '',
    rightsStatement: m.rightsStatement || '',
    disclaimer: m.disclaimer || '',
    author: m.author || '',
  };
}

export const DEFAULT_RIGHTS_STATEMENT =
  'All rights reserved. No part of this book may be copied, reproduced or distributed in any form without the written permission of the publisher and the author.';

// ---------------------------------------------------------------- index & glossary
const NON_TEXT_PROP = /^(https?:|data:|blob:|#|\/|rgb|hsl)/i;
const TEXT_SKIP_KEYS = new Set(['src', 'url', 'href', 'color', 'backgroundColor', 'fontFamily', 'variant', 'align', 'textAlign']);

function collectStrings(value: unknown, out: string[], key = ''): void {
  if (typeof value === 'string') {
    if (!TEXT_SKIP_KEYS.has(key) && value.length > 1 && !NON_TEXT_PROP.test(value)) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out, key));
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => collectStrings(v, out, k));
  }
}

/** Plain text of everything typed on a page (used to find where index terms occur). */
export function getPageText(craftStateJson: string): string {
  if (!craftStateJson) return '';
  try {
    const tree = JSON.parse(craftStateJson) as Record<string, { props?: unknown; type?: { resolvedName?: string } }>;
    const parts: string[] = [];
    Object.values(tree).forEach((node) => {
      const kind = node?.type?.resolvedName;
      // Smart blocks list other pages' content; they are not a place where a term is "used"
      if (kind === 'TocBlock' || kind === 'TermsBlock' || kind === 'CopyrightBlock') return;
      collectStrings(node?.props, parts);
    });
    return parts.join(' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  } catch {
    return '';
  }
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface IndexRange {
  /** Printed label: "12" or "12–14" (consecutive pages) */
  label: string;
  pageIndex: number;
  pageId: string;
}
export interface IndexEntry {
  id: string;
  term: string;
  /** 0 = main entry, 1 = sub-entry under a main entry */
  level: 0 | 1;
  ranges: IndexRange[];
  /** Free text from the term's "see also" field, split at commas */
  seeAlso: string[];
}

/** Pages whose text (or page tags) mention the term, as a sorted list of page indexes. */
function pagesForTerm(
  project: BookProject,
  term: NonNullable<BookProject['terms']>[number],
  texts: string[]
): number[] {
  const words = [term.term, ...(term.aliases || '').split(',')].map((w) => w.trim()).filter(Boolean);
  const re =
    term.auto === false || words.length === 0
      ? null
      : new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map(escapeRe).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
  const out: number[] = [];
  project.chapters.forEach((c, i) => {
    if (c.noIndex) return;
    const tagged = !!c.indexTerms?.includes(term.id);
    if (tagged || (re && texts[i] && re.test(texts[i]))) out.push(i);
  });
  return out;
}

/** Merges runs of consecutive pages into ranges ("12–14"); every range links to its first page. */
export function toIndexRanges(project: BookProject, pages: number[]): IndexRange[] {
  const ranges: IndexRange[] = [];
  let i = 0;
  while (i < pages.length) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    const first = getPrintedNumber(project, pages[i]) || String(pages[i] + 1);
    const last = getPrintedNumber(project, pages[j]) || String(pages[j] + 1);
    ranges.push({
      label: j > i && first !== last ? `${first}–${last}` : first,
      pageIndex: pages[i],
      pageId: project.chapters[pages[i]].id,
    });
    i = j + 1;
  }
  return ranges;
}

const byTerm = (a: { term: string }, b: { term: string }) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' });

/**
 * Alphabetical index with sub-entries: main entries sorted, each followed by its sub-entries. A term is listed when
 * it appears on pages (found in the text, or tagged on the page), or has "see also" text, or has listed sub-entries.
 */
export function buildIndexEntries(project: BookProject): IndexEntry[] {
  const terms = (project.terms || []).filter((t) => t.term.trim() && t.inIndex !== false);
  if (terms.length === 0) return [];
  const texts = project.chapters.map((c) => {
    const skip = c.kind && !['content', 'preface'].includes(c.kind);
    return skip || c.noIndex ? '' : getPageText(c.craftStateJson);
  });
  const make = (t: (typeof terms)[number], level: 0 | 1): IndexEntry => ({
    id: t.id,
    term: t.term.trim(),
    level,
    ranges: toIndexRanges(project, pagesForTerm(project, t, texts)),
    seeAlso: (t.seeAlso || '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  const ids = new Set(terms.map((t) => t.id));
  const isChild = (t: (typeof terms)[number]) => !!t.parent && t.parent !== t.id && ids.has(t.parent);
  const mains = terms.filter((t) => !isChild(t));

  const out: IndexEntry[] = [];
  for (const m of mains) {
    const entry = make(m, 0);
    const kids = terms
      .filter((t) => isChild(t) && t.parent === m.id)
      .map((t) => make(t, 1))
      .filter((k) => k.ranges.length > 0 || k.seeAlso.length > 0)
      .sort(byTerm);
    if (entry.ranges.length === 0 && entry.seeAlso.length === 0 && kids.length === 0) continue;
    out.push(entry, ...kids);
  }
  // keep main entries alphabetical, each followed by its sub-entries
  const groups: IndexEntry[][] = [];
  out.forEach((e) => (e.level === 0 ? groups.push([e]) : groups[groups.length - 1].push(e)));
  return groups.sort((a, b) => byTerm(a[0], b[0])).flat();
}

export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
}

export function getGlossaryEntries(project: BookProject): GlossaryEntry[] {
  return (project.terms || [])
    .filter((t) => t.term.trim() && t.definition?.trim())
    .map((t) => ({ id: t.id, term: t.term.trim(), definition: t.definition!.trim() }))
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
}
