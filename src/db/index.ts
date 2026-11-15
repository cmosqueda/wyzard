import Dexie, { type Table } from 'dexie';
import type { BookProject } from '../types/ast';

export interface StoredAsset {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
  createdAt: number;
}

export class WyzardDatabase extends Dexie {
  projects!: Table<BookProject, string>;
  assets!: Table<StoredAsset, string>;

  constructor() {
    super('WyzardBookDatabase');
    this.version(1).stores({
      projects: 'id, title, updatedAt, createdAt',
      assets: 'id, projectId, name, mimeType, createdAt',
    });
  }
}

export const db = new WyzardDatabase();

// Default starter project factory
export function createStarterProject(): BookProject {
  const initialChapterId = 'ch-1';
  return {
    id: 'proj-' + Date.now(),
    title: 'Editorial Odyssey: The Reflowable Art Book',
    metadata: {
      title: 'Editorial Odyssey',
      author: 'Wyzard Author',
      language: 'en',
      description: 'A mobile-first responsive editorial publication powered by Wyzard.',
    },
    activeChapterId: initialChapterId,
    chapters: [
      {
        id: initialChapterId,
        title: 'Chapter 1: The New Horizon',
        slug: 'chapter-1',
        order: 1,
        backgroundColor: '#FFFFFF',
        craftStateJson: '', // Will be initialized by the Craft frame or canvas container
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: Form & Reflow',
        slug: 'chapter-2',
        order: 2,
        backgroundColor: '#FFFFFF',
        craftStateJson: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
