// pending: 접수됐지만 아직 처리되지 않음
// in_progress: 처리 중
// resolved: 답변 완료 또는 해결됨
export type QuickInquiryStatus =
  | 'pending'
  | 'in_progress'
  | 'resolved';

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
