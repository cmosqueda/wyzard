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

export interface IndexPageRef {
  pageIndex: number;
  pageId: string;
  printed: string;
}
export interface IndexEntry {
  id: string;
  term: string;
  pages: IndexPageRef[];
}

/** Alphabetical index: every term (not turned off) with the pages whose text contains it. */
export function buildIndexEntries(project: BookProject): IndexEntry[] {
  const terms = (project.terms || []).filter((t) => t.term.trim() && t.inIndex !== false);
  if (terms.length === 0) return [];
  const texts = project.chapters.map((c) => {
    const skip = c.kind && !['content', 'preface'].includes(c.kind);
    return skip ? '' : getPageText(c.craftStateJson);
  });
  return terms
    .map((t) => {
      const word = t.term.trim();
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(word)}(?![\\p{L}\\p{N}])`, 'iu');
      const pages: IndexPageRef[] = [];
      texts.forEach((txt, i) => {
        if (txt && re.test(txt)) pages.push({ pageIndex: i, pageId: project.chapters[i].id, printed: getPrintedNumber(project, i) });
      });
      return { id: t.id, term: word, pages };
    })
    .filter((e) => e.pages.length > 0)
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
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
