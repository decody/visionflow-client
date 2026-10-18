import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role, Actor } from '@/entities/delivery/types';

const roles = new Set<Role>(['viewer', 'dispatcher', 'supervisor', 'system']);

/**
 * 로컬 ws 서버용 인증 경계.
 *
 * `WS_AUTH_TOKENS` 형식:
 *   demo-viewer=OP-VIEWER:viewer,demo-dispatcher=OP-DISPATCHER:dispatcher
 *
 * 토큰 목록이 설정되면 연결 URL의 `token`이 일치해야 하며 actor는 서버가 결정한다.
 * 토큰 목록이 비어 있으면 기존 포트폴리오 데모 호환을 위해 supervisor를 사용한다.
 */
export function actorFromRequest(requestUrl: string | undefined, tokens = process.env.WS_AUTH_TOKENS): Actor | null {
  const configured = parseTokenMap(tokens);
  if (!requestUrl) return null;
  const token = new URL(requestUrl, 'ws://localhost').searchParams.get('token');
  if (tokens?.trim()) return configured.size > 0 && token ? configured.get(token) ?? null : null;
  const secret = process.env.WS_JWT_SECRET?.trim();
  if (secret) return token ? actorFromJwt(token, secret) : null;
  return { id: 'OP-DEMO', role: 'supervisor' };
}

export function parseTokenMap(value: string | undefined): Map<string, Actor> {
  const result = new Map<string, Actor>();
  for (const item of value?.split(',') ?? []) {
    const [token, identity] = item.split('=');
    const [id, role] = identity?.split(':') ?? [];
    if (token && id && roles.has(role as Role)) result.set(token, { id, role: role as Role });
  }
  return result;
}

/** HS256 JWT의 최소 검증기. 실제 배포에서는 IdP/JWKS 검증기로 교체한다. */
function actorFromJwt(token: string, secret: string): Actor | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  try {
    const header = JSON.parse(Buffer.from(encodedHeader!, 'base64url').toString('utf8')) as { alg?: string; typ?: string };
    const payload = JSON.parse(Buffer.from(encodedPayload!, 'base64url').toString('utf8')) as { sub?: unknown; role?: unknown; exp?: unknown };
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || typeof payload.sub !== 'string' || !roles.has(payload.role as Role)) return null;
    if (payload.exp !== undefined && (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000))) return null;
    const expected = createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest();
    const received = Buffer.from(encodedSignature!, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return { id: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}
