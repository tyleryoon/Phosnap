-- ============================================================
--  Phosnap · Migration: 의상 대여 업체 시스템
--  날짜: 2026-04-11
--  변경: dress_vendors + dress_items 테이블 추가,
--        photographers 필드 추가, bookings 필드 추가,
--        profiles.role 확장
-- ============================================================

-- ── 1. profiles.role 확장 ──────────────────────────────────────
-- 기존: 'customer','photographer','stylist','admin'
-- 추가: 'artist' (통합 작가), 'dress_vendor' (의상 업체)
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','artist','photographer','stylist','dress_vendor','admin'));

-- ── 2. photographers 테이블 필드 추가 ──────────────────────────
-- artist_type: 작가 세부 유형
alter table public.photographers
  add column if not exists artist_type text default 'photographer'
    check (artist_type in ('photographer','videographer','both','hmk'));

-- H&M 자체 진행 여부 + 메뉴
alter table public.photographers
  add column if not exists hmk_self boolean default false;

alter table public.photographers
  add column if not exists hmk_options jsonb default '[]';
  -- [{name, price, desc, descI18n, img}]

-- 의상: 자체 보유 여부 + 연계 업체
alter table public.photographers
  add column if not exists dress_self boolean default false;

-- dress_vendor_id는 dress_vendors 생성 후 추가 (아래 참조)

-- 기존 dresses 컬럼 구조 확장 설명:
-- dresses jsonb default '[]'  →  [{name, nameI18n, category, sizes[], price, images[], note}]
-- 기존 [{name, sizes[], note}] 구조와 하위 호환 유지

-- ── 3. dress_vendors (의상 대여 업체) ──────────────────────────
create table if not exists public.dress_vendors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',       -- {ko, en, ja, zh}
  bio             text,
  bio_i18n        jsonb default '{}',
  location_id     text,                     -- 활동 위치 (명소 기준)
  location_names  jsonb default '{}',       -- {ko, en, ja, zh}
  categories      text[] default '{}',      -- ['hanbok','dress','tuxedo','casual','traditional_jp','qipao']
  img             text,                     -- 대표 이미지
  contact_info    jsonb default '{}',       -- {phone, email, instagram, website}
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 4. dress_items (개별 의상) ──────────────────────────────────
create table if not exists public.dress_items (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid not null references public.dress_vendors(id) on delete cascade,
  name            text not null,
  name_i18n       jsonb default '{}',       -- {ko, en, ja, zh}
  category        text not null             -- 'hanbok','dress','tuxedo','casual','traditional_jp','qipao'
                    check (category in ('hanbok','dress','tuxedo','casual','traditional_jp','qipao','accessory','other')),
  sizes           text[] default '{}',      -- ['S','M','L','XL','Free'] 또는 ['55','66','77']
  price           int default 0,            -- 대여 가격 (원)
  images          jsonb default '[]',       -- [{url, sizeLabel?, caption?}]
  desc            text,
  desc_i18n       jsonb default '{}',
  color           text,                     -- 'red','blue','white' 등 (필터용)
  sort_order      int default 0,            -- 업체 내 정렬 순서
  is_available    boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 5. photographers.dress_vendor_id FK 추가 ───────────────────
alter table public.photographers
  add column if not exists dress_vendor_id uuid references public.dress_vendors(id) on delete set null;

-- ── 6. bookings 확장 ───────────────────────────────────────────
-- H&M 유형: 작가 자체 or 외부 스타일리스트
alter table public.bookings
  add column if not exists hmk_type text
    check (hmk_type in ('artist_self','external_stylist'));

-- 선택된 작가 자체 H&M 옵션 이름
alter table public.bookings
  add column if not exists hmk_option_name text;

-- 의상 대여 정보
alter table public.bookings
  add column if not exists dress_item_id uuid references public.dress_items(id) on delete set null;

alter table public.bookings
  add column if not exists dress_size text;

alter table public.bookings
  add column if not exists dress_price int default 0;

-- total_price 이제 = package_price + stylist_price + dress_price
-- (기존 코드에서 계산 로직 업데이트 필요)

-- ── 7. RLS — dress_vendors ─────────────────────────────────────
alter table public.dress_vendors enable row level security;

create policy "의상업체 공개 조회"
  on public.dress_vendors for select using (is_active = true);

create policy "의상업체 본인 수정"
  on public.dress_vendors for update using (auth.uid() = user_id);

create policy "의상업체 본인 삽입"
  on public.dress_vendors for insert with check (auth.uid() = user_id);

-- ── 8. RLS — dress_items ───────────────────────────────────────
alter table public.dress_items enable row level security;

create policy "의상 공개 조회"
  on public.dress_items for select using (is_available = true);

create policy "의상 본인 수정"
  on public.dress_items for all
  using (vendor_id in (select id from public.dress_vendors where user_id = auth.uid()));

-- ── 9. 인덱스 ──────────────────────────────────────────────────
create index if not exists idx_dress_items_vendor
  on public.dress_items(vendor_id, is_available);

create index if not exists idx_dress_items_category
  on public.dress_items(category, is_available);

create index if not exists idx_dress_vendors_location
  on public.dress_vendors(location_id, is_active);

create index if not exists idx_photographers_dress_vendor
  on public.photographers(dress_vendor_id);

-- ============================================================
-- 완료! 신규 2개 테이블 + 기존 2개 테이블 확장 + RLS + 인덱스
-- ============================================================
