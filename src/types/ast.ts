export type ViewportMode = 'mobile' | 'tablet' | 'desktop' | 'comic' | 'square';

export interface ViewportConfig {
  mode: ViewportMode;
  name: string;
  width: number; // in px
  height: number; // in px
  icon: string;
}

export const VIEWPORT_PRESETS: Record<ViewportMode, ViewportConfig> = {
  mobile: {
    mode: 'mobile',
    name: 'Mobile Portrait',
    width: 390,
    height: 844,
    icon: 'Smartphone',
  },
  tablet: {
    mode: 'tablet',
    name: 'Tablet Portrait',
    width: 768,
    height: 1024,
    icon: 'Tablet',
  },
  desktop: {
    mode: 'desktop',
    name: 'Laptop / Desktop',
    width: 1280,
    height: 800,
    icon: 'Laptop',
  },
  comic: {
    mode: 'comic',
    name: 'Comic / Graphic 2:3',
    width: 800,
    height: 1200,
    icon: 'Film',
  },
  square: {
    mode: 'square',
    name: 'Square Zine 1:1',
    width: 900,
    height: 900,
    icon: 'Square',
  },
};

export interface FocalPoint {
  x: number; // 0 - 100%
  y: number; // 0 - 100%
}

export interface ResponsiveStyleProps {
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  marginTop?: string;
  marginBottom?: string;
  flexDirection?: 'column' | 'row' | 'row-reverse';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: string;
  splitRatio?: '100' | '50/50' | '60/40' | '40/60' | '70/30' | '30/70';
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  display?: 'block' | 'flex' | 'grid' | 'none';
  width?: string;
  maxWidth?: string;
}

export interface ResponsiveStyleOverrides {
  base: ResponsiveStyleProps; // Mobile default
  overrides?: {
    tablet?: Partial<ResponsiveStyleProps>;
    desktop?: Partial<ResponsiveStyleProps>;
  };
}

export type BlockType = 
  | 'CanvasContainer'
  | 'EditorialTypography'
  | 'ArtDirectedImage'
  | 'MagazineHeroSpread'
  | 'AdaptiveSplitContainer'
  | 'InteractiveAccordion'
  | 'HotspotPinboard'
  | 'VisualGallery'
  | 'AudioNarration';

export interface BlockNode {
  id: string;
  type: BlockType;
  displayName: string;
  props: Record<string, any>;
  styles: ResponsiveStyleOverrides;
  children?: BlockNode[];
  parent?: string;
}

export interface Chapter {
  id: string;
  title: string;
  slug: string;
  order: number;
  craftStateJson: string; // Serialized Craft.js state JSON string
  backgroundColor?: string;
  // ---- Fixed-layout books: in that mode every "chapter" is ONE page ----
  /** Section this page belongs to (drives header / footer tokens and colour) */
  sectionId?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  /** Full-bleed page: no margins, header or footer (covers, openers) */
  fullBleed?: boolean;
  /** What this page is (drives EPUB landmarks and the "Book pages" menu) */
  kind?: PageKind;
  /** Leave this page out of the index (its text is not searched, tags are ignored) */
  noIndex?: boolean;
  /** Index terms tagged on this page, by term id (listed even when the text does not contain them) */
  indexTerms?: string[];
  /** Master page for this page (overrides its section's and the automatic left / right master) */
  masterId?: string;
  /** Lists this page in the table of contents */
  tocEntry?: { title?: string; level: 1 | 2 | 3 };
  /** Starts a new run of page numbers at this page (e.g. roman front matter, then arabic from 1) */
  numbering?: PageNumbering;
  createdAt: number;
  updatedAt: number;
}

export interface AssetAttribution {
  id: string;
  title: string;
  creator: string;
  creatorUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  license: string;
  licenseUrl?: string;
  assetUrl?: string;
  addedAt: number;
}

export interface BookMetadata {
  title: string;
  /** Short running title for headers / footers, e.g. "ENGLISH 7" */
  shortTitle?: string;
  subtitle?: string;
  // ---- imprint / copyright page ----
  publisher?: string;
  isbn?: string;
  edition?: string;
  copyrightYear?: string;
  copyrightHolder?: string;
  classification?: string;
  /** Address, phone, e-mail, website */
  contact?: string;
  /** Boxed legal notice, e.g. "No portion of this book may be reproduced …" */
  rightsStatement?: string;
  disclaimer?: string;
  author: string;
  identifier?: string;
  language: string; // default 'en'
  description?: string;
  coverImage?: string; // base64 or blob URL
  attributions?: AssetAttribution[];
}

