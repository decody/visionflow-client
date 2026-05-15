'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ApiPayload, type IQna } from '@visionflow/shared';

export type CreateQnaValues = {
  author: string;
  category: string;
  content: string;
  isSecret: boolean;
  password?: string;
  title: string;
};

const normalizeQna = (qna: IQna): IQna => ({
  ...qna,
  created_at: qna.created_at ?? qna.createdAt,
  is_notice: qna.is_notice ?? qna.isNotice,
  is_visible: qna.is_visible ?? qna.isVisible,
  updated_at: qna.updated_at ?? qna.updatedAt,
});

const shouldRetryWithMinimalPayload = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('could not find')
  );
};

export const useCreateQnaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateQnaValues) => {
      const now = new Date().toISOString();
      const question = `${values.title}\n\n${values.content}`;
      const minimalPayload: ApiPayload = {
        answer: '',
        category: values.category,
        createdAt: now,
        isNotice: false,
        isVisible: true,
        question,
        updatedAt: now,
      };
      const fullPayload: ApiPayload = {
        ...minimalPayload,
        author: values.author,
        content: values.content,
        isSecret: values.isSecret,
        password: values.password || null,
        status: 'pending',
        title: values.title,
        views: 0,
      };

      try {
        const { data } = await apiClient.post<IQna>('qna', fullPayload);
        return data;
      } catch (error) {
        if (!shouldRetryWithMinimalPayload(error)) {
          throw error;
        }

        const { data } = await apiClient.post<IQna>(
          'qna',
          minimalPayload,
        );
        return data;
      }
    },
    onSuccess: async (createdQna) => {
      const normalizedQna = normalizeQna(createdQna);

      queryClient.setQueryData(
        ['qna-list', { limit: 10, offset: 0 }],
        (oldResponse: unknown) => {
          if (
            !oldResponse ||
            typeof oldResponse !== 'object' ||
            !('data' in oldResponse)
          ) {
            return oldResponse;
          }

          const response = oldResponse as {
            data: IQna[];
            total_count: number;
          };

          return {
            ...response,
            data: [normalizedQna, ...response.data],
            total_count: response.total_count + 1,
          };
        },
      );

      await queryClient.invalidateQueries({ queryKey: ['qna-list'] });
    },
  });
};
