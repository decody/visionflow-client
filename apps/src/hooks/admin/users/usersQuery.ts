import { useQuery } from '@tanstack/react-query';
import type { IUser } from '@visionflow/shared';

const fetchUsersList = async (): Promise<IUser[]> => {
  const response = await fetch('/api/admin/users');

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(error?.message ?? 'Failed to fetch users.');
  }

  return (await response.json()) as IUser[];
};

export const useUsersListQuery = () => {
  return useQuery<IUser[]>({
    queryKey: ['users-list'],
    queryFn: fetchUsersList,
  });
};
