import type { UserRole } from '@visionflow/shared';
import { create } from 'zustand';

type UserRoleStore = {
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  setRole: (role: UserRole | null) => void;
  clearRole: () => void;
  fetchRole: (supabase: {
    from: (table: 'user_roles') => {
      select: (columns: 'role') => {
        single: () => Promise<{
          data: { role: UserRole } | null;
          error: { message: string } | null;
        }>;
      };
    };
  }) => Promise<UserRole | null>;
};

export const useUserRoleStore = create<UserRoleStore>((set) => ({
  role: null,
  isLoading: false,
  error: null,
  setRole: (role) => set({ role, error: null }),
  clearRole: () => set({ role: null, error: null, isLoading: false }),
  fetchRole: async (supabase) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .single();

    if (error) {
      set({ role: null, isLoading: false, error: error.message });
      return null;
    }

    const role = data?.role ?? null;
    set({ role, isLoading: false, error: null });
    return role;
  },
}));
