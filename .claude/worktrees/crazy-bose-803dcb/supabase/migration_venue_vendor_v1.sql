-- ============================================================
--  Phosnap · Migration: 촬영장소 대여 업체 시스템
--  날짜: 2026-04-18
--  변경: venue_vendors + venue_items 테이블 추가,
--        profiles.role 확장, bookings 필드 추가
-- ============================================================

-- ── 1. profiles.role 확장 ──────────────────────────────────────
-- 기존: 'customer','photographer','stylist','artist','dress_vendor','admin'
-- 추가: 'venue_vendor' (촬영장소 업체)
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
  name_i18n       jsonb default '{}',       -- {ko, en, ja, zh}
  bio             text,
  bio_i18n        jsonb default '{}',
  location_id     text,                     -- 활동 위치 (명소 기준)
  location_names  jsonb default '{}',       -- {ko, en, ja, zh}
  categories      text[] default '{}',      -- ['studio','traditional_space','outdoor','urban','event_hall']
  img             text,                     -- 대표 이미지
  contact_info    jsonb default '{}',       -- {phone, email, instagram, website}
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3. venue_items (개별 촬영장소) ──────────────────────────────
create table if not exists public.venue_items (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid not null references public.venue_vendors(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',       -- {ko, en, ja, zh}
  category        text not null             -- 촬영장소 유형
                    check (category in ('studio','traditional_space','outdoor','urban','event_hall','other')),
  capacity        int default 10,           -- 최대 수용 인원
  price           int default 0,            -- 대여 가격 (원)
  price_unit      text default 'per_session'
                    check (price_unit in ('per_hour','per_session','per_day')),
  images          jsonb default '[]',       -- [{url, caption?}]
  desc            text,
  desc_i18n       jsonb default '{}',
  amenities       text[] default '{}',      -- ['parking','wifi','changing_room','ac','restroom','kitchen','sound_system']
  sort_order      int default 0,            -- 업체 내 정렬 순서
  is_available    boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 4. bookings 확장 ───────────────────────────────────────────
-- 촬영장소 대여 정보
alter table public.bookings
  add column if not exists venue_vendor_id uuid references public.venue_vendors(id) on delete set null;

alter table public.bookings
  add column if not exists venue_item_id uuid references public.venue_items(id) on delete set null;

alter table public.bookings
  add column if not exists venue_price int default 0;

-- total_price 이제 = package_price + stylist_price + dress_price + venue_price
-- (기존 코드에서 계산 로직 업데이트 필요)

-- ── 5. RLS — venue_vendors ─────────────────────────────────────
alter table public.venue_vendors enable row level security;

create policy "촬영장소업체 공개 조회"
  on public.venue_vendors for select using (is_active = true);

create policy "촬영장소업체 본인 수정"
  on public.venue_vendors for update using (auth.uid() = user_id);

create policy "촬영장소업체 본인 삽입"
  on public.venue_vendors for insert with check (auth.uid() = user_id);

-- ── 6. RLS — venue_items ───────────────────────────────────────
alter table public.venue_items enable row level security;

create policy "촬영장소 공개 조회"
  on public.venue_items for select using (is_available = true);

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

-- ============================================================
-- 완료! 신규 2개 테이블 + 기존 테이블 확장 + RLS + 인덱스
-- ============================================================
