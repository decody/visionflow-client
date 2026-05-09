interface IFaq {
  id: number;
  category?: string | null;
  question: string;
  answer: string;
  open?: boolean;
  isVisible?: boolean;
  is_visible?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface ICreateFaqRequest {
  category?: string | null;
  question: string;
  answer: string;
  isVisible?: boolean;
  is_visible?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export type { ICreateFaqRequest, IFaq };
