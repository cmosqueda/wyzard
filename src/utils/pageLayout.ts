import type {
  BookProject,
  Chapter,
  HeaderFooterZone,
  PageNumbering,
  PageSetup,
  BookSection,
  PageMaster,
  ZoneSlot,
} from '../types/ast';

/**
 * Fixed-layout (traditional book) support: page sizes, page regions, running headers / footers,
 * page numbers and token resolution. Shared by the editor, the web / PDF exporters and the CBZ renderer.
 * All lengths are CSS pixels (96 per inch).
 */

export const PX_PER_IN = 96;
export const PX_PER_MM = PX_PER_IN / 25.4;

export type PageSizeKey = 'mobile' | 'a4' | 'a5' | 'letter' | 'trade-6x9' | 'digest-5x8' | 'custom';

export interface PageSizePreset {
  key: PageSizeKey;
  label: string;
  width: number;
  height: number;
  note: string;
}

export const PAGE_SIZE_PRESETS: PageSizePreset[] = [
  { key: 'mobile', label: 'Mobile 390×844', width: 390, height: 844, note: 'Phone screens (matches the Mobile preview)' },
  { key: 'a4', label: 'A4', width: Math.round(210 * PX_PER_MM), height: Math.round(297 * PX_PER_MM), note: '210 × 297 mm' },
  { key: 'a5', label: 'A5', width: Math.round(148 * PX_PER_MM), height: Math.round(210 * PX_PER_MM), note: '148 × 210 mm' },
  { key: 'letter', label: 'US Letter', width: 8.5 * PX_PER_IN, height: 11 * PX_PER_IN, note: '8.5 × 11 in' },
  { key: 'trade-6x9', label: 'Trade 6×9 in', width: 6 * PX_PER_IN, height: 9 * PX_PER_IN, note: '6 × 9 in (common paperback)' },
  { key: 'digest-5x8', label: 'Digest 5×8 in', width: 5 * PX_PER_IN, height: 8 * PX_PER_IN, note: '5 × 8 in' },
  { key: 'custom', label: 'Custom', width: 600, height: 800, note: 'Any size you enter' },
];

export type LengthUnit = 'px' | 'mm' | 'in';

export function pxToUnit(px: number, unit: LengthUnit): number {
  const v = unit === 'mm' ? px / PX_PER_MM : unit === 'in' ? px / PX_PER_IN : px;
  return Math.round(v * 100) / 100;
}

export function unitToPx(value: number, unit: LengthUnit): number {
  const v = unit === 'mm' ? value * PX_PER_MM : unit === 'in' ? value * PX_PER_IN : value;
  return Math.round(v * 100) / 100;
}

export const MIN_PAGE_PX = 200;
export const MAX_PAGE_PX = 3000;

export function clampPageDimension(px: number): number {
  return Math.min(MAX_PAGE_PX, Math.max(MIN_PAGE_PX, Math.round(px)));
}

// ---------------------------------------------------------------- header / footer presets
const accentSlot = (text: string, size: number): ZoneSlot => ({ text, size, bold: true, bg: 'accent', color: '#FFFFFF' });

