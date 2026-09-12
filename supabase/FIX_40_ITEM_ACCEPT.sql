-- FIX_40 — 참여자가 각자 자기 항목을 수락한다
--
-- 2026-09-12
--
-- 지금 무엇이 문제인가
--
--   1) 작가만 수락할 수 있다
--      approve_booking() 은 작가 본인인지 확인한 뒤
--      **예약의 모든 아이템**을 confirmed 로 바꾼다.
--      헤메·벤더는 자기가 불려간 줄도 모르는데 확정돼 있다.
--      거절할 방법이 아예 없다.
--
--   2) 벤더 대시보드의 확정 버튼은 DB 에 가지 않는다
--      executeBookingAction() 이 setBookings() 로 React 상태만 바꾼다.
--      새로고침하면 되돌아간다. 누른 사람은 확정한 줄 안다.
--
--   3) 작가 없는 예약을 만들 수 없다
--      "헤메만" · "의상만" · "장소만" 예약을 지원하려면
--      bookings.photographer_id 가 비어 있을 수 있어야 하고,
--      확정 판정도 작가가 아니라 **참여자 전원** 기준이어야 한다.
--
-- 어떻게 바꾸나
--
--   아이템이 단위다. 각 공급자가 자기 아이템만 수락·거절한다.
--   예약 상태는 아이템들에서 **계산된다** — 사람이 직접 바꾸지 않는다.
--
--     아이템이 모두 confirmed        → 예약 confirmed
--     아이템이 모두 cancelled        → 예약 cancelled
--     일부 cancelled + 나머지 confirmed → 예약 confirmed + 환불 필요 표시
--     하나라도 pending               → 예약 pending
--
--   부분 거절을 전체 취소로 만들지 않는 이유
--     고객이 작가·헤메·장소를 함께 예약했는데 장소만 거절됐다고
--     촬영 전체를 없애면 손해가 크다. 거절된 항목만 환불하고
--     나머지는 살린다. 관리자에게 알림이 가서 사람이 확인한다.
--
-- 안전한가
--   · approve_booking / reject_booking 은 그대로 둔다 (하위 호환).
--     내부적으로 새 함수를 부르게만 바꾼다.
--   · 기존 예약의 상태는 바뀌지 않는다.
--   · 여러 번 실행해도 된다.


-- ── 0. 지금 상태 확인 ─────────────────────────────────────────────────

select 'photographer_id NOT NULL 인가' as 항목,
       (select case when is_nullable = 'YES' then '이미 nullable' else '⚠ NOT NULL — 아래에서 푼다' end
          from information_schema.columns
         where table_name = 'bookings' and column_name = 'photographer_id') as 값
union all
select '아이템 상태 분포',
       (select coalesce(string_agg(status || ':' || c, ', '), '(없음)')
          from (select status, count(*)::text c from public.booking_items group by status) x);


-- ── 1. 작가 없는 예약을 허용한다 ──────────────────────────────────────

alter table public.bookings
  alter column photographer_id drop not null;

-- 거절 사유. 고객에게 "왜 안 됐는지" 를 말해줘야 한다.
alter table public.booking_items
  add column if not exists decline_reason text,
  add column if not exists decided_at     timestamptz;

-- 부분 거절이 일어난 예약. 환불이 필요하다는 표시.
alter table public.bookings
  add column if not exists refund_due_amount int,
  add column if not exists partial_declined_at timestamptz;

comment on column public.bookings.refund_due_amount is
  '참여자가 거절해 환불해야 하는 금액. 자동 환불이 아니라 사람이 처리한다.';


-- ── 2. 예약 상태를 아이템에서 계산한다 ────────────────────────────────
--
-- 사람이 bookings.status 를 직접 바꾸지 않는다.
-- 아이템이 진실이고 예약 상태는 그 결과다.

