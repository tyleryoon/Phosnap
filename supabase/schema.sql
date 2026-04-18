-- ============================================================
--  Phosnap · Supabase Schema
--  Supabase 대시보드 → SQL Editor → 아래 전체 복사·실행
-- ============================================================

-- ── 0. 확장 기능 활성화 ──────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles  (회원가입 시 자동 생성)
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  role          text not null default 'customer'   -- 'customer' | 'photographer' | 'stylist'
                  check (role in ('customer','photographer','stylist','admin')),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 회원가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. photographers  (작가 공개 프로필 · 기존 mock 데이터 대체 예정)
-- ============================================================
create table if not exists public.photographers (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  name          text not null,
  name_ko       text,
  bio           text,
  bio_i18n      jsonb default '{}',       -- {ko, en, ja, zh}
  location_id   text,
  location_names jsonb default '{}',      -- {ko, en, ja, zh}
  tags          text[] default '{}',
  languages     text[] default '{}',
  rating        numeric(3,2) default 5.0,
  reviews_count int default 0,
  price_from    int default 0,            -- 최저 패키지 가격
  img           text,
  portfolio     jsonb default '[]',       -- [{url, caption}]
  hmk_available boolean default false,
  hmk_note      text,
  props         jsonb default '[]',       -- [{name, note}]
  dresses       jsonb default '[]',       -- [{name, sizes[], note}]
  packages      jsonb default '[]',       -- [{name, price, hours, photos, desc, descI18n}]
  is_active     boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 3. artist_locations  (활동 지역 — 기간 설정 가능)
-- ============================================================
create table if not exists public.artist_locations (
  id              uuid primary key default uuid_generate_v4(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  location_id     text not null,          -- 'kyoto', 'busan', 'seoul' 등
  name_ko         text,
  name_en         text,
  is_active       boolean default true,
  period_start    date,                   -- null = 상시
  period_end      date,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 4. artist_schedules  (날짜별 시간 슬롯)
-- ============================================================
create table if not exists public.artist_schedules (
  id              uuid primary key default uuid_generate_v4(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  date            date not null,
  day_off         boolean default false,
  slots           text[] default '{}',    -- 이 날 운영 슬롯 (비어있으면 default_slots 사용)
  blocked         text[] default '{}',    -- 차단된 슬롯
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (photographer_id, date)
);

-- 작가별 기본 운영 시간
create table if not exists public.artist_defaults (
  photographer_id uuid primary key references public.photographers(id) on delete cascade,
  default_slots   text[] default array['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'],
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 5. bookings  (예약)
-- ============================================================
create table if not exists public.bookings (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid not null references public.profiles(id),
  photographer_id  uuid not null references public.photographers(id),
  date             date not null,
  time             text not null,          -- 'HH:MM'
  package_name     text not null,
  package_price    int not null,
  stylist_id       uuid,                   -- 선택
  stylist_price    int default 0,
  total_price      int not null,
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','completed','cancelled','refunded')),
  -- TossPayments
  toss_order_id    text unique,
  toss_payment_key text,
  paid_at          timestamptz,
  -- 환불
  refund_reason    text,
  refunded_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- 6. waitlist
-- ============================================================
create table if not exists public.waitlist (
  id         uuid primary key default uuid_generate_v4(),
  name       text,
  email      text not null unique,
  role       text default 'customer',
  lang       text default 'ko',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. Row Level Security (RLS)
-- ============================================================

-- profiles: 본인만 조회·수정
alter table public.profiles enable row level security;
create policy "본인 프로필 조회" on public.profiles for select using (auth.uid() = id);
create policy "본인 프로필 수정" on public.profiles for update using (auth.uid() = id);

-- photographers: 공개 조회 가능, 본인만 수정
alter table public.photographers enable row level security;
create policy "작가 공개 조회" on public.photographers for select using (is_active = true);
create policy "작가 본인 수정" on public.photographers for update using (auth.uid() = user_id);
create policy "작가 본인 삽입" on public.photographers for insert with check (auth.uid() = user_id);

-- artist_schedules: 공개 조회, 본인만 수정
alter table public.artist_schedules enable row level security;
create policy "스케줄 공개 조회" on public.artist_schedules for select using (true);
create policy "스케줄 본인 수정" on public.artist_schedules for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- artist_defaults
alter table public.artist_defaults enable row level security;
create policy "기본시간 공개 조회" on public.artist_defaults for select using (true);
create policy "기본시간 본인 수정" on public.artist_defaults for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- artist_locations
alter table public.artist_locations enable row level security;
create policy "지역 공개 조회" on public.artist_locations for select using (is_active = true);
create policy "지역 본인 수정" on public.artist_locations for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- bookings: 본인 예약만 조회·수정
alter table public.bookings enable row level security;
create policy "내 예약 조회" on public.bookings for select
  using (auth.uid() = customer_id or photographer_id in (select id from public.photographers where user_id = auth.uid()));
create policy "예약 생성" on public.bookings for insert with check (auth.uid() = customer_id);

-- waitlist: 삽입만 공개
alter table public.waitlist enable row level security;
create policy "waitlist 등록" on public.waitlist for insert with check (true);

-- ============================================================
-- 8. 인덱스
-- ============================================================
create index if not exists idx_artist_schedules_date      on public.artist_schedules(photographer_id, date);
create index if not exists idx_bookings_customer          on public.bookings(customer_id);
create index if not exists idx_bookings_photographer      on public.bookings(photographer_id);
create index if not exists idx_artist_locations_active    on public.artist_locations(photographer_id, is_active);

-- ============================================================
-- 완료!  총 6개 테이블 + RLS + 트리거
-- ============================================================
