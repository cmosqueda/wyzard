import { db } from '../db';
import { collectAssetIds, replaceAssetUrls } from '../db/assets';

/**
 * Uploaded images and audio are referenced in pages by `blob:` URLs, which mean nothing inside an .epub.
 * The bundler finds those references in the generated XHTML, copies the stored files into the package and
 * rewrites the references to the packaged copies.
 */

export interface BundledAsset {
  id: string;
  /** Path inside OEBPS, e.g. `images/asset-1.png` */
  href: string;
  mime: string;
  data: Blob;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
};

function extFor(mime: string, name: string): string {
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const fromName = /\.([A-Za-z0-9]{2,5})$/.exec(name)?.[1];
  return (fromName || 'bin').toLowerCase();
}

export function createEpubAssetBundler() {
  const bundled = new Map<string, BundledAsset>();
  const missing = new Set<string>();
  let counter = 0;

  /** Rewrites a document that is located one folder below OEBPS (e.g. `chapters/x.xhtml`). */
  async function rewrite(xml: string): Promise<string> {
    for (const id of collectAssetIds(xml)) {
      if (bundled.has(id) || missing.has(id)) continue;
      const stored = await db.assets.get(id);
      if (!stored) {
        missing.add(id);
        continue;
      }
      counter += 1;
      const mime = stored.mimeType || 'application/octet-stream';
      const folder = mime.startsWith('image/') ? 'images' : 'media';
      bundled.set(id, { id, href: `${folder}/asset-${counter}.${extFor(mime, stored.name)}`, mime, data: stored.data });
    }
    return replaceAssetUrls(xml, (id) => {
      const a = bundled.get(id);
      return a ? `../${a.href}` : undefined;
    });
  }

  return {
    rewrite,
    assets: () => Array.from(bundled.values()),
    /** Assets that pages reference but that are no longer stored (their URLs stay as they were) */
    missingCount: () => missing.size,
  };
}
