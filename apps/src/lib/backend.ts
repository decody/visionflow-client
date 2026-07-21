import { createHmac } from 'node:crypto';

import type { IFaq, UserRole } from '@visionflow/shared';

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
