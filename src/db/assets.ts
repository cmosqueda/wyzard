import { db, type StoredAsset } from './index';

// Cache for Object URLs created from IndexedDB Blobs
const blobUrlCache = new Map<string, string>();

/**
 * Stores a local image File or Blob into IndexedDB and returns a persistent blob URI or asset ID.
 */
export async function saveAsset(projectId: string, file: File): Promise<string> {
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
  const url = URL.createObjectURL(file);
  blobUrlCache.set(assetId, url);
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

  const url = URL.createObjectURL(asset.data);
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
