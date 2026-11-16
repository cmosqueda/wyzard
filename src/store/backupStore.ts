import { create } from 'zustand';

/**
 * Where the user's work is protected: an optional synced folder (File System Access API) and manual
 * `.wyzard.json` backups. Drives the backup reminders and the sync status chip.
 */
export type FolderStatus = 'unsupported' | 'none' | 'active' | 'needs-permission' | 'error';

const STORAGE_KEY = 'wyzard-backup-state';
export const BACKUP_REMINDER_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

interface Persisted {
  lastBackupAt: number | null;
  lastFolderSyncAt: number | null;
  snoozedUntil: number | null;
}

function readPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        lastBackupAt: typeof p.lastBackupAt === 'number' ? p.lastBackupAt : null,
        lastFolderSyncAt: typeof p.lastFolderSyncAt === 'number' ? p.lastFolderSyncAt : null,
        snoozedUntil: typeof p.snoozedUntil === 'number' ? p.snoozedUntil : null,
      };
    }
  } catch {
    // ignore storage errors
  }
  return { lastBackupAt: null, lastFolderSyncAt: null, snoozedUntil: null };
}

function writePersisted(p: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore storage errors
  }
}

interface BackupState extends Persisted {
  folderStatus: FolderStatus;
  folderName: string;
  isSyncing: boolean;
  syncError: string | null;
  /** navigator.storage.persisted(): true once the browser promises not to evict our data */
  storagePersisted: boolean | null;

  setFolder: (status: FolderStatus, name?: string) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (message: string | null) => void;
  setStoragePersisted: (persisted: boolean | null) => void;
  markFolderSynced: () => void;
  markFileBackup: () => void;
  snoozeReminder: (days?: number) => void;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  ...readPersisted(),
  folderStatus: 'none',
  folderName: '',
  isSyncing: false,
  syncError: null,
  storagePersisted: null,

  setFolder: (status, name) => set({ folderStatus: status, folderName: name ?? (status === 'none' ? '' : get().folderName) }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setSyncError: (syncError) => set({ syncError }),
  setStoragePersisted: (storagePersisted) => set({ storagePersisted }),

  markFolderSynced: () => {
    const lastFolderSyncAt = Date.now();
    set({ lastFolderSyncAt, syncError: null });
    const { lastBackupAt, snoozedUntil } = get();
    writePersisted({ lastBackupAt, lastFolderSyncAt, snoozedUntil });
  },

  markFileBackup: () => {
    const lastBackupAt = Date.now();
    set({ lastBackupAt, snoozedUntil: null });
    const { lastFolderSyncAt } = get();
    writePersisted({ lastBackupAt, lastFolderSyncAt, snoozedUntil: null });
  },

  snoozeReminder: (days = 1) => {
    const snoozedUntil = Date.now() + days * DAY;
    set({ snoozedUntil });
    const { lastBackupAt, lastFolderSyncAt } = get();
    writePersisted({ lastBackupAt, lastFolderSyncAt, snoozedUntil });
  },
}));

export type ReminderKind = 'reconnect' | 'backup' | null;

/** Which reminder (if any) should be showing right now. */
export function getReminderKind(
  s: Pick<BackupState, 'folderStatus' | 'lastBackupAt' | 'snoozedUntil'>,
  projectCount: number
): ReminderKind {
  if (projectCount === 0) return null;
  if (s.snoozedUntil && s.snoozedUntil > Date.now()) return null;
  if (s.folderStatus === 'needs-permission') return 'reconnect';
  if (s.folderStatus === 'active') return null;
  const stale = !s.lastBackupAt || Date.now() - s.lastBackupAt > BACKUP_REMINDER_DAYS * DAY;
  return stale ? 'backup' : null;
}

export function formatAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
