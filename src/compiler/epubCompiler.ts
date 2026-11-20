import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BookProject, Chapter, CanvasDesignSystem } from '../types/ast';
import { parseCraftState, type ParsedBlockNode } from './astParser';
import { getArtboardHeightRatio } from '../utils/artboard';
import { extractMath, renderMathInText, unescapeHtml } from '../utils/math';
import { getExportContext, withExportContext } from './exportContext';
import { titlePageHtml, copyrightHtml, tocHtml, BOOK_FEATURES_EPUB_CSS } from './bookFeaturesHtml';
import { buildTocEntries, getPrintedNumber } from '../utils/pageLayout';
import { paginateProjectForViewport, renderPageGrabToCanvasDataUrl } from './multiFormatExporter';

/**
 * Escapes characters for strict XML / XHTML compliance.
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a parsed AST node into strict XHTML5 with progressive fallbacks.
 */
/**
 * Rich-text HTML from the editor → a safe, well-formed XHTML subset: bold / italic / underline /
 * highlight (from inline styles or tags), links (http, mailto, tel, #anchor) and line breaks.
 * Everything else is dropped and all text is escaped.
 */
function inlineXhtml(html: string): string {
  const out: string[] = [];
  const spanStack: string[][] = []; // closing tags to emit for each open <span>
  const safeHref = (raw: string) => (/^(https?:|mailto:|tel:|#)/i.test(raw.trim()) ? raw.trim() : '');

  html.split(/(<[^>]*>)/g).forEach((part) => {
    if (!part) return;
    if (!part.startsWith('<')) {
      out.push(escapeXml(unescapeHtml(part)));
      return;
    }
    const m = /^<(\/?)([a-z0-9]+)([^>]*?)(\/?)>$/i.exec(part);
    if (!m) return;
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const attrs = m[3] || '';

    if (name === 'br') {
      if (!closing) out.push('<br/>');
    } else if (name === 'b' || name === 'strong') {
      out.push(closing ? '</strong>' : '<strong>');
    } else if (name === 'i' || name === 'em') {
      out.push(closing ? '</em>' : '<em>');
    } else if (name === 'u') {
      out.push(closing ? '</u>' : '<u>');
    } else if (name === 'mark') {
      out.push(closing ? '</mark>' : '<mark>');
    } else if (name === 'a') {
      if (closing) {
        out.push('</a>');
      } else {
        const href = /href="([^"]*)"/i.exec(attrs)?.[1];
        out.push(href && safeHref(unescapeHtml(href)) ? `<a href="${escapeXml(safeHref(unescapeHtml(href)))}">` : '<a>');
      }
    } else if (name === 'span') {
      if (closing) {
        (spanStack.pop() || []).forEach((t) => out.push(t));
      } else {
        const style = /style="([^"]*)"/i.exec(attrs)?.[1] || '';
        const opens: string[] = [];
        const closes: string[] = [];
        const wrap = (open: string, close: string) => {
          opens.push(open);
          closes.unshift(close);
        };
        if (/font-weight:\s*(bold|[6-9]00)/i.test(style)) wrap('<strong>', '</strong>');
        if (/font-style:\s*italic/i.test(style)) wrap('<em>', '</em>');
        if (/text-decoration[^;]*underline/i.test(style)) wrap('<u>', '</u>');
        const bg = /background-color:\s*([^;]+)/i.exec(style)?.[1]?.replace(/\s/g, '').toLowerCase();
        if (bg && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)' && bg !== 'initial') wrap('<mark>', '</mark>');
        opens.forEach((t) => out.push(t));
        spanStack.push(closes);
      }
    }
    // any other tag is dropped
  });
  while (spanStack.length) (spanStack.pop() || []).forEach((t) => out.push(t));
  return out.join('');
}

/** Plain text → XHTML-safe text with `$…$` LaTeX rendered as MathML. */
function epubText(value: string): string {
  return renderMathInText(value, 'mathml');
}

