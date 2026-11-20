import type { BookProject, Chapter, PageKind } from '../types/ast';
import { createFixedPageCraftJson } from './index';

/**
 * Ready-made "book feature" pages for fixed-layout books: cover, title page, copyright page,
 * dedication, preface, table of contents and back cover.
 */

export interface BookPageKit {
  kind: Exclude<PageKind, 'content'>;
  label: string;
  description: string;
  /** Only one of these can exist per book */
  unique: boolean;
}

export const BOOK_PAGE_KITS: BookPageKit[] = [
  { kind: 'cover', label: 'Front cover', description: 'Full-bleed cover with title, author and image', unique: true },
  { kind: 'title', label: 'Title page', description: 'Title, subtitle, author and publisher', unique: true },
  { kind: 'copyright', label: 'Copyright page', description: 'Publisher, ISBN, edition, rights and disclaimer', unique: true },
  { kind: 'dedication', label: 'Dedication', description: 'A short dedication', unique: true },
  { kind: 'preface', label: 'Preface / foreword', description: 'Opening text, listed in the contents', unique: false },
  { kind: 'toc', label: 'Table of contents', description: 'Automatic, with page numbers and links', unique: false },
  { kind: 'glossary', label: 'Glossary', description: 'Terms and definitions from Page setup', unique: true },
  { kind: 'index', label: 'Index', description: 'Terms with the pages they appear on', unique: true },
  { kind: 'backCover', label: 'Back cover', description: 'Full-bleed blurb, publisher and ISBN', unique: true },
];

/** Order of the front matter, used to decide where a new book page is inserted. */
export const FRONT_MATTER_ORDER: PageKind[] = ['cover', 'title', 'copyright', 'dedication', 'preface', 'toc'];

/** Order of the back matter, before the back cover. */
export const BACK_MATTER_ORDER: PageKind[] = ['glossary', 'index'];

type NodeSpec = { id: string; type: string; props: Record<string, unknown> };

export function pageJson(children: NodeSpec[]): string {
  const root = JSON.parse(createFixedPageCraftJson());
  root.ROOT.nodes = children.map((c) => c.id);
  children.forEach((c) => {
    root[c.id] = {
      type: { resolvedName: c.type },
      isCanvas: false,
      props: c.props,
      displayName: c.type,
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    };
  });
  return JSON.stringify(root);
}

export const heading = (id: string, text: string, color = '#111111'): NodeSpec => ({
  id,
  type: 'TypographyBlock',
  props: { variant: 'h1', fontFamily: 'heading', htmlContent: text, color, keepTogetherOnPageTurn: true },
});

export function createBookPage(kind: Exclude<PageKind, 'content'>, project: BookProject): Chapter {
  const now = Date.now();
  const id = 'pg-' + now.toString(36) + Math.random().toString(36).slice(2, 5);
  const accent = project.pageSetup?.accentColor || '#2563EB';
  const base: Chapter = {
    id,
    title: 'Page',
    slug: 'page',
    order: project.chapters.length + 1,
    craftStateJson: '',
    backgroundColor: '#FFFFFF',
    kind,
    createdAt: now,
    updatedAt: now,
  };

  switch (kind) {
    case 'cover':
      return {
        ...base,
        title: 'Front cover',
        slug: 'cover',
        fullBleed: true,
        backgroundColor: '#0F172A',
        craftStateJson: pageJson([
          { id: 'cover', type: 'TitlePageBlock', props: { variant: 'cover', textColor: '#FFFFFF', align: 'center', titleSize: 44, overlay: 0 } },
        ]),
      };
    case 'title':
      return {
        ...base,
        title: 'Title page',
        slug: 'title-page',
        hideHeader: true,
        hideFooter: true,
        craftStateJson: pageJson([{ id: 'title', type: 'TitlePageBlock', props: { variant: 'title', textColor: '#111111', align: 'center', titleSize: 36 } }]),
      };
    case 'copyright':
      return {
        ...base,
        title: 'Copyright',
        slug: 'copyright',
        hideHeader: true,
        hideFooter: true,
        craftStateJson: pageJson([{ id: 'copyright', type: 'CopyrightBlock', props: { fontSize: 11, showLegalBox: true, showDisclaimer: true } }]),
      };
    case 'dedication':
      return {
        ...base,
        title: 'Dedication',
        slug: 'dedication',
        hideHeader: true,
        hideFooter: true,
        craftStateJson: pageJson([
          { id: 'dedication', type: 'TitlePageBlock', props: { variant: 'dedication', textColor: '#111111', align: 'center', text: 'For everyone who reads this.' } },
        ]),
      };
    case 'preface':
      return {
        ...base,
        title: 'Preface',
        slug: 'preface',
        hideHeader: true,
        hideFooter: true,
        tocEntry: { level: 1 },
        craftStateJson: pageJson([
          heading('h', 'PREFACE', accent),
          {
            id: 'b',
            type: 'TypographyBlock',
            props: {
              variant: 'body',
              fontFamily: 'sans',
              textAlign: 'justify',
              htmlContent: 'Write a few words to your readers here: why this book exists, who it is for, and how to use it.',
            },
          },
        ]),
      };
    case 'toc':
      return {
        ...base,
        title: 'Table of contents',
        slug: 'table-of-contents',
        hideHeader: true,
        hideFooter: true,
        craftStateJson: pageJson([heading('h', 'TABLE OF CONTENTS', accent), { id: 'toc', type: 'TocBlock', props: { maxLevel: 3, from: 1, limit: 0, showPageNumbers: true, leader: 'dots', fontSize: 13 } }]),
      };
    case 'glossary':
    case 'index': {
      const isIndex = kind === 'index';
      return {
        ...base,
        title: isIndex ? 'Index' : 'Glossary',
        slug: isIndex ? 'index' : 'glossary',
        tocEntry: { level: 1 },
        craftStateJson: pageJson([
          heading('h', isIndex ? 'INDEX' : 'GLOSSARY', accent),
          { id: 'terms', type: 'TermsBlock', props: { variant: isIndex ? 'index' : 'glossary', fontSize: 12, groupByLetter: true, columns: isIndex ? 2 : 1 } },
        ]),
      };
    }
    case 'backCover':
      return {
        ...base,
        title: 'Back cover',
        slug: 'back-cover',
        fullBleed: true,
        backgroundColor: '#0F172A',
        craftStateJson: pageJson([{ id: 'back', type: 'TitlePageBlock', props: { variant: 'back', textColor: '#FFFFFF', align: 'left' } }]),
      };
  }
}
