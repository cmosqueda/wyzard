import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  BookProject,
  Chapter,
  BookMetadata,
  ViewportMode,
  AssetAttribution,
  CanvasDesignSystem,
  PageSetup,
  BookSection,
  PageKind,
} from '../types/ast';
import { VIEWPORT_PRESETS } from '../types/ast';
import {
  db,
  createStarterProject,
  createBlankProject,
  createDefaultChapterCraftJson,
  createEmptyChapterCraftJson,
  createFixedPageCraftJson,
  normalizeProjectChapters,
} from '../db';
import { syncProjectToLocalFs, deleteProjectFromLocalFs } from '../db/localFs';
import { rehydrateProjectAssets } from '../db/assets';
import { viewportForPageWidth } from '../utils/pageLayout';
import { BOOK_PAGE_KITS, FRONT_MATTER_ORDER, createBookPage } from '../db/bookPages';

/** In fixed-layout books the responsive blocks follow the PAGE width, not the preview device. */
function fixedViewportFor(project: BookProject): ViewportMode | null {
  return project.layoutMode === 'fixed' && project.pageSetup ? viewportForPageWidth(project.pageSetup.width) : null;
}
import { notify } from './toastStore';

export type WyzardThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'wyzard-theme-mode';

export function resolveEffectiveTheme(mode: WyzardThemeMode): 'light' | 'dark' {
  if (mode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode === 'dark' ? 'dark' : 'light';
}

export function applyThemeToDocument(mode: WyzardThemeMode): void {
  if (typeof document === 'undefined') return;
  const effective = resolveEffectiveTheme(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.setAttribute('data-theme', effective);
}

const getInitialThemeMode = (): WyzardThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as WyzardThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      applyThemeToDocument(saved);
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  applyThemeToDocument('light');
  return 'light';
};

// ---- Session persistence: an accidental refresh returns to the same project, chapter and view ----
const SESSION_KEY = 'wyzard-session';

interface SavedSession {
  workspaceOpen: boolean;
  projectId?: string;
  chapterId?: string;
  viewportMode?: ViewportMode;
  zoomLevel?: number;
  sidebarTab?: 'spine' | 'blocks' | 'assets';
}

function readSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as SavedSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: SavedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

// Only true when the last session had a project open, so the workspace screen never flashes on refresh
const initialSession = typeof window !== 'undefined' ? readSession() : null;
const shouldRestoreSession = !!(initialSession && initialSession.workspaceOpen === false && initialSession.projectId);

const getInitialPanelOpenState = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1280;
};

interface EditorState {
  project: BookProject;
  themeMode: WyzardThemeMode;
  isWorkspaceOpen: boolean;
  isTransitioning: boolean;
  isRestoring: boolean;
  transitionLabel: string;
  isLeftRailOpen: boolean;
  isRightRailOpen: boolean;
  viewportMode: ViewportMode;
  zoomLevel: number;
  selectedNodeId: string | null;
  activeSidebarTab: 'spine' | 'blocks' | 'assets';
  activeInspectorTab: 'block' | 'page' | 'project';
  isMetadataOpen: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  history: string[]; // snapshot serialized project states for Undo
  historyPointer: number;

  // Theme & Appearance Actions
  setThemeMode: (mode: WyzardThemeMode) => void;
  toggleThemeMode: () => void;

  // Panel Visibility Actions
  toggleLeftRail: () => void;
  setLeftRailOpen: (open: boolean) => void;
  toggleRightRail: () => void;
  setRightRailOpen: (open: boolean) => void;

  // Workspace & Project Actions
  restoreSession: () => Promise<void>;
  openWorkspace: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  createNewProject: (customProject?: BookProject) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  deleteProjectFromDb: (id: string) => Promise<void>;
  renameProjectInDb: (id: string, newTitle: string) => Promise<void>;

