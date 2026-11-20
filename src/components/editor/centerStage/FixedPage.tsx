import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Chapter, HeaderFooterZone, PageSetup, ZoneSlot } from '../../../types/ast';
import {
  getPageContext,
  getPageRegions,
  resolveColor,
  resolveTokens,
  type PageContext,
} from '../../../utils/pageLayout';
import type { BookProject } from '../../../types/ast';

/** One slot (left / centre / right) of a running header or footer. */
const SlotView: React.FC<{
  slot: ZoneSlot;
  ctx: PageContext;
  zoneColor: string;
  grow?: boolean;
  align: 'left' | 'center' | 'right';
}> = ({ slot, ctx, zoneColor, grow, align }) => {
  const text = resolveTokens(slot.text || '', ctx);
  if (!text.trim()) return grow ? <div style={{ flex: 1 }} /> : null;
  const size = slot.size || 12;
  const lines = text.split('\n').filter((l, i) => i === 0 || l.trim());
  return (
    <div
      style={{
        flex: grow ? 1 : '0 0 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        padding: `0 ${slot.padX ?? 8}px`,
        background: resolveColor(slot.bg, ctx),
        color: resolveColor(slot.color, ctx, zoneColor),
        textAlign: align,
        lineHeight: 1.15,
        overflow: 'hidden',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: i === 0 ? size : Math.max(8, Math.round(size * 0.55)),
            fontWeight: i === 0 ? (slot.bold ? 700 : 400) : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

/** A running header or footer, rendered from its zone definition. */
export const PageZoneView: React.FC<{ zone: HeaderFooterZone; ctx: PageContext }> = ({ zone, ctx }) => {
  const color = resolveColor(zone.color, ctx, '#333');
  const border = resolveColor(zone.borderColor, ctx);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'stretch',
        background: resolveColor(zone.background, ctx),
        color,
        border: zone.borderWidth > 0 ? `${zone.borderWidth}px solid ${border}` : 'none',
        fontFamily: '"Plus Jakarta Sans", Arial, sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {zone.left && <SlotView slot={zone.left} ctx={ctx} zoneColor={color} align="left" />}
      {zone.center ? (
        <SlotView slot={zone.center} ctx={ctx} zoneColor={color} grow align={zone.left ? 'left' : 'center'} />
      ) : (
        <div style={{ flex: 1 }} />
      )}
      {zone.right && <SlotView slot={zone.right} ctx={ctx} zoneColor={color} align="right" />}
    </div>
  );
};

interface FixedPageStageProps {
  project: BookProject;
  page: Chapter;
  pageIndex: number;
  setup: PageSetup;
  showGuides: boolean;
  children: React.ReactNode;
}

/**
 * The editing surface of a fixed-layout book: an exact-size sheet with the running header / footer
 * (from the page template) and the page body inside the margins. Content that spills past the body is
 * flagged so it can be moved to another page.
 */
export const FixedPageStage: React.FC<FixedPageStageProps> = ({
  project,
  page,
  pageIndex,
  setup,
  showGuides,
  children,
}) => {
  const regions = getPageRegions(setup, page);
  const ctx = getPageContext(project, pageIndex);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  // Watch the body for content that no longer fits the page
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const over = el.scrollHeight - el.clientHeight;
        setOverflowPx(over > 3 ? Math.round(over) : 0);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [page.id, regions.body.h]);

  const abs = (b: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({
    position: 'absolute',
    left: b.x,
    top: b.y,
    width: b.w,
    height: b.h,
  });

  return (
    <div className="flex flex-col items-center">
      <div
        data-fixed-page="true"
        className="relative bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.14)]"
        style={{ width: setup.width, height: setup.height, background: page.backgroundColor || '#FFFFFF' }}
      >
        {regions.header && (
          <div style={{ ...abs(regions.header), zIndex: 3 }} data-no-block-drag>
            <PageZoneView zone={regions.header.zone} ctx={ctx} />
          </div>
        )}
        {regions.footer && (
          <div style={{ ...abs(regions.footer), zIndex: 3 }} data-no-block-drag>
            <PageZoneView zone={regions.footer.zone} ctx={ctx} />
          </div>
        )}

        <div ref={bodyRef} style={{ ...abs(regions.body), zIndex: 2 }} data-page-body="true">
          {children}
        </div>

        {showGuides && (
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 4 }} aria-hidden="true">
            {!page.fullBleed && (
              <div
                className="absolute border border-dashed border-sky-500/70"
                style={{
                  left: setup.margins.left,
                  top: setup.margins.top,
                  right: setup.margins.right,
                  bottom: setup.margins.bottom,
                }}
              />
            )}
            <div
              className="absolute border border-dotted border-fuchsia-500/50"
              style={{ left: regions.body.x, top: regions.body.y, width: regions.body.w, height: regions.body.h }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-gray-500 select-none" data-stage-ui="true">
        <span>
          Page {pageIndex + 1} of {project.chapters.length}
        </span>
        {ctx.pageNumber && <span>· printed no. {ctx.pageNumber}</span>}
        {page.fullBleed && <span className="px-1.5 rounded bg-neo-yellow text-neo-ink font-bold">Full bleed</span>}
        {overflowPx > 0 && (
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white font-bold"
            title="Some content extends past the page body. Move it to another page or shrink it."
          >
            <AlertTriangle className="w-3 h-3" />
            Content overflows by {overflowPx}px
          </span>
        )}
      </div>
    </div>
  );
};
