'use client';

import { create } from 'zustand';
import type { ChapterId } from '@/config/gallery';

interface GalleryStore {
  chapter: ChapterId;
  progress: number;
  pointerX: number;
  setChapter: (chapter: ChapterId) => void;
  setProgress: (progress: number) => void;
  setPointerX: (pointerX: number) => void;
}

export const useGalleryStore = create<GalleryStore>((set) => ({
  chapter: 'archive', progress: 0, pointerX: 0,
  setChapter: (chapter) => set({ chapter }),
  setProgress: (progress) => set({ progress }),
  setPointerX: (pointerX) => set({ pointerX }),
}));
