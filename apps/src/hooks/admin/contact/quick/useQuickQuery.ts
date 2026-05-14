import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
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
    const { data } =
      await apiClient.get<QuickInquiryApiRow[]>(`/quick_inquiries`);

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
