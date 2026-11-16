import Dexie, { type Table } from 'dexie';
import type { BookProject } from '../types/ast';

export interface StoredAsset {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
  createdAt: number;
}

export interface StoredKv {
  key: string;
  value: unknown;
}

export class WyzardDatabase extends Dexie {
  projects!: Table<BookProject, string>;
  assets!: Table<StoredAsset, string>;
  kv!: Table<StoredKv, string>;

  constructor() {
    super('WyzardBookDatabase');
    this.version(1).stores({
      projects: 'id, title, updatedAt, createdAt',
      assets: 'id, projectId, name, mimeType, createdAt',
    });
    // v2: small key/value store (holds the chosen backup folder handle)
    this.version(2).stores({
      projects: 'id, title, updatedAt, createdAt',
      assets: 'id, projectId, name, mimeType, createdAt',
      kv: 'key',
    });
  }
}

export const db = new WyzardDatabase();

// Default serialized Craft.js state for a fresh chapter
export function createDefaultChapterCraftJson(
  headingText = 'Untitled Chapter',
  bodyText = 'Start writing your story here, or drag editorial blocks from the left rail onto the canvas.'
): string {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: 'CanvasContainer' },
      isCanvas: true,
      props: { backgroundColor: 'transparent', paddingY: '2rem', paddingX: '1.5rem' },
      displayName: 'Page Flow Canvas',
      custom: {},
      hidden: false,
      nodes: ['starter-heading', 'starter-body'],
      linkedNodes: {},
    },
    'starter-heading': {
      type: { resolvedName: 'TypographyBlock' },
      isCanvas: false,
      props: {
        variant: 'h1',
        fontFamily: 'serif',
        textAlign: 'left',
        text: headingText,
        keepTogetherOnPageTurn: true,
      },
      displayName: 'Editorial Typography',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
    'starter-body': {
      type: { resolvedName: 'TypographyBlock' },
      isCanvas: false,
      props: {
        variant: 'body',
        fontFamily: 'serif',
        textAlign: 'left',
        dropCap: true,
        dropCapLines: 3,
        text: bodyText,
        keepTogetherOnPageTurn: false,
      },
      displayName: 'Editorial Typography',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
  });
}

// Completely empty page (no starter blocks) — used by the unthemed 'plain' design system
export function createEmptyChapterCraftJson(): string {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: 'CanvasContainer' },
      isCanvas: true,
      props: { backgroundColor: 'transparent', paddingY: '2rem', paddingX: '1.5rem' },
      displayName: 'Page Flow Canvas',
      custom: {},
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
  });
}

// Blank layout project factory (unthemed, empty page — like Canva / other design tools)
export function createBlankProject(
  title = 'Untitled Layout Project',
  author = 'Wyzard Author',
  description = 'A custom reflowable layout created in Wyzard.'
): BookProject {
  const now = Date.now();
  const initialChapterId = 'ch-' + now;
  return {
    id: 'proj-' + now + '-' + Math.random().toString(36).slice(2, 6),
    title,
    metadata: {
      title,
      author,
      language: 'en',
      description,
    },
    activeChapterId: initialChapterId,
    chapters: [
      {
        id: initialChapterId,
        title: 'Chapter 1: Opening',
        slug: 'chapter-1',
        order: 1,
        backgroundColor: '#FFFFFF',
        craftStateJson: createEmptyChapterCraftJson(),
        createdAt: now,
        updatedAt: now,
      },
    ],
    designSystem: 'plain',
    createdAt: now,
    updatedAt: now,
  };
}

