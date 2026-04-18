-- ============================================================
-- PHOSNAP MASTER MIGRATION SCRIPT
--
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- This creates all tables, functions, triggers, RLS policies
--
-- Date: 2026-04-18
-- Version: 1.0
-- ============================================================

-- Safety: wrap in transaction
BEGIN;

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Base Schema
-- ═══════════════════════════════════════════════════════════

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
  photographer_id  uuid references public.photographers(id),
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
drop policy if exists "본인 프로필 조회" on public.profiles;
create policy "본인 프로필 조회" on public.profiles for select using (auth.uid() = id);
drop policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정" on public.profiles for update using (auth.uid() = id);

-- photographers: 공개 조회 가능, 본인만 수정
alter table public.photographers enable row level security;
drop policy if exists "작가 공개 조회" on public.photographers;
create policy "작가 공개 조회" on public.photographers for select using (is_active = true);
drop policy if exists "작가 본인 수정" on public.photographers;
create policy "작가 본인 수정" on public.photographers for update using (auth.uid() = user_id);
drop policy if exists "작가 본인 삽입" on public.photographers;
create policy "작가 본인 삽입" on public.photographers for insert with check (auth.uid() = user_id);

-- artist_schedules: 공개 조회, 본인만 수정
alter table public.artist_schedules enable row level security;
drop policy if exists "스케줄 공개 조회" on public.artist_schedules;
create policy "스케줄 공개 조회" on public.artist_schedules for select using (true);
drop policy if exists "스케줄 본인 수정" on public.artist_schedules;
create policy "스케줄 본인 수정" on public.artist_schedules for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- artist_defaults
alter table public.artist_defaults enable row level security;
drop policy if exists "기본시간 공개 조회" on public.artist_defaults;
create policy "기본시간 공개 조회" on public.artist_defaults for select using (true);
drop policy if exists "기본시간 본인 수정" on public.artist_defaults;
create policy "기본시간 본인 수정" on public.artist_defaults for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- artist_locations
alter table public.artist_locations enable row level security;
drop policy if exists "지역 공개 조회" on public.artist_locations;
create policy "지역 공개 조회" on public.artist_locations for select using (is_active = true);
drop policy if exists "지역 본인 수정" on public.artist_locations;
create policy "지역 본인 수정" on public.artist_locations for all
  using (photographer_id in (select id from public.photographers where user_id = auth.uid()));

-- bookings: 본인 예약만 조회·수정
alter table public.bookings enable row level security;
drop policy if exists "내 예약 조회" on public.bookings;
create policy "내 예약 조회" on public.bookings for select
  using (auth.uid() = customer_id or photographer_id in (select id from public.photographers where user_id = auth.uid()));
drop policy if exists "예약 생성" on public.bookings;
create policy "예약 생성" on public.bookings for insert with check (auth.uid() = customer_id);

-- waitlist: 삽입만 공개
alter table public.waitlist enable row level security;
drop policy if exists "waitlist 등록" on public.waitlist;
create policy "waitlist 등록" on public.waitlist for insert with check (true);

-- ============================================================
-- 8. 인덱스
-- ============================================================
create index if not exists idx_artist_schedules_date      on public.artist_schedules(photographer_id, date);
create index if not exists idx_bookings_customer          on public.bookings(customer_id);
create index if not exists idx_bookings_photographer      on public.bookings(photographer_id);
create index if not exists idx_artist_locations_active    on public.artist_locations(photographer_id, is_active);

-- ✓ Step 1 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Profile Extensions (Artist Features)
-- ═══════════════════════════════════════════════════════════

