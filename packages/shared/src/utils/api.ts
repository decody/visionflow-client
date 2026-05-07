const SUPABASE_REST_PATH = '/rest/v1';

// 브라우저에 노출되는 Supabase 환경 변수만 사용합니다.
// NEXT_PUBLIC_ 접두사가 있어야 Next.js 클라이언트 코드에서도 접근할 수 있습니다.
type SupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_REST_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

declare const process: { env: SupabaseEnv };

// 모든 API 요청은 { data, totalCount } 모양으로 반환되도록 통일합니다.
export type ApiResponse<T> = {
  data: T;
  totalCount?: number;
};

// POST/PATCH에 넘기는 객체 타입입니다. 값의 형태가 다양할 수 있어 unknown으로 둡니다.
export type ApiPayload = Record<string, unknown>;

// GET query에 넣을 수 있는 값 타입입니다. null/undefined는 URL에 붙이지 않습니다.
export type ApiQueryValue = string | number | boolean | null | undefined;

export type ApiGetOptions = {
  // Supabase의 Content-Range 헤더를 이용해 전체 개수를 받을지 여부입니다.
  count?: boolean;
  // 예: { order: 'created_at.desc', limit: 10 } 처럼 Supabase REST query를 넘깁니다.
  query?: Record<string, ApiQueryValue>;
};

type RequestOptions = {
  body?: unknown;
  count?: boolean;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  returnRepresentation?: boolean;
  singleRow?: boolean;
};

// URL 끝의 /를 제거해서 https://.../rest/v1//notices 같은 중복 slash를 막습니다.
const trimSlash = (value: string) => value.replace(/\/+$/, '');

// 실제 Supabase REST API base URL을 만듭니다.
// REST URL이 직접 있으면 그대로 쓰고, 프로젝트 URL만 있으면 /rest/v1을 붙입니다.
const getRestBaseUrl = () => {
  const NEXT_PUBLIC_SUPABASE_REST_URL = process.env.NEXT_PUBLIC_SUPABASE_REST_URL;
  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (NEXT_PUBLIC_SUPABASE_REST_URL) return trimSlash(NEXT_PUBLIC_SUPABASE_REST_URL);
  if (NEXT_PUBLIC_SUPABASE_URL)
    return `${trimSlash(NEXT_PUBLIC_SUPABASE_URL)}${SUPABASE_REST_PATH}`;

  throw new Error(
    'Supabase URL is required. Set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_REST_URL.',
  );
};

// Supabase 요청 인증에 사용할 public key를 가져옵니다.
// publishable key가 있으면 우선 사용하고, 없으면 기존 anon key를 사용합니다.
const getSupabaseKey = () => {
  const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// DB 컬럼명은 snake_case, 프론트 코드 타입은 camelCase를 쓰기 쉽게 서로 변환합니다.
const toCamelCase = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// 객체/배열 안쪽까지 재귀적으로 돌면서 key 이름만 변환합니다.
const mapObjectKeys = (value: unknown, mapKey: (key: string) => string): unknown => {
  if (Array.isArray(value)) return value.map((item) => mapObjectKeys(item, mapKey));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [mapKey(key), mapObjectKeys(item, mapKey)]),
  );
};

// 'notices/1?order=created_at.desc' 같은 path를 table, id, queryString으로 나눕니다.
const parsePath = (path: string) => {
  const [pathname = '', queryString = ''] = path.replace(/^\/+/, '').split('?');
  const [table, id] = pathname.split('/');

  if (!table) throw new Error('Supabase table name is required.');

  return { id, queryString, table };
};

