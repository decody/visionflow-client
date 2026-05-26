'use client';

import { useQuery } from '@tanstack/react-query';
import type { IQna, IQnaListResponse } from '@visionflow/shared';

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
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetch(`/api/qna?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch Q&A list.');
  }

  const data = (await response.json()) as IQnaListResponse;

  return {
    ...data,
    data: data.data.map(normalizeQna),
  };
};

const fetchQnaNoticeList = async (): Promise<IQna[]> => {
  const searchParams = new URLSearchParams({
    limit: '20',
    notice: 'true',
  });
  const response = await fetch(`/api/qna?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch Q&A notices.');
  }

  const data = (await response.json()) as IQnaListResponse;

  return data.data.map(normalizeQna);
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