-- 1. profiles 테이블에 작가 관련 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS artist_type        TEXT,        -- 'photographer' | 'videographer' | 'both' | 'hmk'
  ADD COLUMN IF NOT EXISTS has_hmk_partner    BOOLEAN DEFAULT FALSE,  -- 자체 H&M 섭외 동행 여부
  ADD COLUMN IF NOT EXISTS referral_code      TEXT UNIQUE, -- 이 작가의 초대코드 (자동 생성)
  ADD COLUMN IF NOT EXISTS referred_by_code   TEXT,        -- 가입 시 입력한 초대코드
  ADD COLUMN IF NOT EXISTS referral_count     INTEGER DEFAULT 0,  -- 내가 초대한 사람 수
  ADD COLUMN IF NOT EXISTS referral_completed INTEGER DEFAULT 0,  -- 초대한 사람들의 누적 완료 건수
  ADD COLUMN IF NOT EXISTS completed_bookings INTEGER DEFAULT 0,  -- 내 누적 완료 건수 (배지 기준)
  ADD COLUMN IF NOT EXISTS badge              TEXT DEFAULT 'rising'; -- 'rising'|'established'|'premier'|'elite'

-- 2. badge 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_artist_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_bookings >= 60 THEN
    NEW.badge := 'elite';
  ELSIF NEW.completed_bookings >= 30 THEN
    NEW.badge := 'premier';
  ELSIF NEW.completed_bookings >= 10 THEN
    NEW.badge := 'established';
  ELSE
    NEW.badge := 'rising';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 연결 (이미 있으면 교체)
DROP TRIGGER IF EXISTS trigger_update_artist_badge ON profiles;
CREATE TRIGGER trigger_update_artist_badge
  BEFORE UPDATE OF completed_bookings ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_artist_badge();

-- 4. 수수료 할인 계산 함수
CREATE OR REPLACE FUNCTION get_referral_discount(p_referral_completed INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF p_referral_completed >= 10 THEN
    RETURN 0.05;  -- 5% 할인
  ELSIF p_referral_completed >= 5 THEN
    RETURN 0.02;  -- 2% 할인
  ELSE
    RETURN 0.00;  -- 할인 없음
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ✓ Step 2 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 3: Location System Enhancement
-- ═══════════════════════════════════════════════════════════

-- photographers table: Add country_code and city columns
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN photographers.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN photographers.city IS 'City name (e.g., Seoul, Kyoto, New York)';

-- Optional: Create index for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_photographers_country_code ON photographers(country_code);
CREATE INDEX IF NOT EXISTS idx_photographers_country_city ON photographers(country_code, city);

-- ✓ Step 3 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 4: Packages and Schedules
-- ═══════════════════════════════════════════════════════════

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
drop policy if exists "packages_public_read" on public.packages;
create policy "packages_public_read" on public.packages
  for select using (is_active = true);
drop policy if exists "packages_owner_all" on public.packages;
create policy "packages_owner_all" on public.packages
  for all using (photographer_id in (
    select id from public.photographers where user_id = auth.uid()
  ));

-- Index
create index if not exists idx_packages_photographer on public.packages(photographer_id, type);

-- ── 2. bookings 테이블에 누락 컬럼 추가 ─────────────────────────
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

-- ── 5. 예약 충돌 체크 함수 ───────────────────────────────────────
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

-- ✓ Step 4 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 5: Stylists and Dress Items
-- ═══════════════════════════════════════════════════════════

-- ============================================================================
-- 1. STYLISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  specialty TEXT, -- e.g. 'makeup', 'hair', 'both'
  description TEXT,
  phone TEXT,
  instagram TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  location_id TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for stylists
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stylists are viewable by everyone" ON stylists
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own stylist profile" ON stylists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stylists can update their own profile" ON stylists
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stylists can delete their own profile" ON stylists
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for stylists
CREATE INDEX IF NOT EXISTS idx_stylists_user_id ON stylists(user_id);
CREATE INDEX IF NOT EXISTS idx_stylists_location_id ON stylists(location_id);
CREATE INDEX IF NOT EXISTS idx_stylists_is_active ON stylists(is_active);

-- Add country_code and city columns
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS city TEXT;
COMMENT ON COLUMN stylists.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN stylists.city IS 'City name (e.g., Seoul, Kyoto, New York)';
CREATE INDEX IF NOT EXISTS idx_stylists_country_code ON stylists(country_code);
CREATE INDEX IF NOT EXISTS idx_stylists_country_city ON stylists(country_code, city);

-- ============================================================================
-- 2. STYLIST_SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stylist_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  price INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 60,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for stylist_services
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone" ON stylist_services
  FOR SELECT USING (true);

CREATE POLICY "Stylists can insert their own services" ON stylist_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

CREATE POLICY "Stylists can update their own services" ON stylist_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

CREATE POLICY "Stylists can delete their own services" ON stylist_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

-- Indexes for stylist_services
CREATE INDEX IF NOT EXISTS idx_stylist_services_stylist_id ON stylist_services(stylist_id);

-- ============================================================================
-- 3. DRESS_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dress_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES dress_vendors(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  category TEXT NOT NULL DEFAULT 'hanbok', -- hanbok, western_dress, tuxedo, kimono, cheongsam
  price INT NOT NULL DEFAULT 0,
  sizes TEXT[] DEFAULT '{}',
  color TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for dress_items
ALTER TABLE dress_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dress items are viewable by everyone" ON dress_items
  FOR SELECT USING (true);

CREATE POLICY "Vendors can insert their own dress items" ON dress_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update their own dress items" ON dress_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete their own dress items" ON dress_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

-- Indexes for dress_items
CREATE INDEX IF NOT EXISTS idx_dress_items_vendor_id ON dress_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dress_items_category ON dress_items(category);
CREATE INDEX IF NOT EXISTS idx_dress_items_is_available ON dress_items(is_available);

-- ============================================================================
-- 4. ADD DELIVERY COLUMNS TO BOOKINGS TABLE
-- ============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_memo TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Update status check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'delivered', 'refunded'));

