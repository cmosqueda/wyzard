import { db, type StoredAsset } from './index';
import { notify } from '../store/toastStore';

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
  const url = URL.createObjectURL(file);
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
