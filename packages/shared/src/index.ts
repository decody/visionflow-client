export { theme } from './constants/theme';
export type { Theme } from './constants/theme';

// shared 패키지 밖에서 사용할 공통 API 클라이언트와 타입만 공개합니다.
export type {
  IQuickInquiry,
  IQuickInquiryListResponse,
  QuickInquiryStatus,
} from './types/contact/quick';
export type {
  IPartnershipInquiry,
  IPartnershipInquiryListResponse,
  PartnershipInquiryCompanySize,
  PartnershipInquiryStatus,
  PartnershipInquiryType,
} from './types/contact/partnership';
export type {
  IQuoteInquiry,
  IQuoteInquiryListResponse,
  QuoteInquiryStatus,
} from './types/contact/quote';
export type { AuthAuditLog, AuthAuditStatus } from './types/auth';
export type { ICreateFaqRequest, IFaq } from './types/faq';
export type {
  ICreateNoticeRequest,
  INotice,
  INoticeListResponse,
} from './types/notice';
export type {
  ICreateQnaRequest,
  IQna,
  IQnaListResponse,
} from './types/qna';
export type {
  AiProvider,
  ContactRow,
  FaqRow,
  Message,
  NoticeRow,
  QnaRow,
  SearchRequest,
  SearchResponse,
  Source,
  SourceType,
} from './types/search';
export type { IUser, UserRole, UserStatus } from './types/users';
export type { WorkRow, WorksData } from './types/works';
export { apiClient } from './utils/api';
export type { ApiPayload, ApiResponse } from './utils/api';

export {
  formatPostDate,
  getPostDateTime,
  sortPostsByLatest,
} from './utils/date';
export { sanitizeContentHtml } from './utils/html';
export { maskString } from './utils/masking';