-- ✓ Step 5 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 6: Dress Vendors
-- ═══════════════════════════════════════════════════════════

-- ── 1. profiles.role 확장 ──────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','artist','photographer','stylist','dress_vendor','admin'));

-- ── 2. photographers 테이블 필드 추가 ──────────────────────────
alter table public.photographers
  add column if not exists artist_type text default 'photographer'
    check (artist_type in ('photographer','videographer','both','hmk'));

alter table public.photographers
  add column if not exists hmk_self boolean default false;

alter table public.photographers
  add column if not exists hmk_options jsonb default '[]';

alter table public.photographers
  add column if not exists dress_self boolean default false;

-- ── 3. dress_vendors (의상 대여 업체) ──────────────────────────
create table if not exists public.dress_vendors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',       -- {ko, en, ja, zh}
  bio             text,
  bio_i18n        jsonb default '{}',
  location_id     text,
  location_names  jsonb default '{}',
  categories      text[] default '{}',
  img             text,
  contact_info    jsonb default '{}',
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add country_code and city columns to dress_vendors
ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS city TEXT;
COMMENT ON COLUMN dress_vendors.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN dress_vendors.city IS 'City name (e.g., Seoul, Kyoto, New York)';
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_code ON dress_vendors(country_code);
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_city ON dress_vendors(country_code, city);

-- ── 4. photographers.dress_vendor_id FK 추가 ───────────────────
alter table public.photographers
  add column if not exists dress_vendor_id uuid references public.dress_vendors(id) on delete set null;

-- ── 5. bookings 확장 ───────────────────────────────────────────
alter table public.bookings
  add column if not exists hmk_type text
    check (hmk_type in ('artist_self','external_stylist'));

alter table public.bookings
  add column if not exists hmk_option_name text;

alter table public.bookings
  add column if not exists dress_item_id uuid references public.dress_items(id) on delete set null;

-- ── 6. RLS — dress_vendors ─────────────────────────────────────
alter table public.dress_vendors enable row level security;

