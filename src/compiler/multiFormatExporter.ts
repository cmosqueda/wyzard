import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BookProject } from '../types/ast';
import { parseCraftState, type ParsedBlockNode } from './astParser';
import {
  renderWebNode,
  getWebPublicationStyles,
  getWebRuntimeJs,
} from './webCompiler';
import { db } from '../db';
import { googleFontStack, loadGoogleFont } from '../utils/googleFonts';
import { unescapeHtml } from '../utils/math';

/** Rich text (HTML from the editor) -> plain text for canvas drawing: no tags, decoded entities, math as TeX. */
function htmlToPlainText(html: string): string {
  return unescapeHtml(
    html
      .replace(/<span[^>]*class="wz-math"[^>]*data-tex="([^"]*)"[^>]*><\/span>/g, (_m, tex: string) => unescapeHtml(tex))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).trim();
}
import { getArtboardHeightRatio, getArtboardWidthPct } from '../utils/artboard';
import { getPageContext, getPageRegions } from '../utils/pageLayout';
import { renderFixedPageHtml, FIXED_PAGE_CSS, drawZoneOnCanvas } from './fixedPage';

export type ScreenRatioKey = 'mobile' | 'tablet' | 'laptop' | 'comic' | 'square';

export interface ScreenRatioPreset {
  key: ScreenRatioKey;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
}

export const SCREEN_RATIO_PRESETS: Record<ScreenRatioKey, ScreenRatioPreset> = {
  mobile: {
    key: 'mobile',
    label: 'Mobile Portrait (390×844)',
    shortLabel: 'Mobile 390×844',
    width: 390,
    height: 844,
    paddingX: 24,
    paddingY: 32,
  },
  tablet: {
    key: 'tablet',
    label: 'Tablet Editorial (768×1024)',
    shortLabel: 'Tablet 768×1024',
    width: 768,
    height: 1024,
    paddingX: 44,
    paddingY: 48,
  },
  laptop: {
    key: 'laptop',
    label: 'Laptop Spread (1280×800)',
    shortLabel: 'Laptop 1280×800',
    width: 1280,
    height: 800,
    paddingX: 64,
    paddingY: 48,
  },
  comic: {
    key: 'comic',
    label: 'Comic / Graphic Novel (800×1200)',
    shortLabel: 'Comic 800×1200',
    width: 800,
    height: 1200,
    paddingX: 36,
    paddingY: 40,
  },
  square: {
    key: 'square',
    label: 'Square Art Zine (900×900)',
    shortLabel: 'Square 900×900',
    width: 900,
    height: 900,
    paddingX: 44,
    paddingY: 44,
  },
};

export interface PaginatedBlockItem {
  node: ParsedBlockNode;
  estimatedHeight: number;
  isVisualAsset: boolean;
  movedToAvoidCut: boolean;
}

export interface PaginatedPage {
  pageNumber: number;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  items: PaginatedBlockItem[];
  usedHeight: number;
  usableHeight: number;
  preset: ScreenRatioPreset;
  /** Fixed-layout book page: laid out by the author, never split or re-flowed */
  fixed?: boolean;
}

function parseAspectRatioValue(ratio?: string): number {
  switch (ratio) {
    case '1/1':
      return 1;
    case '4/5':
      return 4 / 5;
    case '4/3':
      return 4 / 3;
    case '16/9':
      return 16 / 9;
    case '21/9':
      return 21 / 9;
    default:
      return 16 / 10;
  }
}

function isVisualBlock(type: string): boolean {
  return [
    'ImageBlock',
    'ArtDirectedImage',
    'FreeformCanvasBlock',
    'FreeformCanvas',
    'HeroSpreadBlock',
    'MagazineHeroSpread',
    'HotspotPinboardBlock',
    'HotspotPinboard',
    'VisualGalleryBlock',
    'VisualGallery',
    'SplitContainer',
    'AdaptiveSplitContainer',
  ].includes(type);
}

/**
 * Estimates the vertical pixel height of a block at a given content width so
 * the paginator can place any overflowing visual asset onto the next page
 * instead of cutting it across a page boundary.
 */
