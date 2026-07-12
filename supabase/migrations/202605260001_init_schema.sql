-- =============================================================================
-- VisionFlow 초기 스키마 (코드/타입/docs 기반 재구성)
-- 파일명 정렬상 202605260002_increment_qna_view_count.sql 보다 먼저 실행되어야
-- 함수가 참조하는 public.qna 테이블이 존재하게 된다.
--
-- 재구성 출처:
--   - packages/shared/src/types/*         (컬럼/타입/nullable/enum)
--   - apps/app/api/**                     (실제 snake_case 컬럼, insert/select payload)
--   - apps/src/hooks/works/*              (works 테이블, WorkRow 주석의 SQL 타입)
--   - docs/rls-policy-permission-workflow.md (RLS 패턴)
--
-- ⚠ 주의: 이 스키마는 "권위 있는 덤프"가 아니라 코드 사용에서 역산한 best-effort다.
--   nullable/기본값/FK/enum 제약은 추정이 포함되어 있으니 운영 전 검토할 것.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles  (Supabase auth.users 확장 프로필. 서버 API(service_role)에서만 접근)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  name                text,
  status              text        not null default 'active',   -- active | inactive | pending_invite
  avatar_color        text,
  last_login_at       timestamptz,
  last_login_ip       text,
  last_login_location text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. user_roles  (사용자 역할. role 값은 소문자: superadmin | admin | viewer)
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text        not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. auth_audit_logs  (로그인 감사 로그. service_role 에서만 기록)
-- ---------------------------------------------------------------------------
create table if not exists public.auth_audit_logs (
  id         uuid primary key default gen_random_uuid(),
  event_type text        not null default 'login',
  provider   text,
  email      text,
  user_id    uuid,
  ip         text,
  location   text,
  user_agent text,
  status     text        not null,                             -- success | failure
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists auth_audit_logs_created_at_idx on public.auth_audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. qna  (Q&A 게시글. public/admin 모두 /api 경유(service_role) 접근)
--    increment_qna_view_count(text) 함수가 id::text 로 참조하므로 uuid 사용 가능.
-- ---------------------------------------------------------------------------
create table if not exists public.qna (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  question      text,
  content       text,
  answer        text,
  author_name   text,
  category      text,
  is_notice     boolean     not null default false,
  is_secret     boolean     not null default false,
  password      text,
  password_hash text,
  status        text        not null default 'pending',
  view_count    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists qna_created_at_idx on public.qna (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. faq  (id 가 number 타입 -> bigint identity. anon REST 직접 읽기 대상)
-- ---------------------------------------------------------------------------
create table if not exists public.faq (
  id         bigint generated always as identity primary key,
  category   text        default 'default',
  question   text        not null,
  answer     text        not null,
  is_visible boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. notices  (공지. anon REST 직접 읽기 + admin 쓰기는 /api(service_role))
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  description  text,
  content_html text,
  content_json jsonb,
  category     text,
  date         date        not null default current_date,
  is_important boolean     not null default false,
  is_published boolean     not null default true,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists notices_date_idx on public.notices (date desc);

-- ---------------------------------------------------------------------------
-- 7. works  (포트폴리오. anon REST 로 읽기/쓰기 모두 수행 — 아래 SECURITY NOTE 참고)
--    roles 는 콤마 조인된 단일 TEXT 컬럼(useCreateWorkMutation 에서 join(', ')).
-- ---------------------------------------------------------------------------
create table if not exists public.works (
  id           uuid primary key default gen_random_uuid(),
  category     text        not null,
  industry     text        not null,
  roles        text        not null default '',
  title        text        not null,
  size         text        not null,                           -- 'tall' | 'short' | ...
  image        text,
  is_important boolean     not null default false,
  link_url     text,
  link_label   text,
  created_at   timestamptz not null default now()
);
create index if not exists works_created_at_idx on public.works (created_at desc);

-- ---------------------------------------------------------------------------
-- 8. quote_inquiries  (견적 문의. id number -> bigint identity. 제출/조회 모두 /api)
-- ---------------------------------------------------------------------------
create table if not exists public.quote_inquiries (
  id                        bigint generated always as identity primary key,
  service_categories        text[]      not null default '{}',
  project_scale             text,
  preferred_start_date      text,
  project_description       text,
  reference_urls            text[]      not null default '{}',
  attached_files            text[]      not null default '{}',
  company_name              text,
  contact_name              text,
  position                  text,
  email                     text,
  phone                     text,
  preferred_contact_methods text[]      not null default '{}',
  privacy_agreed            boolean     not null default false,
  privacy_agreed_at         timestamptz,
  marketing_agreed          boolean     not null default false,
  marketing_agreed_at       timestamptz,
  status                    text        not null default 'pending',
  admin_memo                text,
  assigned_admin_id         uuid,
  contacted_at              timestamptz,
  completed_at              timestamptz,
  ip_address                text,
  user_agent                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists quote_inquiries_created_at_idx on public.quote_inquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- 9. partnership_inquiries  (제휴 문의. 제출/조회 모두 /api)
-- ---------------------------------------------------------------------------
create table if not exists public.partnership_inquiries (
  id               uuid primary key default gen_random_uuid(),
  company_name     text        not null,
  company_size     text,                                       -- 1 | 2-10 | 11-50 | 50+
  contact_name     text        not null,
  contact_position text,
  contact_email    text        not null,
  contact_phone    text,
  partnership_type text,                                       -- outsourcing | reseller | tech_partner | content_partner | etc
  proposal_content text,
  company_url      text,
  attachment_url   text,
  attachment_name  text,
  attachment_type  text,
  attachment_size  integer,
  status           text        not null default 'pending',
  admin_memo       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists partnership_inquiries_created_at_idx on public.partnership_inquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- 10. quick_inquiries  (빠른 문의. 제출/조회 모두 /api)
-- ---------------------------------------------------------------------------
create table if not exists public.quick_inquiries (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null,
  subject       text,
  content       text        not null,
  status        text        not null default 'pending',        -- pending | processing | completed
  replied_at    timestamptz,
  replied_by    uuid,
  reply_content text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists quick_inquiries_created_at_idx on public.quick_inquiries (created_at desc);

-- =============================================================================
-- RLS (Row Level Security)
--
-- 설계 근거:
--   - 앱 서버 API(/api/**, /api/admin/**) 는 SUPABASE_SERVICE_ROLE_KEY 로 접근하며
--     service_role 은 RLS 를 우회한다. 따라서 문의/qna/프로필/역할/감사로그는
--     RLS 를 켜되 anon 정책을 두지 않아 브라우저 anon 키로는 접근 불가(안전).
--   - anon 키로 Supabase REST 를 직접 치는 곳은 packages/shared apiClient 를 쓰는
--     faq(읽기), notices(읽기), works(읽기+쓰기) 뿐이다. 이들만 anon 정책을 연다.
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.auth_audit_logs       enable row level security;
alter table public.qna                   enable row level security;
alter table public.faq                   enable row level security;
alter table public.notices               enable row level security;
alter table public.works                 enable row level security;
alter table public.quote_inquiries       enable row level security;
alter table public.partnership_inquiries enable row level security;
alter table public.quick_inquiries       enable row level security;

-- profiles / user_roles: (미래 Supabase-Auth 세션 대비) 본인 행만 읽기 허용. 무해.
create policy "profiles_select_own"   on public.profiles   for select to authenticated using (id = auth.uid());
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- faq: anon 이 apiClient 로 직접 읽음(공개 목록 + 관리자 목록 모두 anon 키 사용).
create policy "faq_anon_select" on public.faq for select to anon, authenticated using (true);

-- notices: anon 이 apiClient 로 직접 읽음(공개 + 관리자 목록 모두 anon 키 사용).
create policy "notices_anon_select" on public.notices for select to anon, authenticated using (true);

-- works: anon 은 읽기만. 생성/수정/삭제는 /api/admin/works (service_role, RLS 우회)로
--   이관됨 → anon write 정책 없음. (기존엔 anon 이 works 를 직접 쓰던 취약 구조였음)
create policy "works_anon_select" on public.works for select to anon, authenticated using (true);

-- 명시적 grant (Supabase 기본 default privileges 를 보강). works 는 읽기만 부여.
grant select on public.faq     to anon, authenticated;
grant select on public.notices to anon, authenticated;
grant select on public.works   to anon, authenticated;
