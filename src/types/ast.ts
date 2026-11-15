export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

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
  createdAt: number;
  updatedAt: number;
}

export interface BookMetadata {
  title: string;
  author: string;
  identifier?: string;
  language: string; // default 'en'
  description?: string;
  publisher?: string;
  coverImage?: string; // base64 or blob URL
}

export interface BookProject {
  id: string;
  title: string;
  metadata: BookMetadata;
  chapters: Chapter[];
  activeChapterId: string;
  createdAt: number;
  updatedAt: number;
}
