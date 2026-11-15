export const WYZARD_ASSET_MIME = 'application/x-wyzard-asset';

export interface WyzardAssetDragPayload {
  title: string;
  assetUrl: string;
  creator: string;
  creatorUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  license: string;
  licenseUrl?: string;
  kind: 'image' | 'vector' | 'pack-item';
  defaultWidthPct?: number;
  defaultHeightPct?: number;
  borderNeo?: boolean;
}

export function setAssetDragData(
  e: React.DragEvent,
  payload: WyzardAssetDragPayload
): void {
  try {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(WYZARD_ASSET_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', payload.assetUrl);
  } catch {
    // Fallback if browser restricts custom MIME
  }
}

export function hasAssetDragData(e: React.DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types || []);
  return (
    types.includes(WYZARD_ASSET_MIME) ||
    types.includes('Files') ||
    types.includes('text/uri-list')
  );
}

export function getAssetDragData(
  e: React.DragEvent
): WyzardAssetDragPayload | null {
  try {
    const raw = e.dataTransfer.getData(WYZARD_ASSET_MIME);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.assetUrl === 'string') {
        return parsed as WyzardAssetDragPayload;
      }
    }
    const uri =
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('text/plain');
    if (uri && /^https?:\/\/.+/i.test(uri.trim())) {
      return {
        title: 'Dropped Visual Asset',
        assetUrl: uri.trim(),
        creator: 'External Contributor',
        sourceName: 'Dragged Web Resource',
        sourceUrl: uri.trim(),
        license: 'CC / External',
        kind: 'image',
        defaultWidthPct: 32,
        defaultHeightPct: 40,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}
