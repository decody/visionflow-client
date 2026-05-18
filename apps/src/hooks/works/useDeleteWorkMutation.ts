import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type WorkRow } from '@visionflow/shared';

export const useDeleteWorkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workId: string) => {
      await apiClient.delete<WorkRow>(`works/${workId}`);

      return workId;
    },
    onSuccess: async (workId) => {
      queryClient.setQueryData<WorkRow[]>(['works-list'], (oldWorks = []) =>
        oldWorks.filter((work) => String(work.id) !== String(workId)),
      );

      queryClient.removeQueries({ queryKey: ['work', String(workId)] });

      await queryClient.invalidateQueries({ queryKey: ['works-list'] });
    },
  });
};