function renderEpubNode(node: ParsedBlockNode): string {
  const p = node.props;

  switch (node.type) {
    case 'TypographyBlock':
    case 'EditorialTypography': {
      const variant = p.variant || 'body';
      const mathParts = extractMath(p.htmlContent || p.text || '', 'mathml');
      const text = mathParts.restore(inlineXhtml(mathParts.text));
      const keepTogether = p.keepTogetherOnPageTurn ? 'page-break-avoid' : '';
      const dropCap = p.dropCap && variant === 'body' ? 'drop-cap' : '';

      switch (variant) {
        case 'h1':
          return `<h1 class="epub-h1 ${keepTogether}">${text}</h1>`;
        case 'h2':
          return `<h2 class="epub-h2 ${keepTogether}">${text}</h2>`;
        case 'h3':
          return `<h3 class="epub-h3 ${keepTogether}">${text}</h3>`;
        case 'lead':
          return `<p class="epub-lead ${keepTogether}">${text}</p>`;
        case 'pullquote':
          return `<blockquote class="epub-pullquote ${keepTogether}"><p>${text}</p></blockquote>`;
        case 'body':
        default:
          return `<p class="epub-body ${dropCap} ${keepTogether}">${text}</p>`;
      }
    }

    case 'ImageBlock':
    case 'ArtDirectedImage': {
      const src = escapeXml(p.src || '');
      const alt = escapeXml(p.alt || 'Editorial Image');
      const caption = escapeXml(p.caption || '');
      const keepTogether = p.keepTogetherOnPageTurn ? 'page-break-avoid' : '';

      return `
        <figure class="epub-figure ${keepTogether}">
          <img src="${src}" alt="${alt}" class="epub-img" />
          ${caption ? `<figcaption class="epub-caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }

    case 'HeroSpreadBlock':
    case 'MagazineHeroSpread': {
      const bg = escapeXml(p.backgroundImage || '');
      const kicker = escapeXml(p.kicker || '');
      const title = escapeXml(p.title || '');
      const subtitle = escapeXml(p.subtitle || '');
      const author = escapeXml(p.author || '');

      return `
        <div class="epub-hero-spread page-break-avoid">
          ${bg ? `<img src="${bg}" alt="${title}" class="hero-bg-img" />` : ''}
          <div class="hero-card">
            ${kicker ? `<div class="hero-kicker">${kicker}</div>` : ''}
            <h1 class="hero-title">${title}</h1>
            ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>` : ''}
            ${author ? `<div class="hero-author">${author}</div>` : ''}
          </div>
        </div>
      `;
    }

    case 'SplitContainer':
    case 'AdaptiveSplitContainer': {
      const ratio: string = p.desktopRatio || '60/40';
      const cellCount =
        ratio === '25/25/25/25' || ratio === 'bento-2x2'
          ? 4
          : ['33/33/33', '50/25/25', '25/50/25', '25/25/50'].includes(ratio)
          ? 3
          : 2;

      const colsXhtml = node.children
        .slice(0, cellCount)
        .map(
          (colNode) =>
            `<div class="epub-column">${colNode.children.map(renderEpubNode).join('\n')}</div>`
        )
        .join('\n          ');

      return `
        <div class="epub-split-spread">
          ${colsXhtml}
        </div>
      `;
    }

    case 'CalloutCardBlock':
    case 'CalloutCard': {
      const title = escapeXml(p.title || '');
      const content = epubText(p.content || '');
      return `
        <aside class="epub-callout page-break-avoid">
          <div class="callout-header"><strong>${title}</strong></div>
          <div class="callout-body"><p>${content}</p></div>
        </aside>
      `;
    }

    case 'OrnamentDividerBlock':
    case 'OrnamentDivider': {
      return `<div class="epub-divider"><p>✦ ✦ ✦</p></div>`;
    }

    case 'AccordionBlock':
    case 'InteractiveAccordion': {
      const title = escapeXml(p.title || '');
      const badge = escapeXml(p.badge || 'NOTE');
      const content = epubText(p.content || '');

      return `
        <details class="epub-accordion page-break-avoid">
          <summary class="accordion-summary"><strong>[${badge}] ${title}</strong></summary>
          <div class="accordion-content"><p>${content}</p></div>
        </details>
      `;
    }

    case 'HotspotPinboardBlock':
    case 'HotspotPinboard': {
      const src = escapeXml(p.imageSrc || '');
      const alt = escapeXml(p.alt || 'Annotated Diagram');
      const caption = escapeXml(p.caption || '');
      const pins: any[] = p.pins || [];

      return `
        <figure class="epub-hotspot-pinboard page-break-avoid">
          <img src="${src}" alt="${alt}" class="epub-img" />
          ${caption ? `<figcaption class="epub-caption">${caption}</figcaption>` : ''}
          <aside class="epub-footnotes" epub:type="footnotes">
            <h5 class="footnotes-title">Annotated Reference Points:</h5>
            <ol class="footnotes-list">
              ${pins
                .map(
                  (pin) => `
                <li><strong>${escapeXml(pin.title)}:</strong> ${escapeXml(pin.description)}</li>
              `
                )
                .join('\n')}
            </ol>
          </aside>
        </figure>
      `;
    }

    case 'VisualGalleryBlock':
    case 'VisualGallery': {
      const slides: any[] = p.slides || [];
      return `
        <div class="epub-gallery-stack page-break-avoid">
          ${slides
            .map(
              (slide) => `
            <figure class="gallery-plate">
              <img src="${escapeXml(slide.imageSrc)}" alt="${escapeXml(slide.title)}" class="epub-img" />
              <figcaption class="epub-caption"><strong>${escapeXml(slide.title)}:</strong> ${escapeXml(slide.caption)}</figcaption>
            </figure>
          `
            )
            .join('\n')}
        </div>
      `;
    }

    case 'TitlePageBlock': {
      const ctx = getExportContext();
      return ctx.project ? titlePageHtml(ctx.project, p, 'epub') : '';
    }

    case 'CopyrightBlock': {
      const ctx = getExportContext();
      return ctx.project ? copyrightHtml(ctx.project, p) : '';
    }

    case 'TocBlock': {
      const ctx = getExportContext();
      return ctx.project ? tocHtml(ctx.project, p, ctx.hrefFor) : '';
    }

    case 'TableBlock':
    case 'Table': {
      const grid: string[][] = (Array.isArray(p.rows) && p.rows.length ? p.rows : [['']]).map((r: any) =>
        Array.isArray(r) ? r.map((c: any) => String(c ?? '')) : []
      );
      const cols = Math.max(1, ...grid.map((r) => r.length));
      const headerRow = p.headerRow !== false;
      const headerColumn = !!p.headerColumn;
      const aligns: string[] = Array.isArray(p.columnAlign) ? p.columnAlign : [];
      const body = grid
        .map((row, r) => {
          const cells = Array.from({ length: cols }, (_, c) => {
            const isHead = (headerRow && r === 0) || (headerColumn && c === 0);
            const tag = isHead ? 'th' : 'td';
            const align = aligns[c] && aligns[c] !== 'left' ? ` style="text-align:${aligns[c]}"` : '';
            return `<${tag}${align}>${epubText(row[c] || '')}</${tag}>`;
          }).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('\n');
      const caption = p.caption ? `<figcaption class="epub-caption">${escapeXml(String(p.caption))}</figcaption>` : '';
      return `
        <figure class="epub-table-figure page-break-avoid">
          <table class="epub-table"><tbody>${body}</tbody></table>
          ${caption}
        </figure>
      `;
    }

    case 'AudioNarrationBlock':
    case 'AudioNarration': {
      const src = escapeXml(p.audioSrc || '');
      const title = escapeXml(p.trackTitle || 'Audio Narration');
      const narrator = escapeXml(p.narrator || '');

      return `
        <div class="epub-audio-card page-break-avoid">
          <p><strong>🎧 ${title}</strong> (${narrator})</p>
          ${src ? `<audio controls="controls" src="${src}"><p>Audio playback is supported in EPUB 3 compatible readers.</p></audio>` : '<p><em>(Audio media available online)</em></p>'}
        </div>
      `;
    }

    case 'FreeformCanvasBlock':
    case 'FreeformCanvas': {
      const ratio = p.aspectRatio || '16/9';
      const bg = escapeXml(p.backgroundColor || '#F4F1EA');
      const caption = escapeXml(p.caption || '');
      const layers: any[] = p.layers || [];

      const viewH = Math.round(1000 * getArtboardHeightRatio(ratio, p.artboardHeight));

      const svgNodes = layers
        .filter((layer) => !layer.hidden)
        .map((layer) => {
          const x = Math.round(((layer.x || 0) / 100) * 1000);
          const y = Math.round(((layer.y || 0) / 100) * viewH);
          const w = Math.round(((layer.width || 20) / 100) * 1000);
          const h = Math.round(((layer.height || 20) / 100) * viewH);
          const cx = Math.round(x + w / 2);
          const cy = Math.round(y + h / 2);
          const rot = layer.rotation || 0;
          const transformAttr = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';

          if (layer.type === 'path' && Array.isArray(layer.points) && layer.points.length > 0) {
            const pts = layer.points
              .map(
                (pt: any, i: number) =>
                  `${i === 0 ? 'M' : 'L'} ${Math.round(x + (pt.x / 100) * w)} ${Math.round(
                    y + (pt.y / 100) * h
                  )}`
              )
              .join(' ');
            const d = layer.closed ? `${pts} Z` : pts;
            const fill =
              layer.closed && layer.fill && layer.fill !== 'transparent'
                ? escapeXml(layer.fill)
                : 'none';
            return `<path d="${d}" fill="${fill}" stroke="${escapeXml(
              layer.strokeColor || '#141414'
            )}" stroke-width="${(layer.strokeWidth || 3) * 2}" stroke-linecap="round" stroke-linejoin="round"${transformAttr} />`;
          }

          if (layer.type === 'image' && layer.imageSrc) {
            return `<image href="${escapeXml(layer.imageSrc)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${transformAttr} />`;
          }

          const fill =
            layer.fill && layer.fill !== 'transparent'
              ? escapeXml(layer.fill)
              : 'none';
          const stroke = layer.borderNeo ? ' stroke="#141414" stroke-width="4"' : '';
          const rx =
            layer.shapeKind === 'circle' || layer.shapeKind === 'pill'
              ? Math.round(Math.min(w, h) / 2)
              : 12;

          const shapeEl =
            fill !== 'none' || layer.borderNeo
              ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke} />`
              : '';

          const textEl = layer.text
            ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(
                layer.color || '#141414'
              )}" font-family="sans-serif" font-weight="bold" font-size="${Math.round(
                (layer.fontSize || 16) * 1.6
              )}">${escapeXml(layer.text)}</text>`
            : '';

          return `<g${transformAttr}>${shapeEl}${textEl}</g>`;
        })
        .join('\n            ');

      return `
        <figure class="epub-figure page-break-avoid">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${viewH}" width="100%">
            <rect x="0" y="0" width="1000" height="${viewH}" fill="${bg}" stroke="#141414" stroke-width="6" rx="16" />
            ${svgNodes}
          </svg>
          ${caption ? `<figcaption class="epub-caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }

    default:
      return node.children.map(renderEpubNode).join('\n');
  }
}

