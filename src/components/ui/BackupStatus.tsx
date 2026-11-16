import React from 'react';
import { AlertTriangle, CheckCircle2, FolderSync, Loader2, Download, X } from 'lucide-react';
import { useBackupStore, getReminderKind, formatAgo } from '../../store/backupStore';
import { connectBackupFolder, reconnectBackupFolder } from '../../db/fsAccess';
import { downloadWorkspaceBackup } from '../../db/backup';
import { notify } from '../../store/toastStore';

/** Shared actions so the banner, chip and Settings behave identically. */
export async function runConnectFolder() {
  const r = await connectBackupFolder();
  if (r) {
    notify({
      type: 'success',
      title: 'Backup folder connected',
      message:
        r.restored > 0
          ? `Restored ${r.restored} project${r.restored === 1 ? '' : 's'} from the folder and saved the rest to it.`
          : `Saved ${r.written} project${r.written === 1 ? '' : 's'} to the folder. Changes now sync automatically.`,
      duration: 4200,
    });
  }
}

export async function runReconnectFolder() {
  const r = await reconnectBackupFolder();
  if (r) notify({ type: 'success', title: 'Backup folder reconnected', duration: 2400 });
}

export async function runDownloadBackup() {
  try {
    const r = await downloadWorkspaceBackup();
    notify({
      type: 'success',
      title: 'Backup downloaded',
      message: `${r.projects} project${r.projects === 1 ? '' : 's'} and ${r.assets} uploaded file${r.assets === 1 ? '' : 's'}.`,
    });
  } catch {
    notify({ type: 'error', title: 'Could not create the backup' });
  }
}

/** Dismissible reminder on the workspace page. */
export const BackupReminder: React.FC<{ projectCount: number; onOpenSettings?: () => void }> = ({
  projectCount,
  onOpenSettings,
}) => {
  const { folderStatus, folderName, lastBackupAt, snoozedUntil, storagePersisted, snoozeReminder } = useBackupStore();
  const kind = getReminderKind({ folderStatus, lastBackupAt, snoozedUntil }, projectCount);
  if (!kind) return null;

  const btn =
    'px-3 py-1.5 border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px]';

  return (
    <div
      role="status"
      className="mb-5 p-3 sm:p-4 bg-neo-yellow/25 border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <AlertTriangle className="w-5 h-5 text-neo-vermilion shrink-0" strokeWidth={2.5} />
      <div className="flex-1 min-w-0 text-xs font-mono text-neo-ink">
        {kind === 'reconnect' ? (
          <>
            <strong className="font-heading text-sm">Backup folder paused</strong>
            <p className="mt-0.5 text-gray-700">
              Your browser needs permission again to write to <strong>{folderName || 'your backup folder'}</strong> after a
              restart. Reconnect to resume automatic backups.
            </p>
          </>
        ) : (
          <>
            <strong className="font-heading text-sm">Back up your work</strong>
            <p className="mt-0.5 text-gray-700">
              Projects live only in this browser, and clearing site data would delete them
              {storagePersisted === false ? ' (the browser may also remove them when disk space runs low)' : ''}. Last
              backup: <strong>{formatAgo(lastBackupAt)}</strong>.
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {kind === 'reconnect' ? (
          <>
            <button onClick={runReconnectFolder} className={`${btn} bg-neo-yellow text-neo-ink`}>
              Reconnect folder
            </button>
            {onOpenSettings && (
              <button onClick={onOpenSettings} className={`${btn} bg-white text-neo-ink`}>
                Settings
              </button>
            )}
          </>
        ) : (
          <>
            {folderStatus !== 'unsupported' && (
              <button onClick={runConnectFolder} className={`${btn} bg-neo-yellow text-neo-ink flex items-center gap-1.5`}>
                <FolderSync className="w-3.5 h-3.5" strokeWidth={2.5} />
                Choose backup folder
              </button>
            )}
            <button onClick={runDownloadBackup} className={`${btn} bg-white text-neo-ink flex items-center gap-1.5`}>
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              Download backup
            </button>
          </>
        )}
        <button
          onClick={() => snoozeReminder(1)}
          className="p-1.5 text-gray-600 hover:text-neo-ink rounded"
          title="Remind me tomorrow"
          aria-label="Remind me tomorrow"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

/** Compact status for the editor header: folder sync state or a nudge to back up. */
export const BackupChip: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { folderStatus, folderName, isSyncing, lastFolderSyncAt, lastBackupAt, snoozedUntil } = useBackupStore();

  if (folderStatus === 'active') {
    return (
      <div
        className="flex items-center gap-1 bg-neo-teal/25 px-2.5 py-0.5 rounded-full border border-neo-ink/40 text-neo-ink"
        title={`Mirrored to “${folderName}” · last sync ${formatAgo(lastFolderSyncAt)}`}
      >
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FolderSync className="w-3 h-3" strokeWidth={2.5} />
        )}
        <span>Folder backup</span>
      </div>
    );
  }

  if (folderStatus === 'needs-permission') {
    return (
      <button
        onClick={runReconnectFolder}
        className="flex items-center gap-1 bg-neo-yellow px-2.5 py-0.5 rounded-full border border-neo-ink font-bold text-neo-ink hover:bg-neo-vermilion hover:text-white transition-colors"
        title={`Backup folder “${folderName}” needs permission again`}
      >
        <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
        <span>Reconnect folder</span>
      </button>
    );
  }

  if (getReminderKind({ folderStatus, lastBackupAt, snoozedUntil }, 1) === 'backup') {
    return (
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1 bg-neo-yellow/70 px-2.5 py-0.5 rounded-full border border-neo-ink/60 text-neo-ink hover:bg-neo-yellow transition-colors"
        title="Projects are only stored in this browser. Open Settings to back up."
      >
        <CheckCircle2 className="w-3 h-3 opacity-0 hidden" />
        <AlertTriangle className="w-3 h-3 text-neo-vermilion" strokeWidth={2.5} />
        <span>Not backed up</span>
      </button>
    );
  }

  return null;
};
