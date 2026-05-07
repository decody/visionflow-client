import { create } from 'zustand';

type WorkspaceState = {
  activeWorkspace: string;
  setActiveWorkspace: (workspace: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: 'production',
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
}));
