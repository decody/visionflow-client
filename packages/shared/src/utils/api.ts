const DEFAULT_SUPABASE_REST_URL = 'https://milytmxkzwanonnkrkme.supabase.co/rest/v1';

declare const process:
  | {
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
        NEXT_PUBLIC_SUPABASE_REST_URL?: string;
        NEXT_PUBLIC_SUPABASE_URL?: string;
      };
    }
  | undefined;

export type ApiResponse<T> = {
  data: T;
  totalCount?: number;
};

export type ApiPayload = Record<string, unknown>;
export type ApiQueryValue = string | number | boolean | undefined | null;

export type ApiGetOptions = {
  count?: boolean;
  query?: Record<string, ApiQueryValue>;
};

type RequestHeadersOptions = {
  count?: boolean;
  preferRepresentation?: boolean;
};

const readEnv = (key: string) => {
  if (typeof process === 'undefined') {
    return undefined;
  }

  switch (key) {
    case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    case 'NEXT_PUBLIC_SUPABASE_REST_URL':
      return process.env.NEXT_PUBLIC_SUPABASE_REST_URL;
    case 'NEXT_PUBLIC_SUPABASE_URL':
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    default:
      return undefined;
  }
};

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const createRestBaseUrl = () => {
  const restUrl = readEnv('NEXT_PUBLIC_SUPABASE_REST_URL');

  if (restUrl) {
    return trimTrailingSlashes(restUrl);
  }

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');

  if (supabaseUrl) {
    return `${trimTrailingSlashes(supabaseUrl)}/rest/v1`;
  }

  return DEFAULT_SUPABASE_REST_URL;
};

const getSupabaseKey = () =>
  readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const toCamelCase = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const normalizeResponseKeys = <T>(data: unknown): T => {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeResponseKeys(item)) as T;
  }

  if (!data || typeof data !== 'object') {
    return data as T;
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), normalizeResponseKeys(value)]),
  ) as T;
};

const normalizePayloadKeys = (payload: unknown): unknown => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizePayloadKeys(item));
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [toSnakeCase(key), normalizePayloadKeys(value)]),
  );
};

const parsePath = (path: string) => {
  const pathParts = path.replace(/^\/+/, '').split('?');
  const pathname = pathParts[0] ?? '';
  const queryString = pathParts[1] ?? '';
  const segments = pathname.split('/');
  const table = segments[0];
  const id = segments[1];

  if (!table) {
    throw new Error('Supabase table name is required.');
  }

  return { id, queryString, table };
};

const getHeaders = ({ count = false, preferRepresentation = false }: RequestHeadersOptions = {}): HeadersInit => {
  const supabaseKey = getSupabaseKey();

  if (!supabaseKey) {
    throw new Error(
      'Supabase public key is required. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...((preferRepresentation || count) && {
      Prefer: [preferRepresentation ? 'return=representation' : undefined, count ? 'count=exact' : undefined]
        .filter(Boolean)
        .join(','),
    }),
  };
};

const createTableUrl = ({
  id,
  query,
  queryString,
  table,
}: {
  id?: string;
  query?: Record<string, ApiQueryValue>;
  queryString?: string;
  table: string;
}) => {
  const url = new URL(`${createRestBaseUrl()}/${table}`);

  url.searchParams.set('select', '*');

  if (queryString) {
    new URLSearchParams(queryString).forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  if (id) {
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('limit', '1');
  }

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const parseTotalCount = (contentRange: string | null) => {
  if (!contentRange) return undefined;

  const [, total] = contentRange.split('/');
  const parsedTotal = Number(total);

  return Number.isFinite(parsedTotal) ? parsedTotal : undefined;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const throwIfResponseError = async (response: Response) => {
  if (response.ok) return;

  const errorBody = await parseResponse(response);

  if (errorBody && typeof errorBody === 'object') {
    const error = errorBody as { details?: string; message?: string };
    throw new Error(error.message ?? error.details ?? response.statusText);
  }

  throw new Error(typeof errorBody === 'string' ? errorBody : response.statusText);
};

const firstRow = <T>(data: unknown): T => {
  if (Array.isArray(data)) {
    return data[0] as T;
  }

  return data as T;
};

const request = async <T>(url: string, options: RequestInit, singleRow = false): Promise<ApiResponse<T>> => {
  const response = await fetch(url, options);

  await throwIfResponseError(response);

  const data = await parseResponse(response);
  const responseData = singleRow ? firstRow<T>(data) : (data as T);

  return {
    data: normalizeResponseKeys<T>(responseData),
    totalCount: parseTotalCount(response.headers.get('content-range')),
  };
};

export const apiClient = {
  async get<T>(path: string, options: ApiGetOptions = {}): Promise<ApiResponse<T>> {
    const { id, queryString, table } = parsePath(path);

    return request<T>(
      createTableUrl({ id, query: options.query, queryString, table }),
      {
        headers: getHeaders({ count: options.count }),
        method: 'GET',
      },
      Boolean(id),
    );
  },

  async post<T>(path: string, payload: ApiPayload): Promise<ApiResponse<T>> {
    const { table } = parsePath(path);

    return request<T>(
      createTableUrl({ table }),
      {
        body: JSON.stringify(normalizePayloadKeys(payload)),
        headers: getHeaders({ preferRepresentation: true }),
        method: 'POST',
      },
      true,
    );
  },

  async patch<T>(path: string, payload: ApiPayload): Promise<ApiResponse<T>> {
    const { id, table } = parsePath(path);

    if (!id) {
      throw new Error('Supabase row id is required for update.');
    }

    return request<T>(
      createTableUrl({ id, table }),
      {
        body: JSON.stringify(normalizePayloadKeys(payload)),
        headers: getHeaders({ preferRepresentation: true }),
        method: 'PATCH',
      },
      true,
    );
  },

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const { id, table } = parsePath(path);

    if (!id) {
      throw new Error('Supabase row id is required for delete.');
    }

    return request<T>(
      createTableUrl({ id, table }),
      {
        headers: getHeaders({ preferRepresentation: true }),
        method: 'DELETE',
      },
      true,
    );
  },
};