create or replace function public.recompute_booking_status(p_booking uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total   int;
  v_ok      int;
  v_no      int;
  v_pending int;
  v_refund  int;
  v_status  text;
  v_cur     text;
begin
  select count(*),
         count(*) filter (where status = 'confirmed'),
         count(*) filter (where status = 'cancelled'),
         count(*) filter (where status = 'pending'),
         coalesce(sum(price * coalesce(quantity, 1))
                  filter (where status = 'cancelled'), 0)
    into v_total, v_ok, v_no, v_pending, v_refund
    from public.booking_items
   where booking_id = p_booking;

  -- 아이템이 하나도 없으면 건드리지 않는다.
  -- 레거시 예약(아이템 없이 저장된 것)을 취소로 만들면 안 된다.
  if v_total = 0 then
    select status into v_cur from public.bookings where id = p_booking;
    return v_cur;
  end if;

  if v_pending > 0 then
    v_status := 'pending';
  elsif v_ok = 0 then
    v_status := 'cancelled';
  else
    v_status := 'confirmed';
  end if;

  update public.bookings
     set status = v_status,
         approved_at = case when v_status = 'confirmed' and approved_at is null
                            then now() else approved_at end,
         refund_due_amount = nullif(v_refund, 0),
         partial_declined_at = case when v_no > 0 and v_ok > 0 and partial_declined_at is null
                                    then now() else partial_declined_at end,
         updated_at = now()
   where id = p_booking
     and status not in ('completed', 'refunded');

  return v_status;
end $$;

grant execute on function public.recompute_booking_status(uuid) to authenticated, service_role;


-- ── 3. 내 아이템인가 ──────────────────────────────────────────────────

create or replace function public.owns_booking_item(p_item uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.booking_items i
     where i.id = p_item
       and public.provider_user_id(i.provider_type, i.provider_id) = auth.uid()
  );
$$;

grant execute on function public.owns_booking_item(uuid) to authenticated;


-- ── 4. 수락 · 거절 ────────────────────────────────────────────────────

create or replace function public.accept_booking_item(p_item uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item   public.booking_items;
  v_bk     public.bookings;
  v_status text;
begin
  select * into v_item from public.booking_items where id = p_item;
  if not found then
    raise exception '항목을 찾을 수 없습니다';
  end if;

  if not public.owns_booking_item(p_item) and not public.is_admin() then
    raise exception '이 항목을 수락할 권한이 없습니다';
  end if;

  -- 이미 처리된 건을 다시 누르는 실수를 막는다.
  if v_item.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message',
      format('이미 처리된 항목입니다 (%s)', v_item.status));
  end if;

  update public.booking_items
     set status = 'confirmed', decided_at = now(), decline_reason = null
   where id = p_item;

  v_status := public.recompute_booking_status(v_item.booking_id);
  select * into v_bk from public.bookings where id = v_item.booking_id;

  -- 전부 수락됐을 때만 고객에게 알린다.
  -- 한 명 수락할 때마다 알림이 가면 소음이다.
  if v_status = 'confirmed' then
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (v_bk.customer_id, 'booking_confirmed', '예약이 확정되었습니다',
            coalesce(v_bk.date::text, '') || ' ' || coalesce(v_bk.time, '') ||
            ' 촬영이 확정되었습니다.',
            '/my-bookings',
            jsonb_build_object('booking_id', v_bk.id));
  end if;

  return jsonb_build_object('ok', true, 'booking_status', v_status);
end $$;

grant execute on function public.accept_booking_item(uuid) to authenticated;


create or replace function public.decline_booking_item(p_item uuid, p_reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item   public.booking_items;
  v_bk     public.bookings;
  v_status text;
  v_admin  uuid;
begin
  select * into v_item from public.booking_items where id = p_item;
  if not found then
    raise exception '항목을 찾을 수 없습니다';
  end if;

  if not public.owns_booking_item(p_item) and not public.is_admin() then
    raise exception '이 항목을 거절할 권한이 없습니다';
  end if;

  if v_item.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message',
      format('이미 처리된 항목입니다 (%s)', v_item.status));
  end if;

  update public.booking_items
     set status = 'cancelled', decided_at = now(),
         decline_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_item;

  v_status := public.recompute_booking_status(v_item.booking_id);
  select * into v_bk from public.bookings where id = v_item.booking_id;

  -- 고객에게는 무엇이 거절됐는지 항목 이름으로 말한다.
  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (v_bk.customer_id, 'booking_item_declined',
          v_item.item_name || ' 예약이 취소되었습니다',
          coalesce(v_item.provider_name, '공급자') || ' 측 사정으로 취소되었습니다.' ||
          case when p_reason is null or trim(p_reason) = '' then ''
               else E'\n사유: ' || p_reason end ||
          case when v_status = 'cancelled' then E'\n예약 전체가 취소되었습니다.'
               else E'\n나머지 항목은 그대로 진행됩니다. 해당 금액은 환불해드립니다.' end,
          '/my-bookings',
          jsonb_build_object('booking_id', v_bk.id, 'item_id', v_item.id));

  -- 부분 거절은 사람이 환불을 처리해야 한다. 관리자에게 알린다.
  -- 자동 환불로 만들지 않는 이유는 cancel-payment 가 아직 배포되지 않았고,
  -- 부분 환불은 금액 계산이 사람 판단을 요구하기 때문이다.
  if v_status <> 'cancelled' then
    for v_admin in
      select user_id from public.user_roles where role = 'admin' and status = 'active'
    loop
      insert into public.notifications (user_id, type, title, body, link, metadata)
      values (v_admin, 'refund_needed', '부분 환불이 필요합니다',
              coalesce(v_bk.date::text, '') || ' 예약에서 ' || v_item.item_name ||
              ' 이 거절되었습니다. 환불 금액 ' ||
              coalesce(v_bk.refund_due_amount, v_item.price)::text || '원',
              '/admin',
              jsonb_build_object('booking_id', v_bk.id, 'item_id', v_item.id));
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'booking_status', v_status);
end $$;

