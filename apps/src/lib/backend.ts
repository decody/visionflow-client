import { createHmac } from 'node:crypto';

import type {
  IFaq,
  INotice,
  IPartnershipInquiry,
  IQna,
  IQuickInquiry,
  IQuoteInquiry,
  IUser,
  PartnershipInquiryCompanySize,
  PartnershipInquiryStatus,
  PartnershipInquiryType,
  QuickInquiryStatus,
  QuoteInquiryStatus,
  UserRole,
  UserStatus,
} from '@visionflow/shared';

/**
 * Spring 백엔드(visionflow-server) 호출 헬퍼 — 서버 전용.
 *
 * <p>Route Handler 등 서버 코드에서만 import 한다. base URL(API_BASE_URL)은
 * NEXT_PUBLIC_ 접두사가 없어 브라우저 번들에 노출되지 않는다. 브라우저는 항상
 * 같은 오리진의 Next API 라우트만 호출하고, 그 라우트가 이 헬퍼로 Spring에 위임한다.
 *
 * <p>인증: Spring 어드민 API(/api/admin/**)는 Bearer JWT를 요구한다. 이 파일의
 * {@link backendAuthHeaders}가 NextAuth로 검증된 사용자(userId/role)를 담은 단기
 * HS256 서명 JWT를 발급해 Authorization 헤더로 실어 보낸다(BFF = 토큰 발급자).
 * Spring은 공유 비밀(BACKEND_JWT_SECRET)로 서명·발급자·만료를 검증한다.
 */
