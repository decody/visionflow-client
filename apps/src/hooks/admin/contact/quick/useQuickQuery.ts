import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  IQuickInquiryListResponse,
} from '@visionflow/shared';

const fetchQuickList =
  async (): Promise<IQuickInquiryListResponse> => {
    const { data } =
      await apiClient.get<IQuickInquiryListResponse>(
        `/quick_inquiries`,
      );

    return data;
  };

export const useQuickListQuery = () => {
  return useQuery<IQuickInquiryListResponse>({
    queryKey: ['quick-list'],
    queryFn: fetchQuickList,
  });
};
