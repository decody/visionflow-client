// 자주 묻는 질문(FAQ) 본문 내용에 해당하는 필드 정의
interface IFaqContent {
  category?: string | null; // FAQ 카테고리 (nullable)
  question: string; // 질문 내용
  answer: string; // 답변 내용
  isVisible?: boolean; // 공개 여부 (camelCase, 선택값)
  is_visible?: boolean; // 공개 여부 (snake_case, 선택값) - 호환용
  created_at?: string; // 생성일 (snake_case, 선택값)
  createdAt?: string; // 생성일 (camelCase, 선택값)
  updated_at?: string; // 수정일 (snake_case, 선택값)
  updatedAt?: string; // 수정일 (camelCase, 선택값)
}

// FAQ 전체 객체 구조 (본문 + 추가 메타데이터)
interface IFaq extends IFaqContent {
  id: number; // 고유 ID
  open?: boolean; // 질문 열림 여부 (UI 상태)
}

// FAQ 생성/수정 요청에 사용되는 인터페이스
type ICreateFaqRequest = IFaqContent;

export type { ICreateFaqRequest, IFaq };