const getBackendBaseUrl = () =>
  (process.env.API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');

export const backendUrl = (path: string) =>
  `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

// ── BFF JWT 발급 (HS256, Spring 리소스 서버가 검증) ─────────────────
// jose 등 외부 라이브러리 없이 Node 표준 crypto로 표준 compact JWS(HS256)를 만든다.
// 서명은 우리가 전적으로 통제하는 값이라 위험이 낮고, 의존성/번들 부담이 없다.

const BACKEND_JWT_TTL_SECONDS = 120; // 단기 토큰(2분). BFF→Spring 1-hop 호출용.
const DEFAULT_BACKEND_JWT_ISSUER = 'visionflow-bff';

const base64url = (input: string) =>
  Buffer.from(input, 'utf8').toString('base64url');

export type BackendPrincipal = {
  role: UserRole;
  userId: string;
};

/**
 * userId(sub)/role 클레임을 담은 단기 HS256 JWT를 서명한다.
 * BACKEND_JWT_SECRET(및 Spring 측 값)은 HS256 규격상 32바이트 이상이어야 한다.
 */
export const signBackendToken = ({ role, userId }: BackendPrincipal): string => {
  const secret = process.env.BACKEND_JWT_SECRET;

  if (!secret) {
    throw new Error(
      'BACKEND_JWT_SECRET 이 설정되지 않았습니다. Spring 어드민 API 호출에 필요합니다.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    exp: now + BACKEND_JWT_TTL_SECONDS,
    iat: now,
    iss: process.env.BACKEND_JWT_ISSUER ?? DEFAULT_BACKEND_JWT_ISSUER,
    role,
    sub: userId,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
};

/** Spring 어드민 호출용 Authorization 헤더(Bearer JWT)를 만든다. */
export const backendAuthHeaders = (
  principal: BackendPrincipal,
): Record<string, string> => ({
  Authorization: `Bearer ${signBackendToken(principal)}`,
});

// Spring FaqResponse(JSON, camelCase) 원본 형태.
export type SpringFaq = {
  answer: string;
  category: string | null;
  createdAt: string;
  id: number;
  isVisible: boolean;
  question: string;
  updatedAt: string;
};

// Spring 응답을 프론트 IFaq로 변환. 기존 UI 호환을 위해 camelCase/snake_case를 모두 채운다.
export const springFaqToIFaq = (faq: SpringFaq): IFaq => ({
  answer: faq.answer,
  category: faq.category,
  created_at: faq.createdAt,
  createdAt: faq.createdAt,
  id: faq.id,
  is_visible: faq.isVisible,
  isVisible: faq.isVisible,
  question: faq.question,
  updated_at: faq.updatedAt,
  updatedAt: faq.updatedAt,
});

// Spring NoticeResponse(JSON, camelCase) 원본 형태.
export type SpringNotice = {
  category: string | null;
  contentHtml: string | null;
  createdAt: string;
  createdBy: string | null;
  date: string;
  description: string | null;
  id: string;
  isImportant: boolean;
  isPublished: boolean;
  title: string;
  updatedAt: string;
};

// Spring 응답을 프론트 INotice로 변환. content_json은 백엔드가 다루지 않는 죽은 필드라 항상 null.
export const springNoticeToINotice = (notice: SpringNotice): INotice => ({
  category: notice.category ?? '',
  contentHtml: notice.contentHtml,
  contentJson: null,
  createdAt: notice.createdAt,
  createdBy: notice.createdBy,
  date: notice.date,
  description: notice.description,
  id: notice.id,
  isImportant: notice.isImportant,
  isPublished: notice.isPublished,
  title: notice.title,
  updatedAt: notice.updatedAt,
});

// Spring QnaResponse(JSON, camelCase) 원본 형태. Spring은 title을 정본으로 쓰고 question 컬럼은 없앰.
export type SpringQna = {
  answer: string | null;
  authorName: string | null;
  category: string | null;
  content: string | null;
  createdAt: string;
  id: string;
  isNotice: boolean;
  isSecret: boolean;
  status: string | null;
  title: string;
  updatedAt: string;
  viewCount: number;
};

// Spring 페이지 응답(공개/관리 목록).
export type SpringQnaPage = {
  data: SpringQna[];
  limit: number;
  offset: number;
  totalCount: number;
};

// Spring 응답을 프론트 IQna로 변환. 기존 UI 호환을 위해 camelCase/snake_case를 모두 채운다.
// question은 Spring에 없으므로 title로 매핑(프론트는 question ?? title 순으로 읽음).
export const springQnaToIQna = (qna: SpringQna): IQna => ({
  answer: qna.answer,
  author_name: qna.authorName,
  authorName: qna.authorName,
  category: qna.category,
  content: qna.content,
  created_at: qna.createdAt,
  createdAt: qna.createdAt,
  id: qna.id,
  is_notice: qna.isNotice,
  isNotice: qna.isNotice,
  is_secret: qna.isSecret,
  isSecret: qna.isSecret,
  question: qna.title,
  status: qna.status,
  title: qna.title,
  updated_at: qna.updatedAt,
  updatedAt: qna.updatedAt,
  view_count: qna.viewCount,
  viewCount: qna.viewCount,
});

// Spring QuoteInquiryResponse(JSON, camelCase) 원본 형태. OffsetDateTime은 ISO 문자열로 직렬화된다.
export type SpringQuoteInquiry = {
  adminMemo: string | null;
  assignedAdminId: string | null;
  attachedFiles: string[] | null;
  companyName: string;
  completedAt: string | null;
  contactName: string;
  contactedAt: string | null;
  createdAt: string;
  email: string;
  id: number;
  ipAddress: string | null;
  marketingAgreed: boolean;
  marketingAgreedAt: string | null;
  phone: string | null;
  position: string | null;
  preferredContactMethods: string[] | null;
  preferredStartDate: string;
  privacyAgreed: boolean;
  privacyAgreedAt: string | null;
  projectDescription: string;
  projectScale: string;
  referenceUrls: string[] | null;
  serviceCategories: string[] | null;
  status: string;
  updatedAt: string;
  userAgent: string | null;
};

// Spring 응답을 프론트 IQuoteInquiry(snake_case)로 변환. 훅/컴포넌트가 snake_case로 읽으므로 계약을 그대로 유지한다.
export const springQuoteInquiryToIQuoteInquiry = (
  quote: SpringQuoteInquiry,
): IQuoteInquiry => ({
  admin_memo: quote.adminMemo,
  assigned_admin_id: quote.assignedAdminId,
  attached_files: quote.attachedFiles ?? [],
  company_name: quote.companyName,
  completed_at: quote.completedAt,
  contact_name: quote.contactName,
  contacted_at: quote.contactedAt,
  created_at: quote.createdAt,
  email: quote.email,
  id: quote.id,
  ip_address: quote.ipAddress,
  marketing_agreed: quote.marketingAgreed,
  marketing_agreed_at: quote.marketingAgreedAt,
  phone: quote.phone,
  position: quote.position,
  preferred_contact_methods: quote.preferredContactMethods ?? [],
  preferred_start_date: quote.preferredStartDate,
  privacy_agreed: quote.privacyAgreed,
  privacy_agreed_at: quote.privacyAgreedAt,
  project_description: quote.projectDescription,
  project_scale: quote.projectScale,
  reference_urls: quote.referenceUrls ?? [],
  service_categories: quote.serviceCategories ?? [],
  status: quote.status as QuoteInquiryStatus,
  updated_at: quote.updatedAt,
  user_agent: quote.userAgent,
});

// Spring PartnershipInquiryResponse(JSON, camelCase) 원본 형태. id는 UUID 문자열, 첨부는 단일(4개 스칼라).
export type SpringPartnershipInquiry = {
  adminMemo: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
  companyName: string;
  companySize: string;
  companyUrl: string | null;
  contactEmail: string;
  contactName: string;
  contactPhone: string | null;
  contactPosition: string;
  createdAt: string;
  id: string;
  partnershipType: string;
  proposalContent: string;
  status: string;
  updatedAt: string;
};

// Spring 응답을 프론트 IPartnershipInquiry(snake_case)로 변환. 훅/컴포넌트가 snake_case로 읽으므로 계약을 유지한다.
export const springPartnershipToIPartnershipInquiry = (
  p: SpringPartnershipInquiry,
): IPartnershipInquiry => ({
  admin_memo: p.adminMemo,
  attachment_name: p.attachmentName,
  attachment_size: p.attachmentSize,
  attachment_type: p.attachmentType,
  attachment_url: p.attachmentUrl,
  company_name: p.companyName,
  company_size: p.companySize as PartnershipInquiryCompanySize,
  company_url: p.companyUrl,
  contact_email: p.contactEmail,
  contact_name: p.contactName,
  contact_phone: p.contactPhone,
  contact_position: p.contactPosition,
  created_at: p.createdAt,
  id: p.id,
  partnership_type: p.partnershipType as PartnershipInquiryType,
  proposal_content: p.proposalContent,
  status: p.status as PartnershipInquiryStatus,
  updated_at: p.updatedAt,
});

// Spring QuickInquiryResponse(JSON, camelCase) 원본 형태. id는 UUID 문자열, 첨부 없음(3종 중 가장 단순).
export type SpringQuickInquiry = {
  content: string;
  createdAt: string;
  email: string;
  id: string;
  name: string;
  repliedAt: string | null;
  repliedBy: string | null;
  replyContent: string | null;
  status: string;
  subject: string | null;
  updatedAt: string;
};

// Spring 응답을 프론트 IQuickInquiry(snake_case)로 변환. 훅/컴포넌트가 snake_case로 읽으므로 계약을 유지한다.
export const springQuickToIQuickInquiry = (
  q: SpringQuickInquiry,
): IQuickInquiry => ({
  content: q.content,
  created_at: q.createdAt,
  email: q.email,
  id: q.id,
  name: q.name,
  replied_at: q.repliedAt,
  replied_by: q.repliedBy,
  reply_content: q.replyContent,
  status: q.status as QuickInquiryStatus,
  subject: q.subject,
  updated_at: q.updatedAt,
});

// Spring WorkResponse(JSON, camelCase). 프론트 apiClient 카멜케이스 출력·admin toWork와 동일 shape이라
// 별도 변환기 없이 그대로 전달한다(훅의 normalizeWork가 roles 콤마문자열→배열로 변환). updated_at 없음.
export type SpringWork = {
  category: string;
  createdAt: string;
  id: string;
  image: string | null;
  industry: string;
  isImportant: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  roles: string;
  size: string;
  title: string;
};

// Spring UserResponse(JSON, camelCase). role은 이미 UI 어휘(SuperAdmin|admin|Viewer)로 변환돼 온다.
export type SpringUser = {
  avatarColor: string | null;
  createdAt: string;
  email: string;
  id: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;
  name: string;
  role: string;
  status: string;
  updatedAt: string;
};

// Spring 응답을 프론트 IUser(snake_case)로 변환. 훅/컴포넌트가 snake_case로 읽으므로 계약을 유지한다.
export const springUserToIUser = (u: SpringUser): IUser => ({
  avatar_color: u.avatarColor,
  created_at: u.createdAt,
  email: u.email,
  id: u.id,
  last_login_at: u.lastLoginAt,
  last_login_ip: u.lastLoginIp,
  last_login_location: u.lastLoginLocation,
  name: u.name,
  role: u.role as UserRole,
  status: u.status as UserStatus,
  updated_at: u.updatedAt,
});

// Spring AlarmResponse(JSON, camelCase) 원본 형태.
// 4개 소스(quick/partnership/quote/qna)의 미처리 항목을 동일 projection으로 반환한다.
// 표현(SLA·severity·제목·링크·카운트)은 BFF(app/api/admin/alarms)가 계산한다.
export type SpringAlarm = {
  type: 'general' | 'partnership' | 'qna' | 'quote';
  entityId: string;
  primaryLabel: string;
  secondaryLabel: string;
  status: string;
  createdAt: string;
};

// Spring LoginResponse(JSON, camelCase). role 은 이미 UI 어휘(SuperAdmin|admin|Viewer).
// 로그인/SSO 프로비저닝은 비인증 서버-서버 호출(BFF JWT 불필요) — backendUrl 만 사용한다.
export type SpringLoginResponse = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
};

// Spring 통합 검색 소스(JSON). 공개 FAQ/공지/Q&A 키워드 매칭 결과.
// AI 답변 생성·works/contacts 정적 인덱스는 BFF(app/api/search)가 붙인다. 공개 GET(BFF JWT 불필요).
export type SpringSearchSources = {
  faqs: { id: number; question: string; answer: string }[];
  notices: {
    id: string;
    title: string;
    description: string | null;
    contentHtml: string | null;
  }[];
  qnas: {
    id: string;
    title: string;
    question: string | null; // 비밀글이면 null(마스킹)
    answer: string | null;
    category: string | null;
    notice: boolean; // → isNotice
    secret: boolean; // → isSecret
    status: string | null;
  }[];
};

// fetch 응답 body를 안전하게 JSON 파싱(비어 있으면 null).
export const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};
