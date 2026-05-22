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
  author_name: qna.author_name ?? qna.authorName,
  created_at: qna.created_at ?? qna.createdAt,
  is_notice: qna.is_notice ?? qna.isNotice,
  is_secret: qna.is_secret ?? qna.isSecret,
  question: qna.question ?? qna.title ?? '',
  updated_at: qna.updated_at ?? qna.updatedAt,
  view_count: qna.view_count ?? qna.viewCount,
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
      const minimalPayload: ApiPayload = {
        authorName: values.author,
        content: values.content,
        createdAt: now,
        isNotice: false,
        isSecret: values.isSecret,
        status: 'pending',
        title: values.title,
        updatedAt: now,
        viewCount: 0,
      };
      const fullPayload: ApiPayload = {
        ...minimalPayload,
        category: values.category,
        password: values.password || null,
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