export const HEADER_FOOTER_PRESETS: {
  id: string;
  label: string;
  description: string;
  header: HeaderFooterZone;
  footer: HeaderFooterZone;
}[] = [
  {
    id: 'textbook',
    label: 'Textbook band',
    description: 'Coloured section band on top, book badge + breadcrumb footer',
    header: {
      enabled: true,
      height: 52,
      background: 'accent',
      color: '#FFFFFF',
      borderColor: 'accent',
      borderWidth: 0,
      left: { text: '{sectionNumber}', size: 28, bold: true, color: '#FFFFFF', padX: 14 },
      center: { text: '{sectionTitle}\n{sectionSubtitle}', size: 20, bold: true, color: '#FFFFFF', padX: 12 },
    },
    footer: {
      enabled: true,
      height: 26,
      background: '#FFFFFF',
      color: 'accent',
      borderColor: 'accent',
      borderWidth: 1,
      left: accentSlot('{shortTitle}', 11),
      right: { text: '{sectionTitle}', size: 10, color: 'accent', padX: 10 },
    },
  },
  {
    id: 'classic',
    label: 'Classic running head',
    description: 'Book title centred on top, page number centred at the bottom',
    header: {
      enabled: true,
      height: 28,
      background: 'transparent',
      color: '#444444',
      borderColor: '#999999',
      borderWidth: 1,
      center: { text: '{bookTitle}', size: 11, color: '#444444' },
    },
    footer: {
      enabled: true,
      height: 28,
      background: 'transparent',
      color: '#444444',
      borderColor: 'transparent',
      borderWidth: 0,
      center: { text: '{pageNumber}', size: 12, color: '#444444' },
    },
  },
  {
    id: 'minimal',
    label: 'Page number only',
    description: 'No header, outside page number in the footer',
    header: { enabled: false, height: 28, background: 'transparent', color: '#444444', borderColor: 'transparent', borderWidth: 0 },
    footer: {
      enabled: true,
      height: 28,
      background: 'transparent',
      color: '#444444',
      borderColor: 'transparent',
      borderWidth: 0,
      left: { text: '{shortTitle}', size: 10, color: '#666666' },
      right: { text: '{pageNumber}', size: 11, bold: true, color: '#444444' },
    },
  },
  {
    id: 'none',
    label: 'None',
    description: 'Clean pages without a header or footer',
    header: { enabled: false, height: 28, background: 'transparent', color: '#444444', borderColor: 'transparent', borderWidth: 0 },
    footer: { enabled: false, height: 28, background: 'transparent', color: '#444444', borderColor: 'transparent', borderWidth: 0 },
  },
];

export function createDefaultPageSetup(sizeKey: PageSizeKey = 'mobile', width?: number, height?: number): PageSetup {
  const preset = PAGE_SIZE_PRESETS.find((p) => p.key === sizeKey) || PAGE_SIZE_PRESETS[0];
  const w = width ?? preset.width;
  const h = height ?? preset.height;
  const margin = Math.round(Math.min(w, h) * 0.08);
  const hf = HEADER_FOOTER_PRESETS.find((p) => p.id === 'textbook')!;
  return {
    sizeKey,
    width: clampPageDimension(w),
    height: clampPageDimension(h),
    margins: { top: margin, right: margin, bottom: margin, left: margin },
    showGuides: true,
    numbering: { start: 1, style: 'arabic' },
    header: JSON.parse(JSON.stringify(hf.header)),
    footer: JSON.parse(JSON.stringify(hf.footer)),
  };
}

// ---------------------------------------------------------------- numbering & sections
function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const map: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let out = '';
  let rest = n;
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

export function formatPageNumber(index: number, numbering: PageNumbering | undefined): string {
  const n = (numbering?.start ?? 1) + index;
  switch (numbering?.style) {
    case 'none':
      return '';
    case 'roman':
      return toRoman(n);
    case 'roman-upper':
      return toRoman(n).toUpperCase();
    case 'arabic':
    default:
      return String(n);
  }
}

/**
 * The number printed on page `index`. A page with its own `numbering` starts a new run
 * (roman front matter, then arabic from 1, …); otherwise the book-wide numbering applies.
 */
export function getPrintedNumber(project: BookProject, index: number): string {
  const base = project.pageSetup?.numbering;
  let start = base?.start ?? 1;
  let style: PageNumbering['style'] = base?.style ?? 'arabic';
  let runStart = 0;
  for (let i = 0; i <= index && i < project.chapters.length; i++) {
    const o = project.chapters[i].numbering;
    if (o) {
      start = o.start;
      style = o.style;
      runStart = i;
    }
  }
  return formatPageNumber(index - runStart, { start, style });
}

export interface TocEntry {
  id: string;
  /** Short label before the title, e.g. "Chapter 1" */
  label: string;
  title: string;
  level: 1 | 2 | 3;
  pageIndex: number;
  pageId: string;
  /** Page number as printed (respects numbering runs) */
  printed: string;
}

/**
 * Table of contents derived from the book's structure: every section (at the first page that uses it)
 * and every page marked "include in table of contents". Order follows the pages.
 */
