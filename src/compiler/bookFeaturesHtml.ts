import type { BookProject } from '../types/ast';
import type { TitlePageBlockProps } from '../components/blocks/TitlePageBlock';
import type { CopyrightBlockProps } from '../components/blocks/CopyrightBlock';
import { selectTocEntries, type TocBlockProps } from '../components/blocks/TocBlock';
import { buildTocEntries, DEFAULT_ACCENT } from '../utils/pageLayout';
import { DEFAULT_RIGHTS_STATEMENT, buildIndexEntries, getCopyrightData, getGlossaryEntries, getTitlePageData } from '../utils/bookFeatures';
import type { TermsBlockProps } from '../components/blocks/TermsBlock';

/**
 * Static HTML / XHTML for the smart book-feature blocks (title page, copyright page, table of contents).
 * `mode: 'epub'` produces simpler markup for reading systems; `web` is used by the HTML reader, pack and PDF.
 */

export type FeatureMode = 'web' | 'epub';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lines = (t: string) => esc(t).replace(/\n/g, '<br/>');

export function titlePageHtml(project: BookProject, p: TitlePageBlockProps, mode: FeatureMode = 'web'): string {
  const d = getTitlePageData(project);
  const variant = p.variant || 'title';
  const color = p.textColor || '#111111';
  const align = p.align || 'center';
  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const size = p.titleSize ?? 38;
  const showSub = p.showSubtitle ?? true;
  const showAuthor = p.showAuthor ?? true;
  const showPub = p.showPublisher ?? true;
  const bg = p.backgroundImage ? `background-image:url('${esc(p.backgroundImage)}');background-size:cover;background-position:center;` : '';
  const overlay = p.backgroundImage && (p.overlay ?? 0) > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${(p.overlay ?? 0) / 100})"></div>` : '';

  let inner = '';
  if (variant === 'cover' || variant === 'title') {
    inner = `<h1 style="font-size:${size}px;line-height:1.1;font-weight:800;margin:0">${esc(d.title)}</h1>
      ${showSub && d.subtitle ? `<p style="font-size:${Math.round(size * 0.45)}px;margin:0">${esc(d.subtitle)}</p>` : ''}
      ${showAuthor && d.author ? `<p style="font-size:16px;margin:18px 0 0;font-weight:600">${esc(d.author)}</p>` : ''}
      ${showPub && d.publisher ? `<p style="font-size:12px;margin:8px 0 0;opacity:.8">${esc(d.publisher)}</p>` : ''}`;
  } else if (variant === 'back') {
    inner = `<p style="font-size:15px;line-height:1.55;margin:0">${lines(p.text || d.description)}</p>
      ${showAuthor && d.author ? `<p style="font-size:13px;margin:14px 0 0;font-weight:700">${esc(d.author)}</p>` : ''}
      ${showPub && d.publisher ? `<p style="font-size:12px;margin:0;opacity:.8">${esc(d.publisher)}</p>` : ''}
      ${d.isbn ? `<p style="font-size:11px;margin:10px 0 0;opacity:.8">ISBN ${esc(d.isbn)}</p>` : ''}`;
  } else {
    inner = `<p style="font-size:20px;font-style:italic;line-height:1.5;margin:0;max-width:85%">${lines(p.text || 'For everyone who reads this.')}</p>`;
  }

  const fill = variant === 'cover' || variant === 'back';
  const box =
    mode === 'epub'
      ? `padding:1.5em;text-align:${align};color:${color};`
      : `position:relative;box-sizing:border-box;min-height:${fill ? '100%' : '360px'};height:${fill ? '100%' : 'auto'};display:flex;flex-direction:column;justify-content:center;align-items:${alignItems};text-align:${align};padding:28px;color:${color};${bg}`;
  return `<div class="wz-titlepage wz-tp-${variant}" style="${box}">${mode === 'epub' ? '' : overlay}<div style="position:relative;display:flex;flex-direction:column;gap:12px;align-items:${alignItems}">${inner}</div></div>`;
}

export function copyrightHtml(project: BookProject, p: CopyrightBlockProps): string {
  const c = getCopyrightData(project);
  const fs = p.fontSize ?? 11;
  const plain = [c.publisherLine, c.isbnLine, c.editionLine, c.classification].filter(Boolean);
  return `<div class="wz-copyright" style="font-size:${fs}px;line-height:1.45;text-align:${p.align || 'left'};color:#111">
    <p style="font-weight:700;margin:0 0 8px">${esc(c.copyrightLine)}</p>
    ${c.author ? `<p style="margin:0 0 8px">Written by ${esc(c.author)}</p>` : ''}
    ${plain.map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join('')}
    ${(p.showLegalBox ?? true) ? `<div style="border:1.5px solid #111;padding:10px;margin:10px 0">${lines(c.rightsStatement || DEFAULT_RIGHTS_STATEMENT)}</div>` : ''}
    ${c.contact ? `<p style="margin:0 0 8px">${lines(c.contact)}</p>` : ''}
    ${(p.showDisclaimer ?? true) && c.disclaimer ? `<p style="font-weight:700;margin:10px 0 2px">Disclaimer</p><p style="margin:0;opacity:.85">${lines(c.disclaimer)}</p>` : ''}
  </div>`;
}