// Supabase REST API에 필요한 공통 헤더를 만듭니다.
// Prefer 헤더는 insert/update/delete 결과 반환이나 count 요청 같은 옵션을 제어합니다.
const createHeaders = ({ count = false, returnRepresentation = false } = {}): HeadersInit => {
  const key = getSupabaseKey();

  if (!key) {
    throw new Error(
      'Supabase public key is required. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const prefer = [returnRepresentation && 'return=representation', count && 'count=exact']
    .filter(Boolean)
    .join(',');

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(prefer && { Prefer: prefer }),
  };
};

// apiClient에서 받은 path와 query 옵션을 실제 호출할 URL로 변환합니다.
// id가 있으면 Supabase 필터 문법인 id=eq.{id}와 limit=1을 자동으로 붙입니다.
const createUrl = (path: string, query?: Record<string, ApiQueryValue>) => {
  const { id, queryString, table } = parsePath(path);
  const url = new URL(`${getRestBaseUrl()}/${table}`);

  // 기본적으로 모든 컬럼을 조회합니다. 필요한 경우 query에서 select를 덮어쓸 수 있습니다.
  url.searchParams.set('select', '*');

  new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value));

  if (id) {
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('limit', '1');
  }

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return { id, url: url.toString() };
};

// 응답 body가 JSON이면 객체로, JSON이 아니면 문자열로, 비어 있으면 null로 처리합니다.
const parseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

// fetch는 400/500 응답에서도 throw하지 않기 때문에 직접 성공 여부를 검사합니다.
const assertSuccess = async (response: Response) => {
  if (response.ok) return;

  const error = await parseBody(response);

  if (error && typeof error === 'object') {
    const { details, message } = error as { details?: string; message?: string };
    throw new Error(message ?? details ?? response.statusText);
  }

  throw new Error(typeof error === 'string' ? error : response.statusText);
};

// count=true일 때 Supabase가 내려주는 Content-Range 헤더에서 전체 개수를 꺼냅니다.
const getTotalCount = (response: Response) => {
  const total = response.headers.get('content-range')?.split('/')[1];
  const count = Number(total);

  return Number.isFinite(count) ? count : undefined;
};

// 실제 fetch를 수행하는 공통 함수입니다.
// 요청 body는 snake_case로 보내고, 응답 data는 camelCase로 바꿔서 돌려줍니다.
const request = async <T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> => {
  const response = await fetch(url, {
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(mapObjectKeys(options.body, toSnakeCase)),
    headers: createHeaders({
      count: options.count,
      returnRepresentation: options.returnRepresentation,
    }),
    method: options.method,
  });

  await assertSuccess(response);

  const body = await parseBody(response);
  const data = options.singleRow && Array.isArray(body) ? body[0] : body;

  return {
    data: mapObjectKeys(data, toCamelCase) as T,
    totalCount: getTotalCount(response),
  };
};

// 앱에서 쓰는 공개 API 클라이언트입니다.
// 예: apiClient.get<INotice[]>('notices'), apiClient.patch<INotice>('notices/1', payload)
export const apiClient = {
  get<T>(path: string, options: ApiGetOptions = {}) {
    const { id, url } = createUrl(path, options.query);

    return request<T>(url, {
      count: options.count,
      method: 'GET',
      singleRow: Boolean(id),
    });
  },

  post<T>(path: string, payload: ApiPayload) {
    // 생성된 row를 바로 받아오기 위해 return=representation을 사용합니다.
    return request<T>(createUrl(path).url, {
      body: payload,
      method: 'POST',
      returnRepresentation: true,
      singleRow: true,
    });
  },

  patch<T>(path: string, payload: ApiPayload) {
    const { id, url } = createUrl(path);

    // update/delete는 특정 row를 대상으로 해야 하므로 path에 id가 필요합니다.
    if (!id) throw new Error('Supabase row id is required for update.');

    return request<T>(url, {
      body: payload,
      method: 'PATCH',
      returnRepresentation: true,
      singleRow: true,
    });
  },

  delete<T>(path: string) {
    const { id, url } = createUrl(path);

    // 예: apiClient.delete('notices/1') 처럼 id가 있어야 합니다.
    if (!id) throw new Error('Supabase row id is required for delete.');

    return request<T>(url, {
      method: 'DELETE',
      returnRepresentation: true,
      singleRow: true,
    });
  },
};
