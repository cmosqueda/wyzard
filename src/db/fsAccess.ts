import type { BookProject } from '../types/ast';
import { db, type StoredAsset } from './index';
import { collectAssetIds } from './assets';
import { useBackupStore } from '../store/backupStore';

/**
 * Backup folder sync using the File System Access API (Chrome, Edge, and other Chromium browsers).
 *
 * The user picks a folder once. Wyzard then mirrors every project into it as real files:
 *   <folder>/projects/<id>.wyzard.json
 *   <folder>/assets/<assetId>.meta.json   (+ the file itself as <assetId>__<name>)
 * so the work survives clearing browser data. Connecting the same folder again later restores it.
 */

const HANDLE_KEY = 'backupFolderHandle';
const WRITE_DEBOUNCE_MS = 1200;

type DirHandle = FileSystemDirectoryHandle;
type Perm = 'granted' | 'prompt' | 'denied';

let root: DirHandle | null = null;
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const knownAssetFiles = new Set<string>();

const store = () => useBackupStore.getState();
const safeId = (id: string) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
const safeName = (name: string) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

export function isFolderSyncSupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && 'showDirectoryPicker' in window;
}

async function queryPermission(handle: DirHandle): Promise<Perm> {
  try {
    return (await (handle as any).queryPermission({ mode: 'readwrite' })) as Perm;
  } catch {
    return 'denied';
  }
}

async function requestPermission(handle: DirHandle): Promise<Perm> {
  try {
    return (await (handle as any).requestPermission({ mode: 'readwrite' })) as Perm;
  } catch {
    return 'denied';
  }
}

async function subdir(name: string, create = true): Promise<DirHandle> {
  if (!root) throw new Error('No backup folder connected');
  return root.getDirectoryHandle(name, { create });
}

async function writeFile(dir: DirHandle, name: string, data: string | Blob): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(data);
  await writable.close();
}

