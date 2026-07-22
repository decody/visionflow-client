import { useQuery } from '@tanstack/react-query';
import type { INotice } from '@visionflow/shared';

// 브라우저 → 같은 오리진 Next BFF(/api/admin/notices) → Spring. Supabase 직접 호출 제거.
const readError = async (response: Response, fallback: string) => {
  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return new Error(data?.message ?? fallback);
};

const fetchNoticeList = async (): Promise<INotice[]> => {
  const response = await fetch('/api/admin/notices', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await readError(response, '공지 목록을 불러오지 못했습니다.');
  }

  return (await response.json()) as INotice[];
};

const fetchNotice = async (
  noticeId: string,
): Promise<INotice | null> => {
  const response = await fetch(`/api/admin/notices/${noticeId}`, {
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
  return useQuery<INotice[]>({
    queryKey: ['admin', 'notices-list'],
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
