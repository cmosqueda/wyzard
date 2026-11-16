import { db, type StoredAsset } from './index';
import { notify } from '../store/toastStore';
import type { BookProject } from '../types/ast';

/**
 * Uploaded files are referenced by object URLs, which die when the page reloads. Every URL we hand out
 * carries the asset id in its fragment (`blob:…#wzasset=<id>`; fragments are ignored when the URL is
 * fetched) so the real file can be found again in IndexedDB and re-linked when a project is opened.
 */
const ASSET_TAG = '#wzasset=';
const ASSET_URL_RE = /blob:[^"\\\s]*?#wzasset=([A-Za-z0-9_-]+)/g;

function tagUrl(objectUrl: string, assetId: string): string {
  return `${objectUrl}${ASSET_TAG}${assetId}`;
}

/** Asset ids referenced anywhere inside a project (or any JSON-able value). */
export function collectAssetIds(value: unknown): string[] {
  const ids = new Set<string>();
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const m of text.matchAll(ASSET_URL_RE)) ids.add(m[1]);
  return Array.from(ids);
}

/**
 * Replaces stale `blob:` URLs of uploaded assets with fresh ones created from the files stored in
 * IndexedDB. Safe to call on every project load.
 */
export async function rehydrateProjectAssets(project: BookProject): Promise<BookProject> {
  const json = JSON.stringify(project);
  const ids = collectAssetIds(json);
  if (ids.length === 0) return project;

  const fresh = new Map<string, string>();
  for (const id of ids) {
    const url = await getAssetUrl(id);
    if (url) fresh.set(id, url);
  }
  if (fresh.size === 0) return project;

  const next = json.replace(ASSET_URL_RE, (whole, id: string) => fresh.get(id) ?? whole);
  return next === json ? project : (JSON.parse(next) as BookProject);
}

// Cache for Object URLs created from IndexedDB Blobs
const blobUrlCache = new Map<string, string>();
const MAX_ASSET_BYTES = 25 * 1024 * 1024; // 25 MB limit

/**
 * Stores a local image/audio File or Blob into IndexedDB with validation and returns a persistent blob URI.
 */
export async function saveAsset(projectId: string, file: File): Promise<string> {
  if (!file || file.size === 0) {
    notify({
      type: 'error',
      title: 'Invalid Asset File',
      message: 'The selected file is empty or unreadable.',
    });
    throw new Error('Empty file');
  }

  if (file.size > MAX_ASSET_BYTES) {
    notify({
      type: 'error',
      title: 'Asset Exceeds 25MB Limit',
      message: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please compress it under 25 MB.`,
    });
    throw new Error('File too large');
  }

  const assetId = 'asset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const storedAsset: StoredAsset = {
    id: assetId,
    projectId,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    data: file,
    createdAt: Date.now(),
  };

  await db.assets.put(storedAsset);
  const url = tagUrl(URL.createObjectURL(file), assetId);
  blobUrlCache.set(assetId, url);
  notify({
    type: 'success',
    title: 'Asset Saved Locally',
    message: `"${file.name}" (${Math.max(1, Math.round(file.size / 1024))} KB) stored in Wyzard DB.`,
    duration: 2400,
  });
  return url;
}

/**
 * Retrieves a stored asset as an ObjectURL.
 */
export async function getAssetUrl(assetId: string): Promise<string | null> {
  if (blobUrlCache.has(assetId)) {
    return blobUrlCache.get(assetId)!;
  }

  const asset = await db.assets.get(assetId);
  if (!asset) return null;

  const url = tagUrl(URL.createObjectURL(asset.data), assetId);
  blobUrlCache.set(assetId, url);
  return url;
}

/**
 * Convert a file to a base64 data URL (useful for EPUB bundling).
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
