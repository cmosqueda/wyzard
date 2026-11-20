import type { BookProject, HeaderFooterZone, ZoneSlot } from '../types/ast';
import type { ParsedBlockNode } from './astParser';
import { withExportContext } from './exportContext';
import { BOOK_FEATURES_CSS } from './bookFeaturesHtml';
import {
  getPageContext,
  getPageRegions,
  resolveColor,
  resolveTokens,
  type Box,
  type PageContext,
} from '../utils/pageLayout';

/**
 * Fixed-layout page rendering for exports: one authored page = one exact-size sheet with the running
 * header / footer, mirrored from the editor. Used by the web reader, the HTML pack and the PDF.
 */

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function slotHtml(slot: ZoneSlot | undefined, ctx: PageContext, zoneColor: string, grow: boolean, align: string): string {
  if (!slot) return grow ? '<div style="flex:1"></div>' : '';
  const text = resolveTokens(slot.text || '', ctx);
  if (!text.trim()) return grow ? '<div style="flex:1"></div>' : '';
  const size = slot.size || 12;
  const lines = text.split('\n').filter((l, i) => i === 0 || l.trim());
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  const inner = lines
    .map((line, i) => {
      const fs = i === 0 ? size : Math.max(8, Math.round(size * 0.55));
      const fw = i === 0 ? (slot.bold ? 700 : 400) : 400;
      return `<div style="font-size:${fs}px;font-weight:${fw};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${esc(line)}</div>`;
    })
    .join('');
  return `<div style="flex:${grow ? 1 : '0 0 auto'};min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:${justify};padding:0 ${
    slot.padX ?? 8
  }px;background:${resolveColor(slot.bg, ctx)};color:${resolveColor(slot.color, ctx, zoneColor)};text-align:${align};line-height:1.15;overflow:hidden">${inner}</div>`;
}

export function zoneHtml(zone: HeaderFooterZone, ctx: PageContext): string {
  const color = resolveColor(zone.color, ctx, '#333');
  const border = zone.borderWidth > 0 ? `${zone.borderWidth}px solid ${resolveColor(zone.borderColor, ctx)}` : 'none';
  const centerAlign = zone.left ? 'left' : 'center';
  return `<div style="width:100%;height:100%;display:flex;align-items:stretch;background:${resolveColor(
    zone.background,
    ctx
  )};color:${color};border:${border};font-family:'Plus Jakarta Sans',Arial,sans-serif;box-sizing:border-box;overflow:hidden">${slotHtml(
    zone.left,
    ctx,
    color,
    false,
    'left'
  )}${zone.center ? slotHtml(zone.center, ctx, color, true, centerAlign) : '<div style="flex:1"></div>'}${slotHtml(
    zone.right,
    ctx,
    color,
    false,
    'right'
  )}</div>`;
}