/**
 * Design system applied to the page canvas (not the Wyzard app chrome).
 * - 'plain': blank, unthemed page like Canva / Figma (default for new blank projects)
 * - 'wyzard': the neo-brutalist Wyzard editorial look (templates, starter, legacy projects)
 */
export type CanvasDesignSystem = 'plain' | 'wyzard';

export type LayoutMode = 'reflowable' | 'fixed';

export type PageKind = 'cover' | 'title' | 'copyright' | 'dedication' | 'preface' | 'toc' | 'glossary' | 'index' | 'backCover' | 'content';

export interface ZoneSlot {
  /** Text with tokens such as {sectionTitle} or {pageNumber}. Extra lines render smaller. */
  text: string;
  size?: number;
  bold?: boolean;
  color?: string;
  /** Filled box behind the slot: a colour, or `accent` for the section colour */
  bg?: string;
  padX?: number;
}

export interface HeaderFooterZone {
  enabled: boolean;
  height: number;
  /** Colour, `accent` (section colour) or `transparent` */
  background: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  left?: ZoneSlot;
  center?: ZoneSlot;
  right?: ZoneSlot;
}

export type PageNumberStyle = 'arabic' | 'roman' | 'roman-upper' | 'none';

export interface PageNumbering {
  start: number;
  style: PageNumberStyle;
}

export interface PageSetup {
  sizeKey: string;
  /** CSS pixels (96 per inch) */
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  showGuides: boolean;
  numbering: PageNumbering;
  /** Default section colour when a page has no section */
  accentColor?: string;
  header: HeaderFooterZone;
  footer: HeaderFooterZone;
  /**
   * Master pages: facing pages (left / right). Even pages (1st, 3rd, …) are right-hand pages, odd pages are
   * left-hand pages. The left margin is the inner (binding) margin and the header / footer are mirrored.
   */
  facing?: boolean;
  /** Variant for the first page of each section (chapter openers) */
  sectionStart?: { hideHeader?: boolean; hideFooter?: boolean };
  /** Named master pages (phase 4) */
  masters?: PageMaster[];
}

/**
 * A named master page: its own header, footer and / or margins. Anything left out falls back to the book's
 * page setup. A master with a `side` applies automatically to left- or right-hand pages (facing pages);
 * any master can also be assigned to a page or a whole section.
 */
export interface PageMaster {
  id: string;
  name: string;
  side?: 'left' | 'right';
  header?: HeaderFooterZone;
  footer?: HeaderFooterZone;
  margins?: { top: number; right: number; bottom: number; left: number };
}

/** A term for the book's index and / or glossary. */
export interface BookTerm {
  id: string;
  term: string;
  /** Glossary definition. Terms without one only appear in the index. */
  definition?: string;
  /** Set false to keep the term out of the index (glossary only) */
  inIndex?: boolean;
  /** Id of a main term: this term is listed as a sub-entry under it */
  parent?: string;
  /** Other spellings to look for in the text, comma-separated ("rhymes, rhyming") */
  aliases?: string;
  /** Cross-references printed as "See also …", comma-separated */
  seeAlso?: string;
  /** Set false to list the term only on pages it is tagged on, not wherever its text appears */
  auto?: boolean;
}

export interface BookSection {
  id: string;
  title: string;
  subtitle?: string;
  /** Free text shown by {sectionNumber}, e.g. "1" or "I" */
  number?: string;
  color?: string;
  /** Depth in the table of contents: 1 = part / unit, 2 = chapter, 3 = lesson */
  level?: 1 | 2 | 3;
  /** Short label shown before the title in the table of contents, e.g. "Chapter 1" */
  tocLabel?: string;
  /** Set false to keep this section out of the table of contents */
  inToc?: boolean;
  /** Master page used by this section's pages (unless a page picks its own) */
  masterId?: string;
}

export interface BookProject {
  id: string;
  title: string;
  metadata: BookMetadata;
  chapters: Chapter[];
  activeChapterId: string;
  designSystem?: CanvasDesignSystem; // undefined => 'wyzard' (legacy projects)
  /** undefined => 'reflowable'. In 'fixed' mode each chapter is a single fixed-size page. */
  layoutMode?: LayoutMode;
  pageSetup?: PageSetup;
  sections?: BookSection[];
  terms?: BookTerm[];
  createdAt: number;
  updatedAt: number;
}