grant execute on function public.decline_booking_item(uuid, text) to authenticated;


-- ── 5. 내가 결정해야 할 항목 ──────────────────────────────────────────
--
-- 각 대시보드가 이걸 부른다. 역할마다 따로 만들지 않는다.

create or replace function public.my_pending_items()
returns table (
  item_id uuid, booking_id uuid,
  provider_type text, item_name text, item_option text,
  price int, timing text,
  start_at timestamptz, end_at timestamptz,
  booking_date date, booking_time text,
  customer_name text, total_price int,
  siblings jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, b.id,
         i.provider_type, i.item_name, i.item_option,
         i.price, i.timing,
         i.start_at, i.end_at,
         b.date, b.time,
         b.customer_name, b.total_price,
         -- 같은 예약의 다른 참여자. "누구와 함께 가는가" 를 알아야
         -- 수락할지 판단할 수 있다.
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'type', s.provider_type,
                   'name', s.provider_name,
                   'item', s.item_name,
                   'status', s.status)), '[]'::jsonb)
            from public.booking_items s
           where s.booking_id = b.id and s.id <> i.id)
    from public.booking_items i
    join public.bookings b on b.id = i.booking_id
   where i.status = 'pending'
     and b.status not in ('cancelled', 'refunded')
     and public.provider_user_id(i.provider_type, i.provider_id) = auth.uid()
   order by b.date, b.time;
$$;

grant execute on function public.my_pending_items() to authenticated;


-- ── 6. 기존 함수는 새 경로를 쓴다 ─────────────────────────────────────
--
-- approve_booking / reject_booking 을 호출하는 화면이 아직 있다.
-- 지우지 않고 "내 아이템을 처리한다" 로 의미를 바꾼다.

create or replace function public.approve_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_bk   public.bookings;
  v_n    int := 0;
begin
  for v_item in
    select i.id from public.booking_items i
     where i.booking_id = p_booking
       and i.status = 'pending'
       and public.provider_user_id(i.provider_type, i.provider_id) = auth.uid()
  loop
    perform public.accept_booking_item(v_item.id);
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise exception '수락할 항목이 없습니다. 이미 처리되었거나 권한이 없습니다.';
  end if;

  select * into v_bk from public.bookings where id = p_booking;
  return v_bk;
end $$;

create or replace function public.reject_booking(p_booking uuid, p_reason text default '')
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_bk   public.bookings;
  v_n    int := 0;
begin
  for v_item in
    select i.id from public.booking_items i
     where i.booking_id = p_booking
       and i.status = 'pending'
       and public.provider_user_id(i.provider_type, i.provider_id) = auth.uid()
  loop
    perform public.decline_booking_item(v_item.id, p_reason);
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise exception '거절할 항목이 없습니다. 이미 처리되었거나 권한이 없습니다.';
  end if;

  select * into v_bk from public.bookings where id = p_booking;
  return v_bk;
end $$;

grant execute on function public.approve_booking(uuid)      to authenticated;
grant execute on function public.reject_booking(uuid, text) to authenticated;


-- ── 7. 확인 ───────────────────────────────────────────────────────────

select 'photographer_id' as 항목,
       (select is_nullable from information_schema.columns
         where table_name = 'bookings' and column_name = 'photographer_id') as 값
union all
select '새 함수',
       (select count(*)::text from pg_proc
         where proname in ('recompute_booking_status','owns_booking_item',
                           'accept_booking_item','decline_booking_item','my_pending_items')
           and pronamespace = 'public'::regnamespace)
union all
select '거절 사유 컬럼',
       (select count(*)::text from information_schema.columns
         where table_name = 'booking_items'
           and column_name in ('decline_reason','decided_at'))
union all
select '환불 표시 컬럼',
       (select count(*)::text from information_schema.columns
         where table_name = 'bookings'
           and column_name in ('refund_due_amount','partial_declined_at'))
union all
select '예약 상태 ≠ 아이템 계산 (0이어야 정상)',
       (select count(*)::text from (
          select b.id
            from public.bookings b
            join public.booking_items i on i.booking_id = b.id
           where b.status not in ('completed','refunded')
           group by b.id, b.status
          having (count(*) filter (where i.status = 'pending') > 0
                  and b.status <> 'pending')
              or (count(*) filter (where i.status = 'confirmed') = 0
                  and count(*) filter (where i.status = 'pending') = 0
                  and b.status <> 'cancelled')
        ) x);
