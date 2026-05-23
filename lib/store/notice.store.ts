import create from 'zustand';

interface NoticeStore {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const useNoticeStore = create<NoticeStore>((set) => ({
  searchTerm: '',
  setSearchTerm: (term) => set({ searchTerm: term }),
}));