export function estimateNodeHeight(
  node: ParsedBlockNode,
  contentWidth: number,
  usablePageHeight: number
): number {
  const p = node.props || {};
  switch (node.type) {
    case 'TypographyBlock':
    case 'EditorialTypography': {
      const text: string = String(p.htmlContent || p.text || '');
      const variant = p.variant || 'body';
      const fontSizePx =
        variant === 'h1'
          ? 34
          : variant === 'h2'
          ? 26
          : variant === 'h3'
          ? 21
          : variant === 'lead'
          ? 19
          : variant === 'pullquote'
          ? 21
          : 16.5;
      const charsPerLine = Math.max(22, Math.floor(contentWidth / (fontSizePx * 0.54)));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      const lineHeightPx = fontSizePx * (variant === 'h1' || variant === 'h2' ? 1.25 : 1.7);
      const margin = variant === 'h1' || variant === 'h2' ? 28 : 22;
      return Math.ceil(lines * lineHeightPx + margin);
    }

    case 'ImageBlock':
    case 'ArtDirectedImage': {
      const ratio = parseAspectRatioValue(p.aspectRatio || '4/5');
      const rawImgH = contentWidth / ratio;
      const captionH = p.caption ? 28 : 0;
      return Math.min(usablePageHeight - 12, Math.ceil(rawImgH + captionH + 28));
    }

    case 'FreeformCanvasBlock':
    case 'FreeformCanvas': {
      const rawH =
        contentWidth *
        (getArtboardWidthPct(p.artboardWidth) / 100) *
        getArtboardHeightRatio(p.aspectRatio || '16/9', p.artboardHeight);
      const captionH = p.caption ? 28 : 0;
      return Math.min(usablePageHeight - 12, Math.ceil(rawH + captionH + 28));
    }

    case 'HeroSpreadBlock':
    case 'MagazineHeroSpread': {
      const hMap: Record<string, number> = { sm: 260, md: 360, lg: 460 };
      const baseH = hMap[p.height || 'md'] || 360;
      return Math.min(usablePageHeight - 12, baseH + 28);
    }

    case 'CalloutCardBlock':
    case 'CalloutCard': {
      const text = String(p.content || '');
      const charsPerLine = Math.max(24, Math.floor((contentWidth - 40) / 9));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return Math.ceil(lines * 24 + 78);
    }

    case 'OrnamentDividerBlock':
    case 'OrnamentDivider':
      return 56;

    case 'AccordionBlock':
    case 'InteractiveAccordion': {
      const text = String(p.content || '');
      const charsPerLine = Math.max(24, Math.floor((contentWidth - 40) / 9));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return Math.ceil(64 + lines * 22 + 24);
    }

    case 'HotspotPinboardBlock':
    case 'HotspotPinboard': {
      const rawH = contentWidth * 0.65;
      return Math.min(usablePageHeight - 12, Math.ceil(rawH + 40));
    }

    case 'VisualGalleryBlock':
    case 'VisualGallery': {
      const slides: any[] = p.slides || [];
      if (contentWidth >= 680 && (p.desktopLayout || 'grid-3') === 'grid-3') {
        const colW = (contentWidth - 32) / 3;
        const cardH = colW * 0.75 + 76;
        const rows = Math.max(1, Math.ceil(slides.length / 3));
        return Math.min(usablePageHeight - 12, Math.ceil(rows * cardH + 36));
      }
      return Math.min(usablePageHeight - 12, Math.ceil(contentWidth * 0.68 + 90));
    }

    case 'TableBlock':
    case 'Table': {
      const rowsArr: any[] = Array.isArray(p.rows) ? p.rows : [[]];
      const captionH = p.caption ? 28 : 0;
      return Math.min(usablePageHeight - 12, Math.ceil(rowsArr.length * 34 + captionH + 28));
    }

    case 'AudioNarrationBlock':
    case 'AudioNarration':
      return 132;

    case 'SplitContainer':
    case 'AdaptiveSplitContainer': {
      const ratio: string = p.desktopRatio || '60/40';
      const cellCount =
        ratio === '25/25/25/25' || ratio === 'bento-2x2'
          ? 4
          : ['33/33/33', '50/25/25', '25/50/25', '25/25/50'].includes(ratio)
          ? 3
          : 2;
      const activeCols = node.children.slice(0, cellCount);
      if (contentWidth < 520) {
        // Stacks vertically on narrow mobile viewports
        const sumH = activeCols.reduce((acc, col) => {
          const colH = col.children.reduce(
            (cAcc, child) => cAcc + estimateNodeHeight(child, contentWidth, usablePageHeight),
            0
          );
          return acc + Math.max(60, colH);
        }, 0);
        return Math.min(usablePageHeight - 12, sumH + 28);
      }
      const colsPerRow = ratio === 'bento-2x2' ? 2 : cellCount;
      const colWidth = Math.max(140, (contentWidth - (colsPerRow - 1) * 20) / colsPerRow);
      const colHeights = activeCols.map((col) =>
        col.children.reduce(
          (cAcc, child) => cAcc + estimateNodeHeight(child, colWidth, usablePageHeight),
          0
        )
      );
      if (ratio === 'bento-2x2') {
        const row1 = Math.max(colHeights[0] || 80, colHeights[1] || 80);
        const row2 = Math.max(colHeights[2] || 80, colHeights[3] || 80);
        return Math.min(usablePageHeight - 12, row1 + row2 + 40);
      }
      return Math.min(usablePageHeight - 12, Math.max(90, ...colHeights) + 28);
    }

    default:
      return 80;
  }
}

/**
 * Splits long body typography blocks across pages only when necessary, while
 * NEVER splitting visual assets, callouts, artboards, or headings.
 */
function expandOversizedTypography(
  node: ParsedBlockNode,
  contentWidth: number,
  usablePageHeight: number
): ParsedBlockNode[] {
  if (node.type !== 'TypographyBlock' && node.type !== 'EditorialTypography') {
    return [node];
  }
  const p = node.props || {};
  if ((p.variant || 'body') !== 'body') {
    return [node];
  }
  const est = estimateNodeHeight(node, contentWidth, usablePageHeight);
  if (est <= usablePageHeight * 0.85) {
    return [node];
  }
  const rawText = String(p.htmlContent || p.text || '');
  const sentences = rawText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [rawText];
  if (sentences.length <= 1) return [node];

  const chunks: ParsedBlockNode[] = [];
  let currentText = '';
  let isFirstChunk = true;

  for (const sentence of sentences) {
    const candidate = currentText ? `${currentText}${sentence}` : sentence;
    const candidateNode: ParsedBlockNode = {
      ...node,
      props: {
        ...p,
        text: candidate,
        htmlContent: candidate,
        dropCap: isFirstChunk ? p.dropCap : false,
      },
    };
    if (
      currentText &&
      estimateNodeHeight(candidateNode, contentWidth, usablePageHeight) >
        usablePageHeight * 0.72
    ) {
      chunks.push({
        ...node,
        id: `${node.id}-part-${chunks.length + 1}`,
        props: {
          ...p,
          text: currentText.trim(),
          htmlContent: currentText.trim(),
          dropCap: isFirstChunk ? p.dropCap : false,
        },
      });
      currentText = sentence;
      isFirstChunk = false;
    } else {
      currentText = candidate;
    }
  }

  if (currentText.trim()) {
    chunks.push({
      ...node,
      id: `${node.id}-part-${chunks.length + 1}`,
      props: {
        ...p,
        text: currentText.trim(),
        htmlContent: currentText.trim(),
        dropCap: isFirstChunk ? p.dropCap : false,
      },
    });
  }

  return chunks.length > 0 ? chunks : [node];
}

/**
 * Smart Asset-Safe Paginator:
 * Packs all chapters into discrete page grabs for the selected screen ratio.
 * Visual assets that do not fit in the remaining vertical space on the current
 * page are pushed cleanly to the top of the next page so they are NEVER cut off.
 */
function paginateFixedBook(project: BookProject, onlyChapterId?: string): PaginatedPage[] {
  const setup = project.pageSetup!;
  const preset: ScreenRatioPreset = {
    key: 'mobile',
    label: `Fixed page (${Math.round(setup.width)}×${Math.round(setup.height)})`,
    shortLabel: `${Math.round(setup.width)}×${Math.round(setup.height)}`,
    width: Math.round(setup.width),
    height: Math.round(setup.height),
    paddingX: setup.margins.left,
    paddingY: setup.margins.top,
  };
  const pages: PaginatedPage[] = [];
  project.chapters.forEach((chapter, idx) => {
    if (onlyChapterId && chapter.id !== onlyChapterId) return;
    const regions = getPageRegions(setup, chapter);
    const nodes = chapter.craftStateJson ? parseCraftState(chapter.craftStateJson) : [];
    const items: PaginatedBlockItem[] = nodes.map((node) => ({
      node,
      estimatedHeight: Math.min(regions.body.h, estimateNodeHeight(node, regions.body.w, regions.body.h)),
      isVisualAsset: isVisualBlock(node.type),
      movedToAvoidCut: false,
    }));
    pages.push({
      pageNumber: idx + 1,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterIndex: idx,
      items,
      usedHeight: items.reduce((a, b) => a + b.estimatedHeight, 0),
      usableHeight: regions.body.h,
      preset,
      fixed: true,
    });
  });
  return pages;
}