drop policy if exists "의상업체 공개 조회" on public.dress_vendors;
create policy "의상업체 공개 조회"
  on public.dress_vendors for select using (is_active = true);

drop policy if exists "의상업체 본인 수정" on public.dress_vendors;
create policy "의상업체 본인 수정"
  on public.dress_vendors for update using (auth.uid() = user_id);

drop policy if exists "의상업체 본인 삽입" on public.dress_vendors;
create policy "의상업체 본인 삽입"
  on public.dress_vendors for insert with check (auth.uid() = user_id);

-- ── 7. RLS — dress_items ───────────────────────────────────────
-- (Already enabled in Step 5)

-- ── 8. 인덱스 ──────────────────────────────────────────────────
create index if not exists idx_dress_items_vendor
  on public.dress_items(vendor_id, is_available);

create index if not exists idx_dress_items_category
  on public.dress_items(category, is_available);

create index if not exists idx_dress_vendors_location
  on public.dress_vendors(location_id, is_active);

create index if not exists idx_photographers_dress_vendor
  on public.photographers(dress_vendor_id);

-- ✓ Step 6 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 7: Venue Vendors
-- ═══════════════════════════════════════════════════════════

-- ── 1. profiles.role 확장 ──────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','artist','photographer','stylist','dress_vendor','venue_vendor','admin'));

