'use client';

import { create } from 'zustand';
import type { ChapterId } from '@/config/gallery';

interface GalleryStore {
  entered: boolean;
  chapter: ChapterId;
  focusedArtworkId: string | null;
  entryProgress: number;
  progress: number;
  pointerX: number;
  setEntered: (entered: boolean) => void;
  setFocusedArtworkId: (focusedArtworkId: string | null) => void;
  setEntryProgress: (entryProgress: number) => void;
  setChapter: (chapter: ChapterId) => void;
  setProgress: (progress: number) => void;
  setPointerX: (pointerX: number) => void;
}

export const useGalleryStore = create<GalleryStore>((set) => ({
  entered: false, chapter: 'archive', focusedArtworkId: null, entryProgress: 0, progress: 0, pointerX: 0,
  setEntered: (entered) => set({ entered }),
  setFocusedArtworkId: (focusedArtworkId) => set({ focusedArtworkId }),
  setEntryProgress: (entryProgress) => set({ entryProgress }),
  setChapter: (chapter) => set({ chapter }),
  setProgress: (progress) => set({ progress }),
  setPointerX: (pointerX) => set({ pointerX }),
}));
