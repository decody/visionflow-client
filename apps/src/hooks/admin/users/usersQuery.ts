import { useQuery } from '@tanstack/react-query';
import { apiClient, type IUser } from '@visionflow/shared';

const fetchUsersList = async (): Promise<IUser[]> => {
  const { data } = await apiClient.get<IUser[] | null>('users');
  console.log(data);

  return data ?? [];
};

export const usersListQuery = () => {
  return useQuery<IUser[]>({
    queryKey: ['users-list'],
    queryFn: fetchUsersList,
  });
};