-- ── 2. venue_vendors (촬영장소 대여 업체) ──────────────────────
create table if not exists public.venue_vendors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',
  bio             text,
  bio_i18n        jsonb default '{}',
  location_id     text,
  location_names  jsonb default '{}',
  categories      text[] default '{}',
  img             text,
  contact_info    jsonb default '{}',
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3. venue_items (개별 촬영장소) ──────────────────────────────
create table if not exists public.venue_items (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid not null references public.venue_vendors(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',
  category        text not null
                    check (category in ('studio','traditional_space','outdoor','urban','event_hall','other')),
  capacity        int default 10,
  price           int default 0,
  price_unit      text default 'per_session'
                    check (price_unit in ('per_hour','per_session','per_day')),
  images          jsonb default '[]',
  description     text,
  description_i18n jsonb default '{}',
  amenities       text[] default '{}',
  sort_order      int default 0,
  is_available    boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 4. bookings 확장 ───────────────────────────────────────────
alter table public.bookings
  add column if not exists venue_vendor_id uuid references public.venue_vendors(id) on delete set null;

alter table public.bookings
  add column if not exists venue_item_id uuid references public.venue_items(id) on delete set null;

alter table public.bookings
  add column if not exists venue_price int default 0;

-- ── 5. RLS — venue_vendors ─────────────────────────────────────
alter table public.venue_vendors enable row level security;

drop policy if exists "촬영장소업체 공개 조회" on public.venue_vendors;
create policy "촬영장소업체 공개 조회"
  on public.venue_vendors for select using (is_active = true);

drop policy if exists "촬영장소업체 본인 수정" on public.venue_vendors;
create policy "촬영장소업체 본인 수정"
  on public.venue_vendors for update using (auth.uid() = user_id);

drop policy if exists "촬영장소업체 본인 삽입" on public.venue_vendors;
create policy "촬영장소업체 본인 삽입"
  on public.venue_vendors for insert with check (auth.uid() = user_id);

-- ── 6. RLS — venue_items ───────────────────────────────────────
alter table public.venue_items enable row level security;

drop policy if exists "촬영장소 공개 조회" on public.venue_items;
create policy "촬영장소 공개 조회"
  on public.venue_items for select using (is_available = true);

drop policy if exists "촬영장소 본인 수정" on public.venue_items;
create policy "촬영장소 본인 수정"
  on public.venue_items for all
  using (vendor_id in (select id from public.venue_vendors where user_id = auth.uid()));

-- ── 7. 인덱스 ──────────────────────────────────────────────────
create index if not exists idx_venue_items_vendor
  on public.venue_items(vendor_id, is_available);

create index if not exists idx_venue_items_category
  on public.venue_items(category, is_available);

create index if not exists idx_venue_vendors_location
  on public.venue_vendors(location_id, is_active);

create index if not exists idx_bookings_venue_vendor
  on public.bookings(venue_vendor_id);

-- ✓ Step 7 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 8: Bookings Extensions (v2 through v5)
-- ═══════════════════════════════════════════════════════════

-- ── v2: Allow nullable photographer_id for MVP phase ─────────

ALTER TABLE public.bookings
  ALTER COLUMN photographer_id DROP NOT NULL;

-- ── v3: Customer UPDATE allowed + metadata ─────────────────

CREATE POLICY "내 예약 업데이트" ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reschedule_request text;

-- ── v4: Booking approval tracking ──────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- (rejected_reason already added in Step 4)

-- ── v5: Payment verification support ───────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS toss_method       text,
  ADD COLUMN IF NOT EXISTS toss_receipt_url  text,
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount     int default 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_toss_order_id
  ON public.bookings (toss_order_id)
  WHERE toss_order_id IS NOT NULL;

-- ✓ Step 8 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 9: Reviews (v1 and v2)
-- ═══════════════════════════════════════════════════════════

-- ── v1: Main reviews table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id   uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text              text NOT NULL DEFAULT '',
  author_name       text,
  lang              text DEFAULT 'ko',
  is_visible        boolean DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_unique
  ON public.reviews (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_photographer
  ON public.reviews (photographer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_customer
  ON public.reviews (customer_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "리뷰 공개 조회"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

CREATE POLICY "리뷰 작성"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "리뷰 본인 수정"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "리뷰 본인 삭제"
  ON public.reviews FOR DELETE
  USING (auth.uid() = customer_id);

CREATE POLICY "admin_reviews_select"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_reviews_update"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for auto-updating photographer rating
CREATE OR REPLACE FUNCTION public.update_photographer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _photographer_id uuid;
  _avg_rating numeric(3,2);
  _count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _photographer_id := OLD.photographer_id;
  ELSE
    _photographer_id := NEW.photographer_id;
  END IF;

  SELECT
    COALESCE(AVG(rating)::numeric(3,2), 5.0),
    COUNT(*)
  INTO _avg_rating, _count
  FROM public.reviews
  WHERE photographer_id = _photographer_id
    AND is_visible = true;

  UPDATE public.photographers
  SET
    rating = _avg_rating,
    reviews_count = _count,
    updated_at = now()
  WHERE id = _photographer_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_photographer_rating ON public.reviews;
CREATE TRIGGER trg_update_photographer_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_photographer_rating();

-- ── v2: Package and photographer specific review tables ──────

CREATE TABLE IF NOT EXISTS package_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  package_id UUID,
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photographer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pkg_reviews_photographer ON package_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_pkg_reviews_booking ON package_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_photographer ON photographer_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_booking ON photographer_reviews(booking_id);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read package reviews" ON package_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own package reviews" ON package_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own package reviews" ON package_reviews FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Anyone can read photographer reviews" ON photographer_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own photographer reviews" ON photographer_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own photographer reviews" ON photographer_reviews FOR UPDATE USING (auth.uid() = customer_id);

-- ✓ Step 9 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 10: Review Replies
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('package', 'photographer')),
  photographer_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (review_id, review_type)
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_replies_photographer ON review_replies(photographer_id);

ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review replies"
  ON review_replies FOR SELECT USING (true);

CREATE POLICY "Photographer can insert own replies"
  ON review_replies FOR INSERT
  WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographer can update own replies"
  ON review_replies FOR UPDATE
  USING (auth.uid() = photographer_id);

-- ✓ Step 10 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 11: Chat/Messaging System
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_photographer ON chat_rooms(photographer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_customer ON chat_rooms(customer_id);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own chat rooms" ON chat_rooms
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = photographer_id);

CREATE POLICY "Users can see messages in their rooms" ON messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid())
  );

CREATE POLICY "Users can send messages to their rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ✓ Step 11 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 12: Stylist Scheduling
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stylist_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked','cancelled','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stylist_id, date, time_slot)
);

