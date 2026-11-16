import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
  getLocalFsStatus,
  updateLocalFsDirectory,
  syncAllWithLocalFs,
  type LocalFsStatus,
} from '../../db/localFs';
import { saveAs } from 'file-saver';
import { useBackupStore, formatAgo } from '../../store/backupStore';
import { disconnectBackupFolder, syncAllWithFolder } from '../../db/fsAccess';
import { downloadWorkspaceBackup, importWorkspaceBackup } from '../../db/backup';
import { runConnectFolder, runReconnectFolder } from '../ui/BackupStatus';
import { useEditorStore, type WyzardThemeMode } from '../../store/editorStore';
import {
  X,
  Settings,
  HardDrive,
  FolderSync,
  Database,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  FileJson,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Palette,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const assets = useLiveQuery(() => db.assets.toArray(), []) || [];
  const backup = useBackupStore();
  const themeMode = useEditorStore((state) => state.themeMode);
  const setThemeMode = useEditorStore((state) => state.setThemeMode);

  const [fsStatus, setFsStatus] = useState<LocalFsStatus | null>(null);
  const [customDirInput, setCustomDirInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ usage: number; quota: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshStorageStatus = async () => {
    const status = await getLocalFsStatus();
    setFsStatus(status);
    if (status && !customDirInput) {
      setCustomDirInput(status.storageDir);
    }

    if (navigator.storage) {
      try {
        if (navigator.storage.persisted) {
          const persisted = await navigator.storage.persisted();
          setIsPersisted(persisted);
        }
        if (navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          setQuotaInfo({ usage: est.usage || 0, quota: est.quota || 0 });
        }
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStorageStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const projectSizes = projects.map((p) => ({
    id: p.id,
    title: p.title,
    chapters: p.chapters?.length || 1,
    bytes: new Blob([JSON.stringify(p)]).size,
  }));

  const totalProjectBytes = projectSizes.reduce((sum, p) => sum + p.bytes, 0);
  const totalAssetBytes = assets.reduce((sum, a) => sum + (a.size || 0), 0);
  const totalWyzardBytes = totalProjectBytes + totalAssetBytes;

  const projectIds = new Set(projects.map((p) => p.id));
  const orphanedAssets = assets.filter((a) => !projectIds.has(a.projectId));

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3200);
  };

  const handleRequestPersistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
      showToast(
        granted
          ? 'Browser persistent storage lock enabled!'
          : 'Browser managed storage (install as PWA or Extension for unlimited lock).'
      );
    }
  };

  const handleSaveStorageDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDirInput.trim()) return;
    setIsSyncing(true);
    const updatedDir = await updateLocalFsDirectory(customDirInput.trim());
    if (updatedDir) {
      await syncAllWithLocalFs();
      await refreshStorageStatus();
      showToast(`Local storage directory set to ${updatedDir}`);
    } else {
      showToast('Could not update folder path. Check permissions.');
    }
    setIsSyncing(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const res = await syncAllWithLocalFs();
    await refreshStorageStatus();
    setIsSyncing(false);
    showToast(
      `Synced! Written: ${res.writtenToDisk} projects • Restored: ${res.restoredFromDisk}`
    );
  };

  const handlePurgeOrphanAssets = async () => {
    if (orphanedAssets.length === 0) return;
    for (const asset of orphanedAssets) {
      await db.assets.delete(asset.id);
    }
    showToast(`Cleaned up ${orphanedAssets.length} orphaned asset(s).`);
  };

  const handleExportWorkspaceBackup = async () => {
    try {
      const r = await downloadWorkspaceBackup();
      showToast(`Downloaded backup: ${r.projects} project(s), ${r.assets} uploaded file(s).`);
    } catch {
      showToast('Could not create the backup file.');
    }
  };

  const handleImportWorkspaceBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await importWorkspaceBackup(file);
      await syncAllWithLocalFs();
      await refreshStorageStatus();
      showToast(`Imported ${r.projects} project(s) and ${r.assets} uploaded file(s).`);
    } catch {
      showToast('Invalid .wyzard.json backup file.');
    }
    e.target.value = '';
  };

  const handleFolderSyncNow = async () => {
    const r = await syncAllWithFolder();
    showToast(`Folder synced — wrote ${r.written}, restored ${r.restored} project(s).`);
  };

  const handleFolderDisconnect = async () => {
    await disconnectBackupFolder();
    showToast('Backup folder disconnected. Files already in the folder were kept.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-neo-bg border-neo-thick border-neo-ink rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-white border-b-neo border-neo-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neo-yellow rounded border-neo border-neo-ink shadow-neo-sm">
              <Settings className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-neo-ink">
                Wyzard Settings &amp; Local Data Management
              </h3>
              <p className="text-xs font-mono text-gray-500">
                Track workspace project sizes, image assets, and local machine filesystem sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neo-ink hover:bg-neo-vermilion hover:text-white rounded border-neo border-neo-ink shadow-neo-sm transition-all"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mx-6 mt-4 px-3 py-2 bg-neo-teal/30 border-neo border-neo-ink rounded-lg flex items-center gap-2 text-xs font-mono font-bold text-neo-ink">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* 0. Wyzard Theme Style & Studio Appearance (Light Mode / Dark Mode / System) */}
          <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-neo-vermilion" strokeWidth={2.5} />
                <div>
                  <h4 className="font-heading font-bold text-sm text-neo-ink">
                    Wyzard Theme &amp; Studio Appearance
                  </h4>
                  <p className="text-[11px] font-mono text-gray-500">
                    Switch between Warm Newsprint Light Mode and Midnight Obsidian Dark Mode
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-neo-yellow text-neo-ink border border-neo-ink">
                Active: {themeMode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'light' as WyzardThemeMode,
                    title: 'Light Mode',
                    subtitle: 'Warm Newsprint & Ink',
                    icon: Sun,
                    previewBg: '#F4F1EA',
                    previewSurface: '#FFFFFF',
                    previewInk: '#141414',
                    previewAccent: '#FFD23F',
                  },
                  {
                    id: 'dark' as WyzardThemeMode,
                    title: 'Dark Mode',
                    subtitle: 'Midnight Obsidian Studio',
                    icon: Moon,
                    previewBg: '#121316',
                    previewSurface: '#1D1F24',
                    previewInk: '#F4F1EA',
                    previewAccent: '#FF5E3A',
                  },
                  {
                    id: 'system' as WyzardThemeMode,
                    title: 'System Auto',
                    subtitle: 'Match Device OS Theme',
                    icon: Monitor,
                    previewBg: 'linear-gradient(135deg, #F4F1EA 50%, #121316 50%)',
                    previewSurface: '#3BCEAC',
                    previewInk: '#141414',
                    previewAccent: '#FFD23F',
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const isSelected = themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeMode(opt.id)}
                    className={`p-3 rounded-xl border-neo border-neo-ink text-left flex flex-col gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-neo-yellow/25 ring-2 ring-neo-vermilion shadow-neo-sm'
                        : 'bg-neo-bg/50 hover:bg-neo-bg'
                    }`}
                  >
                    {/* Visual Mini Studio Preview Swatch */}
                    <div
                      style={{ background: opt.previewBg }}
                      className="h-12 w-full rounded-lg border border-neo-ink p-2 flex items-center justify-between overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{ backgroundColor: opt.previewSurface }}
                          className="w-5 h-5 rounded border border-neo-ink/60 block"
                        />
                        <span
                          style={{ backgroundColor: opt.previewAccent }}
                          className="w-3.5 h-3.5 rounded-full border border-neo-ink/60 block"
                        />
                      </div>
                      <span
                        style={{
                          backgroundColor: opt.previewInk,
                          color: opt.id === 'dark' ? '#121316' : '#FFFFFF',
                        }}
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      >
                        Aa
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-heading font-bold text-xs text-neo-ink flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-neo-vermilion" />
                          <span>{opt.title}</span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                          {opt.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-neo-vermilion shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Storage Usage Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-1">
                <span>Total Wyzard Data</span>
                <Database className="w-4 h-4 text-neo-vermilion" />
              </div>
              <div className="font-heading font-bold text-xl text-neo-ink">
                {formatBytes(totalWyzardBytes)}
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">
                {quotaInfo && quotaInfo.quota > 0
                  ? `Browser Quota: ${formatBytes(quotaInfo.usage)} used`
                  : 'IndexedDB + Local Disk Sync'}
              </div>
            </div>

            <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-1">
                <span>Saved Layouts ({projects.length})</span>
                <FileJson className="w-4 h-4 text-neo-teal" />
              </div>
              <div className="font-heading font-bold text-xl text-neo-ink">
                {formatBytes(totalProjectBytes)}
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">
                Craft.js AST &amp; Chapter JSON
              </div>
            </div>

            <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-1">
                <span>Media Assets ({assets.length})</span>
                <ImageIcon className="w-4 h-4 text-neo-violet" />
              </div>
              <div className="font-heading font-bold text-xl text-neo-ink">
                {formatBytes(totalAssetBytes)}
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">
                {orphanedAssets.length > 0
                  ? `${orphanedAssets.length} orphaned blob(s)`
                  : 'All blobs linked to projects'}
              </div>
            </div>
          </div>

          {/* 1b. Backup folder (File System Access API) */}
          <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FolderSync className="w-5 h-5 text-neo-teal" strokeWidth={2.5} />
                <div>
                  <h4 className="font-heading font-bold text-sm text-neo-ink">Backup folder</h4>
                  <p className="text-[11px] font-mono text-gray-500">
                    Mirror every project and uploaded file into a folder you choose, so clearing browser data can't delete your work
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-neo-ink ${
                  backup.folderStatus === 'active'
                    ? 'bg-neo-teal text-neo-ink'
                    : backup.folderStatus === 'needs-permission'
                    ? 'bg-neo-vermilion text-white'
                    : 'bg-neo-yellow text-neo-ink'
                }`}
              >
                {backup.folderStatus === 'active'
                  ? `Active · ${backup.folderName}`
                  : backup.folderStatus === 'needs-permission'
                  ? 'Needs permission'
                  : backup.folderStatus === 'unsupported'
                  ? 'Not supported'
                  : 'Not set up'}
              </span>
            </div>

            {backup.folderStatus === 'unsupported' && (
              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                Folder backup needs the File System Access API (Chrome, Edge, Brave, Opera, and other Chromium browsers).
                In this browser, use <strong>Export All</strong> below and keep the file somewhere safe.
              </p>
            )}

            {backup.folderStatus === 'none' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-mono text-gray-600 leading-snug">
                  Pick a folder (for example in Documents, or inside Dropbox / OneDrive / iCloud for cloud backup). Wyzard writes{' '}
                  <code>projects/*.wyzard.json</code> and your uploaded files there after every change. After clearing browser
                  data, choose the same folder again to restore everything.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={runConnectFolder}
                    className="px-3 py-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                  >
                    Choose backup folder…
                  </button>
                </div>
              </div>
            )}

            {backup.folderStatus === 'needs-permission' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-mono text-gray-600 leading-snug">
                  Browsers ask for permission again after a restart. Reconnect <strong>{backup.folderName}</strong> to resume
                  automatic backups.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runReconnectFolder}
                    className="px-3 py-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm"
                  >
                    Reconnect folder
                  </button>
                  <button
                    type="button"
                    onClick={handleFolderDisconnect}
                    className="px-3 py-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {backup.folderStatus === 'active' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-mono text-gray-600">
                  Last synced <strong>{formatAgo(backup.lastFolderSyncAt)}</strong>. Changes are written about a second after
                  you stop editing.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleFolderSyncNow}
                    disabled={backup.isSyncing}
                    className="px-3 py-1.5 bg-neo-ink text-white border-neo border-neo-ink rounded font-mono text-xs font-bold flex items-center gap-1 hover:bg-neo-vermilion transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${backup.isSyncing ? 'animate-spin' : ''}`} />
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={runConnectFolder}
                    className="px-3 py-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold"
                  >
                    Change folder…
                  </button>
                  <button
                    type="button"
                    onClick={handleFolderDisconnect}
                    className="px-3 py-1.5 bg-white text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {backup.syncError && (
              <p className="text-[11px] font-mono text-red-600 font-bold">⚠ {backup.syncError}</p>
            )}

            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono text-gray-600">
              <div>
                Last file backup: <strong className="text-neo-ink">{formatAgo(backup.lastBackupAt)}</strong>
              </div>
              <div>
                Browser storage:{' '}
                <strong className="text-neo-ink">
                  {backup.storagePersisted === null
                    ? 'unknown'
                    : backup.storagePersisted
                    ? 'protected from eviction'
                    : 'can be evicted'}
                </strong>
              </div>
              <div>
                Reminders: <strong className="text-neo-ink">weekly while not backed up</strong>
              </div>
            </div>
          </div>

          {/* 2. Real Local Filesystem Storage Folder Configuration */}
          <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FolderSync className="w-5 h-5 text-neo-vermilion" strokeWidth={2.5} />
                <div>
                  <h4 className="font-heading font-bold text-sm text-neo-ink">
                    Local Machine Filesystem Storage
                  </h4>
                  <p className="text-[11px] font-mono text-gray-500">
                    Protects against browser cache wipes by saving real <code>.wyzard.json</code> files to disk
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-neo-ink ${
                  fsStatus?.available ? 'bg-neo-teal text-neo-ink' : 'bg-neo-yellow text-neo-ink'
                }`}
              >
                {fsStatus?.available
                  ? `Active (${fsStatus.projectFileCount} Disk Files)`
                  : 'Browser / Extension Mode'}
              </span>
            </div>

            {fsStatus?.available && (
              <form onSubmit={handleSaveStorageDir} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customDirInput}
                  onChange={(e) => setCustomDirInput(e.target.value)}
                  placeholder="/path/to/local/wyzard-storage"
                  className="flex-1 px-3 py-1.5 bg-neo-bg border-neo border-neo-ink rounded font-mono text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-neo-yellow text-neo-ink border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  Set Folder Path
                </button>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-neo-ink text-white border-neo border-neo-ink rounded font-mono text-xs font-bold flex items-center justify-center gap-1 hover:bg-neo-vermilion transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Disk</span>
                </button>
              </form>
            )}

            {/* Portable Backup / Restore & Persistent Storage Lock */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleExportWorkspaceBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded text-xs font-mono font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All (.wyzard.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded text-xs font-mono font-bold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import .wyzard.json</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.wyzard.json"
                onChange={handleImportWorkspaceBackup}
                className="hidden"
              />

              <button
                onClick={handleRequestPersistentStorage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neo-teal/30 border border-neo-ink rounded text-xs font-mono font-bold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neo-teal" />
                <span>
                  {isPersisted ? 'Persistent Storage Locked' : 'Lock Browser Cache Eviction'}
                </span>
              </button>

              <a
                href="/wyzard-browser-extension-v1.1.1.zip"
                download="wyzard-browser-extension-v1.1.1.zip"
                onClick={() =>
                  showToast('Downloading Wyzard v1.1.1 Browser Extension (.ZIP) bundle...')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow hover:bg-neo-vermilion hover:text-white text-neo-ink border border-neo-ink rounded text-xs font-mono font-bold shadow-neo-sm transition-colors"
                title="Download unpackable Chrome/Edge/Brave/Firefox Manifest V3 Extension .zip"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Browser Extension v1.1.1 (.ZIP)</span>
              </a>

              {orphanedAssets.length > 0 && (
                <button
                  onClick={handlePurgeOrphanAssets}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-vermilion text-white border border-neo-ink rounded text-xs font-mono font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge {orphanedAssets.length} Orphaned Asset(s)</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Per-Project & Asset Storage Breakdown */}
          <div className="bg-white border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm">
            <h4 className="font-heading font-bold text-sm text-neo-ink mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-neo-ink" />
              <span>Workspace Projects &amp; Assets Breakdown</span>
            </h4>

            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {projectSizes.map((p) => (
                <div
                  key={p.id}
                  className="py-2 flex items-center justify-between text-xs font-mono"
                >
                  <div className="truncate pr-3">
                    <span className="font-bold text-neo-ink">{p.title}</span>
                    <span className="text-gray-400 ml-2">({p.chapters} ch)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-neo-bg border border-neo-ink/30 rounded text-[11px] shrink-0">
                    {formatBytes(p.bytes)}
                  </span>
                </div>
              ))}

              {assets.map((a) => (
                <div
                  key={a.id}
                  className="py-2 flex items-center justify-between text-xs font-mono text-gray-600"
                >
                  <div className="truncate pr-3 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-neo-violet shrink-0" />
                    <span className="truncate">{a.name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-neo-violet/10 border border-neo-violet/40 rounded text-[11px] shrink-0">
                    {formatBytes(a.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Open-Source Acknowledgements & Inspiration Credits */}
          <div className="bg-neo-yellow/25 border-neo border-neo-ink rounded-xl p-4 shadow-neo-sm flex flex-col gap-2">
            <h4 className="font-heading font-bold text-sm text-neo-ink">
              Open-Source Inspiration &amp; Resource Credits
            </h4>
            <p className="text-xs font-sans text-gray-700 leading-relaxed">
              Wyzard’s Freeform 2D Vector &amp; Visual Artboard workflow takes inspiration from{' '}
              <a
                href="https://github.com/GraphiteEditor/Graphite"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-neo-vermilion underline"
              >
                Graphite Editor (GraphiteEditor/Graphite)
              </a>
              , and integrates open-license asset packs curated by{' '}
              <a
                href="https://www.adamsdesk.com/posts/free-design-asset-resource/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-neo-vermilion underline"
              >
                Adam Douglas (Adamsdesk)
              </a>
              , Openverse (Creative Commons), and Iconify.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
