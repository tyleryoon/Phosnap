-- ============================================================
--  Phosnap · Migration: Packages & Schedules v1
--  패키지/상품 및 스케줄을 독립 테이블로 관리
--  기존 photographers.packages jsonb → packages 테이블로 정규화
-- ============================================================

-- ── 1. packages 테이블 (스냅 상품, 포토투어, 의상, 소품) ──────────
create table if not exists public.packages (
  id              uuid primary key default uuid_generate_v4(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  type            text not null check (type in ('snap','tour','costume','prop')),
  name            text not null,
  name_i18n       jsonb default '{}',           -- {ko, en, ja, zh}
  description     text,
  desc_i18n       jsonb default '{}',           -- {ko, en, ja, zh}
  price           int not null default 0,
  -- snap 전용
  duration_hours  numeric(3,1),                 -- 1.0, 1.5, 2.0 ...
  edit_count      int,                          -- 보정 컷 수
  -- tour 전용
  duration_min    int,                          -- 소요 시간 (분)
  max_guests      int,
  min_guests      int,
  pricing_mode    text check (pricing_mode in ('per_person','total')),
  spots           jsonb default '[]',           -- [{name, lat, lng}]
  -- costume 전용
  gender          text check (gender in ('male','female','unisex')),
  category        text,
  sizes           text[] default '{}',
  -- 공통
  images          text[] default '{}',          -- Storage URLs
  regions         text[] default '{}',          -- 지역별 제공 여부
  sort_order      int default 0,
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.packages enable row level security;
create policy "packages_public_read" on public.packages
  for select using (is_active = true);
create policy "packages_owner_all" on public.packages
  for all using (photographer_id in (
    select id from public.photographers where user_id = auth.uid()
  ));

-- Index
create index if not exists idx_packages_photographer on public.packages(photographer_id, type);

-- ── 2. bookings 테이블에 누락 컬럼 추가 ─────────────────────────
-- 드레스/스타일리스트 상세 정보 + 48시간 만료 지원
do $$
begin
  -- 드레스
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='dress_name') then
    alter table public.bookings add column dress_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='dress_size') then
    alter table public.bookings add column dress_size text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='dress_price') then
    alter table public.bookings add column dress_price int default 0;
  end if;
  -- 스타일리스트
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='stylist_name') then
    alter table public.bookings add column stylist_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='stylist_service') then
    alter table public.bookings add column stylist_service text;
  end if;
  -- 만료 관련
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='expires_at') then
    alter table public.bookings add column expires_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='approved_at') then
    alter table public.bookings add column approved_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='rejected_reason') then
    alter table public.bookings add column rejected_reason text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='cancelled_at') then
    alter table public.bookings add column cancelled_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='lang') then
    alter table public.bookings add column lang text default 'ko';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='note') then
    alter table public.bookings add column note text;
  end if;
  -- photographer_name (fallback)
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='photographer_name') then
    alter table public.bookings add column photographer_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='bookings' and column_name='photographer_legacy_id') then
    alter table public.bookings add column photographer_legacy_id text;
  end if;
end $$;

-- ── 3. 예약 생성 시 expires_at 자동 설정 트리거 ──────────────────
-- pending 상태로 삽입 시 48시간 후 만료
create or replace function public.set_booking_expiry()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'pending' and new.expires_at is null then
    new.expires_at := now() + interval '48 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_booking_expiry on public.bookings;
create trigger trg_set_booking_expiry
  before insert on public.bookings
  for each row execute procedure public.set_booking_expiry();

-- ── 4. 48시간 자동 만료 함수 (pg_cron 또는 Edge Function에서 호출) ─
create or replace function public.expire_stale_bookings()
returns int language plpgsql security definer as $$
declare
  expired_count int;
begin
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      rejected_reason = 'auto_expired_48h',
      updated_at = now()
  where status = 'pending'
    and expires_at < now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- pg_cron 설정 (Supabase Pro 플랜에서 사용 가능):
-- select cron.schedule('expire-stale-bookings', '*/30 * * * *', $$select public.expire_stale_bookings()$$);

-- ── 5. 예약 충돌 체크 함수 ───────────────────────────────────────
-- 특정 작가+날짜+시간에 이미 확정된 예약이 있는지 체크
create or replace function public.check_booking_conflict(
  p_photographer_id uuid,
  p_date date,
  p_time text
)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from public.bookings
    where photographer_id = p_photographer_id
      and date = p_date
      and time = p_time
      and status in ('pending', 'confirmed')
  );
end;
$$;

-- Index for conflict check
create index if not exists idx_bookings_conflict
  on public.bookings(photographer_id, date, time, status);
