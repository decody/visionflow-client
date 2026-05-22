// pending: received but not processed yet
// processing: currently being handled
// completed: reply sent
export type QuickInquiryStatus =
  | 'pending'
  | 'processing'
  | 'completed';

export interface IQuickInquiry {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  content: string;
  status: QuickInquiryStatus;
  created_at: string;
  replied_at?: string | null;
  replied_by?: string | null;
  reply_content?: string | null;
  updated_at: string;
}

export type IQuickInquiryListResponse = IQuickInquiry[];