  // Editor Actions
  setViewportMode: (mode: ViewportMode) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setActiveSidebarTab: (tab: 'spine' | 'blocks' | 'assets') => void;
  setActiveInspectorTab: (tab: 'block' | 'page' | 'project') => void;
  setMetadataOpen: (open: boolean) => void;
  addAssetAttribution: (attr: Omit<AssetAttribution, 'id' | 'addedAt'>) => void;
  removeAssetAttribution: (id: string) => void;
  setActiveChapter: (chapterId: string) => void;
  addChapter: (title?: string) => void;
  deleteChapter: (chapterId: string) => void;
  renameChapter: (chapterId: string, newTitle: string) => void;
  reorderChapters: (startIndex: number, endIndex: number) => void;
  duplicateChapter: (chapterId: string) => void;
  updateChapterMeta: (
    chapterId: string,
    patch: Partial<
      Pick<Chapter, 'title' | 'sectionId' | 'hideHeader' | 'hideFooter' | 'fullBleed' | 'kind' | 'tocEntry' | 'numbering'>
    >
  ) => void;
  addBookPage: (kind: Exclude<PageKind, 'content'>) => void;
  updatePageSetup: (patch: Partial<PageSetup>) => void;
  addSection: (section?: Partial<BookSection>) => string;
  updateSection: (id: string, patch: Partial<BookSection>) => void;
  deleteSection: (id: string) => void;
  updateChapterCraftState: (chapterId: string, craftJson: string) => void;
  updateProjectMetadata: (metadata: Partial<BookMetadata>) => void;
  setDesignSystem: (designSystem: CanvasDesignSystem) => void;
  saveProjectToDb: () => Promise<void>;
  loadProjectFromDb: (id?: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  pushHistorySnapshot: () => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    project: createStarterProject(),
    themeMode: getInitialThemeMode(),
    isWorkspaceOpen: true,
    isTransitioning: false,
    isRestoring: shouldRestoreSession,
    transitionLabel: '',
    isLeftRailOpen: getInitialPanelOpenState(),
    isRightRailOpen: getInitialPanelOpenState(),
    viewportMode: 'mobile',
    zoomLevel: 100,
    selectedNodeId: null,
    activeSidebarTab: 'blocks',
    activeInspectorTab: 'block',
    isMetadataOpen: false,
    isSaving: false,
    lastSavedAt: null,
    history: [],
    historyPointer: -1,

    setThemeMode: (mode) => {
      set((state) => {
        state.themeMode = mode;
      });
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // ignore
      }
      applyThemeToDocument(mode);
      notify({
        type: 'info',
        title: `Theme: ${
          mode === 'dark'
            ? 'Dark Studio (Midnight Obsidian)'
            : mode === 'light'
            ? 'Light Studio (Warm Newsprint)'
            : 'System Appearance'
        }`,
        duration: 1800,
      });
    },

    toggleThemeMode: () => {
      const current = resolveEffectiveTheme(get().themeMode);
      const next: WyzardThemeMode = current === 'dark' ? 'light' : 'dark';
      get().setThemeMode(next);
    },

    toggleLeftRail: () => {
      set((state) => {
        const next = !state.isLeftRailOpen;
        state.isLeftRailOpen = next;
        // On small mobile screens (<768px), auto-close the opposite rail so they don't overlap
        if (next && typeof window !== 'undefined' && window.innerWidth < 1280) {
          state.isRightRailOpen = false;
        }
      });
    },

    setLeftRailOpen: (open) => {
      set((state) => {
        state.isLeftRailOpen = open;
        if (open && typeof window !== 'undefined' && window.innerWidth < 1280) {
          state.isRightRailOpen = false;
        }
      });
    },

    toggleRightRail: () => {
      set((state) => {
        const next = !state.isRightRailOpen;
        state.isRightRailOpen = next;
        if (next && typeof window !== 'undefined' && window.innerWidth < 1280) {
          state.isLeftRailOpen = false;
        }
      });
    },

    setRightRailOpen: (open) => {
      set((state) => {
        state.isRightRailOpen = open;
        if (open && typeof window !== 'undefined' && window.innerWidth < 1280) {
          state.isLeftRailOpen = false;
        }
      });
    },

