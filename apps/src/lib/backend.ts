import type { IFaq } from '@visionflow/shared';

/**
 * Spring 백엔드(visionflow-server) 호출 헬퍼 — 서버 전용.
 *
 * <p>Route Handler 등 서버 코드에서만 import 한다. base URL(API_BASE_URL)은
 * NEXT_PUBLIC_ 접두사가 없어 브라우저 번들에 노출되지 않는다. 브라우저는 항상
 * 같은 오리진의 Next API 라우트만 호출하고, 그 라우트가 이 헬퍼로 Spring에 위임한다.
 * (⚠️ Spring 어드민 API는 아직 미인증 — 반드시 Next 라우트의 NextAuth 뒤에 둔다.)
 */
const getBackendBaseUrl = () =>
  (process.env.API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');

export const backendUrl = (path: string) =>
  `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

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
