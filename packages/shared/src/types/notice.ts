// 공지사항의 본문 내용에 해당하는 필드 정의
interface INoticeContent {
  title: string; // 공지 제목
  description: string | null; // 공지 요약 설명 (nullable)
  contentHtml: string | null; // 공지 본문 HTML (nullable)
  contentJson: Record<string, unknown> | null; // 공지 본문 JSON 포맷 (nullable)
  isImportant: boolean; // 중요 공지 여부
  isPublished: boolean; // 공개 여부
  createdBy: string | null; // 작성자 ID (nullable)
}

// 공지사항 전체 객체 구조 (공지 본문 + 추가 메타데이터)
interface INotice extends INoticeContent {
  id: string; // 고유 ID
  category: string; // 카테고리
  date: string; // 공지 게시일 (문자열)
  createdAt: string; // 생성일
  updatedAt: string; // 수정일
}

// 공지사항 생성/수정 요청에 사용되는 인터페이스
interface ICreateNoticeRequest
  // 필수값: 제목, 설명, HTML 본문
  extends
    Pick<INoticeContent, 'title' | 'description' | 'contentHtml'>,
    // 선택값: JSON 본문, 중요/공개 여부, 작성자
    Partial<
      Pick<
        INoticeContent,
        'contentJson' | 'isImportant' | 'isPublished' | 'createdBy'
      >
    > {
  category?: string | null; // 카테고리 (nullable)
  date?: string; // 게시일
  createdAt?: string; // 생성일
  updatedAt?: string; // 수정일
}

export type { ICreateNoticeRequest, INotice };
