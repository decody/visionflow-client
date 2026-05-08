export interface IFaq {
  id: number;
  category?: string | null;
  question: string;
  answer: string;
  open?: boolean;
  isVisible?: boolean;
  is_visible?: boolean;
  created_at?: string;
}
