/**
 * Google Fonts integration (open-source, OFL / Apache licensed families).
 *
 * The public CSS API (https://fonts.googleapis.com/css2) needs no API key, so any family
 * name that exists on Google Fonts can be used. A curated list is offered for quick picking.
 */

export type FontCategory = 'sans' | 'serif' | 'display' | 'handwriting' | 'mono';

export interface GoogleFontEntry {
  family: string;
  category: FontCategory;
  /** Weights to request, e.g. '400;700'. Single-weight display faces use '400'. */
  weights: string;
}

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Sans',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Script',
  mono: 'Mono',
};

export const GOOGLE_FONTS: GoogleFontEntry[] = [
  // Sans
  { family: 'Inter', category: 'sans', weights: '400;700' },
  { family: 'Roboto', category: 'sans', weights: '400;700' },
  { family: 'Open Sans', category: 'sans', weights: '400;700' },
  { family: 'Lato', category: 'sans', weights: '400;700' },
  { family: 'Montserrat', category: 'sans', weights: '400;700' },
  { family: 'Poppins', category: 'sans', weights: '400;700' },
  { family: 'Nunito', category: 'sans', weights: '400;700' },
  { family: 'Work Sans', category: 'sans', weights: '400;700' },
  { family: 'DM Sans', category: 'sans', weights: '400;700' },
  { family: 'Source Sans 3', category: 'sans', weights: '400;700' },
  { family: 'Raleway', category: 'sans', weights: '400;700' },
  { family: 'Manrope', category: 'sans', weights: '400;700' },
  { family: 'Plus Jakarta Sans', category: 'sans', weights: '400;700' },
  // Serif
  { family: 'Playfair Display', category: 'serif', weights: '400;700' },
  { family: 'Merriweather', category: 'serif', weights: '400;700' },
  { family: 'Lora', category: 'serif', weights: '400;700' },
  { family: 'Source Serif 4', category: 'serif', weights: '400;700' },
  { family: 'Libre Baskerville', category: 'serif', weights: '400;700' },
  { family: 'EB Garamond', category: 'serif', weights: '400;700' },
  { family: 'Cormorant Garamond', category: 'serif', weights: '400;700' },
  { family: 'Crimson Pro', category: 'serif', weights: '400;700' },
  { family: 'PT Serif', category: 'serif', weights: '400;700' },
  { family: 'Noto Serif', category: 'serif', weights: '400;700' },
  // Display
  { family: 'Space Grotesk', category: 'display', weights: '400;700' },
  { family: 'Bebas Neue', category: 'display', weights: '400' },
  { family: 'Oswald', category: 'display', weights: '400;700' },
  { family: 'Anton', category: 'display', weights: '400' },
  { family: 'Abril Fatface', category: 'display', weights: '400' },
  { family: 'Archivo Black', category: 'display', weights: '400' },
  { family: 'Fraunces', category: 'display', weights: '400;700' },
  { family: 'Bangers', category: 'display', weights: '400' },
  // Script / handwriting
  { family: 'Caveat', category: 'handwriting', weights: '400;700' },
  { family: 'Dancing Script', category: 'handwriting', weights: '400;700' },
  { family: 'Pacifico', category: 'handwriting', weights: '400' },
  { family: 'Patrick Hand', category: 'handwriting', weights: '400' },
  { family: 'Shadows Into Light', category: 'handwriting', weights: '400' },
  // Mono
  { family: 'JetBrains Mono', category: 'mono', weights: '400;700' },
  { family: 'Fira Code', category: 'mono', weights: '400;700' },
  { family: 'IBM Plex Mono', category: 'mono', weights: '400;700' },
  { family: 'Space Mono', category: 'mono', weights: '400;700' },
  { family: 'Source Code Pro', category: 'mono', weights: '400;700' },
];

const FALLBACK_STACK: Record<FontCategory, string> = {
  sans: 'sans-serif',
  serif: 'serif',
  display: 'sans-serif',
  handwriting: 'cursive',
  mono: 'monospace',
};

export function findGoogleFont(family?: string): GoogleFontEntry | undefined {
  if (!family) return undefined;
  const needle = family.trim().toLowerCase();
  return GOOGLE_FONTS.find((f) => f.family.toLowerCase() === needle);
}

/** CSS font-family value including a generic fallback, e.g. `"Lora", serif`. */
export function googleFontStack(family: string): string {
  const entry = findGoogleFont(family);
  const clean = family.replace(/["']/g, '').trim();
  return `"${clean}", ${FALLBACK_STACK[entry?.category || 'sans']}`;
}

function familyParam(family: string): string {
  const entry = findGoogleFont(family);
  const name = encodeURIComponent(family.trim()).replace(/%20/g, '+');
  // Unknown (custom-typed) families are requested without axes so the request can't 400
  // on a weight the family doesn't ship.
  return entry && entry.weights !== '400' ? `family=${name}:wght@${entry.weights}` : `family=${name}`;
}

/** Stylesheet URL for one or more Google Font families. */
export function googleFontsHref(families: string[]): string {
  const unique = Array.from(new Set(families.map((f) => f.trim()).filter(Boolean)));
  return `https://fonts.googleapis.com/css2?${unique.map(familyParam).join('&')}&display=swap`;
}

const loaded = new Set<string>();

/** Injects the stylesheet for a family into the document once (editor / in-app preview). */
export function loadGoogleFont(family?: string): void {
  if (!family || typeof document === 'undefined') return;
  loadGoogleFonts([family]);
}

export function loadGoogleFonts(families: string[]): void {
  if (typeof document === 'undefined') return;
  const fresh = families.filter((f) => f && !loaded.has(f.trim()));
  if (fresh.length === 0) return;
  fresh.forEach((f) => loaded.add(f.trim()));
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontsHref(fresh);
  document.head.appendChild(link);
}
