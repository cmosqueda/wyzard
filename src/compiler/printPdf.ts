import type { BookProject } from '../types/ast';
import { getWebPublicationStyles } from './webCompiler';
import { FIXED_PAGE_CSS } from './fixedPage';
import { paginateProjectForViewport, renderPaginatedPageHtml } from './multiFormatExporter';
import { PX_PER_MM, getEffectiveSetup, getPageRegions } from '../utils/pageLayout';

/**
 * Print-ready PDF for fixed-layout books: every sheet is the trim size plus bleed and a slug area that
 * carries crop marks, optionally with facing pages laid out as spreads.
 *
 * Lengths are CSS pixels (96 per inch) like the rest of the page model.
 */

export interface PrintPdfOptions {
  /** Bleed on each outer edge, in millimetres (0, 3, 5 …) */
  bleedMm: number;
  cropMarks: boolean;
  /** Lay facing pages out as two-page spreads. Needs "facing pages" in Page setup. */
  spreads: boolean;
  /** Dashed outline of the safe area (inside the margins) on screen only, never printed */
  showSafeArea?: boolean;
}

export const DEFAULT_PRINT_OPTIONS: PrintPdfOptions = { bleedMm: 3, cropMarks: true, spreads: false, showSafeArea: true };

const MARK_GAP = 6; // between the bleed edge and the start of a crop mark
const MARK_LEN = 14;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Pages on each sheet: one page, or with spreads the cover alone, then pairs (left page, right page). */
export function planSheets(pageCount: number, spreads: boolean): { left?: number; right?: number }[] {
  const sheets: { left?: number; right?: number }[] = [];
  if (!spreads) {
    for (let i = 0; i < pageCount; i++) sheets.push({ right: i });
    return sheets;
  }
  if (pageCount > 0) sheets.push({ right: 0 });
  for (let i = 1; i < pageCount; i += 2) sheets.push({ left: i, right: i + 1 < pageCount ? i + 1 : undefined });
  return sheets;
}

