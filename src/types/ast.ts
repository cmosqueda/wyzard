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
  author: string;
  identifier?: string;
  language: string; // default 'en'
  description?: string;
  publisher?: string;
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
}

export interface BookSection {
  id: string;
  title: string;
  subtitle?: string;
  /** Free text shown by {sectionNumber}, e.g. "1" or "I" */
  number?: string;
  color?: string;
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
  createdAt: number;
  updatedAt: number;
}
