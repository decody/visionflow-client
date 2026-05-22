interface IQnaContent {
  category?: string | null;
  answer?: string | null;
  author_name?: string | null;
  authorName?: string | null;
  content?: string | null;
  created_at?: string;
  createdAt?: string;
  is_notice?: boolean;
  isNotice?: boolean;
  is_secret?: boolean;
  isSecret?: boolean;
  question?: string | null;
  status?: string | null;
  title?: string | null;
  updated_at?: string;
  updatedAt?: string;
  view_count?: number | null;
  viewCount?: number | null;
}

interface IQna extends IQnaContent {
  id: string;
  open?: boolean;
}

type ICreateQnaRequest = IQnaContent;

interface IQnaListResponse {
  total_count: number;
  limit: number;
  offset: number;
  data: IQna[];
}

export type { ICreateQnaRequest, IQna, IQnaListResponse };
