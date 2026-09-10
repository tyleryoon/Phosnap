-- ============================================================
-- 테스트용 예약 생성
--   결제(TossPayments)를 거치지 않고 bookings 레코드를 만들어
--   작가 승인 → 채팅 → 알림 → 리뷰 흐름을 검증하기 위한 시드.
--   사업자등록증/결제 연동 없이 상호작용을 끝까지 볼 수 있다.
--
--   고객: customer@gmail.com
--   작가: photo@gmail.com (윤작가)
-- ============================================================

insert into public.bookings (
  customer_id,
  photographer_id,
  date,
  time,
  package_name,
  package_price,
  total_price,
  status,
  photographer_name,
  lang,
  note
)
select
  c.id,
  ph.id,
  date '2026-09-20',
  '13:00',
  '데이 스냅 기본 패키지',
  250000,
  250000,
  'pending',                     -- 작가 승인 대기 상태로 시작
  ph.name_ko,
  'ko',
  '테스트 예약 — 상호작용 검증용'
from public.profiles c
cross join public.photographers ph
where c.email = 'customer@gmail.com'
  and ph.user_id = (select id from public.profiles where email = 'photo@gmail.com')
  -- 중복 생성 방지
  and not exists (
    select 1 from public.bookings b
    where b.customer_id = c.id
      and b.photographer_id = ph.id
      and b.date = date '2026-09-20'
      and b.time = '13:00'
  );

-- ============================================================
-- 검증
-- ============================================================
select
  b.id,
  b.date,
  b.time,
  b.package_name,
  b.total_price,
  b.status,
  cust.email  as customer_email,
  ph.name_ko  as artist_name
from public.bookings b
join public.profiles cust on cust.id = b.customer_id
join public.photographers ph on ph.id = b.photographer_id
order by b.created_at desc;
