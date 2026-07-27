/**
 * 기존 Supabase 사용자의 비밀번호 해시를 Spring users 로 1회 이관하는 스크립트(idempotent).
 *
 * ─ 배경 ────────────────────────────────────────────────────────────────
 * 로그인이 Supabase Auth(GoTrue) 에서 Spring 으로 이관됐다. Spring 은 users.password_hash(bcrypt)로
 * 비번을 검증하는데, "이미 존재하던" 사용자의 해시는 Supabase auth.users.encrypted_password 에 있다.
 * bcrypt($2a/$2b)라 Spring BCryptPasswordEncoder 로 그대로 검증되므로, 해시만 옮기면 무중단 로그인이 된다.
 *
 * ★ GoTrue 의 admin API 는 비밀번호 해시를 노출하지 않으므로, Supabase Postgres 에 "직접 접속"해서
 *   auth.users 를 읽어야 한다(service 역할 연결 문자열 필요). 읽기 전용 SELECT 만 수행한다.
 *
 * 읽기(Supabase Postgres) → Spring upsert(POST /api/admin/users, passwordHash 포함).
 * upsert 는 id 기준 + password_hash 는 값이 있을 때만 갱신(coalesce)이라 여러 번 돌려도 안전하다.
 *
 * ─ 실행 전제 ────────────────────────────────────────────────────────────
 * Spring 백엔드가 배포돼 있고(users 도메인 + V9), Supabase Postgres 연결 문자열이 있어야 한다.
 * 먼저 seed-users-to-spring.mjs 로 사용자 레코드를 만든 뒤(또는 이 스크립트가 함께 생성),
 * 아래 환경변수를 설정하고 apps/ 에서 실행한다:
 *
 *   SUPABASE_DB_URL   Supabase Postgres 연결 문자열
 *                     예) postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
 *   API_BASE_URL      Spring 백엔드 base URL (기본 http://localhost:8080)
 *   BACKEND_JWT_SECRET Spring 과 공유하는 HS256 시크릿(≥32바이트)
 *   BACKEND_JWT_ISSUER (선택) 기본 visionflow-bff
 *   SEED_ACTOR_ID     (선택) 토큰 sub 로 쓸 실행자 id. 기본 임의 UUID.
 *
 *   의존성:  pnpm add -D pg --filter @visionflow/web   (pg 미설치 시)
 *   실행:    node apps/scripts/seed-password-hashes.mjs [--dry-run]
 *            (--dry-run: Supabase 만 읽어 대상 수/이메일을 출력하고 Spring 에 쓰지 않는다. 해시는 미출력)
 */

import { createHmac, randomUUID } from 'node:crypto';

const DEFAULT_ISSUER = 'visionflow-bff';
const TOKEN_TTL_SECONDS = 300;

const normalizeUserRole = (role) => {
  if (typeof role !== 'string') return 'Viewer';
  const normalized = role.trim().toLowerCase().replace(/[\s_-]/g, '');
  if (normalized === 'superadmin') return 'SuperAdmin';
  if (normalized === 'admin') return 'admin';
  return 'Viewer';
};

const base64url = (input) => Buffer.from(input, 'utf8').toString('base64url');

const signSuperAdminToken = (secret, issuer, actorId) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      exp: now + TOKEN_TTL_SECONDS,
      iat: now,
      iss: issuer,
      role: 'SuperAdmin',
      sub: actorId,
    }),
  );
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`환경변수 ${name} 이(가) 필요합니다.`);
    process.exit(1);
  }
  return value;
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const dbUrl = requireEnv('SUPABASE_DB_URL');
  const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
  const secret = dryRun ? 'dry-run' : requireEnv('BACKEND_JWT_SECRET');
  const issuer = process.env.BACKEND_JWT_ISSUER ?? DEFAULT_ISSUER;
  const actorId = process.env.SEED_ACTOR_ID ?? randomUUID();

  // pg 는 배포 런타임 의존성이 아니라 이 1회 스크립트에서만 쓴다(devDependency, 동적 import).
  let Client;
  try {
    ({ default: { Client } } = await import('pg'));
  } catch {
    console.error('pg 모듈이 없습니다. 실행 전: pnpm add -D pg --filter @visionflow/web');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  // auth.users(해시) + profiles(이름) + user_roles(역할) 조인. 해시 없는 계정(초대 미완료 등)은 제외.
  const { rows } = await client.query(`
    select u.id::text            as id,
           u.email               as email,
           u.encrypted_password  as password_hash,
           p.name                as name,
           r.role                as role
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.user_roles r on r.user_id = u.id
    where u.encrypted_password is not null and u.encrypted_password <> ''
  `);
  await client.end();

  console.log(`이관 대상 ${rows.length}명 (해시 보유 계정).`);

  if (dryRun) {
    for (const row of rows) {
      console.log(`  - ${row.email} (role=${normalizeUserRole(row.role)})`);
    }
    console.log('[dry-run] Spring 에 쓰지 않았습니다.');
    return;
  }

  let ok = 0;
  const failures = [];
  for (const row of rows) {
    const token = signSuperAdminToken(secret, issuer, actorId);
    const body = {
      email: row.email,
      id: row.id,
      name: row.name ?? row.email,
      passwordHash: row.password_hash,
      role: normalizeUserRole(row.role),
      status: 'active',
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (response.ok) {
        ok += 1;
      } else {
        failures.push({ email: row.email, status: response.status });
      }
    } catch (error) {
      failures.push({ email: row.email, error: String(error) });
    }
  }

  console.log(`완료: 성공 ${ok} / 실패 ${failures.length}`);
  if (failures.length > 0) {
    console.error('실패 목록:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
