-- ============================================================
-- FIX 6: MASTER_MIGRATION 에서 누락된 테이블 3개 생성
--   user_roles      : 멀티롤(한 이메일 = 여러 역할) + 관리자 승인 상태
--   notifications   : 알림 벨 아이콘 / 예약 알림
--   vendor_reviews  : 의상·장소·헤메 벤더 리뷰 통합
-- 코드는 이 테이블들을 참조하지만 DB 에 없어 조용히 폴백되고 있었다.
-- ============================================================

-- ── user_roles ─────────────────────────────────────────────────
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null,
  status     text default 'active' check (status in ('active','pending','suspended')),
  created_at timestamptz default now(),
  unique (user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_self_read"   on public.user_roles;
create policy "user_roles_self_read"   on public.user_roles for select using (auth.uid() = user_id);
drop policy if exists "user_roles_self_insert" on public.user_roles;
create policy "user_roles_self_insert" on public.user_roles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "user_roles_self_update" on public.user_roles;
create policy "user_roles_self_update" on public.user_roles for update to authenticated using (auth.uid() = user_id);
drop policy if exists "user_roles_admin_read"  on public.user_roles;
-- profiles 를 직접 조회하면 재귀 위험이 있으므로 is_admin() 사용
create policy "user_roles_admin_read"  on public.user_roles for select using (public.is_admin());

-- ── notifications ──────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text,
  body       text,
  data       jsonb default '{}',
  read_at    timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user   on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where read_at is null;
alter table public.notifications enable row level security;

drop policy if exists "notifications_self_read"   on public.notifications;
create policy "notifications_self_read"   on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update" on public.notifications for update to authenticated using (auth.uid() = user_id);
drop policy if exists "notifications_insert"      on public.notifications;
create policy "notifications_insert"      on public.notifications for insert to authenticated with check (true);

-- ── vendor_reviews ─────────────────────────────────────────────
create table if not exists public.vendor_reviews (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null,
  vendor_type text not null check (vendor_type in ('dress','venue','stylist')),
  booking_id  uuid references public.bookings(id) on delete set null,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating      int  not null check (rating >= 1 and rating <= 5),
  text        text default '',
  author_name text,
  lang        text default 'ko',
  is_visible  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_vendor_reviews_vendor   on public.vendor_reviews(vendor_id, vendor_type);
create index if not exists idx_vendor_reviews_customer on public.vendor_reviews(customer_id);
alter table public.vendor_reviews enable row level security;

drop policy if exists "vendor_reviews_public_read" on public.vendor_reviews;
create policy "vendor_reviews_public_read" on public.vendor_reviews for select using (is_visible = true);
drop policy if exists "vendor_reviews_insert"      on public.vendor_reviews;
create policy "vendor_reviews_insert"      on public.vendor_reviews for insert to authenticated with check (auth.uid() = customer_id);
drop policy if exists "vendor_reviews_self_update" on public.vendor_reviews;
create policy "vendor_reviews_self_update" on public.vendor_reviews for update to authenticated using (auth.uid() = customer_id);

-- ── 권한 부여 (새로 만든 테이블에도 적용) ──────────────────────
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================
-- FIX 7: 기존 계정 정리
--   헤메 계정을 stylist 역할로 전환
--   현재 profiles.role 을 user_roles 에 백필
-- ============================================================
update public.profiles set role = 'stylist' where email = 'hnm@gmail.com';

insert into public.user_roles (user_id, role, status)
select id, role, 'active' from public.profiles
where role is not null
on conflict (user_id, role) do nothing;

-- ============================================================
-- 검증
-- ============================================================
select p.email, p.role, p.artist_type, p.approval_status,
       (select string_agg(ur.role, ',') from public.user_roles ur where ur.user_id = p.id) as roles
from public.profiles p
order by p.created_at;