export function compilePrintPdfDocument(
  project: BookProject,
  options: PrintPdfOptions
): { html: string; sheetCount: number; pageCount: number } {
  const setup = project.pageSetup!;
  const W = Math.round(setup.width);
  const H = Math.round(setup.height);
  const bleed = Math.max(0, Math.round(options.bleedMm * PX_PER_MM * 100) / 100);
  const slug = options.cropMarks ? bleed + MARK_GAP + MARK_LEN : bleed;
  const spreads = options.spreads && !!setup.facing;

  const pages = paginateProjectForViewport(project);
  const renderPage = (i: number) => renderPaginatedPageHtml(pages[i], project, pages.length);
  const sheets = planSheets(pages.length, spreads);

  const cell = (i: number, trimX: number, trimY: number, outerLeft: boolean, outerRight: boolean): string => {
    const page = project.chapters[i];
    const bl = outerLeft ? bleed : 0;
    const br = outerRight ? bleed : 0;
    const ex = trimX - bl;
    const ey = trimY - bleed;
    const EW = W + bl + br;
    const EH = H + 2 * bleed;
    const bg = page.backgroundColor || '#FFFFFF';
    let inner: string;
    if (page.fullBleed && bleed > 0) {
      // Art / cover pages grow to cover the bleed instead of leaving a white edge
      const s = Math.max(EW / W, EH / H);
      inner = `<div style="position:absolute;left:${(EW - W * s) / 2}px;top:${(EH - H * s) / 2}px;width:${W}px;height:${H}px;transform:scale(${s});transform-origin:0 0">${renderPage(i)}</div>`;
    } else {
      inner = `<div style="position:absolute;left:${bl}px;top:${bleed}px;width:${W}px;height:${H}px">${renderPage(i)}</div>`;
    }
    const m = getPageRegions(getEffectiveSetup(project, i), page).body;
    const safe =
      options.showSafeArea && !page.fullBleed
        ? `<div class="pp-safe" style="left:${bl + m.x}px;top:${bleed + m.y}px;width:${m.w}px;height:${m.h}px"></div>`
        : '';
    return `<div class="pp-cell" style="left:${ex}px;top:${ey}px;width:${EW}px;height:${EH}px;background:${bg}">${inner}${safe}</div>`;
  };

  const marks = (trimW: number): string => {
    if (!options.cropMarks) return '';
    const out: string[] = [];
    const corners: [number, number, number, number][] = [
      [slug, slug, -1, -1],
      [slug + trimW, slug, 1, -1],
      [slug, slug + H, -1, 1],
      [slug + trimW, slug + H, 1, 1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      const a = bleed + MARK_GAP;
      const hx = dx < 0 ? cx - a - MARK_LEN : cx + a;
      const vy = dy < 0 ? cy - a - MARK_LEN : cy + a;
      out.push(`<i class="pp-mark" style="left:${hx}px;top:${cy - 0.5}px;width:${MARK_LEN}px;height:1px"></i>`);
      out.push(`<i class="pp-mark" style="left:${cx - 0.5}px;top:${vy}px;width:1px;height:${MARK_LEN}px"></i>`);
    }
    return out.join('');
  };

  const sheetHtml = sheets
    .map((sh) => {
      const double = spreads && sh.left !== undefined && sh.right !== undefined;
      const cols = double ? 2 : 1;
      const trimW = W * cols;
      const sheetW = trimW + 2 * slug;
      const sheetH = H + 2 * slug;
      let cells = '';
      if (double) {
        cells += cell(sh.left!, slug, slug, true, false);
        cells += cell(sh.right!, slug + W, slug, false, true);
      } else {
        const idx = (sh.right ?? sh.left)!;
        cells += cell(idx, slug, slug, true, true);
      }
      return `<div class="pp-sheet ${double ? 'pp-double' : 'pp-single'}" style="width:${sheetW}px;height:${sheetH}px">${cells}${marks(trimW)}</div>`;
    })
    .join('\n');

  const single = { w: W + 2 * slug, h: H + 2 * slug };
  const title = esc(project.metadata.title || project.title);
  const trimMm = `${(W / PX_PER_MM).toFixed(1)} × ${(H / PX_PER_MM).toFixed(1)} mm`;

  const html = `<!DOCTYPE html>
<html lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="UTF-8" />
  <title>${title} — Print PDF</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    ${getWebPublicationStyles(project.designSystem)}
    ${FIXED_PAGE_CSS}

    @page single { size: ${single.w}px ${single.h}px; margin: 0; }
    @page double { size: ${W * 2 + 2 * slug}px ${single.h}px; margin: 0; }

    html, body { margin: 0; padding: 0; background: #444; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pp-stack { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0; }
    .pp-sheet { position: relative; background: #FFFFFF; overflow: hidden; flex: 0 0 auto; break-after: page; box-shadow: 0 2px 14px rgba(0,0,0,.4); }
    .pp-single { page: single; }
    .pp-double { page: double; }
    .pp-cell { position: absolute; overflow: hidden; }
    .pp-mark { position: absolute; background: #000; display: block; }
    .pp-safe { position: absolute; border: 1px dashed #38bdf8; pointer-events: none; z-index: 20; }
    .wyzard-page-grab { page-break-after: auto; }

    @media print {
      html, body { background: #FFFFFF; }
      .pp-stack { gap: 0; padding: 0; display: block; }
      .pp-sheet { box-shadow: none; }
      .pp-safe, .no-print-toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar" style="position:sticky;top:0;z-index:999;background:#141414;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:'JetBrains Mono',monospace;font-size:12px;border-bottom:2px solid #FFD23F;">
    <span>WYZARD PRINT PDF • trim ${trimMm} • bleed ${options.bleedMm} mm • ${options.cropMarks ? 'crop marks' : 'no marks'} • ${sheets.length} sheets${spreads ? ' (spreads)' : ''}</span>
    <button onclick="window.print()" style="background:#FFD23F;color:#141414;border:2px solid #141414;padding:6px 14px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-weight:700;cursor:pointer;">Save / Print as PDF</button>
  </div>
  <main class="pp-stack" data-sheets="${sheets.length}" data-bleed="${bleed}">
${sheetHtml}
  </main>
</body>
</html>`;

  return { html, sheetCount: sheets.length, pageCount: pages.length };
}

/** Opens the print-ready document in a new window and starts the browser's print / save-as-PDF dialog. */
export function exportToPrintPdf(project: BookProject, options: PrintPdfOptions): { sheetCount: number; pageCount: number } {
  const { html, sheetCount, pageCount } = compilePrintPdfDocument(project, options);
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
        // the toolbar button prints too
      }
    }, 800);
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'publication'}-print.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return { sheetCount, pageCount };
}
