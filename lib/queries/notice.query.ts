import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { getList, getById, create, update, remove } from '@/lib/actions/notice';

export const useNotices = (searchTerm) => {
  return useInfiniteQuery(['notices', { searchTerm }], getList, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};

export const useNotice = (id) => {
  return useQuery(['notice', id], () => getById(id));
};

export const useCreateNotice = () => {
  return useMutation(create);
};

export const useUpdateNotice = () => {
  return useMutation(update);
};

export const useDeleteNotice = () => {
  return useMutation(remove);
};