const boxStyle = (b: Box) => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`;

/** One page as an exact-size, clipped sheet. `renderNode` turns a block into its export HTML. */
export function renderFixedPageHtml(
  project: BookProject,
  pageIndex: number,
  nodes: ParsedBlockNode[],
  renderNode: (node: ParsedBlockNode) => string
): string {
  const setup = project.pageSetup!;
  const page = project.chapters[pageIndex];
  const regions = getPageRegions(setup, page);
  const ctx = getPageContext(project, pageIndex);
  // Smart blocks (table of contents …) read the whole book through the export context
  const body = withExportContext({ project }, () =>
    nodes
      .map((n) => {
        const grow = n.type === 'TitlePageBlock' && (n.props?.variant === 'cover' || n.props?.variant === 'back');
        return `<div class="fx-block${grow ? ' fx-grow' : ''}">${renderNode(n)}</div>`;
      })
      .join('\n')
  );

  return `<section id="page-${pageIndex + 1}" class="wyzard-page-grab fx-page" data-page="${pageIndex + 1}" style="position:relative;display:block;padding:0;width:${setup.width}px;height:${
    setup.height
  }px;background:${page.backgroundColor || '#FFFFFF'};overflow:hidden">
    ${regions.header ? `<div class="fx-zone" style="${boxStyle(regions.header)}z-index:3">${zoneHtml(regions.header.zone, ctx)}</div>` : ''}
    ${regions.footer ? `<div class="fx-zone" style="${boxStyle(regions.footer)}z-index:3">${zoneHtml(regions.footer.zone, ctx)}</div>` : ''}
    <div class="fx-body" style="${boxStyle(regions.body)}z-index:2;overflow:hidden;display:flex;flex-direction:column;gap:24px">${body}</div>
  </section>`;
}

/** Styles shared by every export that renders fixed pages. */
export const FIXED_PAGE_CSS = BOOK_FEATURES_CSS + `
.fx-page { box-sizing: border-box; }
.fx-body > .fx-grow { flex: 1 1 auto; min-height: 0; }
.fx-body > .fx-grow > .wz-titlepage { height: 100%; }
.fx-body > .fx-block { flex: 0 0 auto; min-width: 0; }
.fx-body > .fx-block > * { margin-top: 0; }
.fx-body p, .fx-body h1, .fx-body h2, .fx-body h3 { margin-bottom: 0.6em; }
`;

// ---------------------------------------------------------------- canvas (CBZ page plates)
function wrapEllipsis(c: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (c.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function drawSlot(
  c: CanvasRenderingContext2D,
  slot: ZoneSlot | undefined,
  ctx: PageContext,
  zoneColor: string,
  box: Box,
  x: number,
  width: number | null,
  align: 'left' | 'center' | 'right'
): number {
  if (!slot) return 0;
  const text = resolveTokens(slot.text || '', ctx);
  if (!text.trim()) return 0;
  const size = slot.size || 12;
  const lines = text.split('\n').filter((l, i) => i === 0 || l.trim());
  const padX = slot.padX ?? 8;
  const font = (i: number) => `${i === 0 && slot.bold ? 700 : 400} ${i === 0 ? size : Math.max(8, Math.round(size * 0.55))}px "Plus Jakarta Sans", Arial, sans-serif`;

  // natural width of the slot
  let natural = 0;
  lines.forEach((l, i) => {
    c.font = font(i);
    natural = Math.max(natural, c.measureText(l).width);
  });
  const slotW = width ?? Math.ceil(natural + padX * 2);
  const slotX = align === 'right' ? x - slotW : x;

  const bg = resolveColor(slot.bg, ctx, 'transparent');
  if (bg !== 'transparent') {
    c.fillStyle = bg;
    c.fillRect(slotX, box.y, slotW, box.h);
  }
  c.fillStyle = resolveColor(slot.color, ctx, zoneColor);
  c.textBaseline = 'top';
  const lineHeights = lines.map((_, i) => (i === 0 ? size : Math.max(8, Math.round(size * 0.55))) * 1.15);
  const total = lineHeights.reduce((a, b) => a + b, 0);
  let y = box.y + (box.h - total) / 2;
  lines.forEach((l, i) => {
    c.font = font(i);
    const shown = wrapEllipsis(c, l, slotW - padX * 2);
    const w = c.measureText(shown).width;
    const tx = align === 'center' ? slotX + (slotW - w) / 2 : align === 'right' ? slotX + slotW - padX - w : slotX + padX;
    c.fillText(shown, tx, y);
    y += lineHeights[i];
  });
  return slotW;
}

/** Draws a header / footer zone onto a canvas (CBZ plates). */
export function drawZoneOnCanvas(c: CanvasRenderingContext2D, zone: HeaderFooterZone, ctx: PageContext, box: Box): void {
  c.save();
  const bg = resolveColor(zone.background, ctx, 'transparent');
  if (bg !== 'transparent') {
    c.fillStyle = bg;
    c.fillRect(box.x, box.y, box.w, box.h);
  }
  const zoneColor = resolveColor(zone.color, ctx, '#333333');

  const leftW = drawSlot(c, zone.left, ctx, zoneColor, box, box.x, null, 'left');
  const rightW = drawSlot(c, zone.right, ctx, zoneColor, box, box.x + box.w, null, 'right');
  if (zone.center) {
    const cx = box.x + leftW;
    const cw = Math.max(0, box.w - leftW - rightW);
    drawSlot(c, zone.center, ctx, zoneColor, box, cx, cw, zone.left ? 'left' : 'center');
  }

  if (zone.borderWidth > 0) {
    c.strokeStyle = resolveColor(zone.borderColor, ctx, 'transparent');
    c.lineWidth = zone.borderWidth;
    c.strokeRect(box.x + zone.borderWidth / 2, box.y + zone.borderWidth / 2, box.w - zone.borderWidth, box.h - zone.borderWidth);
  }
  c.restore();
}
