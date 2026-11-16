import { saveAs } from 'file-saver';
import { db, type StoredAsset } from './index';
import { collectAssetIds } from './assets';
import { useBackupStore } from '../store/backupStore';

/**
 * Portable `.wyzard.json` workspace backup: every project plus the uploaded files they reference
 * (embedded as base64), so images and audio survive a restore on any browser.
 */
interface BackupAsset extends Omit<StoredAsset, 'data'> {
  dataBase64: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function downloadWorkspaceBackup(): Promise<{ projects: number; assets: number }> {
  const projects = await db.projects.toArray();
  const wanted = new Set(projects.flatMap((p) => collectAssetIds(p)));
  const assets: BackupAsset[] = [];
  for (const id of wanted) {
    const a = await db.assets.get(id);
    if (!a) continue;
    const { data, ...meta } = a;
    assets.push({ ...meta, dataBase64: await blobToBase64(data) });
  }
  const payload = { version: '1.1.0', exportedAt: Date.now(), projects, assets };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `wyzard-workspace-backup-${new Date().toISOString().slice(0, 10)}.wyzard.json`);
  useBackupStore.getState().markFileBackup();
  return { projects: projects.length, assets: assets.length };
}

export async function importWorkspaceBackup(file: File): Promise<{ projects: number; assets: number }> {
  const parsed = JSON.parse(await file.text());
  const projects = Array.isArray(parsed.projects) ? parsed.projects : parsed.id && parsed.chapters ? [parsed] : [];
  if (projects.length === 0) throw new Error('No projects found in that file');

  let assetCount = 0;
  for (const a of Array.isArray(parsed.assets) ? (parsed.assets as BackupAsset[]) : []) {
    if (!a?.id || !a.dataBase64) continue;
    const { dataBase64, ...meta } = a;
    await db.assets.put({ ...meta, data: base64ToBlob(dataBase64, meta.mimeType) });
    assetCount++;
  }
  for (const proj of projects) await db.projects.put(proj);
  return { projects: projects.length, assets: assetCount };
}
