-- ═══════════════════════════════════════════════════════════════════════
-- FIX_16: 공급자가 자기가 참여한 예약을 읽을 수 있게 한다
--
-- 증상
--   헤메 대시보드에 "예약이 없습니다" 가 뜬다.
--   booking_items 는 정상적으로 조회되는데, 함께 가져오는 bookings 가
--   전부 null 로 온다.
--
-- 원인
--   booking_items 에는 "내가 정산받는 아이템" 을 읽는 정책이 있지만,
--   bookings 쪽에는 고객과 작가만 읽을 수 있는 정책만 있었다.
--   getProviderBookings() 는 booking_items 에 bookings 를 조인해서
--   날짜·시간·고객을 가져오는데, 조인된 행이 null 이면 건너뛴다.
--   결과적으로 헤메와 벤더는 자기 예약을 영원히 볼 수 없었다.
--
-- 적용 순서: FIX_15 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 이 예약에 정산 대상으로 참여하고 있는가
--
--    SECURITY DEFINER 로 두어 booking_items 의 RLS 를 우회한다.
--    그러지 않으면 bookings ↔ booking_items 사이에 정책이 서로를
--    참조하며 무한 재귀(42P17)가 난다.
--    profiles 의 "관리자 전체 조회" 정책이 같은 이유로 모든 조회를
--    실패시켰던 전례가 있다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.is_booking_provider(p_booking uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.booking_items bi
     where bi.booking_id = p_booking
       and public.owns_provider(bi.provider_type, bi.provider_id)
  );
$$;

grant execute on function public.is_booking_provider(uuid) to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 2. bookings 조회 정책에 "참여 공급자" 추가
--
--    기존 정책 이름이 환경마다 다를 수 있어 새 정책을 하나 더 얹는다.
--    RLS 의 SELECT 정책은 OR 로 합쳐지므로 기존 접근에는 영향이 없다.
-- ───────────────────────────────────────────────────────────────────────
drop policy if exists "참여 공급자 예약 조회" on public.bookings;
create policy "참여 공급자 예약 조회" on public.bookings
  for select using ( public.is_booking_provider(id) );


-- ───────────────────────────────────────────────────────────────────────
-- 3. 헤메·벤더도 자기 아이템의 상태를 바꿀 수 있어야 한다
--    (완료 처리, 노쇼 표시 등). 예약 본문은 건드리지 못하게 두고
--    booking_items 만 수정 가능하게 유지한다. — FIX_15 에서 이미 부여됨.
--
--    다만 확정/취소 시 예약 전체 상태를 바꾸는 것은 작가와 고객만 한다.
-- ───────────────────────────────────────────────────────────────────────


-- ───────────────────────────────────────────────────────────────────────
-- 4. 확인
--    헤메(hnm@gmail.com) 로 로그인한 상태에서 실행하면
--    자기가 참여한 예약이 나와야 한다.
-- ───────────────────────────────────────────────────────────────────────
select bi.provider_type,
       bi.item_name,
       bi.price,
       bi.start_at,
       bi.end_at,
       b.date,
       b.time,
       b.status        as booking_status,
       b.total_price
  from public.booking_items bi
  join public.bookings b on b.id = bi.booking_id
 order by bi.start_at desc;
