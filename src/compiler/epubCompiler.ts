import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BookProject, Chapter } from '../types/ast';
import { parseCraftState, type ParsedBlockNode } from './astParser';

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
function renderEpubNode(node: ParsedBlockNode): string {
  const p = node.props;

  switch (node.type) {
    case 'TypographyBlock':
    case 'EditorialTypography': {
      const variant = p.variant || 'body';
      const text = escapeXml(p.htmlContent || p.text || '');
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
      const content = escapeXml(p.content || '');
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
      const content = escapeXml(p.content || '');

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

      const viewH =
        ratio === '1/1'
          ? 1000
          : ratio === '4/5'
          ? 1250
          : ratio === '4/3'
          ? 750
          : 562;

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
function buildChapterXhtml(chapter: Chapter, project: BookProject): string {
  const parsedNodes = parseCraftState(chapter.craftStateJson);
  const bodyContent = parsedNodes.map(renderEpubNode).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../css/style.css" />
</head>
<body class="epub-body-doc">
  <section epub:type="chapter" role="doc-chapter">
    <h1 class="chapter-heading">${escapeXml(chapter.title)}</h1>
    ${bodyContent}
  </section>
</body>
</html>`;
}

/**
 * Returns safe, relative-unit CSS for EPUB 3 reading systems.
 */
function getEpubStyles(): string {
  return `
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
  zip.file('OEBPS/css/style.css', getEpubStyles());

  // 4. Chapter XHTML documents
  const chapterEntries: { id: string; filename: string; title: string }[] = [];
  project.chapters.forEach((chapter, idx) => {
    const filename = `chapter-${idx + 1}.xhtml`;
    const chapterXml = buildChapterXhtml(chapter, project);
    zip.file(`OEBPS/chapters/${filename}`, chapterXml);
    chapterEntries.push({
      id: `chapter-${idx + 1}`,
      filename,
      title: chapter.title,
    });
  });

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
    <ol>
      ${chapterEntries
        .map(
          (c) => `
        <li><a href="chapters/${c.filename}">${escapeXml(c.title)}</a></li>
      `
        )
        .join('\n')}
    </ol>
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
    ${chapterEntries
      .map(
        (c) => `
    <item id="${c.id}" href="chapters/${c.filename}" media-type="application/xhtml+xml"/>
    `
      )
      .join('')}
  </manifest>
  <spine>
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
