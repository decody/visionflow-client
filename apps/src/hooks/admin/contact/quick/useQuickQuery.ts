import { useQuery } from '@tanstack/react-query';
import {
  type IQuickInquiry,
  type IQuickInquiryListResponse,
} from '@visionflow/shared';

type QuickInquiryApiRow = Omit<
  IQuickInquiry,
  'created_at' | 'updated_at'
> & {
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

const fetchQuickList =
  async (): Promise<IQuickInquiryListResponse> => {
    const response = await fetch('/api/quick-inquiries');

    if (!response.ok) {
      throw new Error('Failed to load quick inquiries.');
    }

    const data = (await response.json()) as QuickInquiryApiRow[];

    return data.map((item) => ({
      ...item,
      created_at: item.created_at ?? item.createdAt ?? '',
      updated_at: item.updated_at ?? item.updatedAt ?? '',
    }));
  };

export const useQuickListQuery = () => {
  return useQuery<IQuickInquiryListResponse>({
    queryKey: ['quick-list'],
    queryFn: fetchQuickList,
  });
};
