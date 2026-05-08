export interface IFaq {
  id: number;
  category?: string | null;
  question: string;
  answer: string;
  open?: boolean;
  is_visible?: boolean;
  created_at?: string;
}
