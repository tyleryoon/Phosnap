-- ═══════════════════════════════════════════════════════════════════════
-- FIX_17: 예약에 고객 이름 스냅샷 추가
--
-- 증상
--   헤메 대시보드의 예약 카드에 고객이 "N/A" 로 표시된다.
--
-- 원인
--   화면은 booking.customer_name 을 읽는데 그런 컬럼이 없다.
--   bookings 에는 customer_id(uuid) 만 있고, 이름은 profiles 에 있다.
--   그런데 profiles 의 RLS 는 본인만 읽을 수 있어서, 헤메가 조인으로
--   가져오려 해도 막힌다.
--
-- 해결
--   provider_name 을 스냅샷으로 저장하는 것과 같은 방식으로
--   customer_name 도 예약 시점에 박아둔다.
--   고객이 개명해도 과거 예약 기록이 유지되는 장점도 같다.
--
-- 적용 순서: FIX_16 다음
-- ═══════════════════════════════════════════════════════════════════════

alter table public.bookings
  add column if not exists customer_name text;

comment on column public.bookings.customer_name is
  '예약 시점의 고객 이름 스냅샷. profiles RLS 때문에 공급자가 조인으로 읽을 수 없다.';

-- 기존 예약 백필 (SQL Editor 는 관리자 권한이라 profiles 를 읽을 수 있다)
update public.bookings b
   set customer_name = coalesce(p.full_name, p.real_name, split_part(p.email, '@', 1))
  from public.profiles p
 where p.id = b.customer_id
   and b.customer_name is null;

-- 확인
select id, date, time, customer_name, photographer_name, status, total_price
  from public.bookings
 order by date desc;
