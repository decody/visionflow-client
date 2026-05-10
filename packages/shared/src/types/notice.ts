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

export interface ICreateNoticeRequest {
  category?: string | null;
  date?: string;
  title: string;
  description: string;
  contentHtml: string | null;
  contentJson?: Record<string, unknown> | null;
  isImportant?: boolean;
  isPublished?: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