export function paginateProjectForViewport(
  project: BookProject,
  ratioKey: ScreenRatioKey = 'tablet',
  onlyChapterId?: string
): PaginatedPage[] {
  if (project.layoutMode === 'fixed' && project.pageSetup) return paginateFixedBook(project, onlyChapterId);

  const preset = SCREEN_RATIO_PRESETS[ratioKey] || SCREEN_RATIO_PRESETS.tablet;
  const headerFooterReserve = 56; // Folio top bar + page number footer
  const usableHeight = Math.max(240, preset.height - preset.paddingY * 2 - headerFooterReserve);
  const contentWidth = Math.max(220, preset.width - preset.paddingX * 2);

  const pages: PaginatedPage[] = [];
  const targetChapters = onlyChapterId
    ? project.chapters.filter((c) => c.id === onlyChapterId)
    : project.chapters;

  targetChapters.forEach((chapter, chapterIdx) => {
    const rawNodes = parseCraftState(chapter.craftStateJson || '');
    const expandedNodes: ParsedBlockNode[] = [];
    for (const n of rawNodes) {
      expandedNodes.push(...expandOversizedTypography(n, contentWidth, usableHeight));
    }

    let currentItems: PaginatedBlockItem[] = [];
    let currentUsed = 0;

    const flushPage = () => {
      if (currentItems.length === 0) return;
      pages.push({
        pageNumber: pages.length + 1,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: chapterIdx,
        items: currentItems,
        usedHeight: currentUsed,
        usableHeight,
        preset,
      });
      currentItems = [];
      currentUsed = 0;
    };

    for (let i = 0; i < expandedNodes.length; i++) {
      const node = expandedNodes[i];
      const visual = isVisualBlock(node.type);
      const estHeight = Math.min(
        usableHeight,
        estimateNodeHeight(node, contentWidth, usableHeight)
      );

      // Avoid stranding a heading at the very bottom of a page without its next block
      const isHeading =
        (node.type === 'TypographyBlock' || node.type === 'EditorialTypography') &&
        ['h1', 'h2', 'h3'].includes(node.props?.variant || '');
      const nextNode = expandedNodes[i + 1];
      const nextHeight = nextNode
        ? Math.min(usableHeight, estimateNodeHeight(nextNode, contentWidth, usableHeight))
        : 0;

      const wouldOverflow = currentUsed + estHeight > usableHeight;
      const headingWouldOrphan =
        isHeading &&
        currentItems.length > 0 &&
        nextNode &&
        currentUsed + estHeight + Math.min(120, nextHeight) > usableHeight;

      if (currentItems.length > 0 && (wouldOverflow || headingWouldOrphan)) {
        // Push this asset/block to the next page so it is never cut off!
        flushPage();
        currentItems.push({
          node,
          estimatedHeight: estHeight,
          isVisualAsset: visual,
          movedToAvoidCut: wouldOverflow && visual,
        });
        currentUsed += estHeight;
      } else {
        currentItems.push({
          node,
          estimatedHeight: estHeight,
          isVisualAsset: visual,
          movedToAvoidCut: false,
        });
        currentUsed += estHeight;
      }
    }

    if (currentItems.length === 0) {
      // Empty chapter still gets 1 blank page
      pages.push({
        pageNumber: pages.length + 1,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: chapterIdx,
        items: [],
        usedHeight: 0,
        usableHeight,
        preset,
      });
    } else {
      flushPage();
    }
  });

  return pages;
}

/**
 * Renders a single PaginatedPage into self-contained HTML markup for the
 * In-App Page-Grab Reader and the Paginated PDF Exporter.
 */
export function renderPaginatedPageHtml(
  page: PaginatedPage,
  project: BookProject,
  totalPages: number
): string {
  if (page.fixed) {
    return renderFixedPageHtml(
      project,
      page.chapterIndex,
      page.items.map((i) => i.node),
      renderWebNode
    );
  }
  const { preset } = page;
  const maxAssetHeight = Math.max(180, page.usableHeight - 36);

  const blocksHtml = page.items
    .map((item) => {
      const inner = renderWebNode(item.node);
      return `<div class="page-grab-block ${
        item.isVisualAsset ? 'page-grab-visual-asset' : ''
      }" style="--max-asset-h: ${maxAssetHeight}px;">${inner}</div>`;
    })
    .join('\n');

  return `
    <section class="wyzard-page-grab" data-page="${page.pageNumber}" style="width:${preset.width}px;height:${preset.height}px;padding:${preset.paddingY}px ${preset.paddingX}px;">
      <header class="page-grab-folio">
        <span class="folio-book">${project.metadata.title || project.title}</span>
        <span class="folio-chapter">${page.chapterTitle}</span>
      </header>
      <div class="page-grab-body" style="height:${page.usableHeight}px;">
        ${blocksHtml}
      </div>
      <footer class="page-grab-footer">
        <span class="folio-ratio">${preset.shortLabel}</span>
        <span class="folio-page-num">PAGE ${page.pageNumber} OF ${totalPages}</span>
      </footer>
    </section>
  `;
}

/**
 * Compiles a complete multi-page HTML document for Paginated PDF export or preview.
 */
