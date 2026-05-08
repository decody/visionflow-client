const SUPABASE_REST_PATH = '/rest/v1';

// Next.js 클라이언트에서 접근 가능한 Supabase 공개 환경 변수만 사용합니다.
type SupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_REST_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

declare const process: { env: SupabaseEnv };

export type ApiResponse<T> = {
  data: T;
};

export type ApiPayload = Record<string, unknown>;
export type ApiQueryParams = Record<string, boolean | number | string | null | undefined>;

// apiClient 내부에서만 쓰는 최소 요청 옵션입니다.
type RequestOptions = {
  body?: unknown;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  returnRepresentation?: boolean;
  singleRow?: boolean;
};

const trimSlash = (value: string) => value.replace(/\/+$/, '');

// REST URL이 있으면 그대로 쓰고, 프로젝트 URL만 있으면 /rest/v1을 붙입니다.
const getRestBaseUrl = () => {
  const NEXT_PUBLIC_SUPABASE_REST_URL = process.env.NEXT_PUBLIC_SUPABASE_REST_URL;
  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (NEXT_PUBLIC_SUPABASE_REST_URL) return trimSlash(NEXT_PUBLIC_SUPABASE_REST_URL);
  if (NEXT_PUBLIC_SUPABASE_URL) return `${trimSlash(NEXT_PUBLIC_SUPABASE_URL)}${SUPABASE_REST_PATH}`;

  throw new Error(
    'Supabase URL is required. Set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_REST_URL.',
  );
};

const getSupabaseKey = () => {
  const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// DB는 snake_case, 프론트 타입은 camelCase로 쓰기 위해 key 이름만 변환합니다.
const toCamelCase = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const mapObjectKeys = (value: unknown, mapKey: (key: string) => string): unknown => {
  if (Array.isArray(value)) return value.map((item) => mapObjectKeys(item, mapKey));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [mapKey(key), mapObjectKeys(item, mapKey)]),
  );
};

const createHeaders = ({ returnRepresentation = false } = {}): HeadersInit => {
  const key = getSupabaseKey();

  if (!key) {
    throw new Error(
      'Supabase public key is required. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(returnRepresentation && { Prefer: 'return=representation' }),
  };
};

// 지원 경로는 table 또는 table/id 형태로 제한합니다.
const parsePath = (path: string) => {
  const [table, id] = path
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/');

  if (!table) {
    throw new Error('Supabase table path is required.');
  }

  return { id, table };
};

// Supabase REST 호출 URL을 만들고, id가 있으면 단일 row 필터를 붙입니다.
const createUrl = (path: string, query?: ApiQueryParams) => {
  const { id, table } = parsePath(path);
  const url = new URL(`${getRestBaseUrl()}/${table}`);

  url.searchParams.set('select', '*');

  if (id) {
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('limit', '1');
  }

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      url.searchParams.set(toSnakeCase(key), String(value));
    });
  }

  return { id, url: url.toString() };
};

// 응답 body는 JSON이면 파싱하고, 비어 있으면 null로 처리합니다.
const parseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

// fetch는 HTTP 에러에서 throw하지 않으므로 공통으로 성공 여부를 검사합니다.
const assertSuccess = async (response: Response) => {
  if (response.ok) return;

  const error = await parseBody(response);

  if (error && typeof error === 'object') {
    const { details, message } = error as { details?: string; message?: string };
    throw new Error(message ?? details ?? response.statusText);
  }

  throw new Error(typeof error === 'string' ? error : response.statusText);
};

// 요청 payload는 snake_case로 보내고, 응답 data는 camelCase로 돌려줍니다.
const request = async <T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> => {
  const response = await fetch(url, {
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(mapObjectKeys(options.body, toSnakeCase)),
    headers: createHeaders({
      returnRepresentation: options.returnRepresentation,
    }),
    method: options.method,
  });

  await assertSuccess(response);

  const body = await parseBody(response);
  const data = options.singleRow && Array.isArray(body) ? body[0] : body;

  return {
    data: mapObjectKeys(data, toCamelCase) as T,
  };
};

// 앱에서 공통으로 사용하는 Supabase REST CRUD 클라이언트입니다.
export const apiClient = {
  get<T>(path: string, query?: ApiQueryParams) {
    const { id, url } = createUrl(path, query);

    return request<T>(url, {
      method: 'GET',
      singleRow: Boolean(id),
    });
  },

  post<T>(path: string, payload: ApiPayload) {
    return request<T>(createUrl(path).url, {
      body: payload,
      method: 'POST',
      returnRepresentation: true,
      singleRow: true,
    });
  },

  patch<T>(path: string, payload: ApiPayload) {
    const { id, url } = createUrl(path);

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

    if (!id) throw new Error('Supabase row id is required for delete.');

    return request<T>(url, {
      method: 'DELETE',
      returnRepresentation: true,
      singleRow: true,
    });
  },
};
