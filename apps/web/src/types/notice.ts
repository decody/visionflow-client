export interface INotice {
  id: string;
  category: string;
  date: string;
  title: string;
  description: string | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  isImportant: boolean;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateNoticeInput = Omit<INotice, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateNoticeInput = Partial<Omit<INotice, 'id' | 'createdAt' | 'updatedAt'>>;

export type NoticeSummary = Omit<INotice, 'contentHtml' | 'contentJson'>;

export type NoticeCategory = 'announcement' | 'event' | 'maintenance' | 'update' | string;