export function compilePaginatedPdfDocument(
  project: BookProject,
  ratioKey: ScreenRatioKey = 'tablet',
  onlyChapterId?: string
): { html: string; pages: PaginatedPage[]; preset: ScreenRatioPreset } {
  const pages = paginateProjectForViewport(project, ratioKey, onlyChapterId);
  const preset = SCREEN_RATIO_PRESETS[ratioKey] || SCREEN_RATIO_PRESETS.tablet;

  const pagesMarkup = pages
    .map((p) => renderPaginatedPageHtml(p, project, pages.length))
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="UTF-8" />
  <title>${project.metadata.title || project.title} — Paginated PDF (${preset.shortLabel})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    ${getWebPublicationStyles(project.designSystem)}
    ${FIXED_PAGE_CSS}

    @page {
      size: ${preset.width}px ${preset.height}px;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #222;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-pages-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px 0;
    }

    .wyzard-page-grab {
      background: #FFFFFF;
      color: #141414;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      border: 2px solid #141414;
    }

    .page-grab-folio {
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #141414;
      padding-bottom: 4px;
      margin-bottom: 10px;
      font-family: "JetBrains Mono", monospace;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      flex-shrink: 0;
    }

    .page-grab-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .page-grab-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Guarantee visual assets never overflow or clip on a page grab */
    .page-grab-block .editorial-image-figure,
    .page-grab-block .editorial-hero-spread,
    .page-grab-block .editorial-callout,
    .page-grab-block .interactive-accordion,
    .page-grab-block .interactive-hotspot-pinboard,
    .page-grab-block .editorial-gallery,
    .page-grab-block .editorial-audio-player,
    .page-grab-block .adaptive-split-container {
      margin-top: 0.55rem !important;
      margin-bottom: 0.65rem !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .page-grab-block .editorial-image-figure.full-bleed {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    .page-grab-block .image-aspect-wrapper {
      max-height: var(--max-asset-h, 520px);
    }

    .page-grab-block .editorial-hero-spread {
      max-height: var(--max-asset-h, 440px);
      min-height: 200px;
    }

    .page-grab-footer {
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #ddd;
      padding-top: 4px;
      margin-top: 8px;
      font-family: "JetBrains Mono", monospace;
      font-size: 9.5px;
      font-weight: 700;
      color: #666;
      flex-shrink: 0;
    }

    @media print {
      html, body {
        background: #FFFFFF;
      }
      .pdf-pages-stack {
        gap: 0;
        padding: 0;
      }
      .wyzard-page-grab {
        box-shadow: none;
        border: none;
        margin: 0;
      }
      .no-print-toolbar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar" style="position:sticky;top:0;z-index:999;background:#141414;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;border-bottom:2px solid #FFD23F;">
    <span>WYZARD PAGINATED PDF ENGINE • ${preset.label} • ${pages.length} PAGES (ASSET-SAFE PAGE GRABS)</span>
    <button onclick="window.print()" style="background:#FFD23F;color:#141414;border:2px solid #141414;padding:6px 14px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-weight:700;cursor:pointer;">Save / Print as PDF</button>
  </div>
  <main class="pdf-pages-stack">
    ${pagesMarkup}
  </main>
</body>
</html>`;

  return { html, pages, preset };
}

/**
 * Triggers Paginated PDF Export for the selected screen ratio.
 * Opens a dedicated print-ready window and triggers the system PDF saver,
 * with a fallback downloadable Paginated PDF HTML bundle if popups are blocked.
 */
export function exportToPaginatedPdf(
  project: BookProject,
  ratioKey: ScreenRatioKey = 'tablet'
): void {
  const { html, preset } = compilePaginatedPdfDocument(project, ratioKey);
  const slug =
    project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'wyzard-publication';

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        // User can also click the top "Save / Print as PDF" button inside the window
      }
    }, 650);
  } else {
    // Fallback if browser blocks popups: download the print-calibrated PDF HTML bundle
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${slug}-${preset.key}-paginated-pdf.html`);
  }
}

/**
 * Exports a complete HTML .ZIP Pack containing:
 * - index.html (Interactive Multi-Chapter Reader Shell)
 * - chapters/chapter-1.html ...
 * - assets/style.css
 * - assets/reader.js
 * - assets/credits.json
 * - assets/media/* (local binary assets stored in IndexedDB + extracted data URLs)
 */
export async function exportToHtmlZipPack(project: BookProject): Promise<void> {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets');
  const mediaFolder = assetsFolder?.folder('media');
  const chaptersFolder = zip.folder('chapters');

  // 1. Collect project binary assets from IndexedDB
  try {
    const dbAssets = await db.assets.where('projectId').equals(project.id).toArray();
    for (const item of dbAssets) {
      if (item.data && mediaFolder) {
        const safeName = (item.name || `${item.id}.bin`).replace(/[^a-zA-Z0-9._-]/g, '_');
        mediaFolder.file(safeName, item.data);
      }
    }
  } catch {
    // Non-fatal if IndexedDB assets table is empty
  }

  // 2. Write shared stylesheet & interactive runtime JS
  assetsFolder?.file('style.css', getWebPublicationStyles(project.designSystem));
  assetsFolder?.file('reader.js', getWebRuntimeJs());
  assetsFolder?.file(
    'credits.json',
    JSON.stringify(
      {
        title: project.metadata.title || project.title,
        author: project.metadata.author,
        exportedAt: new Date().toISOString(),
        attributions: project.metadata.attributions || [],
      },
      null,
      2
    )
  );

  // 3. Build chapter HTML files and combined index.html
  const attributions = project.metadata.attributions || [];
  const colophonHtml =
    attributions.length > 0
      ? `
    <footer class="editorial-colophon" role="doc-colophon">
      <h4 class="colophon-heading">Visual Asset Credits &amp; Attributions</h4>
      <ul class="colophon-list">
        ${attributions
          .map(
            (attr) => `
          <li>
            <strong>${attr.title}</strong> — By ${
              attr.creatorUrl
                ? `<a href="${attr.creatorUrl}" target="_blank" rel="noopener noreferrer">${attr.creator}</a>`
                : attr.creator
            } (${attr.license}) via ${
              attr.sourceUrl
                ? `<a href="${attr.sourceUrl}" target="_blank" rel="noopener noreferrer">${attr.sourceName}</a>`
                : attr.sourceName
            }
          </li>`
          )
          .join('\n')}
      </ul>
    </footer>`
      : '';

  const chapterLinks: { file: string; title: string; htmlBody: string }[] = [];

  project.chapters.forEach((chapter, idx) => {
    const nodes = parseCraftState(chapter.craftStateJson || '');
    const bodyHtml = nodes.map(renderWebNode).join('\n');
    const filename = `chapter-${idx + 1}.html`;
    chapterLinks.push({ file: `chapters/${filename}`, title: chapter.title, htmlBody: bodyHtml });

    const standaloneChapterHtml = `<!DOCTYPE html>
<html lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${chapter.title} — ${project.metadata.title || project.title}</title>
  <link rel="stylesheet" href="../assets/style.css" />
</head>
<body>
  <div class="book-wrapper">
    <nav style="display:flex;justify-content:space-between;align-items:center;padding-bottom:1rem;margin-bottom:2rem;border-bottom:2px solid #141414;font-family:'JetBrains Mono',monospace;font-size:12px;">
      <a href="../index.html" style="color:#141414;font-weight:700;text-decoration:none;">← TABLE OF CONTENTS</a>
      <span>CHAPTER ${idx + 1} OF ${project.chapters.length}</span>
    </nav>
    <article>
      ${bodyHtml}
      ${idx === project.chapters.length - 1 ? colophonHtml : ''}
    </article>
  </div>
  <script src="../assets/reader.js"></script>
</body>
</html>`;

    chaptersFolder?.file(filename, standaloneChapterHtml);
  });

  // 4. Master index.html with interactive chapter switcher + full publication view
  const indexHtml = `<!DOCTYPE html>
<html lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.metadata.title || project.title} — Web Publication Pack</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/style.css" />
  <style>
    .pack-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #FFFFFF;
      border-bottom: 2px solid #141414;
      padding: 0.75rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .pack-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .pack-tab-btn {
      font-family: "JetBrains Mono", monospace;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      border: 2px solid #141414;
      border-radius: 6px;
      background: #F4F1EA;
      color: #141414;
      cursor: pointer;
      box-shadow: 2px 2px 0px #141414;
    }
    .pack-tab-btn.active {
      background: #FFD23F;
    }
    .chapter-pane { display: none; }
    .chapter-pane.active { display: block; }
  </style>
</head>
<body>
  <header class="pack-topbar">
    <div>
      <strong style="font-family:'Space Grotesk',sans-serif;font-size:1rem;">${
        project.metadata.title || project.title
      }</strong>
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#666;margin-left:0.5rem;">by ${
        project.metadata.author || 'Author'
      }</span>
    </div>
    <nav class="pack-tabs">
      ${chapterLinks
        .map(
          (ch, idx) =>
            `<button class="pack-tab-btn ${
              idx === 0 ? 'active' : ''
            }" data-target="ch-pane-${idx}" type="button">${idx + 1}. ${ch.title}</button>`
        )
        .join('\n      ')}
    </nav>
  </header>

  <div class="book-wrapper">
    ${chapterLinks
      .map(
        (ch, idx) => `
      <article id="ch-pane-${idx}" class="chapter-pane ${idx === 0 ? 'active' : ''}">
        ${ch.htmlBody}
      </article>`
      )
      .join('\n')}
    ${colophonHtml}
  </div>

  <script src="assets/reader.js"></script>
  <script>
    document.querySelectorAll('.pack-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.pack-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.chapter-pane').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  </script>
