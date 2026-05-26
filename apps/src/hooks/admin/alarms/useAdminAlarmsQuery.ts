import { useQuery } from '@tanstack/react-query';

export type AdminAlarmItem = {
  created_at: string;
  entity_id: string;
  href: string;
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  type: 'general' | 'partnership' | 'quote';
};

export type AdminAlarmsResponse = {
  counts: {
    generalPending: number;
    partnershipPending: number;
    quoteOverdue: number;
    quotePending: number;
    total: number;
  };
  items: AdminAlarmItem[];
};

const EMPTY_ALARMS: AdminAlarmsResponse = {
  counts: {
    generalPending: 0,
    partnershipPending: 0,
    quoteOverdue: 0,
    quotePending: 0,
    total: 0,
  },
  items: [],
};

const fetchAdminAlarms = async (): Promise<AdminAlarmsResponse> => {
  const response = await fetch('/api/admin/alarms');

  if (!response.ok) {
    throw new Error('Failed to load admin alarms.');
  }

  return (await response.json()) as AdminAlarmsResponse;
};

export const useAdminAlarmsQuery = () => {
  return useQuery<AdminAlarmsResponse>({
    queryFn: fetchAdminAlarms,
    queryKey: ['admin-alarms'],
    placeholderData: EMPTY_ALARMS,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