// Rich default state for Chapter 2 of the starter project
export function createChapter2StarterCraftJson(): string {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: 'CanvasContainer' },
      isCanvas: true,
      props: { backgroundColor: 'transparent', paddingY: '2rem', paddingX: '1.5rem' },
      displayName: 'Page Flow Canvas',
      custom: {},
      hidden: false,
      nodes: ['ch2-hero', 'ch2-lead', 'ch2-callout', 'ch2-divider'],
      linkedNodes: {},
    },
    'ch2-hero': {
      type: { resolvedName: 'HeroSpreadBlock' },
      isCanvas: false,
      props: {
        kicker: 'CHAPTER 02 • ADAPTIVE SYSTEMS',
        kickerColor: 'teal',
        title: 'Form & Reflow Across Viewports',
        subtitle: 'How asymmetric desktop spreads gracefully collapse into focused vertical reading streams on mobile.',
        author: 'Wyzard Editorial • Chapter 2',
        backgroundImage: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1400&q=80',
        overlayOpacity: 50,
        height: 'md',
        cardTheme: 'neo-white',
        keepTogetherOnPageTurn: true,
      },
      displayName: 'Magazine Hero Spread',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
    'ch2-lead': {
      type: { resolvedName: 'TypographyBlock' },
      isCanvas: false,
      props: {
        variant: 'body',
        fontFamily: 'serif',
        dropCap: true,
        dropCapLines: 3,
        text: 'As viewports shift from pocket screens to desktop spreads, typography and imagery adapt with intentional rhythm. Every chapter in the Publication Spine maintains its own independent Craft.js layout tree while sharing global book metadata.',
        keepTogetherOnPageTurn: false,
      },
      displayName: 'Editorial Typography',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
    'ch2-callout': {
      type: { resolvedName: 'CalloutCardBlock' },
      isCanvas: false,
      props: {
        accent: 'teal',
        icon: 'sparkles',
        title: 'SPINE ARCHITECTURE NOTE',
        content: 'Each document item in the Publication Spine compiles to its own standalone XHTML chapter inside the exported EPUB 3 package.',
        keepTogetherOnPageTurn: true,
      },
      displayName: 'Editorial Aside Box',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
    'ch2-divider': {
      type: { resolvedName: 'OrnamentDividerBlock' },
      isCanvas: false,
      props: {
        type: 'asterisms',
        spacingY: 'md',
      },
      displayName: 'Scene Break Ornament',
      custom: {},
      parent: 'ROOT',
      hidden: false,
      nodes: [],
      linkedNodes: {},
    },
  });
}

// Default starter project factory
export function createStarterProject(): BookProject {
  const now = Date.now();
  const initialChapterId = 'ch-1';
  return {
    id: 'proj-' + now,
    title: 'Editorial Odyssey: The Reflowable Art Book',
    metadata: {
      title: 'Editorial Odyssey',
      author: 'Wyzard Author',
      language: 'en',
      description: 'A mobile-first responsive editorial publication powered by Wyzard.',
    },
    activeChapterId: initialChapterId,
    designSystem: 'wyzard',
    chapters: [
      {
        id: initialChapterId,
        title: 'Chapter 1: The New Horizon',
        slug: 'chapter-1',
        order: 1,
        backgroundColor: '#FFFFFF',
        craftStateJson: '', // Initialized by default CanvasFrame starter layout
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: Form & Reflow',
        slug: 'chapter-2',
        order: 2,
        backgroundColor: '#FFFFFF',
        craftStateJson: createChapter2StarterCraftJson(),
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Ensures every chapter in a loaded project has a valid, distinct Craft.js state JSON.
 * Also repairs legacy starter projects where Chapter 2 was empty or cloned from Chapter 1.
 */
export function normalizeProjectChapters(project: BookProject): BookProject {
  const ch1Json = project.chapters[0]?.craftStateJson || '';
  const chapters = project.chapters.map((ch, idx) => {
    // If a non-first chapter has empty state, or if legacy ch-2 duplicated ch-1's starter layout
    const isLegacyClonedCh2 =
      idx > 0 &&
      ch.id === 'ch-2' &&
      ch.craftStateJson &&
      (ch.craftStateJson === ch1Json || ch.craftStateJson.includes('The Art of Reflowable Design'));

    if (idx > 0 && (!ch.craftStateJson || ch.craftStateJson.trim() === '' || isLegacyClonedCh2)) {
      return {
        ...ch,
        craftStateJson:
          ch.id === 'ch-2'
            ? createChapter2StarterCraftJson()
            : project.designSystem === 'plain'
            ? createEmptyChapterCraftJson()
            : createDefaultChapterCraftJson(ch.title),
      };
    }
    return ch;
  });

  const activeExists = chapters.some((c) => c.id === project.activeChapterId);
  return {
    ...project,
    activeChapterId: activeExists ? project.activeChapterId : chapters[0]?.id || 'ch-1',
    chapters,
  };
}