export function buildTocEntries(project: BookProject): TocEntry[] {
  const out: TocEntry[] = [];
  const seen = new Set<string>();
  project.chapters.forEach((page, i) => {
    const printed = getPrintedNumber(project, i);
    if (page.sectionId && !seen.has(page.sectionId)) {
      seen.add(page.sectionId);
      const sec = project.sections?.find((x) => x.id === page.sectionId);
      if (sec && sec.inToc !== false) {
        out.push({
          id: `toc-sec-${sec.id}`,
          label: sec.tocLabel ?? '',
          title: sec.title,
          level: sec.level ?? 1,
          pageIndex: i,
          pageId: page.id,
          printed,
        });
      }
    }
    if (page.tocEntry) {
      out.push({
        id: `toc-page-${page.id}`,
        label: '',
        title: page.tocEntry.title?.trim() || page.title,
        level: page.tocEntry.level,
        pageIndex: i,
        pageId: page.id,
        printed,
      });
    }
  });
  return out;
}

export function findSection(project: BookProject, page: Chapter): BookSection | undefined {
  return page.sectionId ? project.sections?.find((s) => s.id === page.sectionId) : undefined;
}

export const DEFAULT_ACCENT = '#2563EB';

export interface PageContext {
  bookTitle: string;
  shortTitle: string;
  author: string;
  pageNumber: string;
  pageCount: string;
  pageTitle: string;
  sectionNumber: string;
  sectionTitle: string;
  sectionSubtitle: string;
  accent: string;
}

export function getPageContext(project: BookProject, pageIndex: number): PageContext {
  const page = project.chapters[pageIndex];
  const section = page ? findSection(project, page) : undefined;
  const title = project.metadata.title || project.title;
  return {
    bookTitle: title,
    shortTitle: project.metadata.shortTitle || title,
    author: project.metadata.author || '',
    pageNumber: getPrintedNumber(project, pageIndex),
    pageCount: String(project.chapters.length),
    pageTitle: page?.title || '',
    sectionNumber: section?.number || '',
    sectionTitle: section?.title || '',
    sectionSubtitle: section?.subtitle || '',
    accent: section?.color || project.pageSetup?.accentColor || DEFAULT_ACCENT,
  };
}

export const PAGE_TOKENS: { token: string; label: string }[] = [
  { token: '{bookTitle}', label: 'Book title' },
  { token: '{shortTitle}', label: 'Short title' },
  { token: '{author}', label: 'Author' },
  { token: '{pageNumber}', label: 'Page number' },
  { token: '{pageCount}', label: 'Page count' },
  { token: '{pageTitle}', label: 'Page title' },
  { token: '{sectionNumber}', label: 'Section number' },
  { token: '{sectionTitle}', label: 'Section title' },
  { token: '{sectionSubtitle}', label: 'Section subtitle' },
];

export function resolveTokens(text: string, ctx: PageContext): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = (ctx as unknown as Record<string, string>)[key];
    return typeof v === 'string' && key !== 'accent' ? v : whole;
  });
}

/** Colour value of a zone / slot: the literal `accent` resolves to the section colour. */
export function resolveColor(value: string | undefined, ctx: PageContext, fallback = 'transparent'): string {
  if (!value) return fallback;
  return value === 'accent' ? ctx.accent : value;
}

// ---------------------------------------------------------------- regions
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageRegions {
  page: Box;
  header: (Box & { zone: HeaderFooterZone }) | null;
  footer: (Box & { zone: HeaderFooterZone }) | null;
  body: Box;
}

const ZONE_GAP = 12;

export function pageShowsHeader(setup: PageSetup, page: Chapter): boolean {
  return !!setup.header?.enabled && !page.hideHeader && !page.fullBleed;
}
export function pageShowsFooter(setup: PageSetup, page: Chapter): boolean {
  return !!setup.footer?.enabled && !page.hideFooter && !page.fullBleed;
}

/**
 * Where the header, footer and body sit on a page. Full-bleed pages (covers, openers) use the whole
 * sheet for the body with no margins, header or footer.
 */
