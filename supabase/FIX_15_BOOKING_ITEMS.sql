-- ═══════════════════════════════════════════════════════════════════════
-- FIX_15: booking_items — 예약을 참여자별 라인 아이템으로 분해
--
-- 배경
--   기존 bookings 는 예약 1건의 모든 정보를 한 행에 욱여넣는 구조였다.
--     stylist_name / stylist_service / stylist_price   ← 시술 1개만 가능
--     dress_name   / dress_size      / dress_price     ← 의상 1벌만 가능
--   이 구조 때문에 아래가 전부 불가능했다.
--     · 신부 헤메 + 신랑 그루밍 동시 예약
--     · 드레스 2벌 + 헤어변형 2회
--     · 참여자별 수수료 계산 / 정산 대상 특정
--     · 콜라보 인원수 판정 (수수료 우대)
--     · 헤메만 노쇼 시 부분 환불
--     · 시간 충돌 판정 (헤메 선행/동행/상주)
--
--   또한 getVendorBookings() 는 무조건 빈 배열을 반환했고,
--   getStylistBookings() 는 이름 문자열 매칭이라 개명·동명이인에 취약했다.
--
-- 적용 순서: FIX_14 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. updated_at 자동 갱신 함수 (없으면 생성)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────
-- 2. booking_items 테이블
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.booking_items (
  id            uuid primary key default uuid_generate_v4(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,

  -- ── 정산 대상 ────────────────────────────────────────────────────
  -- provider_id 가 가리키는 테이블은 provider_type 에 따라 달라진다.
  --   photographer → photographers.id
  --   stylist      → stylists.id
  --   dress        → dress_vendors.id
  --   venue        → venue_vendors.id
  provider_type text not null
    check (provider_type in ('photographer','stylist','dress','venue')),
  provider_id   uuid not null,
  -- 이름은 스냅샷으로 저장한다. 공급자가 개명해도 과거 예약 이력이 보존된다.
  provider_name text,

  -- ── 판매된 항목 ──────────────────────────────────────────────────
  --   photographer → packages.id
  --   stylist      → stylist_services.id
  --   dress        → dress_items.id
  --   venue        → venue_items.id
  item_id       uuid,
  item_name     text not null,
  item_option   text,                      -- 드레스 사이즈, 헤어변형 회차 등
  quantity      int  not null default 1 check (quantity > 0),

  -- ── 금액 (공급가액 기준 · quantity 반영된 합계) ──────────────────
  -- 수수료는 부가세 포함 총액이 아니라 공급가액 기준으로 산정한다.
  price         int  not null default 0 check (price >= 0),

  -- ── 시간 점유 ────────────────────────────────────────────────────
  -- shoot  : 촬영 시간 그대로            (작가 · 장소)
  -- before : 촬영 전 완료 + 이동          (샵 헤어메이크업)
  -- during : 촬영 중 합류                 (헤어변형)
  -- full   : 촬영 전 시술 + 종료까지 상주 (야외스냅 종일 동행)
  -- day    : 하루 단위 점유               (의상)
  timing        text not null default 'shoot'
    check (timing in ('shoot','before','during','full','day')),
  start_at      timestamptz,
  end_at        timestamptz,

  -- ── 정산 ─────────────────────────────────────────────────────────
  -- commission_rate 는 예약 시점의 요율을 그대로 박아둔다.
  -- 나중에 정책이 바뀌어도 과거 예약의 정산 근거가 흔들리지 않는다.
  commission_rate   numeric(6,4),          -- 0.1600 = 16%
  commission_amount int,
  payout_amount     int,                   -- price - commission_amount
  collab_count      int,                   -- 정산 시점의 콜라보 인원수 (우대 근거)

  -- ── 개별 상태 (부분 노쇼 · 부분 환불용) ─────────────────────────
  status        text not null default 'pending'
    check (status in ('pending','confirmed','completed','no_show','cancelled','refunded')),
  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_booking_items_updated on public.booking_items;
create trigger trg_booking_items_updated
  before update on public.booking_items
  for each row execute function public.set_updated_at();

-- 예약 상세 조회
create index if not exists idx_booking_items_booking
  on public.booking_items (booking_id);

-- 공급자 대시보드 조회 (getStylistBookings / getVendorBookings)
create index if not exists idx_booking_items_provider
  on public.booking_items (provider_type, provider_id, status);

-- 시간 충돌 판정
create index if not exists idx_booking_items_slot
  on public.booking_items (provider_type, provider_id, start_at, end_at)
  where status in ('pending','confirmed','completed');

-- 의상 재고 판정 (같은 아이템이 같은 날 중복 예약되는지)
create index if not exists idx_booking_items_item
  on public.booking_items (item_id, start_at)
  where status in ('pending','confirmed','completed');


-- ───────────────────────────────────────────────────────────────────────
-- 3. 소유권 확인 헬퍼 (SECURITY DEFINER — RLS 재귀 방지)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.owns_provider(p_type text, p_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case p_type
    when 'photographer' then exists (
      select 1 from public.photographers where id = p_id and user_id = auth.uid())
    when 'stylist' then exists (
      select 1 from public.stylists      where id = p_id and user_id = auth.uid())
    when 'dress' then exists (
      select 1 from public.dress_vendors where id = p_id and user_id = auth.uid())
    when 'venue' then exists (
      select 1 from public.venue_vendors where id = p_id and user_id = auth.uid())
    else false
  end;
$$;

grant execute on function public.owns_provider(text, uuid) to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ───────────────────────────────────────────────────────────────────────
alter table public.booking_items enable row level security;

drop policy if exists "아이템 조회" on public.booking_items;
create policy "아이템 조회" on public.booking_items
  for select using (
    -- 고객: 자기 예약의 아이템
    exists (select 1 from public.bookings b
             where b.id = booking_id and b.customer_id = auth.uid())
    -- 공급자: 자기가 정산받는 아이템
    or public.owns_provider(provider_type, provider_id)
  );

drop policy if exists "아이템 생성" on public.booking_items;
create policy "아이템 생성" on public.booking_items
  for insert with check (
    exists (select 1 from public.bookings b
             where b.id = booking_id and b.customer_id = auth.uid())
  );

-- 공급자는 자기 아이템의 상태만 바꿀 수 있다 (확정 · 완료 · 노쇼 처리)
drop policy if exists "아이템 수정" on public.booking_items;
create policy "아이템 수정" on public.booking_items
  for update using (
    public.owns_provider(provider_type, provider_id)
    or exists (select 1 from public.bookings b
                where b.id = booking_id and b.customer_id = auth.uid())
  );

grant select, insert, update on public.booking_items to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 5. stylist_services — 시술 시점 / 소요 / 동행 관련 필드
-- ───────────────────────────────────────────────────────────────────────
alter table public.stylist_services
  -- before : 촬영 전 완료 (샵에서 받고 이동)
  -- during : 촬영 중 합류 (헤어변형)
  -- full   : 촬영 전 시술 후 종료까지 상주 (야외스냅 동행)
  add column if not exists timing text not null default 'before'
    check (timing in ('before','during','full')),

  -- before → 촬영 시작 몇 분 "전에 끝나야" 하는지 (이동 버퍼)
  --          현장에서 시술하면 0
  -- during → 촬영 시작 몇 분 "후에 합류"하는지
  -- full   → 이동 버퍼 (현장 시술이면 0)
  add column if not exists offset_minutes int not null default 30,

  -- full 전용: 이 메뉴로 감당 가능한 최대 촬영 길이(시간).
  -- 촬영이 이보다 길면 고객에게 노출하지 않는다.
  add column if not exists max_hours numeric(4,1),

  -- 동행 시 출장비를 시술가와 분리해서 받고 싶을 때
  add column if not exists travel_fee int not null default 0;

comment on column public.stylist_services.timing is
  'before=촬영 전 완료 / during=촬영 중 합류 / full=촬영 전 시술 후 종료까지 상주';
comment on column public.stylist_services.offset_minutes is
  'before·full=촬영 시작 전 이동 버퍼(현장 시술이면 0), during=촬영 시작 후 합류 시점';
comment on column public.stylist_services.max_hours is
  'full 전용. 감당 가능한 최대 촬영 시간. 초과 시 고객에게 노출하지 않음';


-- ───────────────────────────────────────────────────────────────────────
-- 6. bookings — 집계 컬럼 보강
--    기존 텍스트 컬럼(stylist_name, dress_name 등)은 하위 호환을 위해
--    당장 삭제하지 않는다. 코드가 전부 booking_items 로 옮겨간 뒤 정리.
-- ───────────────────────────────────────────────────────────────────────
alter table public.bookings
  -- 촬영 시작/종료 (아이템 시간 계산의 기준점)
  add column if not exists shoot_start_at timestamptz,
  add column if not exists shoot_end_at   timestamptz,
  -- 콜라보 인원수 (정산받는 고유 provider 수) — 수수료 우대 판정
  add column if not exists collab_count   int not null default 1,
  -- 플랫폼 수수료 합계
  add column if not exists commission_total int not null default 0;


-- ───────────────────────────────────────────────────────────────────────
-- 7. 기존 예약 백필
--    텍스트 컬럼에만 남아 있던 정보를 booking_items 로 옮긴다.
--    이미 아이템이 있는 예약은 건너뛴다 (여러 번 실행해도 안전).
-- ───────────────────────────────────────────────────────────────────────

-- 7-1. 작가
insert into public.booking_items
  (booking_id, provider_type, provider_id, provider_name,
   item_name, price, timing, status)
select b.id, 'photographer', b.photographer_id,
       coalesce(p.name_ko, p.name, '작가'),
       coalesce(b.package_name, '촬영'),
       coalesce(b.package_price, 0),
       'shoot',
       case when b.status in ('completed','cancelled','refunded')
            then b.status else 'confirmed' end
from public.bookings b
left join public.photographers p on p.id = b.photographer_id
where b.photographer_id is not null
  and not exists (
    select 1 from public.booking_items bi
     where bi.booking_id = b.id and bi.provider_type = 'photographer');

-- 7-2. 헤메 — stylist_id 가 있으면 그대로, 없으면 이름으로 찾아본다
insert into public.booking_items
  (booking_id, provider_type, provider_id, provider_name,
   item_name, price, timing, status)
select b.id, 'stylist',
       coalesce(b.stylist_id, s.id),
       coalesce(b.stylist_name, s.name_ko, '헤어메이크업'),
       coalesce(b.stylist_service, '헤어메이크업'),
       coalesce(b.stylist_price, 0),
       'before',
       case when b.status in ('completed','cancelled','refunded')
            then b.status else 'confirmed' end
from public.bookings b
left join public.stylists s
       on s.id = b.stylist_id
       or (b.stylist_id is null and s.name_ko = b.stylist_name)
where coalesce(b.stylist_price, 0) > 0
  and coalesce(b.stylist_id, s.id) is not null
  and not exists (
    select 1 from public.booking_items bi
     where bi.booking_id = b.id and bi.provider_type = 'stylist');

-- 7-3. 의상 — dress_name 으로 아이템과 벤더를 역추적
insert into public.booking_items
  (booking_id, provider_type, provider_id, provider_name,
   item_id, item_name, item_option, price, timing, status)
select b.id, 'dress', di.vendor_id,
       coalesce(dv.name_ko, dv.name, '의상'),
       di.id,
       coalesce(b.dress_name, di.name_ko),
       b.dress_size,
       coalesce(b.dress_price, 0),
       'day',
       case when b.status in ('completed','cancelled','refunded')
            then b.status else 'confirmed' end
from public.bookings b
join public.dress_items   di on di.name_ko = b.dress_name
left join public.dress_vendors dv on dv.id = di.vendor_id
where coalesce(b.dress_price, 0) > 0
  and not exists (
    select 1 from public.booking_items bi
     where bi.booking_id = b.id and bi.provider_type = 'dress');


-- ───────────────────────────────────────────────────────────────────────
-- 8. 촬영 시각 백필 — date + time 을 timestamptz 로
--    duration 정보가 없는 과거 예약은 2시간으로 가정한다.
-- ───────────────────────────────────────────────────────────────────────
update public.bookings
   set shoot_start_at = (date || ' ' || time)::timestamp at time zone 'Asia/Seoul',
       shoot_end_at   = (date || ' ' || time)::timestamp at time zone 'Asia/Seoul'
                        + interval '2 hours'
 where shoot_start_at is null
   and date is not null
   and time ~ '^[0-9]{1,2}:[0-9]{2}$';


-- ───────────────────────────────────────────────────────────────────────
-- 9. 콜라보 인원수 재계산
-- ───────────────────────────────────────────────────────────────────────
update public.bookings b
   set collab_count = greatest(1, (
         select count(distinct bi.provider_id)
           from public.booking_items bi
          where bi.booking_id = b.id
            and bi.price > 0
            and bi.status not in ('cancelled','refunded')
       ));


-- ───────────────────────────────────────────────────────────────────────
-- 10. 확인
-- ───────────────────────────────────────────────────────────────────────
select b.id,
       b.date,
       b.time,
       b.total_price,
       b.collab_count,
       count(bi.id)                              as items,
       string_agg(bi.provider_type || ':' || bi.item_name, ' | ') as detail
  from public.bookings b
  left join public.booking_items bi on bi.booking_id = b.id
 group by b.id, b.date, b.time, b.total_price, b.collab_count
 order by b.date desc;
