import { useQuery } from '@tanstack/react-query';
import type { INotice, INoticeListResponse } from '@visionflow/shared';

// 브라우저 → 같은 오리진 Next BFF(/api/notices) → Spring. Supabase RPC(get_notices) 제거.
const readError = async (response: Response, fallback: string) => {
  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return new Error(data?.message ?? fallback);
};

const fetchNoticeList = async (): Promise<INoticeListResponse> => {
  const response = await fetch('/api/notices', { cache: 'no-store' });

  if (!response.ok) {
    throw await readError(response, '공지 목록을 불러오지 못했습니다.');
  }

  const data = (await response.json()) as INotice[];

  // 기존 RPC 응답 형태(INoticeListResponse) 유지 — 페이지가 .data 로 접근한다.
  return {
    total_count: data.length,
    limit: data.length,
    offset: 0,
    data,
  };
};

const fetchNotice = async (
  noticeId: string,
): Promise<INotice | null> => {
  const response = await fetch(`/api/notices/${noticeId}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw await readError(response, '공지를 불러오지 못했습니다.');
  }

  return (await response.json()) as INotice;
};

export const useNoticeListQuery = () => {
  return useQuery<INoticeListResponse>({
    queryKey: ['notices-list'],
    queryFn: fetchNoticeList,
  });
};

export const useNoticeViewQuery = (noticeId: string) => {
  return useQuery<INotice | null>({
    enabled: Boolean(noticeId),
    queryKey: ['notice', noticeId],
    queryFn: () => fetchNotice(noticeId),
  });
};
