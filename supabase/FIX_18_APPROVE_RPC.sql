-- ═══════════════════════════════════════════════════════════════════════
-- FIX_18: 예약 확정/거절을 서버 함수로 옮긴다
--
-- 증상
--   작가가 예약을 확정해도
--     · 고객에게 확정 알림이 가지 않는다
--     · 헤메·벤더에게 알림이 가지 않는다
--     · 헤메·벤더의 아이템이 pending 으로 남는다
--
-- 원인
--   전부 클라이언트에서 처리하고 있었는데 RLS 가 (의도대로) 막는다.
--     notifications INSERT  → user_id = auth.uid() 만 허용 (42501)
--     booking_items UPDATE  → 자기가 정산받는 아이템만 허용 (0행 갱신)
--     booking_items SELECT  → 자기 아이템만 보임 → 알림 대상이 빈 목록
--
--   PostgREST 는 0행 갱신을 200 으로 돌려주고, 알림 실패는
--   .catch(() => {}) 로 삼켜져서 아무 흔적도 남지 않았다.
--
-- 왜 정책을 푸는 대신 함수로 가는가
--   notifications INSERT 를 열면 누구나 아무에게나 알림을 보낼 수 있다.
--   알림 발송은 원래 서버가 할 일이다.
--   SECURITY DEFINER 함수 안에서 권한을 직접 확인하고 처리한다.
--
-- 적용 순서: FIX_17 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. provider 레코드 → 소유자(auth uid)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.provider_user_id(p_type text, p_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select case p_type
    when 'photographer' then (select user_id from public.photographers where id = p_id)
    when 'stylist'      then (select user_id from public.stylists      where id = p_id)
    when 'dress'        then (select user_id from public.dress_vendors where id = p_id)
    when 'venue'        then (select user_id from public.venue_vendors where id = p_id)
  end;
$$;

-- 공급자 유형별 대시보드 경로
create or replace function public.provider_link(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'photographer' then '/artist/dashboard'
    when 'stylist'      then '/stylist/dashboard'
    else '/vendor/dashboard'
  end;
$$;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 예약 확정
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.approve_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_uid     uuid := auth.uid();
  v_item    record;
  v_target  uuid;
  v_when    text;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found then
    raise exception '예약을 찾을 수 없습니다';
  end if;

  -- 이 예약의 작가만 확정할 수 있다
  if not exists (
    select 1 from public.photographers
     where id = v_booking.photographer_id and user_id = v_uid
  ) then
    raise exception '이 예약을 확정할 권한이 없습니다';
  end if;

  if v_booking.status <> 'pending' then
    raise exception '이미 처리된 예약입니다 (%)', v_booking.status;
  end if;

  update public.bookings
     set status = 'confirmed', approved_at = now(), updated_at = now()
   where id = p_booking
   returning * into v_booking;

  -- 아이템도 함께 확정. 클라이언트에서는 RLS 때문에
  -- 작가 본인 아이템만 바뀌고 나머지는 pending 으로 남았다.
  update public.booking_items
     set status = 'confirmed'
   where booking_id = p_booking and status = 'pending';

  v_when := coalesce(v_booking.date::text, '') || ' ' || coalesce(v_booking.time, '');

  -- 고객 알림
  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (v_booking.customer_id, 'booking_confirmed', '예약이 확정되었습니다',
          coalesce(v_booking.photographer_name, '작가') || ' · ' || v_when,
          '/my', jsonb_build_object('bookingId', p_booking));

  -- 참여 공급자 알림 (작가 본인 제외)
  for v_item in
    select distinct provider_type, provider_id
      from public.booking_items
     where booking_id = p_booking
       and provider_type <> 'photographer'
  loop
    v_target := public.provider_user_id(v_item.provider_type, v_item.provider_id);
    if v_target is not null then
      insert into public.notifications (user_id, type, title, body, link, metadata)
      values (v_target, 'booking_confirmed', '예약이 확정되었습니다',
              v_when || ' · ' || coalesce(v_booking.photographer_name, '작가') || ' 촬영',
              public.provider_link(v_item.provider_type),
              jsonb_build_object('bookingId', p_booking,
                                 'providerType', v_item.provider_type));
    end if;
  end loop;

  return v_booking;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 예약 거절
--    아이템도 함께 취소해야 헤메·벤더의 시간이 다시 풀린다.
--    이게 없으면 성사되지 않은 예약이 스케줄을 계속 점유한다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.reject_booking(p_booking uuid, p_reason text default '')
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_uid     uuid := auth.uid();
  v_item    record;
  v_target  uuid;
  v_when    text;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found then
    raise exception '예약을 찾을 수 없습니다';
  end if;

  if not exists (
    select 1 from public.photographers
     where id = v_booking.photographer_id and user_id = v_uid
  ) then
    raise exception '이 예약을 거절할 권한이 없습니다';
  end if;

  update public.bookings
     set status = 'cancelled',
         rejected_reason = nullif(p_reason, ''),
         cancelled_at = now(),
         updated_at = now()
   where id = p_booking
   returning * into v_booking;

  update public.booking_items
     set status = 'cancelled'
   where booking_id = p_booking
     and status not in ('cancelled', 'refunded');

  v_when := coalesce(v_booking.date::text, '') || ' ' || coalesce(v_booking.time, '');

  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (v_booking.customer_id, 'booking_rejected', '예약이 거절되었습니다',
          case when coalesce(p_reason, '') <> '' then '사유: ' || p_reason
               else coalesce(v_booking.photographer_name, '작가') || ' · ' || v_when end,
          '/my', jsonb_build_object('bookingId', p_booking));

  for v_item in
    select distinct provider_type, provider_id
      from public.booking_items
     where booking_id = p_booking
       and provider_type <> 'photographer'
  loop
    v_target := public.provider_user_id(v_item.provider_type, v_item.provider_id);
    if v_target is not null then
      insert into public.notifications (user_id, type, title, body, link, metadata)
      values (v_target, 'booking_cancelled', '예약이 취소되었습니다',
              v_when || ' · 일정이 다시 열렸습니다',
              public.provider_link(v_item.provider_type),
              jsonb_build_object('bookingId', p_booking));
    end if;
  end loop;

  return v_booking;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────
-- 3-2. 새 예약 알림
--      고객이 직접 공급자에게 알림을 넣으려 하면 같은 이유로 막힌다.
--      예약 생성 직후 이 함수를 호출한다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.notify_new_booking(p_booking uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_item    record;
  v_target  uuid;
  v_when    text;
  v_sent    int := 0;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found then
    return 0;
  end if;

  -- 예약 당사자(고객)만 호출할 수 있다
  if v_booking.customer_id <> auth.uid() then
    raise exception '이 예약의 알림을 보낼 권한이 없습니다';
  end if;

  v_when := coalesce(v_booking.date::text, '') || ' ' || coalesce(v_booking.time, '');

  for v_item in
    select distinct provider_type, provider_id
      from public.booking_items
     where booking_id = p_booking
  loop
    v_target := public.provider_user_id(v_item.provider_type, v_item.provider_id);
    if v_target is not null then
      insert into public.notifications (user_id, type, title, body, link, metadata)
      values (v_target, 'booking_created', '새 예약 요청이 있습니다',
              coalesce(v_booking.customer_name, '고객') || ' · ' || v_when,
              public.provider_link(v_item.provider_type),
              jsonb_build_object('bookingId', p_booking,
                                 'providerType', v_item.provider_type));
      v_sent := v_sent + 1;
    end if;
  end loop;

  return v_sent;
end;
$$;


grant execute on function public.notify_new_booking(uuid)     to authenticated;
grant execute on function public.provider_user_id(text, uuid) to authenticated;
grant execute on function public.provider_link(text)          to authenticated, anon;
grant execute on function public.approve_booking(uuid)        to authenticated;
grant execute on function public.reject_booking(uuid, text)   to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 4. 이번 검증에서 반쪽만 확정된 예약 정리
--    작가 아이템만 confirmed 가 되고 헤메·벤더는 pending 으로 남아 있다.
-- ───────────────────────────────────────────────────────────────────────
update public.booking_items bi
   set status = 'confirmed'
  from public.bookings b
 where b.id = bi.booking_id
   and b.status = 'confirmed'
   and bi.status = 'pending';


-- ───────────────────────────────────────────────────────────────────────
-- 5. 확인
-- ───────────────────────────────────────────────────────────────────────
select b.date, b.time, b.status as 예약,
       bi.provider_type, bi.item_name, bi.status as 아이템
  from public.bookings b
  join public.booking_items bi on bi.booking_id = b.id
 order by b.date desc, bi.provider_type;
