const SUPABASE_REST_PATH = '/rest/v1';

type SupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_REST_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

declare const process: { env: SupabaseEnv };

export type ApiResponse<T> = {
  data: T;
  totalCount?: number;
};

export type ApiPayload = Record<string, unknown>;
export type ApiQueryValue = string | number | boolean | null | undefined;

export type ApiGetOptions = {
  count?: boolean;
  query?: Record<string, ApiQueryValue>;
};

type RequestOptions = {
  body?: unknown;
  count?: boolean;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  returnRepresentation?: boolean;
  singleRow?: boolean;
};

const trimSlash = (value: string) => value.replace(/\/+$/, '');

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

const getSupabaseKey = () => {
  const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

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

const parsePath = (path: string) => {
  const [pathname = '', queryString = ''] = path.replace(/^\/+/, '').split('?');
  const [table, id] = pathname.split('/');

  if (!table) throw new Error('Supabase table name is required.');

  return { id, queryString, table };
};

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

const createUrl = (path: string, query?: Record<string, ApiQueryValue>) => {
  const { id, queryString, table } = parsePath(path);
  const url = new URL(`${getRestBaseUrl()}/${table}`);

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

const parseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const assertSuccess = async (response: Response) => {
  if (response.ok) return;

  const error = await parseBody(response);

  if (error && typeof error === 'object') {
    const { details, message } = error as { details?: string; message?: string };
    throw new Error(message ?? details ?? response.statusText);
  }

  throw new Error(typeof error === 'string' ? error : response.statusText);
};

const getTotalCount = (response: Response) => {
  const total = response.headers.get('content-range')?.split('/')[1];
  const count = Number(total);

  return Number.isFinite(count) ? count : undefined;
};

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