/**
 * Builds the strict XHTML document for a single chapter.
 */
const KIND_EPUB_TYPE: Record<string, { type: string; role?: string }> = {
  cover: { type: 'cover' },
  title: { type: 'titlepage' },
  copyright: { type: 'copyright-page' },
  dedication: { type: 'dedication', role: 'doc-dedication' },
  preface: { type: 'preface', role: 'doc-preface' },
  toc: { type: 'frontmatter' },
  backCover: { type: 'backmatter' },
};

function buildChapterXhtml(
  chapter: Chapter,
  project: BookProject,
  pageIndex: number,
  coverFile?: string
): string {
  const isFixed = project.layoutMode === 'fixed';
  const parsedNodes = chapter.craftStateJson ? parseCraftState(chapter.craftStateJson) : [];
  const bodyContent =
    isFixed && chapter.kind === 'cover' && coverFile
      ? `<div class="epub-cover"><img src="../images/${coverFile}" alt="Cover"/></div>`
      : withExportContext({ project, hrefFor: (i) => `chapter-${i + 1}.xhtml` }, () =>
          parsedNodes.map(renderEpubNode).join('\n')
        );
  const kind = chapter.kind ? KIND_EPUB_TYPE[chapter.kind] : undefined;
  const sectionAttrs = kind
    ? `epub:type="${kind.type}"${kind.role ? ` role="${kind.role}"` : ''}`
    : isFixed
    ? 'epub:type="bodymatter chapter" role="doc-chapter"'
    : 'epub:type="chapter" role="doc-chapter"';
  void pageIndex;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../css/style.css" />
</head>
<body class="epub-body-doc">
  <section id="page-${pageIndex + 1}" ${sectionAttrs}>
    ${isFixed ? '' : `<h1 class="chapter-heading">${escapeXml(chapter.title)}</h1>`}
    ${bodyContent}
  </section>
</body>
</html>`;
}

interface NavNode {
  title: string;
  href: string;
  children: NavNode[];
}

/** Nested <ol> for the EPUB navigation document, following the entries' levels. */
function renderNavTree(entries: { level: number; title: string; href: string }[]): string {
  const root: NavNode = { title: '', href: '', children: [] };
  const stack: [NavNode, number][] = [[root, 0]];
  entries.forEach((e) => {
    while (stack.length > 1 && stack[stack.length - 1][1] >= e.level) stack.pop();
    const node: NavNode = { title: e.title, href: e.href, children: [] };
    stack[stack.length - 1][0].children.push(node);
    stack.push([node, e.level]);
  });
  const render = (n: NavNode): string =>
    `<ol>${n.children
      .map((c) => `<li><a href="${escapeXml(c.href)}">${escapeXml(c.title)}</a>${c.children.length ? render(c) : ''}</li>`)
      .join('')}</ol>`;
  return render(root);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1] || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface CoverAsset {
  file: string;
  mime: string;
  data: Uint8Array | Blob;
}

/** The book's cover: the uploaded image, or (fixed books) a render of the cover page. */
async function resolveCover(project: BookProject): Promise<CoverAsset | null> {
  if (project.metadata.coverImage) {
    try {
      const res = await fetch(project.metadata.coverImage);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : blob.type.includes('svg') ? 'svg' : 'jpg';
      const mime = blob.type || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
      if (mime.startsWith('image/')) return { file: `cover.${ext}`, mime, data: blob };
    } catch {
      // unreachable cover image: fall through to the cover page render
    }
  }
  if (project.layoutMode === 'fixed' && project.pageSetup) {
    const coverPage = project.chapters.find((c) => c.kind === 'cover');
    if (coverPage) {
      try {
        const pages = paginateProjectForViewport(project, 'tablet', coverPage.id);
        if (pages[0]) {
          const url = await renderPageGrabToCanvasDataUrl(pages[0], project, project.chapters.length, 2);
          if (url) return { file: 'cover.png', mime: 'image/png', data: dataUrlToBytes(url) };
        }
      } catch (err) {
        console.warn('Could not render the cover page for the EPUB cover:', err);
      }
    }
  }
  return null;
}

/**
 * Returns safe, relative-unit CSS for EPUB 3 reading systems.
 */
function getEpubStyles(designSystem?: CanvasDesignSystem): string {
  const base = `
@charset "utf-8";

body {
  margin: 1.5em;
  font-family: serif;
  font-size: 1em;
  line-height: 1.6;
  color: #111;
}

.chapter-heading {
  font-family: sans-serif;
  font-size: 1.8em;
  margin-bottom: 1.2em;
  border-bottom: 2px solid #111;
  padding-bottom: 0.3em;
}

.epub-h1 { font-family: sans-serif; font-size: 1.5em; margin: 1em 0 0.5em 0; }
.epub-h2 { font-family: sans-serif; font-size: 1.3em; margin: 1em 0 0.5em 0; }
.epub-h3 { font-family: sans-serif; font-size: 1.15em; margin: 0.8em 0 0.4em 0; }
.epub-lead { font-size: 1.15em; font-weight: normal; margin-bottom: 1em; }
.epub-body { font-size: 1em; margin-bottom: 1em; text-align: justify; }

.drop-cap::first-letter {
  float: left;
  font-size: 3.2em;
  line-height: 0.8;
  padding: 0.1em 0.15em 0 0;
  font-weight: bold;
  font-family: sans-serif;
}

.epub-pullquote {
  font-style: italic;
  font-size: 1.15em;
  border-left: 3px solid #111;
  margin: 1.5em 0;
  padding-left: 1em;
}

/* Page Break Guardrail */
.page-break-avoid {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Figures & Images */
.epub-figure {
  margin: 1.5em 0;
  text-align: center;
}
.epub-img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}
.epub-caption {
  font-size: 0.85em;
  color: #555;
  margin-top: 0.5em;
  font-style: italic;
}

/* Hero Spread fallback */
.epub-hero-spread {
  border: 1px solid #ddd;
  padding: 1.2em;
  margin: 1.5em 0;
  background: #fafafa;
}
.hero-bg-img {
  max-width: 100%;
  height: auto;
  margin-bottom: 1em;
}
.hero-kicker {
  font-size: 0.75em;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.05em;
}
.hero-title {
  font-size: 1.4em;
  margin: 0.3em 0;
}
.hero-subtitle {
  font-size: 0.95em;
  color: #444;
}

/* Split Spread safe flex fallback */
.epub-split-spread {
  display: block;
  margin: 1.5em 0;
}
.epub-column {
  margin-bottom: 1.2em;
}

/* Inline formatting & links */
mark { background: #fff3a3; color: inherit; }
a { color: #1d4ed8; text-decoration: underline; }

/* Tables */
.epub-table-figure { margin: 1.5em 0; }
.epub-table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
.epub-table th, .epub-table td { border: 1px solid #777; padding: 0.4em 0.5em; text-align: left; vertical-align: top; }
.epub-table th { background: #eee; font-weight: bold; }

/* Aside & Callout */
.epub-callout {
  border: 2px solid #111;
  padding: 1em;
  margin: 1.5em 0;
  background: #fdfdfd;
}
.callout-header {
  font-size: 0.85em;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

/* Scene Break */
.epub-divider {
  text-align: center;
  margin: 2em 0;
  letter-spacing: 0.4em;
}

/* Footnotes & Annotations */
.epub-footnotes {
  border-top: 1px dashed #888;
  margin-top: 1.2em;
  padding-top: 0.8em;
  text-align: left;
}
.footnotes-title {
  font-size: 0.9em;
  margin-bottom: 0.4em;
}
.footnotes-list {
  font-size: 0.85em;
  padding-left: 1.5em;
}
.footnotes-list li {
  margin-bottom: 0.4em;
}

/* Audio Player in EPUB 3 */
.epub-audio-card {
  border: 1px solid #111;
  padding: 1em;
  margin: 1.5em 0;
  background: #fcfcfc;
}
`;
  const plainOverrides = `
/* ===== Plain design system overrides ===== */
body { color: #111; }
.chapter-heading { border-bottom: 1px solid #ccc; }
.epub-pullquote { border-left: 3px solid #ccc; }
.epub-hero-spread { border: 1px solid #ccc; background: #fff; }
.epub-callout { border: 1px solid #ccc; background: #fff; }
.epub-audio-card { border: 1px solid #ccc; background: #fff; }
.epub-footnotes { border-top: 1px solid #ccc; }
`;
  const cover = '\n.epub-cover { text-align: center; margin: 0; }\n.epub-cover img { max-width: 100%; height: auto; display: block; margin: 0 auto; }\n';
  return (designSystem === 'plain' ? base + plainOverrides : base) + cover + BOOK_FEATURES_EPUB_CSS;
}

/**
 * Packages the entire book project into a valid EPUB 3.3 binary package.
 */
export async function exportToEpub(project: BookProject): Promise<void> {
  const zip = new JSZip();

  // 1. mimetype: MUST be the first file in the ZIP, completely uncompressed (STORE)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // 3. OEBPS/css/style.css
  zip.file('OEBPS/css/style.css', getEpubStyles(project.designSystem));

  // 3b. Cover image (uploaded, or rendered from the cover page of a fixed-layout book)
  const cover = await resolveCover(project);
  if (cover) zip.file(`OEBPS/images/${cover.file}`, cover.data);
  const hasCoverPage = project.chapters.some((c) => c.kind === 'cover');

  // 4. Chapter XHTML documents
  const chapterEntries: { id: string; filename: string; title: string; hasMath?: boolean }[] = [];
  project.chapters.forEach((chapter, idx) => {
    const filename = `chapter-${idx + 1}.xhtml`;
    const chapterXml = buildChapterXhtml(chapter, project, idx, cover?.file);
    zip.file(`OEBPS/chapters/${filename}`, chapterXml);
    chapterEntries.push({
      id: `chapter-${idx + 1}`,
      filename,
      title: chapter.title,
      hasMath: chapterXml.includes('<math'),
    });
  });

  // Cover page document for books that have a cover image but no designed cover page
  const needsCoverDoc = !!cover && !hasCoverPage;
  if (needsCoverDoc && cover) {
    zip.file(
      'OEBPS/chapters/cover.xhtml',
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>Cover</title>
  <link rel="stylesheet" type="text/css" href="../css/style.css" />
</head>
<body class="epub-body-doc">
  <section epub:type="cover"><div class="epub-cover"><img src="../images/${cover.file}" alt="Cover"/></div></section>
</body>
</html>`
    );
  }

  // Optional Colophon / Credits chapter if attributions exist
  const attributions = project.metadata.attributions || [];
  if (attributions.length > 0) {
    const creditsFilename = 'colophon-credits.xhtml';
    const creditsXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>Credits &amp; Visual Attributions</title>
  <link rel="stylesheet" type="text/css" href="../css/style.css" />
</head>
<body class="epub-body-doc">
  <section epub:type="colophon" role="doc-colophon">
    <h1 class="chapter-heading">Credits &amp; Visual Attributions</h1>
    <p class="epub-body">This publication incorporates openly licensed works and design resources by the following contributors:</p>
    <ul>
      ${attributions
        .map(
          (attr) =>
            `<li><strong>${escapeXml(attr.title)}</strong> by ${escapeXml(attr.creator)} (${escapeXml(attr.license)}) — Source: ${escapeXml(attr.sourceName)}${
              attr.sourceUrl ? ` (${escapeXml(attr.sourceUrl)})` : ''
            }</li>`
        )
        .join('\n      ')}
    </ul>
  </section>
</body>
</html>`;
    zip.file(`OEBPS/chapters/${creditsFilename}`, creditsXhtml);
    chapterEntries.push({
      id: 'colophon-credits',
      filename: creditsFilename,
      title: 'Credits & Visual Attributions',
    });
  }

  // 5. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  const isFixedBook = project.layoutMode === 'fixed';
  const pageHref = (i: number) => `chapters/chapter-${i + 1}.xhtml`;
  const tocEntries = isFixedBook ? buildTocEntries(project) : [];
  const navItems =
    tocEntries.length > 0
      ? tocEntries.map((e) => ({ level: e.level, title: `${e.label ? e.label + ' ' : ''}${e.title}`, href: pageHref(e.pageIndex) }))
      : chapterEntries.map((c) => ({ level: 1, title: c.title, href: `chapters/${c.filename}` }));

  const pageListHtml = isFixedBook
    ? `<nav epub:type="page-list" hidden="hidden"><ol>${project.chapters
        .map((_, i) => ({ i, n: getPrintedNumber(project, i) }))
        .filter((x) => x.n)
        .map((x) => `<li><a href="${pageHref(x.i)}">${escapeXml(x.n)}</a></li>`)
        .join('')}</ol></nav>`
    : '';

  const firstBody = project.chapters.findIndex((c) => !c.kind || c.kind === 'content');
  const tocPageIdx = project.chapters.findIndex((c) => c.kind === 'toc');
  const titleIdx = project.chapters.findIndex((c) => c.kind === 'title');
  const landmarks: { type: string; title: string; href: string }[] = [];
  if (hasCoverPage) landmarks.push({ type: 'cover', title: 'Cover', href: pageHref(project.chapters.findIndex((c) => c.kind === 'cover')) });
  else if (needsCoverDoc) landmarks.push({ type: 'cover', title: 'Cover', href: 'chapters/cover.xhtml' });
  if (titleIdx >= 0) landmarks.push({ type: 'titlepage', title: 'Title page', href: pageHref(titleIdx) });
  landmarks.push({ type: 'toc', title: 'Table of contents', href: tocPageIdx >= 0 ? pageHref(tocPageIdx) : 'nav.xhtml#toc' });
  const bodyHref = isFixedBook ? (firstBody >= 0 ? pageHref(firstBody) : null) : chapterEntries[0] ? `chapters/${chapterEntries[0].filename}` : null;
  if (bodyHref) landmarks.push({ type: 'bodymatter', title: 'Start of content', href: bodyHref });

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="css/style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc" role="doc-toc">
    <h1>Table of Contents</h1>
    ${renderNavTree(navItems)}
  </nav>
  ${pageListHtml}
  <nav epub:type="landmarks" hidden="hidden">
    <h2>Guide</h2>
    <ol>${landmarks.map((l) => `<li><a epub:type="${l.type}" href="${l.href}">${escapeXml(l.title)}</a></li>`).join('')}</ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  // 6. OEBPS/content.opf (Package Manifest & Spine)
  const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bookId = project.metadata.identifier || `urn:uuid:${project.id}`;

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${project.metadata.language || 'en'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(bookId)}</dc:identifier>
    <dc:title>${escapeXml(project.metadata.title)}</dc:title>
    <dc:language>${escapeXml(project.metadata.language || 'en')}</dc:language>
    <dc:creator id="creator">${escapeXml(project.metadata.author || 'Author')}</dc:creator>
    <meta property="dcterms:modified">${nowIso}</meta>
    ${cover ? '<meta name="cover" content="cover-image"/>' : ''}
    ${project.metadata.publisher ? `<dc:publisher>${escapeXml(project.metadata.publisher)}</dc:publisher>` : ''}
    ${project.metadata.description ? `<dc:description>${escapeXml(project.metadata.description)}</dc:description>` : ''}
    ${attributions
      .map(
        (attr, i) =>
          `<dc:contributor id="contrib-${i + 1}">${escapeXml(attr.creator)} (${escapeXml(attr.license)})</dc:contributor>`
      )
      .join('\n    ')}
  </metadata>
  <manifest>
    <item id="style" href="css/style.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${cover ? `<item id="cover-image" href="images/${cover.file}" media-type="${cover.mime}" properties="cover-image"/>` : ''}
    ${needsCoverDoc ? '<item id="cover-doc" href="chapters/cover.xhtml" media-type="application/xhtml+xml"/>' : ''}
    ${chapterEntries
      .map(
        (c) => `
    <item id="${c.id}" href="chapters/${c.filename}" media-type="application/xhtml+xml"${c.hasMath ? ' properties="mathml"' : ''}/>
    `
      )
      .join('')}
  </manifest>
  <spine>
    ${needsCoverDoc ? '<itemref idref="cover-doc"/>' : ''}
    ${chapterEntries
      .map(
        (c) => `
    <itemref idref="${c.id}"/>
    `
      )
      .join('')}
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  // 7. Generate and trigger client-side download
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'publication'}.epub`;
  saveAs(blob, filename);
}
