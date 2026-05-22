'use client';

import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  type IQna,
  type IQnaListResponse,
} from '@visionflow/shared';

type QnaListQueryParams = {
  limit: number;
  offset: number;
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

const fetchQnaList = async ({
  limit,
  offset,
}: QnaListQueryParams): Promise<IQnaListResponse> => {
  const { count, data } = await apiClient.get<IQna[] | null>(
    'qna',
    {
      limit,
      or: '(is_notice.is.false,is_notice.is.null)',
      offset,
      order: 'created_at.desc',
    },
    { count: 'exact' },
  );
  const qnas = (data ?? []).map(normalizeQna);

  return {
    data: qnas,
    limit,
    offset,
    total_count: count ?? offset + qnas.length,
  };
};

const fetchQnaNoticeList = async (): Promise<IQna[]> => {
  const { data } = await apiClient.get<IQna[] | null>('qna', {
    isNotice: 'eq.true',
    order: 'created_at.desc',
  });

  return (data ?? []).map(normalizeQna);
};

export const useQnaListQuery = (params: QnaListQueryParams) => {
  return useQuery<IQnaListResponse>({
    queryKey: ['qna-list', params],
    queryFn: () => fetchQnaList(params),
  });
};

export const useQnaNoticeListQuery = () => {
  return useQuery<IQna[]>({
    queryKey: ['qna-notice-list'],
    queryFn: fetchQnaNoticeList,
  });
};