ALTER TABLE public.stylist_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stylist_schedules_public_read"
  ON public.stylist_schedules
  FOR SELECT
  USING (true);

CREATE POLICY "stylist_schedules_self_manage"
  ON public.stylist_schedules
  FOR ALL
  USING (auth.uid() = stylist_id)
  WITH CHECK (auth.uid() = stylist_id);

CREATE POLICY "stylist_schedules_booking_system"
  ON public.stylist_schedules
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stylist_schedule_date
  ON public.stylist_schedules(stylist_id, date);

CREATE INDEX IF NOT EXISTS idx_stylist_schedule_booking
  ON public.stylist_schedules(booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stylist_schedule_status
  ON public.stylist_schedules(stylist_id, status, date);

CREATE OR REPLACE FUNCTION update_stylist_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stylist_schedule_updated_at
  BEFORE UPDATE ON public.stylist_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_stylist_schedule_timestamp();

-- ✓ Step 12 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 13: Storage Buckets
-- ═══════════════════════════════════════════════════════════

-- ── 1. 버킷 생성 (public: CDN 공개 읽기) ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('portfolios', 'portfolios', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('dresses',    'dresses',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

-- ── 2. avatars RLS ────────────────────────────────────────────
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 3. portfolios RLS ────────────────────────────────────────
CREATE POLICY "portfolios_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolios');

CREATE POLICY "portfolios_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolios_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolios_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. dresses RLS ───────────────────────────────────────────
CREATE POLICY "dresses_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dresses');

CREATE POLICY "dresses_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "dresses_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "dresses_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ✓ Step 13 complete

-- ═══════════════════════════════════════════════════════════
-- STEP 14: RLS Hardening
-- ═══════════════════════════════════════════════════════════

-- ── 1. profiles: INSERT 정책 ────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '본인 프로필 삽입'
  ) THEN
    CREATE POLICY "본인 프로필 삽입"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── 2. bookings: UPDATE 정책 (고객 취소 + 작가 확정/거절) ──────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '고객 예약 수정'
  ) THEN
    CREATE POLICY "고객 예약 수정"
      ON public.bookings FOR UPDATE
      USING (auth.uid() = customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '작가 예약 수정'
  ) THEN
    CREATE POLICY "작가 예약 수정"
      ON public.bookings FOR UPDATE
      USING (
        photographer_id IN (
          SELECT id FROM public.photographers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 4. photographers: DELETE 정책 (본인만 탈퇴) ─────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '작가 본인 삭제'
  ) THEN
    CREATE POLICY "작가 본인 삭제"
      ON public.photographers FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. dress_vendors: DELETE 정책 ───────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dress_vendors' AND policyname = '의상업체 본인 삭제'
  ) THEN
    CREATE POLICY "의상업체 본인 삭제"
      ON public.dress_vendors FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 6. profiles: admin은 모든 프로필 조회 가능 ──────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '관리자 전체 조회'
  ) THEN
    CREATE POLICY "관리자 전체 조회"
      ON public.profiles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 7. bookings: admin 전체 조회/수정 ────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 전체 조회'
  ) THEN
    CREATE POLICY "관리자 예약 전체 조회"
      ON public.bookings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 수정'
  ) THEN
    CREATE POLICY "관리자 예약 수정"
      ON public.bookings FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 8. photographers: 비활성 작가도 admin이 볼 수 있도록 ────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '관리자 작가 전체 조회'
  ) THEN
    CREATE POLICY "관리자 작가 전체 조회"
      ON public.photographers FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ✓ Step 14 complete

COMMIT;
-- ============================================================
-- MIGRATION COMPLETE — All tables and policies created
-- ============================================================