</body>
</html>`;

  zip.file('index.html', indexHtml);
  zip.file(
    'README.txt',
    `WYZARD HTML PUBLICATION PACK\n============================\nTitle: ${
      project.metadata.title || project.title
    }\nAuthor: ${
      project.metadata.author
    }\n\nOpen index.html in any modern browser to read the publication offline.\nIndividual chapters are located in /chapters and shared stylesheets/scripts/media in /assets.\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const slug =
    project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'wyzard-publication';
  saveAs(blob, `${slug}-html-pack.zip`);
}

/**
 * Helper to load an image URL/dataURI with CORS fallback for Canvas rendering.
 */
function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Word-wraps text inside a 2D canvas context and returns the new Y coordinate.
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 40
): number {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  let line = '';
  let curY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n];
      curY += lineHeight;
      linesCount++;
      if (linesCount >= maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (line && linesCount < maxLines) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

/**
 * Renders a single PaginatedPage onto a high-DPI HTML5 Canvas and returns a PNG Data URL.
 * Used by both the In-App .CBZ Comic Reader Engine and the .CBZ Archive Exporter.
 */
export async function renderPageGrabToCanvasDataUrl(
  page: PaginatedPage,
  project: BookProject,
  totalPages: number,
  scale = 1.5
): Promise<string> {
  const { preset } = page;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(preset.width * scale);
  canvas.height = Math.round(preset.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Canvas design system: 'plain' = blank neutral page, otherwise the Wyzard editorial look
  const plain = project.designSystem === 'plain';
  const T = plain
    ? {
        sans: 'Arial, Helvetica, sans-serif',
        head: 'Arial, Helvetica, sans-serif',
        mono: 'Arial, Helvetica, sans-serif',
        ink: '#111111',
        line: '#D1D5DB',
        lw: 1,
        accent: '#9CA3AF',
        quoteBg: '#F3F4F6',
        paper: '#F3F4F6',
        box: '#F9FAFB',
      }
    : {
        sans: '"Plus Jakarta Sans", sans-serif',
        head: '"Space Grotesk", sans-serif',
        mono: '"JetBrains Mono", monospace',
        ink: '#141414',
        line: '#141414',
        lw: 2,
        accent: '#FF5E3A',
        quoteBg: '#FFF9DB',
        paper: '#F4F1EA',
        box: '#FAF9F6',
      };

  // Fixed-layout book pages use the authored regions (margins, header, footer) instead of the comic folio
  const fxPage = page.fixed && project.pageSetup ? project.chapters[page.chapterIndex] : null;
  const fx = fxPage ? getPageRegions(project.pageSetup!, fxPage) : null;

  // 1. Paper Background & Neo-Brutalist Comic Frame
  ctx.fillStyle = fxPage?.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, preset.width, preset.height);

  if (!plain && !fx) {
    ctx.strokeStyle = T.line;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, preset.width - 12, preset.height - 12);
  }

  const padX = fx ? fx.body.x : preset.paddingX;
  const padY = preset.paddingY;
  const contentW = fx ? fx.body.w : preset.width - padX * 2;

  if (fx) {
    const tok = getPageContext(project, page.chapterIndex);
    if (fx.header) drawZoneOnCanvas(ctx, fx.header.zone, tok, fx.header);
    if (fx.footer) drawZoneOnCanvas(ctx, fx.footer.zone, tok, fx.footer);
  } else {
  // 2. Top Folio Bar (comic exports) or the authored header / footer (fixed-layout books)
    ctx.fillStyle = '#555555';
    ctx.font = `bold 10px ${T.mono}`;
    ctx.textBaseline = 'top';
    ctx.fillText(
      (project.metadata.title || project.title).toUpperCase().slice(0, 38),
      padX,
      padY - 12
    );
    const chapLabel = page.chapterTitle.toUpperCase().slice(0, 32);
    const chapW = ctx.measureText(chapLabel).width;
    ctx.fillText(chapLabel, preset.width - padX - chapW, padY - 12);
  
    ctx.strokeStyle = T.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padX, padY + 4);
    ctx.lineTo(preset.width - padX, padY + 4);
    ctx.stroke();
  }

  let curY = fx ? fx.body.y : padY + 18;
  ctx.textBaseline = 'top';
  const maxBottomY = fx ? fx.body.y + fx.body.h : preset.height - padY - 22;

  // 3. Render each block item on this page grab
  for (const item of page.items) {
    if (curY >= maxBottomY - 16) break;
    const node = item.node;
    const p = node.props || {};
    const availH = Math.max(60, maxBottomY - curY);

    switch (node.type) {
      case 'TypographyBlock':
      case 'EditorialTypography': {
        const variant = p.variant || 'body';
        const text = htmlToPlainText(String(p.htmlContent || p.text || ''));
        let fam: string | null = null;
        if (typeof p.googleFont === 'string' && p.googleFont.trim()) {
          fam = googleFontStack(p.googleFont);
          loadGoogleFont(p.googleFont);
          try {
            await document.fonts.load(`16px "${p.googleFont.replace(/"/g, '')}"`);
          } catch {
            // fall back to the generic family if the web font can't load
          }
        }
        if (variant === 'h1') {
          ctx.fillStyle = p.color || '#141414';
          ctx.font = `bold 28px ${fam || T.head}`;
          curY = drawWrappedText(ctx, text, padX, curY, contentW, 34, 6) + 12;
        } else if (variant === 'h2') {
          ctx.fillStyle = p.color || '#141414';
          ctx.font = `bold 22px ${fam || T.head}`;
          curY = drawWrappedText(ctx, text, padX, curY, contentW, 28, 6) + 10;
        } else if (variant === 'h3') {
          ctx.fillStyle = p.color || '#141414';
          ctx.font = `bold 18px ${fam || T.head}`;
          curY = drawWrappedText(ctx, text, padX, curY, contentW, 24, 6) + 8;
        } else if (variant === 'pullquote') {
          ctx.fillStyle = T.quoteBg;
          const estH = Math.min(availH, Math.max(54, item.estimatedHeight - 12));
          ctx.fillRect(padX, curY, contentW, estH);
          ctx.fillStyle = T.accent;
          ctx.fillRect(padX, curY, 5, estH);
          ctx.fillStyle = T.ink;
          ctx.font = `italic bold 17px ${fam || T.head}`;
          curY = drawWrappedText(ctx, `"${text}"`, padX + 16, curY + 12, contentW - 28, 23, 6) + 18;
        } else {
          ctx.fillStyle = p.color || '#222222';
          ctx.font =
            variant === 'lead'
              ? `500 17px ${fam || T.sans}`
              : `400 15px ${fam || T.sans}`;
          curY =
            drawWrappedText(
              ctx,
              text,
              padX,
              curY,
              contentW,
              variant === 'lead' ? 25 : 22,
              Math.max(2, Math.floor(availH / 22))
            ) + 12;
        }
        break;
      }

      case 'ImageBlock':
      case 'ArtDirectedImage': {
        const ratio = parseAspectRatioValue(p.aspectRatio || '4/5');
        const boxH = Math.min(availH - (p.caption ? 24 : 8), Math.round(contentW / ratio));
        if (boxH > 40) {
          // Neo shadow
          if (!plain) {
            ctx.fillStyle = T.ink;
            ctx.fillRect(padX + 4, curY + 4, contentW, boxH);
          }
          ctx.fillStyle = T.paper;
          ctx.fillRect(padX, curY, contentW, boxH);

          const img = await loadImageForCanvas(p.src || '');
          if (img) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(padX, curY, contentW, boxH);
            ctx.clip();
            const imgRatio = img.width / Math.max(1, img.height);
            const targetRatio = contentW / boxH;
            let drawW = contentW;
            let drawH = boxH;
            let drawX = padX;
            let drawY = curY;
            if (p.fit === 'contain') {
              if (imgRatio > targetRatio) {
                drawH = contentW / imgRatio;
                drawY = curY + (boxH - drawH) / 2;
              } else {
                drawW = boxH * imgRatio;
                drawX = padX + (contentW - drawW) / 2;
              }
            } else {
              if (imgRatio > targetRatio) {
                drawW = boxH * imgRatio;
                drawX = padX - (drawW - contentW) / 2;
              } else {
                drawH = contentW / imgRatio;
                drawY = curY - (drawH - boxH) / 2;
              }
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();
          } else {
            ctx.fillStyle = '#888';
            ctx.font = `bold 12px ${T.mono}`;
            ctx.fillText(`[IMAGE: ${p.alt || 'Visual Plate'}]`, padX + 16, curY + boxH / 2 - 6);
          }

          ctx.strokeStyle = T.line;
          ctx.lineWidth = T.lw;
          ctx.strokeRect(padX, curY, contentW, boxH);
          curY += boxH + 8;

          if (p.caption) {
            ctx.fillStyle = '#555555';
            ctx.font = `11px ${T.mono}`;
            ctx.fillText(String(p.caption).slice(0, 75), padX, curY);
            curY += 18;
          }
          curY += 8;
        }
        break;
      }

      case 'FreeformCanvasBlock':
      case 'FreeformCanvas': {
        const fbW = contentW * (getArtboardWidthPct(p.artboardWidth) / 100);
        const fbX = padX + (contentW - fbW) / 2;
        const boardH = getArtboardHeightRatio(p.aspectRatio || '16/9', p.artboardHeight);
        const boxH = Math.min(availH - (p.caption ? 24 : 8), Math.round(fbW * boardH));
        if (boxH > 40) {
          const isTransparentBg = p.backgroundType === 'transparent';
          if (!isTransparentBg) {
            if (!plain) {
              ctx.fillStyle = T.ink;
              ctx.fillRect(fbX + 4, curY + 4, fbW, boxH);
            }
            ctx.fillStyle = p.backgroundColor || T.paper;
            ctx.fillRect(fbX, curY, fbW, boxH);
          }

          if (p.backgroundType === 'image' && p.backgroundImage) {
            const bgArtImg = await loadImageForCanvas(p.backgroundImage);
            if (bgArtImg) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(fbX, curY, fbW, boxH);
              ctx.clip();
              ctx.drawImage(bgArtImg, fbX, curY, fbW, boxH);
              ctx.restore();
            }
          }

          const layers: any[] = (p.layers || []).filter((l: any) => !l.hidden);
          for (const layer of layers) {
            const lx = fbX + (layer.x / 100) * fbW;
            const ly = curY + (layer.y / 100) * boxH;
            const lw = (layer.width / 100) * fbW;
            const lh = (layer.height / 100) * boxH;

            ctx.save();
            ctx.globalAlpha = (layer.opacity ?? 100) / 100;
            const cx = lx + lw / 2;
            const cy = ly + lh / 2;
            ctx.translate(cx, cy);
            if (layer.rotation) {
              ctx.rotate((layer.rotation * Math.PI) / 180);
            }
            if (layer.flipX || layer.flipY) {
              ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
            }
            ctx.translate(-cx, -cy);

            if (layer.type === 'image' && layer.imageSrc) {
              const lImg = await loadImageForCanvas(layer.imageSrc);
              if (lImg) {
                ctx.drawImage(lImg, lx, ly, lw, lh);
              }
            } else if (layer.type === 'path' && Array.isArray(layer.points) && layer.points.length > 1) {
              ctx.strokeStyle = layer.strokeColor || '#141414';
              ctx.lineWidth = layer.strokeWidth || 3;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              layer.points.forEach((pt: any, idx: number) => {
                const px = lx + (pt.x / 100) * lw;
                const py = ly + (pt.y / 100) * lh;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              });
              if (layer.closed) {
                ctx.closePath();
                if (layer.fill && layer.fill !== 'transparent') {
                  ctx.fillStyle = layer.fill;
                  ctx.fill();
                }
              }
              ctx.stroke();
            } else {
              if (layer.fill && layer.fill !== 'transparent') {
                ctx.fillStyle = layer.fill;
                ctx.fillRect(lx, ly, lw, lh);
              }
              if (layer.borderNeo) {
                ctx.strokeStyle = T.line;
                ctx.lineWidth = T.lw;
                ctx.strokeRect(lx, ly, lw, lh);
              }
              if (layer.text) {
                ctx.fillStyle = layer.color || '#141414';
                ctx.font = `bold ${layer.fontSize || 14}px ${T.head}`;
                drawWrappedText(ctx, String(layer.text), lx + 6, ly + 8, Math.max(40, lw - 12), (layer.fontSize || 14) * 1.25, 4);
              }
            }
            ctx.restore();
          }

          if (!isTransparentBg) {
            ctx.strokeStyle = T.line;
            ctx.lineWidth = T.lw;
            ctx.strokeRect(fbX, curY, fbW, boxH);
          }
          curY += boxH + 8;

          if (p.caption) {
            ctx.fillStyle = '#555555';
            ctx.font = `11px ${T.mono}`;
            ctx.fillText(String(p.caption).slice(0, 75), fbX, curY);
            curY += 18;
          }
          curY += 8;
        }
        break;
      }

      case 'TableBlock':
      case 'Table': {
        const grid: string[][] = (Array.isArray(p.rows) ? p.rows : []).map((r: any) =>
          Array.isArray(r) ? r.map((c: any) => String(c ?? '')) : []
        );
        const cols = Math.max(1, ...grid.map((r) => r.length));
        const rowH = 26;
        const maxRows = Math.max(1, Math.floor((availH - 8) / rowH));
        const shown = grid.slice(0, maxRows);
        const widthsPct: number[] =
          Array.isArray(p.columnWidths) && p.columnWidths.length === cols
            ? p.columnWidths
            : Array.from({ length: cols }, () => 100 / cols);
        const widthTotal = widthsPct.reduce((a: number, b: number) => a + b, 0) || 100;
        const headerRow = p.headerRow !== false;
        shown.forEach((row, r) => {
          let x = padX;
          for (let c = 0; c < cols; c++) {
            const cw = (widthsPct[c] / widthTotal) * contentW;
            const isHead = (headerRow && r === 0) || (!!p.headerColumn && c === 0);
            if (isHead) {
              ctx.fillStyle = T.paper;
              ctx.fillRect(x, curY + r * rowH, cw, rowH);
            }
            ctx.strokeStyle = T.line;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, curY + r * rowH, cw, rowH);
            ctx.fillStyle = T.ink;
            ctx.font = `${isHead ? 'bold ' : ''}12px ${T.sans}`;
            let label = (row[c] || '').replace(/\$/g, '');
            while (label.length > 1 && ctx.measureText(label).width > cw - 12) label = label.slice(0, -2) + '…';
            ctx.fillText(label, x + 6, curY + r * rowH + 7);
            x += cw;
          }
        });
        curY += shown.length * rowH + 8;
        if (p.caption) {
          ctx.fillStyle = '#555555';
          ctx.font = `11px ${T.mono}`;
          ctx.fillText(String(p.caption).slice(0, 75), padX, curY);
          curY += 18;
        }
        curY += 8;
        break;
      }

      case 'HeroSpreadBlock':
      case 'MagazineHeroSpread': {
        const boxH = Math.min(availH - 12, 280);
        if (boxH > 60) {
          if (!plain) {
            ctx.fillStyle = T.ink;
            ctx.fillRect(padX + 4, curY + 4, contentW, boxH);
          }
          ctx.fillStyle = '#1E1E1E';
          ctx.fillRect(padX, curY, contentW, boxH);

          const bgImg = await loadImageForCanvas(p.backgroundImage || '');
          if (bgImg) {
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.drawImage(bgImg, padX, curY, contentW, boxH);
            ctx.restore();
          }

          // Floating card inside hero
          const cardW = Math.min(contentW - 36, 420);
          const cardH = Math.min(boxH - 32, 165);
          const cardX = padX + 18;
          const cardY = curY + boxH - cardH - 16;

          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillRect(cardX, cardY, cardW, cardH);
          ctx.strokeStyle = T.line;
          ctx.lineWidth = T.lw;
          ctx.strokeRect(cardX, cardY, cardW, cardH);

          let ty = cardY + 12;
          if (p.kicker) {
            ctx.fillStyle = T.accent;
            ctx.font = `bold 10px ${T.mono}`;
            ctx.fillText(String(p.kicker).toUpperCase(), cardX + 14, ty);
            ty += 16;
          }
          ctx.fillStyle = T.ink;
          ctx.font = `bold 19px ${T.head}`;
          ty = drawWrappedText(ctx, String(p.title || ''), cardX + 14, ty, cardW - 28, 23, 3) + 4;
          if (p.subtitle && ty < cardY + cardH - 18) {
            ctx.fillStyle = '#444444';
            ctx.font = `12px ${T.sans}`;
            drawWrappedText(ctx, String(p.subtitle), cardX + 14, ty, cardW - 28, 16, 2);
          }

          ctx.strokeStyle = T.line;
          ctx.lineWidth = T.lw;
          ctx.strokeRect(padX, curY, contentW, boxH);
          curY += boxH + 14;
        }
        break;
      }

      case 'CalloutCardBlock':
      case 'CalloutCard': {
        const boxH = Math.min(availH - 10, Math.max(76, item.estimatedHeight - 10));
        const bgMap: Record<string, string> = plain
          ? { yellow: '#F3F4F6', vermilion: '#F3F4F6', teal: '#F3F4F6', violet: '#F3F4F6', ink: '#374151' }
          : {
              yellow: '#FFF9DB',
              vermilion: '#FFEAE4',
              teal: '#E6FBF5',
              violet: '#F5EDFD',
              ink: '#141414',
            };
        if (!plain) {
          ctx.fillStyle = T.ink;
          ctx.fillRect(padX + 3, curY + 3, contentW, boxH);
        }
        ctx.fillStyle = bgMap[p.accent || 'yellow'] || '#FFF9DB';
        ctx.fillRect(padX, curY, contentW, boxH);
        ctx.strokeStyle = T.line;
        ctx.lineWidth = T.lw;
        ctx.strokeRect(padX, curY, contentW, boxH);

        const fg = p.accent === 'ink' ? '#FFFFFF' : '#141414';
        ctx.fillStyle = fg;
        ctx.font = `bold 11px ${T.mono}`;
        ctx.fillText(String(p.title || 'NOTE').toUpperCase(), padX + 14, curY + 12);
        ctx.font = `13.5px ${T.sans}`;
        drawWrappedText(ctx, String(p.content || ''), padX + 14, curY + 32, contentW - 28, 19, 4);
        curY += boxH + 14;
        break;
      }

      case 'OrnamentDividerBlock':
      case 'OrnamentDivider': {
        ctx.fillStyle = T.ink;
        ctx.font = `bold 14px ${T.mono}`;
        const orn = '✦   ✦   ✦';
        const ow = ctx.measureText(orn).width;
        ctx.fillText(orn, padX + (contentW - ow) / 2, curY + 12);
        curY += 40;
        break;
      }

      default: {
        // Fallback summary box for interactive blocks (Accordion, Gallery, Audio, Split)
        const boxH = Math.min(availH - 10, Math.max(72, Math.min(180, item.estimatedHeight - 12)));
        ctx.fillStyle = T.box;
        ctx.fillRect(padX, curY, contentW, boxH);
        ctx.strokeStyle = T.line;
        ctx.lineWidth = T.lw;
        ctx.strokeRect(padX, curY, contentW, boxH);

        const label =
          p.title ||
          p.trackTitle ||
          p.caption ||
          node.type.replace(/Block$/, '').toUpperCase();
        ctx.fillStyle = T.ink;
        ctx.font = `bold 13px ${T.head}`;
        ctx.fillText(String(label).slice(0, 55), padX + 14, curY + 14);

        const sub =
          p.content ||
          p.narrator ||
          (node.children?.length
            ? `${node.children.length}-Column Adaptive Grid Layout`
            : 'Interactive Module');
        ctx.fillStyle = '#555555';
        ctx.font = `12.5px ${T.sans}`;
        drawWrappedText(ctx, String(sub), padX + 14, curY + 36, contentW - 28, 18, 4);
        curY += boxH + 12;
        break;
      }
    }
  }

  if (!fx) {
  // 4. Bottom Folio Bar
    const footY = preset.height - padY + 2;
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, footY - 6);
    ctx.lineTo(preset.width - padX, footY - 6);
    ctx.stroke();
  
    ctx.fillStyle = '#666666';
    ctx.font = `bold 10px ${T.mono}`;
    ctx.fillText(preset.shortLabel.toUpperCase(), padX, footY);
    const pgText = `PAGE ${page.pageNumber} / ${totalPages}`;
    const pgW = ctx.measureText(pgText).width;
    ctx.fillText(pgText, preset.width - padX - pgW, footY);
  }

  return canvas.toDataURL('image/png');
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const bstr = atob(parts[1] || '');
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8[i] = bstr.charCodeAt(i);
  }
  return u8;
}

