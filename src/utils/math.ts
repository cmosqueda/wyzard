import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * LaTeX math support (KaTeX).
 *
 * - Rich text (Typography) stores math as atomic, empty placeholder spans:
 *     <span class="wz-math" data-tex="x^2" data-display="0" contenteditable="false"></span>
 *   The editor renders KaTeX into them; exporters re-render them for their own target.
 * - Plain-text fields (callouts, accordions, table cells) keep `$inline$` / `$$display$$` source text.
 */

export const KATEX_CSS_HREF = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

export type MathOutput = 'html' | 'mathml' | 'htmlAndMathml';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function unescapeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Renders one TeX expression. Invalid TeX is shown (in red) instead of throwing. */
export function renderTex(tex: string, displayMode = false, output: MathOutput = 'htmlAndMathml'): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output,
      strict: 'ignore',
      trust: false,
    });
  } catch {
    return escapeHtml(tex);
  }
}

// $$display$$ and $inline$ (inline must not start/end with whitespace, so "$5 and $6" is left alone)
const DISPLAY_RE = /\$\$([\s\S]+?)\$\$/g;
const INLINE_RE = /(?<![\\$])\$(?=\S)([^$\n]*?\S)\$(?!\d)/g;

export function hasMath(text: string): boolean {
  if (!text || text.indexOf('$') === -1) return false;
  DISPLAY_RE.lastIndex = 0;
  INLINE_RE.lastIndex = 0;
  return DISPLAY_RE.test(text) || INLINE_RE.test(text);
}

/**
 * Plain text (unescaped) → safe HTML with `$…$` / `$$…$$` rendered as math.
 * Everything outside math is HTML-escaped.
 */
export function renderMathInText(text: string, output: MathOutput = 'htmlAndMathml'): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };
  let work = text.replace(DISPLAY_RE, (_m, tex: string) => stash(renderTex(tex.trim(), true, output)));
  work = work.replace(INLINE_RE, (_m, tex: string) => stash(renderTex(tex, false, output)));
  return escapeHtml(work).replace(/\u0000(\d+)\u0000/g, (_m, i: string) => tokens[Number(i)]);
}

export function mathSpanHtml(tex: string, display: boolean): string {
  return `<span class="wz-math" data-tex="${escapeHtml(tex)}" data-display="${display ? '1' : '0'}" contenteditable="false"></span>`;
}

/** In stored rich-text HTML, turn typed `$…$` / `$$…$$` into atomic math placeholder spans. */
export function dollarMathToSpans(html: string): string {
  if (html.indexOf('$') === -1) return html;
  // Don't touch anything inside tags / existing math spans: split on tags and only convert text runs.
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith('<')) return part;
      let out = part.replace(DISPLAY_RE, (_m, tex: string) => mathSpanHtml(unescapeHtml(tex).trim(), true));
      out = out.replace(INLINE_RE, (_m, tex: string) => mathSpanHtml(unescapeHtml(tex), false));
      return out;
    })
    .join('');
}

const MATH_SPAN_RE =
  /<span[^>]*class="wz-math"[^>]*data-tex="([^"]*)"[^>]*data-display="([01])"[^>]*>[\s\S]*?<\/span>/g;

/** Exporters: replace math placeholder spans (and any leftover `$…$`) in rich-text HTML with rendered math. */
export function renderMathInHtml(html: string, output: MathOutput = 'htmlAndMathml'): string {
  if (!html) return html;
  const withSpans = dollarMathToSpans(html);
  return withSpans.replace(MATH_SPAN_RE, (_m, tex: string, display: string) =>
    renderTex(unescapeHtml(tex), display === '1', output)
  );
}

export function htmlHasMath(html: string): boolean {
  return !!html && (html.indexOf('wz-math') !== -1 || hasMath(html));
}

/** Editor: render KaTeX into every empty/stale placeholder span under `root`. */
export function hydrateMath(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.wz-math').forEach((el) => {
    const tex = el.dataset.tex || '';
    const display = el.dataset.display === '1';
    const key = `${display ? 1 : 0}:${tex}`;
    if (el.dataset.rendered === key && el.childNodes.length > 0) return;
    el.innerHTML = renderTex(tex, display, 'htmlAndMathml');
    el.dataset.rendered = key;
    el.setAttribute('contenteditable', 'false');
  });
}

/** Editor: HTML to persist — math spans emptied (re-rendered on load) and typed `$…$` converted. */
export function serializeRichHtml(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('.wz-math').forEach((el) => {
    el.innerHTML = '';
    el.removeAttribute('data-rendered');
  });
  return dollarMathToSpans(clone.innerHTML);
}

/**
 * For exporters that escape the surrounding text: swap math for opaque tokens, let the caller
 * escape the rest, then call `restore` to put the rendered math back.
 */
export function extractMath(
  html: string,
  output: MathOutput = 'mathml'
): { text: string; restore: (escaped: string) => string; hasMath: boolean } {
  const rendered: string[] = [];
  const withSpans = dollarMathToSpans(html || '');
  const text = withSpans.replace(MATH_SPAN_RE, (_m, tex: string, display: string) => {
    rendered.push(renderTex(unescapeHtml(tex), display === '1', output));
    return `\u0001${rendered.length - 1}\u0001`;
  });
  return {
    text,
    hasMath: rendered.length > 0,
    restore: (escaped: string) => escaped.replace(/\u0001(\d+)\u0001/g, (_m, i: string) => rendered[Number(i)]),
  };
}