    restoreSession: async () => {
      const session = readSession();
      if (!shouldRestoreSession || !session?.projectId) {
        set((state) => {
          state.isRestoring = false;
        });
        sessionReady = true;
        return;
      }
      try {
        const loaded = await db.projects.get(session.projectId);
        if (!loaded) throw new Error('Saved project no longer exists');
        const normalized = await rehydrateProjectAssets(normalizeProjectChapters(loaded));
        const chapterId = normalized.chapters.some((c) => c.id === session.chapterId)
          ? (session.chapterId as string)
          : normalized.activeChapterId;
        const restored: BookProject = { ...normalized, activeChapterId: chapterId };
        set((state) => {
          state.project = restored;
          state.lastSavedAt = restored.updatedAt;
          state.selectedNodeId = null;
          state.history = [JSON.stringify(restored)];
          state.historyPointer = 0;
          state.isWorkspaceOpen = false;
          if (session.viewportMode && session.viewportMode in VIEWPORT_PRESETS) {
            state.viewportMode = session.viewportMode;
          }
          const fixedVp = fixedViewportFor(restored);
          if (fixedVp) state.viewportMode = fixedVp;
          if (typeof session.zoomLevel === 'number') {
            state.zoomLevel = Math.min(250, Math.max(25, session.zoomLevel));
          }
          if (session.sidebarTab) state.activeSidebarTab = session.sidebarTab;
          state.isRestoring = false;
        });
      } catch (err) {
        console.warn('Could not restore the previous session:', err);
        set((state) => {
          state.isRestoring = false;
        });
      } finally {
        sessionReady = true;
      }
    },

    openWorkspace: async () => {
      set((state) => {
        state.isTransitioning = true;
        state.transitionLabel = 'Saving & returning to Workspace...';
      });
      await get().saveProjectToDb();
      setTimeout(() => {
        set((state) => {
          state.isWorkspaceOpen = true;
          state.selectedNodeId = null;
          state.isTransitioning = false;
          state.transitionLabel = '';
        });
      }, 160);
    },

    openProject: async (id) => {
      set((state) => {
        state.isTransitioning = true;
        state.transitionLabel = 'Loading project layout...';
      });
      try {
        const loaded = await db.projects.get(id);
        if (!loaded) {
          set((state) => {
            state.isTransitioning = false;
          });
          notify({
            type: 'error',
            title: 'Project Not Found',
            message: 'The requested layout could not be found in local storage.',
          });
          return;
        }
        const normalized = await rehydrateProjectAssets(normalizeProjectChapters(loaded));
        await db.projects.put(normalized);
        setTimeout(() => {
          set((state) => {
            state.project = normalized;
            state.lastSavedAt = normalized.updatedAt;
            state.selectedNodeId = null;
            state.history = [JSON.stringify(normalized)];
            state.historyPointer = 0;
            state.isWorkspaceOpen = false;
            state.isTransitioning = false;
            state.transitionLabel = '';
            const fixedVp = fixedViewportFor(normalized);
            if (fixedVp) state.viewportMode = fixedVp;
          });
          notify({
            type: 'success',
            title: `Opened "${normalized.title}"`,
            message: `${normalized.chapters.length} spine ${
              normalized.chapters.length === 1 ? 'chapter' : 'chapters'
            } loaded.`,
            duration: 2400,
          });
        }, 180);
      } catch (err) {
        console.error('Failed to open project:', err);
        set((state) => {
          state.isTransitioning = false;
        });
        notify({
          type: 'error',
          title: 'Failed to Open Project',
          message: 'An unexpected database error occurred while loading the project.',
        });
      }
    },

    createNewProject: async (customProject) => {
      set((state) => {
        state.isTransitioning = true;
        state.transitionLabel = 'Initializing new publication studio...';
      });
      try {
        const now = Date.now();
        const newProject: BookProject = customProject
          ? {
              ...JSON.parse(JSON.stringify(customProject)),
              id: 'proj-' + now + '-' + Math.random().toString(36).slice(2, 6),
              createdAt: now,
              updatedAt: now,
            }
          : createBlankProject();

        await db.projects.put(newProject);
        syncProjectToLocalFs(newProject);
        setTimeout(() => {
          set((state) => {
            state.project = newProject;
            state.lastSavedAt = newProject.updatedAt;
            state.selectedNodeId = null;
            state.history = [JSON.stringify(newProject)];
            state.historyPointer = 0;
            state.isWorkspaceOpen = false;
            state.isTransitioning = false;
            state.transitionLabel = '';
            const fixedVp = fixedViewportFor(newProject);
            if (fixedVp) state.viewportMode = fixedVp;
          });
          notify({
            type: 'success',
            title: 'Layout Project Created',
            message: `"${newProject.title}" is ready for editing.`,
          });
        }, 180);
      } catch (err) {
        console.error('Failed to create project:', err);
        set((state) => {
          state.isTransitioning = false;
        });
        notify({
          type: 'error',
          title: 'Creation Error',
          message: 'Could not initialize the new layout project.',
        });
      }
    },