async function fileExists(dir: DirHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** Marks the folder as needing a fresh permission grant if a write was rejected. */
function handleWriteError(err: unknown) {
  const name = (err as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    store().setFolder('needs-permission');
  } else {
    store().setSyncError((err as Error)?.message || 'Could not write to the backup folder');
  }
  console.warn('Backup folder write failed:', err);
}

// ---------- assets ----------
async function ensureAssetInFolder(assetId: string): Promise<void> {
  if (knownAssetFiles.has(assetId)) return;
  const dir = await subdir('assets');
  const metaName = `${safeId(assetId)}.meta.json`;
  if (await fileExists(dir, metaName)) {
    knownAssetFiles.add(assetId);
    return;
  }
  const asset = await db.assets.get(assetId);
  if (!asset) return;
  await writeFile(dir, `${safeId(asset.id)}__${safeName(asset.name)}`, asset.data);
  const { data: _data, ...meta } = asset;
  await writeFile(dir, metaName, JSON.stringify(meta, null, 2));
  knownAssetFiles.add(assetId);
}

async function readAssetsFromFolder(): Promise<StoredAsset[]> {
  const dir = await subdir('assets');
  const out: StoredAsset[] = [];
  const names: string[] = [];
  for await (const [name] of (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>) names.push(name);

  for (const metaName of names.filter((n) => n.endsWith('.meta.json'))) {
    try {
      const meta = JSON.parse(await (await (await dir.getFileHandle(metaName)).getFile()).text());
      const prefix = `${safeId(meta.id)}__`;
      const dataName = names.find((n) => n.startsWith(prefix));
      if (!dataName) continue;
      const file = await (await dir.getFileHandle(dataName)).getFile();
      out.push({ ...meta, data: new Blob([file], { type: meta.mimeType || file.type }) } as StoredAsset);
    } catch {
      // skip unreadable entries
    }
  }
  return out;
}

// ---------- projects ----------
async function writeProjectNow(project: BookProject): Promise<void> {
  const dir = await subdir('projects');
  await writeFile(dir, `${safeId(project.id)}.wyzard.json`, JSON.stringify(project, null, 2));
  for (const id of collectAssetIds(project)) await ensureAssetInFolder(id);
}

async function readProjectsFromFolder(): Promise<BookProject[]> {
  const dir = await subdir('projects');
  const projects: BookProject[] = [];
  for await (const [name, handle] of (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind !== 'file' || !name.endsWith('.wyzard.json')) continue;
    try {
      const parsed = JSON.parse(await (await (handle as FileSystemFileHandle).getFile()).text());
      if (parsed?.id && Array.isArray(parsed.chapters)) projects.push(parsed as BookProject);
    } catch {
      // skip corrupt files
    }
  }
  return projects;
}

/** Debounced mirror of one project into the backup folder. Called after every save. */
export function mirrorProjectToFolder(project: BookProject): void {
  if (!root || store().folderStatus !== 'active') return;
  const existing = writeTimers.get(project.id);
  if (existing) clearTimeout(existing);
  const snapshot = JSON.parse(JSON.stringify(project)) as BookProject;
  writeTimers.set(
    project.id,
    setTimeout(async () => {
      writeTimers.delete(project.id);
      store().setSyncing(true);
      try {
        await writeProjectNow(snapshot);
        store().markFolderSynced();
      } catch (err) {
        handleWriteError(err);
      } finally {
        store().setSyncing(false);
      }
    }, WRITE_DEBOUNCE_MS)
  );
}

export async function removeProjectFromFolder(id: string): Promise<void> {
  const timer = writeTimers.get(id);
  if (timer) clearTimeout(timer);
  writeTimers.delete(id);
  if (!root || store().folderStatus !== 'active') return;
  try {
    const dir = await subdir('projects');
    await dir.removeEntry(`${safeId(id)}.wyzard.json`);
  } catch (err) {
    if ((err as DOMException)?.name !== 'NotFoundError') handleWriteError(err);
  }
}

export interface FolderSyncResult {
  restored: number;
  written: number;
  assetsRestored: number;
}

/**
 * Two-way merge between IndexedDB and the folder (newer `updatedAt` wins). Projects and uploaded
 * files that exist only in the folder are restored, e.g. after the browser's data was cleared.
 */
export async function syncAllWithFolder(): Promise<FolderSyncResult> {
  const result: FolderSyncResult = { restored: 0, written: 0, assetsRestored: 0 };
  if (!root) return result;
  store().setSyncing(true);
  try {
    // Folder -> IndexedDB
    const folderProjects = await readProjectsFromFolder();
    const dbProjects = await db.projects.toArray();
    const dbMap = new Map(dbProjects.map((p) => [p.id, p]));
    for (const fp of folderProjects) {
      const mine = dbMap.get(fp.id);
      if (!mine || (fp.updatedAt || 0) > (mine.updatedAt || 0)) {
        await db.projects.put(fp);
        dbMap.set(fp.id, fp);
        result.restored++;
      }
    }

    const folderAssets = await readAssetsFromFolder();
    for (const asset of folderAssets) {
      knownAssetFiles.add(asset.id);
      if (!(await db.assets.get(asset.id))) {
        await db.assets.put(asset);
        result.assetsRestored++;
      }
    }

    // IndexedDB -> folder
    const folderMap = new Map(folderProjects.map((p) => [p.id, p]));
    for (const proj of await db.projects.toArray()) {
      const onDisk = folderMap.get(proj.id);
      if (!onDisk || (proj.updatedAt || 0) > (onDisk.updatedAt || 0)) {
        await writeProjectNow(proj);
        result.written++;
      } else {
        for (const id of collectAssetIds(proj)) await ensureAssetInFolder(id);
      }
    }
    store().markFolderSynced();
  } catch (err) {
    handleWriteError(err);
  } finally {
    store().setSyncing(false);
  }
  return result;
}

// ---------- connect / reconnect / disconnect ----------
async function activate(handle: DirHandle): Promise<FolderSyncResult> {
  root = handle;
  knownAssetFiles.clear();
  store().setFolder('active', handle.name);
  return syncAllWithFolder();
}

/** Must be called from a click handler (opens the folder picker). */
export async function connectBackupFolder(): Promise<FolderSyncResult | null> {
  if (!isFolderSyncSupported()) return null;
  try {
    const handle: DirHandle = await (window as any).showDirectoryPicker({ id: 'wyzard-backup', mode: 'readwrite' });
    if ((await requestPermission(handle)) !== 'granted') {
      store().setSyncError('Permission to write to that folder was not granted');
      return null;
    }
    await db.kv.put({ key: HANDLE_KEY, value: handle });
    return await activate(handle);
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return null; // picker dismissed
    store().setSyncError((err as Error)?.message || 'Could not open the folder');
    return null;
  }
}

/** Must be called from a click handler: browsers ask again for permission after a restart. */
export async function reconnectBackupFolder(): Promise<FolderSyncResult | null> {
  const saved = (await db.kv.get(HANDLE_KEY))?.value as DirHandle | undefined;
  if (!saved) return null;
  if ((await requestPermission(saved)) !== 'granted') {
    store().setFolder('needs-permission', saved.name);
    return null;
  }
  return activate(saved);
}

export async function disconnectBackupFolder(): Promise<void> {
  root = null;
  knownAssetFiles.clear();
  writeTimers.forEach((t) => clearTimeout(t));
  writeTimers.clear();
  await db.kv.delete(HANDLE_KEY);
  store().setFolder('none', '');
}

/** App start: restore the saved folder, sync silently if permission is still granted. */
export async function initFolderSync(): Promise<void> {
  if (!isFolderSyncSupported()) {
    store().setFolder('unsupported');
    return;
  }
  try {
    const saved = (await db.kv.get(HANDLE_KEY))?.value as DirHandle | undefined;
    if (!saved) {
      store().setFolder('none');
      return;
    }
    if ((await queryPermission(saved)) === 'granted') {
      await activate(saved);
    } else {
      store().setFolder('needs-permission', saved.name);
    }
  } catch (err) {
    console.warn('Could not restore the backup folder:', err);
    store().setFolder('none');
  }
}
