import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BookProject, Chapter, BookMetadata, ViewportMode } from '../types/ast';
import { db, createStarterProject } from '../db';

interface EditorState {
  project: BookProject;
  viewportMode: ViewportMode;
  zoomLevel: number;
  selectedNodeId: string | null;
  activeSidebarTab: 'spine' | 'blocks';
  activeInspectorTab: 'block' | 'page' | 'project';
  isSaving: boolean;
  lastSavedAt: number | null;
  history: string[]; // snapshot serialized project states for Undo
  historyPointer: number;

  // Actions
  setViewportMode: (mode: ViewportMode) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setActiveSidebarTab: (tab: 'spine' | 'blocks') => void;
  setActiveInspectorTab: (tab: 'block' | 'page' | 'project') => void;
  setActiveChapter: (chapterId: string) => void;
  addChapter: (title?: string) => void;
  deleteChapter: (chapterId: string) => void;
  renameChapter: (chapterId: string, newTitle: string) => void;
  reorderChapters: (startIndex: number, endIndex: number) => void;
  updateChapterCraftState: (chapterId: string, craftJson: string) => void;
  updateProjectMetadata: (metadata: Partial<BookMetadata>) => void;
  saveProjectToDb: () => Promise<void>;
  loadProjectFromDb: (id?: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  pushHistorySnapshot: () => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    project: createStarterProject(),
    viewportMode: 'mobile',
    zoomLevel: 100,
    selectedNodeId: null,
    activeSidebarTab: 'blocks',
    activeInspectorTab: 'block',
    isSaving: false,
    lastSavedAt: null,
    history: [],
    historyPointer: -1,

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

    setActiveInspectorTab: (tab) => {
      set((state) => {
        state.activeInspectorTab = tab;
      });
    },

    setActiveChapter: (chapterId) => {
      set((state) => {
        state.project.activeChapterId = chapterId;
        state.selectedNodeId = null;
      });
    },

    addChapter: (title) => {
      get().pushHistorySnapshot();
      set((state) => {
        const order = state.project.chapters.length + 1;
        const newChapter: Chapter = {
          id: 'ch-' + Date.now(),
          title: title || `Chapter ${order}: Untitled`,
          slug: `chapter-${order}`,
          order,
          craftStateJson: '',
          backgroundColor: '#FFFFFF',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.project.chapters.push(newChapter);
        state.project.activeChapterId = newChapter.id;
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    deleteChapter: (chapterId) => {
      const { project } = get();
      if (project.chapters.length <= 1) {
        alert("A book must have at least one chapter.");
        return;
      }
      get().pushHistorySnapshot();
      set((state) => {
        state.project.chapters = state.project.chapters.filter((c) => c.id !== chapterId);
        if (state.project.activeChapterId === chapterId) {
          state.project.activeChapterId = state.project.chapters[0].id;
        }
        state.project.updatedAt = Date.now();
      });
      get().saveProjectToDb();
    },

    renameChapter: (chapterId, newTitle) => {
      set((state) => {
        const ch = state.project.chapters.find((c) => c.id === chapterId);
        if (ch) {
          ch.title = newTitle;
          ch.updatedAt = Date.now();
          state.project.updatedAt = Date.now();
        }
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

    saveProjectToDb: async () => {
      const { project } = get();
      set((state) => {
        state.isSaving = true;
      });
      try {
        await db.projects.put(JSON.parse(JSON.stringify(project)));
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
          set((state) => {
            state.project = loadedProject!;
            state.lastSavedAt = loadedProject!.updatedAt;
          });
        } else {
          // Initialize starter project into DB
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
        // limit history to 30 snapshots
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
      }
    },
  }))
);
