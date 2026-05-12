import { create } from 'zustand';
export const useWorkspaceStore = create((set) => ({
    activeWorkspace: 'production',
    setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
}));
