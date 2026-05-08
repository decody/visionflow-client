export interface IFaq {
  id: number;
  question: string;
  answer: string;
  open?: boolean;
  is_visible?: boolean;
  created_at?: string;
}
