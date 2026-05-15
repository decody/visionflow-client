interface IQnaContent {
  answer: string;
  category?: string | null;
  created_at?: string;
  createdAt?: string;
  is_notice?: boolean;
  isNotice?: boolean;
  is_visible?: boolean;
  isVisible?: boolean;
  question: string;
  updated_at?: string;
  updatedAt?: string;
}

interface IQna extends IQnaContent {
  id: number;
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
