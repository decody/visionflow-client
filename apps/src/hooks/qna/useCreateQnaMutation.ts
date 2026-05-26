'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IQna } from '@visionflow/shared';

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

export const useCreateQnaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateQnaValues) => {
      const response = await fetch('/api/qna', {
        body: JSON.stringify({
          author: values.author,
          content: values.content,
          isSecret: values.isSecret,
          password: values.isSecret ? values.password : undefined,
          title: values.title,
          category: values.category,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(error?.message ?? 'Failed to create Q&A.');
      }

      return (await response.json()) as IQna;
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
