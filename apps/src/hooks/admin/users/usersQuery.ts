import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { IUser, UserRole, UserStatus } from '@visionflow/shared';

const parseError = async (response: Response) => {
  const error = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return error?.message ?? null;
};

const fetchUsersList = async (): Promise<IUser[]> => {
  const response = await fetch('/api/admin/users');

  if (!response.ok) {
    throw new Error((await parseError(response)) ?? 'Failed to fetch users.');
  }

  return (await response.json()) as IUser[];
};

export const useUsersListQuery = () => {
  return useQuery<IUser[]>({
    queryKey: ['users-list'],
    queryFn: fetchUsersList,
  });
};

const fetchUser = async (id: string): Promise<IUser> => {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error((await parseError(response)) ?? 'Failed to fetch user.');
  }

  return (await response.json()) as IUser;
};

/** 단건 사용자 조회 → BFF `GET /api/admin/users/{id}`(Spring 위임). */
export const useUserQuery = (id: string) => {
  return useQuery<IUser>({
    enabled: Boolean(id),
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
  });
};

/** 역할/상태 갱신 → BFF `PATCH /api/admin/users/{id}`(Spring 위임). */
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      role?: UserRole;
      status?: UserStatus;
    }) => {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(payload.id)}`,
        {
          body: JSON.stringify({ role: payload.role, status: payload.status }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      );

      if (!response.ok) {
        throw new Error((await parseError(response)) ?? 'Failed to update user.');
      }

      return (await response.json()) as IUser;
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<IUser[]>(['users-list'], (current = []) =>
        current.map((user) => (user.id === updated.id ? updated : user)),
      );

      await queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });
};

/** 사용자 삭제 → BFF `DELETE /api/admin/users/{id}`(Spring 위임). */
export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error((await parseError(response)) ?? 'Failed to delete user.');
      }

      return id;
    },
    onSuccess: async (id) => {
      queryClient.setQueryData<IUser[]>(['users-list'], (current = []) =>
        current.filter((user) => user.id !== id),
      );

      await queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });
};
