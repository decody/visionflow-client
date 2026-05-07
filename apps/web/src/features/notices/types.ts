export type NoticeCategory = 'Guide' | 'Service' | 'Update';

export type Notice = {
  category: NoticeCategory;
  date: string;
  description: string;
  title: string;
};

export type NoticeSummaryItem = {
  label: string;
  value: string;
};