    duplicateProject: async (id) => {
      try {
        const source = await db.projects.get(id);
        if (!source) {
          notify({
            type: 'error',
            title: 'Duplicate Failed',
            message: 'Source layout project could not be found.',
          });
          return;
        }
        const now = Date.now();
        const copyTitle = `${source.title} (Copy)`;
        const duplicated: BookProject = {
          ...JSON.parse(JSON.stringify(source)),
          id: 'proj-' + now + '-' + Math.random().toString(36).slice(2, 6),
          title: copyTitle,
          metadata: {
            ...source.metadata,
            title: copyTitle,
          },
          createdAt: now,
          updatedAt: now,
        };
        await db.projects.put(duplicated);
        syncProjectToLocalFs(duplicated);
        notify({
          type: 'success',
          title: 'Layout Duplicated',
          message: `Created "${copyTitle}".`,
        });
      } catch (err) {
        console.error('Failed to duplicate project:', err);
        notify({
          type: 'error',
          title: 'Duplicate Failed',
          message: 'An error occurred while duplicating the project.',
        });
      }
    },

    deleteProjectFromDb: async (id) => {
      try {
        const target = await db.projects.get(id);
        await db.projects.delete(id);
        await db.assets.where('projectId').equals(id).delete();
        deleteProjectFromLocalFs(id);
        notify({
          type: 'info',
          title: 'Layout Deleted',
          message: target ? `Removed "${target.title}" from workspace.` : 'Project removed.',
        });
      } catch (err) {
        console.error('Failed to delete project:', err);
        notify({
          type: 'error',
          title: 'Delete Error',
          message: 'Could not delete the layout project.',
        });
      }
    },

    renameProjectInDb: async (id, newTitle) => {
      const trimmed = newTitle.trim();
      if (!trimmed) {
        notify({
          type: 'warning',
          title: 'Validation Error',
          message: 'Project title cannot be empty.',
        });
        return;
      }
      try {
        const existing = await db.projects.get(id);
        if (existing) {
          const updated: BookProject = {
            ...existing,
            title: trimmed,
            metadata: {
              ...existing.metadata,
              title: trimmed,
            },
            updatedAt: Date.now(),
          };
          await db.projects.put(updated);
          syncProjectToLocalFs(updated);
        }
        if (get().project.id === id) {
          set((state) => {
            state.project.title = trimmed;
            state.project.metadata.title = trimmed;
            state.project.updatedAt = Date.now();
          });
        }
        notify({
          type: 'success',
          title: 'Title Updated',
          message: `Renamed to "${trimmed}".`,
          duration: 2200,
        });
      } catch (err) {
        console.error('Failed to rename project:', err);
        notify({
          type: 'error',
          title: 'Rename Failed',
          message: 'Could not save the updated project title.',
        });
      }
    },

    setViewportMode: (mode) => {
      set((state) => {
        state.viewportMode = mode;
      });
    },

    setZoomLevel: (zoom) => {
      set((state) => {
        state.zoomLevel = Math.max(25, Math.min(200, zoom));
      });
    },

