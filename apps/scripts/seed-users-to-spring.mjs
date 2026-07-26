/**
 * 기존 Supabase 사용자를 Spring users 테이블로 1회 시드하는 스크립트(idempotent).
 *
 * ─ 배경 ────────────────────────────────────────────────────────────────
 * 사용자 관리 목록이 Supabase(auth.users + profiles + user_roles) 조합에서 Spring users 로 이관됐다.
 * 앞으로 초대되는 사용자는 초대 라우트가 Spring 에 이중 쓰기하지만, "이미 존재하던" 사용자는
 * Spring users 테이블에 없어 목록이 비어 보인다. 이 스크립트가 그 갭을 메운다.
 *
 * 읽기(Supabase) → 병합(기존 /api/admin/users 목록 라우트와 동일 로직) → Spring upsert(POST /api/admin/users).
 * upsert 는 id 기준이라 여러 번 돌려도 안전하다.
 *
 * ─ 실행 전제 ────────────────────────────────────────────────────────────
 * Spring 백엔드가 배포돼 있고(프로덕션/스테이징), 프로덕션 Supabase 자격증명이 있어야 한다.
 * 아래 환경변수를 설정하고 apps/ 에서 실행한다(의존성 @supabase/supabase-js 해석을 위해):
 *
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY  service_role 키(auth.admin 접근 필요)
 *   API_BASE_URL               Spring 백엔드 base URL (기본 http://localhost:8080)
 *   BACKEND_JWT_SECRET         Spring 과 공유하는 HS256 시크릿(≥32바이트)
 *   BACKEND_JWT_ISSUER         (선택) 기본 visionflow-bff
 *   SEED_ACTOR_ID              (선택) 토큰 sub 로 쓸 실행자 id. 기본 임의 UUID.
 *
 *   실행:  node apps/scripts/seed-users-to-spring.mjs [--dry-run]
 *          (--dry-run: Supabase 만 읽어 전송할 내용을 출력하고 쓰지 않는다)
 */

import { createHmac, randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_ISSUER = 'visionflow-bff';
const TOKEN_TTL_SECONDS = 300;

// ── 역할 어휘 정규화 (프론트 normalizeUserRole 과 동일 규칙) ─────────────
const normalizeUserRole = (role) => {
  if (typeof role !== 'string') return 'Viewer';
  const normalized = role.trim().toLowerCase().replace(/[\s_-]/g, '');
  if (normalized === 'superadmin') return 'SuperAdmin';
  if (normalized === 'admin') return 'admin';
  return 'Viewer'; // viewer/user/그 외
};

// ── BFF 서명 JWT (HS256) — Spring 리소스 서버가 검증 ─────────────────────
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

// ── Supabase 에서 전체 사용자 읽고 병합 (기존 목록 라우트와 동일) ────────
const readSupabaseUsers = async (supabase) => {
  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`auth.listUsers 실패: ${error.message}`);
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*');
  if (pErr) throw new Error(`profiles 조회 실패: ${pErr.message}`);

  const { data: roles, error: rErr } = await supabase
    .from('user_roles')
    .select('user_id,role');
  if (rErr) throw new Error(`user_roles 조회 실패: ${rErr.message}`);

  const profileById = new Map((profiles ?? []).map((p) => [String(p.id), p]));
  const roleByUserId = new Map(
    (roles ?? []).map((r) => [String(r.user_id), r.role]),
  );

  return authUsers.map((user) => {
    const profile = profileById.get(user.id);
    return {
      email: user.email ?? '',
      id: user.id,
      name:
        profile?.name ??
        user.user_metadata?.name ??
        user.email ??
        'Unknown user',
      role: normalizeUserRole(roleByUserId.get(user.id)),
      status: profile?.status ?? 'active',
    };
  });
};

// ── Spring upsert (POST /api/admin/users) ──────────────────────────────
const upsertUser = async (baseUrl, secret, issuer, actorId, user) => {
  const token = signSuperAdminToken(secret, issuer, actorId);
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/admin/users`, {
    body: JSON.stringify(user),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${text}`);
  }
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 필요합니다.`);
    process.exit(1);
  }
  return value;
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:8080';
  const issuer = process.env.BACKEND_JWT_ISSUER ?? DEFAULT_ISSUER;
  const actorId = process.env.SEED_ACTOR_ID ?? randomUUID();
  const secret = dryRun ? '' : requireEnv('BACKEND_JWT_SECRET');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`▶ Supabase 사용자 읽는 중… (${supabaseUrl})`);
  const users = await readSupabaseUsers(supabase);
  console.log(`  ${users.length}명 발견.`);

  if (dryRun) {
    console.log('▶ --dry-run: 전송할 내용(쓰지 않음):');
    for (const u of users) {
      console.log(`  ${u.role.padEnd(10)} ${u.status.padEnd(14)} ${u.email}  (${u.id})`);
    }
    return;
  }

  console.log(`▶ Spring 으로 upsert 중… (${baseUrl})`);
  let ok = 0;
  const failed = [];
  for (const u of users) {
    try {
      await upsertUser(baseUrl, secret, issuer, actorId, u);
      ok += 1;
    } catch (error) {
      failed.push({ email: u.email, id: u.id, reason: String(error) });
    }
  }

  console.log(`\n✔ 완료: 성공 ${ok} / 실패 ${failed.length} (전체 ${users.length})`);
  if (failed.length > 0) {
    console.log('실패 목록:');
    for (const f of failed) console.log(`  ✗ ${f.email} (${f.id}): ${f.reason}`);
    process.exit(1);
  }
};

// 직접 실행 시에만 main() 을 돈다(테스트에서 함수만 import 가능).
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  main().catch((error) => {
    console.error('✗ 시드 실패:', error);
    process.exit(1);
  });
}

export { normalizeUserRole, readSupabaseUsers, signSuperAdminToken, upsertUser };