/**
 * Exports the entire project as a Comic Book Archive (.cbz) file containing:
 * - High-resolution rendered PNG plates (001.png, 002.png, ...)
 * - Standard ComicInfo.xml metadata (including contributor credits)
 */
export async function exportToCbz(
  project: BookProject,
  ratioKey: ScreenRatioKey = 'comic',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const pages = paginateProjectForViewport(project, ratioKey);
  const zip = new JSZip();

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const dataUrl = await renderPageGrabToCanvasDataUrl(
      pages[i],
      project,
      pages.length,
      1.75
    );
    if (dataUrl) {
      const pageNumPadded = String(i + 1).padStart(3, '0');
      zip.file(`${pageNumPadded}.png`, dataUrlToUint8Array(dataUrl));
    }
  }

  const creditsSummary = (project.metadata.attributions || [])
    .map((a) => `${a.title} by ${a.creator} (${a.license})`)
    .join('; ');

  const comicInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Title>${escapeXml(project.metadata.title || project.title)}</Title>
  <Writer>${escapeXml(project.metadata.author || 'Author')}</Writer>
  <Publisher>${escapeXml(project.metadata.publisher || 'Wyzard Studio')}</Publisher>
  <Summary>${escapeXml(
    project.metadata.description ||
      `Compiled with Wyzard Comic & Visual Layout Studio.${
        creditsSummary ? ` Credits: ${creditsSummary}` : ''
      }`
  )}</Summary>
  <PageCount>${pages.length}</PageCount>
  <LanguageISO>${escapeXml(project.metadata.language || 'en')}</LanguageISO>
</ComicInfo>`;

  zip.file('ComicInfo.xml', comicInfoXml);

  const blob = await zip.generateAsync({ type: 'blob' });
  const slug =
    project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'wyzard-comic';
  saveAs(blob, `${slug}.cbz`);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