    setSelectedNodeId: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId;
        if (nodeId) {
          state.activeInspectorTab = 'block';
        }
      });
    },

    setActiveSidebarTab: (tab) => {
      set((state) => {
        state.activeSidebarTab = tab;
      });
    },

    setMetadataOpen: (open) => {
      set((state) => {
        state.isMetadataOpen = open;
      });
    },

    setActiveInspectorTab: (tab) => {
      set((state) => {
        state.activeInspectorTab = tab;
      });
    },

    setActiveChapter: (chapterId) => {
      const target = get().project.chapters.find((c) => c.id === chapterId);
      set((state) => {
        state.project.activeChapterId = chapterId;
        state.selectedNodeId = null;
      });
      get().saveProjectToDb();
      if (target) {
        notify({
          type: 'info',
          title: 'Switched Spine Chapter',
          message: `Loaded "${target.title}".`,
          duration: 1800,
        });
      }
    },

    addChapter: (title) => {
      get().pushHistorySnapshot();
      let createdTitle = '';
      set((state) => {
        const order = state.project.chapters.length + 1;
        const isFixed = state.project.layoutMode === 'fixed';
        const chapterTitle = (title || '').trim() || (isFixed ? `Page ${order}` : `Chapter ${order}: Untitled`);
        createdTitle = chapterTitle;
        const activePage = state.project.chapters.find((c) => c.id === state.project.activeChapterId);
        const newChapter: Chapter = {
          id: (isFixed ? 'pg-' : 'ch-') + Date.now(),
          title: chapterTitle,
          slug: `${isFixed ? 'page' : 'chapter'}-${order}`,
          order,
          // a new page continues the section of the page you were on
          ...(isFixed && activePage?.sectionId ? { sectionId: activePage.sectionId } : {}),
          craftStateJson: isFixed
            ? createFixedPageCraftJson()
            : state.project.designSystem === 'plain'
            ? createEmptyChapterCraftJson()
            : createDefaultChapterCraftJson(chapterTitle),
          backgroundColor: '#FFFFFF',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.project.chapters.push(newChapter);
        state.project.activeChapterId = newChapter.id;
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      notify({
        type: 'success',
        title: get().project.layoutMode === 'fixed' ? 'Page Added' : 'Chapter Added to Spine',
        message: `Created "${createdTitle}".`,
      });
    },

    deleteChapter: (chapterId) => {
      const { project } = get();
      if (project.chapters.length <= 1) {
        notify({
          type: 'warning',
          title: 'Cannot Delete Last Chapter',
          message: 'A publication must contain at least one chapter in the spine.',
        });
        return;
      }
      const target = project.chapters.find((c) => c.id === chapterId);
      get().pushHistorySnapshot();
      set((state) => {
        state.project.chapters = state.project.chapters.filter((c) => c.id !== chapterId);
        if (state.project.activeChapterId === chapterId) {
          state.project.activeChapterId = state.project.chapters[0].id;
        }
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      notify({
        type: 'info',
        title: 'Chapter Removed',
        message: target ? `Deleted "${target.title}".` : 'Chapter removed from spine.',
      });
    },

    renameChapter: (chapterId, newTitle) => {
      const trimmed = newTitle.trim();
      if (!trimmed) {
        notify({
          type: 'warning',
          title: 'Validation Error',
          message: 'Chapter title cannot be blank.',
        });
        return;
      }
      set((state) => {
        const ch = state.project.chapters.find((c) => c.id === chapterId);
        if (ch) {
          ch.title = trimmed;
          ch.updatedAt = Date.now();
          state.project.updatedAt = Date.now();
        }
      });
      get().saveProjectToDb();
    },

    duplicateChapter: (chapterId) => {
      const src = get().project.chapters.find((c) => c.id === chapterId);
      if (!src) return;
      get().pushHistorySnapshot();
      const isFixed = get().project.layoutMode === 'fixed';
      set((state) => {
        const idx = state.project.chapters.findIndex((c) => c.id === chapterId);
        const copy: Chapter = {
          ...JSON.parse(JSON.stringify(src)),
          id: (isFixed ? 'pg-' : 'ch-') + Date.now(),
          title: `${src.title} (copy)`,
          slug: `${src.slug}-copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.project.chapters.splice(idx + 1, 0, copy);
        state.project.chapters.forEach((c, i) => (c.order = i + 1));
        state.project.activeChapterId = copy.id;
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    updateChapterMeta: (chapterId, patch) => {
      get().pushHistorySnapshot();
      set((state) => {
        const ch = state.project.chapters.find((c) => c.id === chapterId);
        if (!ch) return;
        Object.entries(patch).forEach(([k, v]) => {
          if (v === undefined || v === false || v === '') delete (ch as unknown as Record<string, unknown>)[k];
          else (ch as unknown as Record<string, unknown>)[k] = v;
        });
        ch.updatedAt = Date.now();
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    addBookPage: (kind) => {
      const { project } = get();
      const kit = BOOK_PAGE_KITS.find((k) => k.kind === kind);
      const existing = kit?.unique ? project.chapters.find((c) => c.kind === kind) : undefined;
      if (existing) {
        get().setActiveChapter(existing.id);
        notify({ type: 'info', title: `${kit?.label} already exists`, message: 'Opened the existing page.', duration: 2200 });
        return;
      }
      get().pushHistorySnapshot();
      const page = createBookPage(kind, project);
      set((state) => {
        const list = state.project.chapters;
        let index: number;
        if (kind === 'cover') index = 0;
        else if (kind === 'backCover') index = list.length;
        else {
          const rank = FRONT_MATTER_ORDER.indexOf(kind);
          let last = -1;
          list.forEach((c, i) => {
            const r = c.kind ? FRONT_MATTER_ORDER.indexOf(c.kind) : -1;
            if (r !== -1 && r <= rank) last = i;
          });
          index = last + 1;
        }
        list.splice(index, 0, page);
        list.forEach((c, i) => (c.order = i + 1));
        state.project.activeChapterId = page.id;
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      notify({ type: 'success', title: `${kit?.label} added`, duration: 1800 });
    },

    updatePageSetup: (patch) => {
      get().pushHistorySnapshot();
      set((state) => {
        if (!state.project.pageSetup) return;
        state.project.pageSetup = { ...state.project.pageSetup, ...patch };
        state.project.updatedAt = Date.now();
        const vp = fixedViewportFor(state.project);
        if (vp) state.viewportMode = vp;
      });
      get().saveProjectToDb();
    },

    addSection: (section) => {
      const id = 'sec-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
      get().pushHistorySnapshot();
      set((state) => {
        const list = state.project.sections || (state.project.sections = []);
        list.push({ id, title: 'New section', ...section });
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      return id;
    },

    updateSection: (id, patch) => {
      set((state) => {
        const sec = state.project.sections?.find((x) => x.id === id);
        if (sec) Object.assign(sec, patch);
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    deleteSection: (id) => {
      get().pushHistorySnapshot();
      set((state) => {
        state.project.sections = (state.project.sections || []).filter((x) => x.id !== id);
        state.project.chapters.forEach((c) => {
          if (c.sectionId === id) delete c.sectionId;
        });
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    reorderChapters: (startIndex, endIndex) => {
      get().pushHistorySnapshot();
      set((state) => {
        const [removed] = state.project.chapters.splice(startIndex, 1);
        state.project.chapters.splice(endIndex, 0, removed);
        state.project.chapters.forEach((ch, idx) => {
          ch.order = idx + 1;
        });
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    updateChapterCraftState: (chapterId, craftJson) => {
      set((state) => {
        const ch = state.project.chapters.find((c) => c.id === chapterId);
        if (ch) {
          ch.craftStateJson = craftJson;
          ch.updatedAt = Date.now();
          state.project.updatedAt = Date.now();
        }
      });
      get().saveProjectToDb();
    },

    updateProjectMetadata: (metadata) => {
      get().pushHistorySnapshot();
      set((state) => {
        state.project.metadata = { ...state.project.metadata, ...metadata };
        if (metadata.title) {
          state.project.title = metadata.title;
        }
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    setDesignSystem: (designSystem) => {
      get().pushHistorySnapshot();
      set((state) => {
        state.project.designSystem = designSystem;
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      notify({
        type: 'info',
        title: `Canvas Design System: ${designSystem === 'plain' ? 'Plain (blank)' : 'Wyzard Editorial'}`,
        duration: 1800,
      });
    },

    addAssetAttribution: (attr) => {
      let wasAdded = false;
      set((state) => {
        const list = state.project.metadata.attributions || [];
        const exists = list.some(
          (item) =>
            (attr.assetUrl && item.assetUrl === attr.assetUrl) ||
            (attr.sourceUrl && item.sourceUrl === attr.sourceUrl && item.title === attr.title) ||
            (item.title === attr.title && item.creator === attr.creator)
        );
        if (!exists) {
          list.push({
            ...attr,
            id: 'attr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            addedAt: Date.now(),
          });
          state.project.metadata.attributions = list;
          state.project.updatedAt = Date.now();
          wasAdded = true;
        }
      });
      get().saveProjectToDb();
      if (wasAdded) {
        notify({
          type: 'success',
          title: 'Contributor Credit Recorded',
          message: `"${attr.title}" by ${attr.creator} added to colophon.`,
          duration: 2400,
        });
      }
    },

    removeAssetAttribution: (id) => {
      set((state) => {
        const list = state.project.metadata.attributions || [];
        state.project.metadata.attributions = list.filter((item) => item.id !== id);
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
      notify({
        type: 'info',
        title: 'Credit Entry Removed',
        duration: 2000,
      });
    },

    saveProjectToDb: async () => {
      const { project } = get();
      set((state) => {
        state.isSaving = true;
      });
      try {
        const plainProject = JSON.parse(JSON.stringify(project));
        await db.projects.put(plainProject);
        syncProjectToLocalFs(plainProject);
        set((state) => {
          state.isSaving = false;
          state.lastSavedAt = Date.now();
        });
      } catch (err) {
        console.error('Failed to save project to IndexedDB:', err);
        set((state) => {
          state.isSaving = false;
        });
      }
    },

    loadProjectFromDb: async (id) => {
      try {
        let loadedProject: BookProject | undefined;
        if (id) {
          loadedProject = await db.projects.get(id);
        } else {
          loadedProject = await db.projects.orderBy('updatedAt').reverse().first();
        }

        if (loadedProject) {
          const normalized = await rehydrateProjectAssets(normalizeProjectChapters(loadedProject));
          await db.projects.put(normalized);
          set((state) => {
            state.project = normalized;
            state.lastSavedAt = normalized.updatedAt;
          });
        } else {
          const starter = createStarterProject();
          await db.projects.put(starter);
          set((state) => {
            state.project = starter;
            state.lastSavedAt = starter.updatedAt;
          });
        }
      } catch (err) {
        console.error('Failed to load project from IndexedDB:', err);
      }
    },

    pushHistorySnapshot: () => {
      set((state) => {
        const snapshot = JSON.stringify(state.project);
        const newHistory = state.history.slice(0, state.historyPointer + 1);
        newHistory.push(snapshot);
        if (newHistory.length > 30) {
          newHistory.shift();
        }
        state.history = newHistory;
        state.historyPointer = newHistory.length - 1;
      });
    },

    undo: () => {
      const { history, historyPointer } = get();
      if (historyPointer > 0) {
        const previousSnapshot = history[historyPointer - 1];
        set((state) => {
          state.project = JSON.parse(previousSnapshot);
          state.historyPointer = historyPointer - 1;
        });
        notify({
          type: 'info',
          title: 'Undo Applied',
          duration: 1400,
        });
      }
    },

    redo: () => {
      const { history, historyPointer } = get();
      if (historyPointer < history.length - 1) {
        const nextSnapshot = history[historyPointer + 1];
        set((state) => {
          state.project = JSON.parse(nextSnapshot);
          state.historyPointer = historyPointer + 1;
        });
        notify({
          type: 'info',
          title: 'Redo Applied',
          duration: 1400,
        });
      }
    },
  }))
);

// Persist where the user is (after the restore step, so boot defaults never overwrite a saved session)
let sessionReady = false;

useEditorStore.subscribe((state) => {
  if (!sessionReady) return;
  writeSession({
    workspaceOpen: state.isWorkspaceOpen,
    projectId: state.isWorkspaceOpen ? undefined : state.project.id,
    chapterId: state.project.activeChapterId,
    viewportMode: state.viewportMode,
    zoomLevel: state.zoomLevel,
    sidebarTab: state.activeSidebarTab,
  });
});