export function getPageRegions(setup: PageSetup, page: Chapter): PageRegions {
  const { width: W, height: H, margins: m } = setup;
  const pageBox: Box = { x: 0, y: 0, w: W, h: H };
  if (page.fullBleed) return { page: pageBox, header: null, footer: null, body: pageBox };

  const innerW = Math.max(40, W - m.left - m.right);
  let top = m.top;
  let bottom = H - m.bottom;

  let header: PageRegions['header'] = null;
  if (pageShowsHeader(setup, page)) {
    header = { x: m.left, y: m.top, w: innerW, h: setup.header.height, zone: setup.header };
    top = m.top + setup.header.height + ZONE_GAP;
  }
  let footer: PageRegions['footer'] = null;
  if (pageShowsFooter(setup, page)) {
    footer = { x: m.left, y: H - m.bottom - setup.footer.height, w: innerW, h: setup.footer.height, zone: setup.footer };
    bottom = footer.y - ZONE_GAP;
  }
  const body: Box = { x: m.left, y: top, w: innerW, h: Math.max(40, bottom - top) };
  return { page: pageBox, header, footer, body };
}

// ---------------------------------------------------------------- master pages
/** True for left-hand pages of a facing-pages book (the first page is a right-hand page). */
export function isLeftPage(setup: PageSetup | undefined, pageIndex: number): boolean {
  return !!setup?.facing && pageIndex % 2 === 1;
}

function mirrorZone(zone: HeaderFooterZone): HeaderFooterZone {
  const { left, right, ...rest } = zone;
  return { ...rest, ...(right ? { left: right } : {}), ...(left ? { right: left } : {}) };
}

/** Index of the first page of `page`'s section, or -1 when it has none. */
export function isSectionStart(project: BookProject, pageIndex: number): boolean {
  const page = project.chapters[pageIndex];
  if (!page?.sectionId) return false;
  return project.chapters.findIndex((c) => c.sectionId === page.sectionId) === pageIndex;
}

/**
 * The master page for a page: the one picked on the page, else the one picked on its section, else (with facing
 * pages) the first master made for its side. Undefined means the book's own setup applies.
 */
export function pickMaster(project: BookProject, pageIndex: number): PageMaster | undefined {
  const setup = project.pageSetup;
  const masters = setup?.masters;
  if (!setup || !masters || masters.length === 0) return undefined;
  const page = project.chapters[pageIndex];
  if (!page) return undefined;
  const byId = (id?: string) => (id ? masters.find((m) => m.id === id) : undefined);
  const picked = byId(page.masterId) || byId(findSection(project, page)?.masterId);
  if (picked) return picked;
  if (!setup.facing) return undefined;
  const side = isLeftPage(setup, pageIndex) ? 'left' : 'right';
  return masters.find((m) => m.side === side);
}

/**
 * The page setup that applies to one page after master-page rules: mirrored margins and zones on
 * left-hand pages, and the section-opener variant. Everything that lays out or draws a page uses this.
 */
export function getEffectiveSetup(project: BookProject, pageIndex: number): PageSetup {
  const setup = project.pageSetup!;
  let out = setup;
  const master = pickMaster(project, pageIndex);
  if (master) {
    // an explicit master replaces the automatic mirroring
    out = {
      ...out,
      margins: master.margins ?? out.margins,
      header: master.header ?? out.header,
      footer: master.footer ?? out.footer,
    };
  } else if (isLeftPage(setup, pageIndex)) {
    out = {
      ...out,
      margins: { ...out.margins, left: out.margins.right, right: out.margins.left },
      header: mirrorZone(out.header),
      footer: mirrorZone(out.footer),
    };
  }
  if (setup.sectionStart && isSectionStart(project, pageIndex)) {
    out = {
      ...out,
      header: setup.sectionStart.hideHeader ? { ...out.header, enabled: false } : out.header,
      footer: setup.sectionStart.hideFooter ? { ...out.footer, enabled: false } : out.footer,
    };
  }
  return out;
}

/** The viewport class (used by responsive blocks) that best matches a page's width. */
export function viewportForPageWidth(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 600) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
}

export function describePageSize(setup: PageSetup): string {
  const preset = PAGE_SIZE_PRESETS.find((p) => p.key === setup.sizeKey);
  const dims = `${Math.round(setup.width)}×${Math.round(setup.height)} px`;
  // preset labels like "Mobile 390×844" already carry the size
  const name = preset && preset.key !== 'custom' ? preset.label.replace(/\s*\d+×\d+$/, '') : 'Custom';
  return `${name} · ${dims}`;
}
