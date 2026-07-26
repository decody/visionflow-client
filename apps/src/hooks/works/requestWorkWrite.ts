// works 쓰기(생성/수정/삭제)를 /api/admin/works 로 보낸다.
// 서버 라우트가 NextAuth 세션·역할을 검증한 뒤 서명 JWT로 Spring 백엔드(BFF)에 위임하므로
// 브라우저에서 works 를 직접 쓰던 경로가 더 이상 존재하지 않는다.

type WorkWriteOptions = {
  method: 'POST' | 'PATCH' | 'DELETE';
  payload?: unknown;
};

const parseErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { message?: string };

    return body.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
};

export const requestWorkWrite = async <T>(
  url: string,
  { method, payload }: WorkWriteOptions,
): Promise<T> => {
  const response = await fetch(url, {
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers:
      payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    method,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};
