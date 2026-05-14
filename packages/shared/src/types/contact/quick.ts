// 'pending' : 접수됨, 아직 처리되지 않음
// 'in_progress' : 처리 중
// 'resolved' : 답변 완료/해결됨
export type QuickInquiryStatus =
  | 'pending'
  | 'in_progress'
  | 'resolved';

export interface IQuickInquiry {
  id: string; // uuid
  name: string;
  email: string;
  subject?: string | null;
  content: string;
  status: QuickInquiryStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// 목록 응답 타입 예시, 기존 INoticeQuickListResponse 보다 일반적 확장
export interface IQuickInquiryListResponse {
  total_count: number;
  limit: number;
  offset: number;
  data: IQuickInquiry[];
}
