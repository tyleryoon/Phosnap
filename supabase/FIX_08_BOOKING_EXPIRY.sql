-- ============================================================
-- FIX 11: 예약 만료 시각에 촬영일 상한 추가
--
-- 기존: expires_at = 생성 + 48시간 (무조건)
-- 문제: 촬영일이 3일 뒤인 예약도 48시간을 꽉 채워 기다리므로,
--       취소가 확정될 땐 이미 촬영 하루 전이라 고객이 다른 작가를
--       찾을 시간이 없다.
--
-- 변경: expires_at = min(생성 + 48시간, 촬영일 3일 전)
--       단 그 시점이 이미 지났다면 최소 2시간은 보장한다
--       (작가에게 응답할 최소한의 기회를 준다)
-- ============================================================

create or replace function public.set_booking_expiry()
returns trigger language plpgsql security definer as $$
declare
  hard_deadline timestamptz;   -- 촬영 3일 전
  standard      timestamptz;   -- 생성 + 48시간
  chosen        timestamptz;
begin
  if new.status = 'pending' and new.expires_at is null then
    standard      := now() + interval '48 hours';
    hard_deadline := (new.date::timestamptz) - interval '3 days';

    chosen := least(standard, hard_deadline);

    -- 촬영이 임박해 이미 마감 시점이 지난 경우 최소 응답 시간 보장
    if chosen <= now() then
      chosen := now() + interval '2 hours';
    end if;

    new.expires_at := chosen;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_booking_expiry on public.bookings;
create trigger trg_set_booking_expiry
  before insert on public.bookings
  for each row execute procedure public.set_booking_expiry();

-- ============================================================
-- 검증: 현재 대기 중인 예약의 만료 시각
-- ============================================================
select id, date, created_at, expires_at,
       round(extract(epoch from (expires_at - now())) / 3600, 1) as hours_left
from public.bookings
where status = 'pending'
order by created_at desc;
