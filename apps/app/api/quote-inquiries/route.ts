import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  springQuoteInquiryToIQuoteInquiry,
  type SpringQuoteInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

// snake_case 필드명은 Spring multipart 컨트롤러(@RequestParam)와 정확히 일치한다.
const ARRAY_FIELDS = [
  'service_categories',
  'reference_urls',
  'preferred_contact_methods',
];
const SCALAR_FIELDS = [
  'project_scale',
  'preferred_start_date',
  'project_description',
  'company_name',
  'contact_name',
  'position',
  'email',
  'phone',
];
const BOOLEAN_FIELDS = ['privacy_agreed', 'marketing_agreed'];

/**
 * JSON 본문(snake_case)을 Spring multipart 접수 포맷으로 변환한다.
 * 배열은 JSON 문자열(Spring parseArray가 파싱), 불리언/스칼라는 문자열로 보낸다.
 * (공개 폼은 항상 multipart로 보내지만, JSON 접수도 계약상 지원한다 — 이 경로엔 첨부가 없다.)
 */
const buildFormFromJson = (payload: Record<string, unknown>): FormData => {
  const form = new FormData();

  for (const key of ARRAY_FIELDS) {
    const value = payload[key];

    form.set(key, JSON.stringify(Array.isArray(value) ? value : []));
  }

  for (const key of SCALAR_FIELDS) {
    const value = payload[key];

    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  }

  for (const key of BOOLEAN_FIELDS) {
    form.set(key, String(Boolean(payload[key])));
  }

  return form;
};

/**
 * 공개 견적 문의 접수 — Spring `POST /api/quote-inquiries`(multipart)로 위임한다. 인증 불필요.
 * 브라우저는 Supabase Storage/DB 대신 이 같은 오리진 라우트를 호출하고(BFF), Spring이 파일 저장·검증·저장을 수행한다.
 * multipart 요청은 첨부(File) 포함 그대로 포워딩, JSON 요청은 multipart 폼으로 변환해 단일 경로로 위임한다.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const body = contentType.includes('multipart/form-data')
      ? await request.formData()
      : buildFormFromJson((await request.json()) as Record<string, unknown>);

    const forwardedFor = request.headers.get('x-forwarded-for');
    const userAgent = request.headers.get('user-agent');

    // Content-Type은 fetch가 FormData 경계(boundary)와 함께 자동 설정하므로 지정하지 않는다.
    const response = await fetch(backendUrl('/api/quote-inquiries'), {
      body,
      headers: {
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
      method: 'POST',
    });

    const data = await readJson(response);

    if (!response.ok) {
      return jsonError(
        'Failed to create quote inquiry.',
        response.status,
        data,
      );
    }

    return NextResponse.json(
      springQuoteInquiryToIQuoteInquiry(data as SpringQuoteInquiry),
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
