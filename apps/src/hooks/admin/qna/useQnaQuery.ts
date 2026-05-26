'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IQna, IQnaListResponse } from '@visionflow/shared';

type AdminQnaListParams = {
  keyword?: string;
  limit?: number;
  offset?: number;
  secret?: boolean;
  status?: 'all' | 'pending' | 'done';
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

const fetchQnaList = async (
  params: AdminQnaListParams,
): Promise<IQnaListResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }

  if (params.secret) {
    searchParams.set('secret', 'true');
  }

  if (params.keyword?.trim()) {
    searchParams.set('q', params.keyword.trim());
  }

  const response = await fetch(`/api/admin/qna?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Q&A 목록을 불러오지 못했습니다.');
  }

  const data = (await response.json()) as IQnaListResponse;

  return {
    ...data,
    data: data.data.map(normalizeQna),
  };
};

const fetchQnaDetail = async (id: string): Promise<IQna> => {
  const response = await fetch(`/api/admin/qna/${id}`);

  if (!response.ok) {
    throw new Error('Q&A 상세를 불러오지 못했습니다.');
  }

  const data = (await response.json()) as { qna: IQna };

  return normalizeQna(data.qna);
};

const deleteQna = async (id: string) => {
  const response = await fetch(`/api/admin/qna/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Q&A를 삭제하지 못했습니다.');
  }

  return response.json() as Promise<{ success: boolean }>;
};

export const useAdminQnaListQuery = (params: AdminQnaListParams) => {
  return useQuery<IQnaListResponse>({
    queryKey: ['admin', 'qna-list', params],
    queryFn: () => fetchQnaList(params),
  });
};

export const useAdminQnaDetailQuery = (id: string) => {
  return useQuery<IQna>({
    enabled: Boolean(id),
    queryKey: ['admin', 'qna-detail', id],
    queryFn: () => fetchQnaDetail(id),
  });
};

export const useDeleteQnaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQna,
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-alarms'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'qna-list'] }),
        queryClient.removeQueries({ queryKey: ['admin', 'qna-detail', id] }),
      ]);
    },
  });
};
