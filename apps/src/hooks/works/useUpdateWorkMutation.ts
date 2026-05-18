import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type WorkRow } from '@visionflow/shared';

import type { WorkMutationValues } from './useCreateWorkMutation';

export const useUpdateWorkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      workId,
    }: {
      values: WorkMutationValues;
      workId: string;
    }) => {
      const { data } = await apiClient.patch<WorkRow>(`works/${workId}`, {
        ...values,
        image: values.image?.trim() || null,
        linkLabel: values.linkLabel?.trim() || null,
        linkUrl: values.linkUrl?.trim() || null,
        roles: values.roles.filter(Boolean),
      });

      return data;
    },
    onSuccess: async (updatedWork) => {
      queryClient.setQueryData<WorkRow[]>(['works-list'], (oldWorks = []) =>
        oldWorks.map((work) =>
          String(work.id) === String(updatedWork.id) ? updatedWork : work,
        ),
      );

      queryClient.setQueryData<WorkRow | null>(
        ['work', String(updatedWork.id)],
        updatedWork,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['works-list'] }),
        queryClient.invalidateQueries({
          queryKey: ['work', String(updatedWork.id)],
        }),
      ]);
    },
  });
};
