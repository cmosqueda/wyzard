import type { BookProject } from '../types/ast';
import { db } from './index';
import { mirrorProjectToFolder, removeProjectFromFolder } from './fsAccess';

export interface LocalFsStatus {
  available: boolean;
  storageDir: string;
  defaultStorageDir: string;
  projectFileCount: number;
  assetFileCount: number;
  diskBytes: number;
  files: { name: string; type: 'project' | 'asset'; size: number }[];
}

export async function getLocalFsStatus(): Promise<LocalFsStatus | null> {
  try {
    const res = await fetch('/api/fs/status');
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.available) {
      return data as LocalFsStatus;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateLocalFsDirectory(storageDir: string): Promise<string | null> {
  try {
    const res = await fetch('/api/fs/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageDir }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.storageDir || null;
  } catch {
    return null;
  }
}

export async function syncProjectToLocalFs(project: BookProject): Promise<boolean> {
  mirrorProjectToFolder(project); // File System Access backup folder (no-op unless connected)
  try {
    const res = await fetch('/api/fs/project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteProjectFromLocalFs(id: string): Promise<boolean> {
  void removeProjectFromFolder(id);
  try {
    const res = await fetch(`/api/fs/project?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Bi-directional sync between local machine disk folder and IndexedDB.
 * - Restores any disk projects missing from IndexedDB (e.g. after browser cache wipe).
 * - Writes any IndexedDB projects missing on disk to the local folder.
 */
export async function syncAllWithLocalFs(): Promise<{
  restoredFromDisk: number;
  writtenToDisk: number;
}> {
  let restoredFromDisk = 0;
  let writtenToDisk = 0;

  try {
    const res = await fetch('/api/fs/projects');
    if (!res.ok) return { restoredFromDisk, writtenToDisk };
    const data = await res.json();
    const diskProjects: BookProject[] = Array.isArray(data.projects) ? data.projects : [];
    const dbProjects = await db.projects.toArray();

    const dbMap = new Map(dbProjects.map((p) => [p.id, p]));
    const diskMap = new Map(diskProjects.map((p) => [p.id, p]));

    // 1. Restore from disk -> IndexedDB if missing or newer on disk
    for (const diskProj of diskProjects) {
      const existing = dbMap.get(diskProj.id);
      if (!existing || (diskProj.updatedAt || 0) > (existing.updatedAt || 0)) {
        await db.projects.put(diskProj);
        restoredFromDisk++;
      }
    }

    // 2. Write from IndexedDB -> disk if missing or newer in IndexedDB
    for (const dbProj of dbProjects) {
      const onDisk = diskMap.get(dbProj.id);
      if (!onDisk || (dbProj.updatedAt || 0) >= (onDisk.updatedAt || 0)) {
        const ok = await syncProjectToLocalFs(dbProj);
        if (ok) writtenToDisk++;
      }
    }
  } catch {
    // Offline or static mode without local Vite FS endpoint
  }

  return { restoredFromDisk, writtenToDisk };
}