export function tocHtml(
  project: BookProject,
  p: TocBlockProps,
  hrefFor: (pageIndex: number, pageId: string) => string
): string {
  const entries = selectTocEntries(buildTocEntries(project), p);
  const accent = p.accentColor || project.pageSetup?.accentColor || DEFAULT_ACCENT;
  const fs = p.fontSize ?? 13;
  const showPg = p.showPageNumbers ?? true;
  const dots = (p.leader ?? 'dots') === 'dots' && showPg;
  if (entries.length === 0) return '<nav class="wz-toc" role="doc-toc"><p>(No contents entries yet)</p></nav>';
  const items = entries
    .map(
      (e) => `<li class="wz-toc-l${e.level}"><a href="${esc(hrefFor(e.pageIndex, e.pageId))}" data-wz-page="${esc(e.pageId)}">${
        e.label ? `<span class="wz-toc-label" style="background:${accent}">${esc(e.label)}</span>` : ''
      }<span class="wz-toc-title">${esc(e.title)}</span>${dots ? '<span class="wz-toc-leader"></span>' : '<span class="wz-toc-gap"></span>'}${
        showPg ? `<span class="wz-toc-pg">${esc(e.printed)}</span>` : ''
      }</a></li>`
    )
    .join('');
  return `<nav class="wz-toc" role="doc-toc" style="font-size:${fs}px"><ol class="wz-toc-list">${items}</ol></nav>`;
}

export function termsHtml(
  project: BookProject,
  p: TermsBlockProps,
  hrefFor: (pageIndex: number, pageId: string) => string
): string {
  const fs = p.fontSize ?? 12;
  const cols = p.columns ?? 1;
  const colStyle = cols > 1 ? `column-count:${cols};column-gap:20px;` : '';
  if ((p.variant ?? 'index') === 'glossary') {
    const items = getGlossaryEntries(project)
      .map((g) => `<p class="wz-gl-item"><strong>${esc(g.term)}</strong> — ${esc(g.definition)}</p>`)
      .join('');
    return `<div class="wz-glossary" style="font-size:${fs}px;${colStyle}">${items || '<p>(No glossary entries yet)</p>'}</div>`;
  }
  const entries = buildIndexEntries(project);
  const group = p.groupByLetter ?? true;
  let html = '';
  entries.forEach((e, i) => {
    const letter = e.term[0]?.toUpperCase() || '';
    if (group && (i === 0 || entries[i - 1].term[0]?.toUpperCase() !== letter)) html += `<div class="wz-ix-letter">${esc(letter)}</div>`;
    html += `<div class="wz-ix-item">${esc(e.term)}, ${e.pages
      .map((pg) => `<a href="${esc(hrefFor(pg.pageIndex, pg.pageId))}" data-wz-page="${esc(pg.pageId)}">${esc(pg.printed || String(pg.pageIndex + 1))}</a>`)
      .join(', ')}</div>`;
  });
  return `<div class="wz-index" style="font-size:${fs}px;${colStyle}">${html || '<p>(No index entries yet)</p>'}</div>`;
}

/** Contents / title / copyright styles for HTML, PDF and the HTML pack. */
export const BOOK_FEATURES_CSS = `
.wz-ix-letter { font-weight: 800; margin-top: 10px; break-after: avoid; }
.wz-ix-item { break-inside: avoid; margin: 2px 0; }
.wz-index a { color: inherit; }
.wz-gl-item { break-inside: avoid; margin: 8px 0 0; }
.wz-toc-list { list-style: none; margin: 0; padding: 0; }
.wz-toc a { display: flex; align-items: baseline; gap: 6px; padding: 3px 0; color: inherit; text-decoration: none; }
.wz-toc a:hover .wz-toc-title { text-decoration: underline; }
.wz-toc-l1 { font-weight: 700; margin-top: 8px; }
.wz-toc-l2 { padding-left: 14px; }
.wz-toc-l3 { padding-left: 28px; }
.wz-toc-label { color: #fff; font-size: 0.78em; font-weight: 700; padding: 0 6px; border-radius: 2px; white-space: nowrap; }
.wz-toc-leader { flex: 1; border-bottom: 1.5px dotted currentColor; opacity: 0.45; transform: translateY(-3px); min-width: 12px; }
.wz-toc-gap { flex: 1; }
.wz-toc-pg { font-variant-numeric: tabular-nums; }
`;

/** Simpler contents styles for reading systems (no flexbox leaders). */
export const BOOK_FEATURES_EPUB_CSS = `
.wz-ix-letter { font-weight: 800; margin-top: 10px; break-after: avoid; }
.wz-ix-item { break-inside: avoid; margin: 2px 0; }
.wz-index a { color: inherit; }
.wz-gl-item { break-inside: avoid; margin: 8px 0 0; }
.wz-toc-list { list-style: none; margin: 0; padding: 0; }
.wz-toc-list li { margin: 0.25em 0; overflow: hidden; }
.wz-toc-list a { color: inherit; text-decoration: none; }
.wz-toc-l1 { font-weight: bold; margin-top: 0.9em !important; }
.wz-toc-l2 { padding-left: 1em; }
.wz-toc-l3 { padding-left: 2em; }
.wz-toc-label { font-size: 0.8em; font-weight: bold; margin-right: 0.5em; border: 1px solid #555; padding: 0 0.35em; }
.wz-toc-leader, .wz-toc-gap { display: none; }
.wz-toc-pg { float: right; }
`;
