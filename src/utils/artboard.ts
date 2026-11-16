/**
 * Fixed Visual Canvas artboard sizing.
 *
 * An artboard has a preset aspect ratio (kept for backwards compatibility and as quick presets) and,
 * optionally, a free-form size set by dragging its edges:
 *  - `artboardHeight`: height ÷ width ratio (e.g. 0.5625 for 16:9)
 *  - `artboardWidth`:  width as a percentage of the page column (20–100)
 */
export type ArtboardPreset = '16/9' | '4/3' | '1/1' | '4/5';

export const MIN_ARTBOARD_HEIGHT_RATIO = 0.2;
export const MAX_ARTBOARD_HEIGHT_RATIO = 3;
export const MIN_ARTBOARD_WIDTH_PCT = 20;

/** Height-to-width ratio (H / W). A free-form `custom` value wins over the preset. */
export function getArtboardHeightRatio(ratio: string = '16/9', custom?: number): number {
  if (typeof custom === 'number' && Number.isFinite(custom) && custom > 0) {
    return Math.min(MAX_ARTBOARD_HEIGHT_RATIO, Math.max(MIN_ARTBOARD_HEIGHT_RATIO, custom));
  }
  switch (ratio) {
    case '1/1':
      return 1;
    case '4/5':
      return 5 / 4;
    case '4/3':
      return 3 / 4;
    case '16/9':
    default:
      return 9 / 16;
  }
}

/** Artboard width as a percentage (20–100) of its column. */
export function getArtboardWidthPct(custom?: number): number {
  if (typeof custom !== 'number' || !Number.isFinite(custom)) return 100;
  return Math.min(100, Math.max(MIN_ARTBOARD_WIDTH_PCT, custom));
}
