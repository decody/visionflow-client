import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type WorkRow } from '@visionflow/shared';

import { requestWorkWrite } from './requestWorkWrite';

export type WorkMutationValues = {
  category: string;
  image?: string | null;
  industry: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
  roles: string[];
  size: WorkRow['size'];
  title: string;
};

export const useCreateWorkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: WorkMutationValues) => {
      const data = await requestWorkWrite<WorkRow>('/api/admin/works', {
        method: 'POST',
        payload: {
          ...values,
          image: values.image?.trim() || null,
          linkLabel: values.linkLabel?.trim() || null,
          linkUrl: values.linkUrl?.trim() || null,
          roles: values.roles.filter(Boolean).join(', '),
        },
      });

      return {
        ...data,
        roles: values.roles.filter(Boolean),
      };
    },
    onSuccess: async (createdWork) => {
      queryClient.setQueryData<WorkRow[]>(['works-list'], (oldWorks = []) => {
        const exists = oldWorks.some(
          (work) => String(work.id) === String(createdWork.id),
        );

        if (exists) {
          return oldWorks.map((work) =>
            String(work.id) === String(createdWork.id) ? createdWork : work,
          );
        }

        return [createdWork, ...oldWorks];
      });

      await queryClient.invalidateQueries({ queryKey: ['works-list'] });
    },
  });
};
