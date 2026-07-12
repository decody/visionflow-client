import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type WorkRow } from '@visionflow/shared';

import { requestWorkWrite } from './requestWorkWrite';

export const useDeleteWorkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workId: string) => {
      await requestWorkWrite<WorkRow>(`/api/admin/works/${workId}`, {
        method: 'DELETE',
      });

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
