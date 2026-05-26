import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  IPartnershipInquiry,
  IPartnershipInquiryListResponse,
  PartnershipInquiryStatus,
} from '@visionflow/shared';

type PartnershipInquiryApiRow = Omit<
  IPartnershipInquiry,
  'created_at' | 'updated_at'
> & {
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

const normalizeInquiry = (
  item: PartnershipInquiryApiRow,
): IPartnershipInquiry => ({
  ...item,
  created_at: item.created_at ?? item.createdAt ?? '',
  updated_at: item.updated_at ?? item.updatedAt ?? '',
});

const fetchPartnershipList =
  async (): Promise<IPartnershipInquiryListResponse> => {
    const response = await fetch('/api/partnership-inquiries');

    if (!response.ok) {
      throw new Error('Failed to load partnership inquiries.');
    }

    const data = (await response.json()) as PartnershipInquiryApiRow[];

    return data.map(normalizeInquiry);
  };

export const usePartnershipListQuery = () => {
  return useQuery<IPartnershipInquiryListResponse>({
    queryKey: ['partnership-list'],
    queryFn: fetchPartnershipList,
  });
};

export const useUpdatePartnershipMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      admin_memo?: string | null;
      id: string;
      status?: PartnershipInquiryStatus;
    }) => {
      const response = await fetch('/api/partnership-inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update partnership inquiry.');
      }

      return normalizeInquiry(
        (await response.json()) as PartnershipInquiryApiRow,
      );
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<IPartnershipInquiry[]>(
        ['partnership-list'],
        (current) =>
          current?.map((item) =>
            item.id === updated.id ? updated : item,
          ) ?? [updated],
      );

      await queryClient.invalidateQueries({
        queryKey: ['partnership-list'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['admin-alarms'],
      });
    },
  });
};
