-- ═══════════════════════════════════════════════════════════════════════
-- FIX_21: 채팅 알림 생성 + 이메일 발송 큐
--
-- 배경
--   1) 채팅은 알림을 아예 만들지 않았다.
--      sendChatMessage() 가 messages 에 INSERT 만 하고 끝나서,
--      상대방은 채팅창을 직접 열어보기 전에는 알 방법이 없었다.
--
--   2) 이메일이 나가지 않는다.
--      Edge Function(send-notification)은 잘 만들어져 있는데
--      배포되지 않았고, 호출하는 곳도 createBooking 한 군데뿐이었다.
--      작가는 48시간 안에 예약을 확정해야 하는데 홈페이지에
--      들어오지 않으면 알 방법이 없다.
--
-- 설계
--   알림을 만드는 것이 곧 메일을 예약하는 것이 되게 한다.
--   notifications 에 발송 상태를 두고, 스케줄러가 주기적으로 집어간다.
--   앞으로 알림을 추가하면 메일은 저절로 따라간다.
--
--   채팅은 5분 유예를 둔다. 대화가 오갈 때 메일이 연달아 가면
--   짜증을 유발하고, 상대가 이미 읽었으면 보낼 이유도 없다.
--
-- 적용 순서: FIX_20 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 발송 상태 컬럼
-- ───────────────────────────────────────────────────────────────────────
alter table public.notifications
  -- pending  보낼 차례를 기다리는 중
  -- sent     발송 완료
  -- skipped  보낼 필요가 없어짐 (이미 읽음 등)
  -- failed   발송 실패
  add column if not exists email_status text not null default 'pending'
    check (email_status in ('pending','sent','skipped','failed')),
  -- 이 시각 이후에 보낸다. 채팅은 +5분, 나머지는 즉시.
  add column if not exists email_after timestamptz not null default now(),
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;

create index if not exists idx_notifications_email_queue
  on public.notifications (email_after)
  where email_status = 'pending';


-- ───────────────────────────────────────────────────────────────────────
-- 2. 채팅 메시지 전송 + 상대방 알림
--
--    클라이언트에서 상대방에게 알림을 넣으려 하면 RLS 가 막는다
--    (notifications INSERT 는 user_id = auth.uid() 만 허용).
--    FIX_18 에서 예약 알림을 서버로 옮긴 것과 같은 이유다.
--
--    같은 방에 아직 안 읽은 알림이 남아 있으면 새로 만들지 않고
--    내용만 갱신한다. 메시지 10개에 알림 10개가 쌓이면 안 된다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.send_chat_message(p_room uuid, p_content text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room     public.chat_rooms;
  v_uid      uuid := auth.uid();
  v_msg      public.messages;
  v_target   uuid;
  v_sender   text;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;
  if coalesce(trim(p_content), '') = '' then
    raise exception '내용이 비어 있습니다';
  end if;

  select * into v_room from public.chat_rooms where id = p_room;
  if not found then
    raise exception '채팅방을 찾을 수 없습니다';
  end if;

  -- 이 방의 참여자인지 확인한다.
  -- photographer_id 는 photographers.id 라 auth uid 와 다른 값이다.
  if v_room.customer_id <> v_uid
     and not exists (
       select 1 from public.photographers
        where id = v_room.photographer_id and user_id = v_uid
     ) then
    raise exception '이 대화에 참여할 권한이 없습니다';
  end if;

  insert into public.messages (room_id, sender_id, content)
  values (p_room, v_uid, p_content)
  returning * into v_msg;

  -- 받는 사람 = 나머지 한쪽
  if v_room.customer_id = v_uid then
    select user_id into v_target
      from public.photographers where id = v_room.photographer_id;
    select coalesce(customer_name, '고객') into v_sender
      from public.bookings where id = v_room.booking_id;
  else
    v_target := v_room.customer_id;
    select coalesce(photographer_name, '작가') into v_sender
      from public.bookings where id = v_room.booking_id;
  end if;

  if v_target is null or v_target = v_uid then
    return v_msg;
  end if;

  -- 같은 방의 안 읽은 알림이 있으면 갱신만 한다
  select id into v_existing
    from public.notifications
   where user_id = v_target
     and type = 'chat_message'
     and read_at is null
     and metadata->>'roomId' = p_room::text
   order by created_at desc
   limit 1;

  if v_existing is not null then
    update public.notifications
       set body = left(p_content, 120),
           created_at = now(),
           -- 유예 시간을 다시 센다. 대화가 이어지는 동안은 보내지 않는다.
           email_after = now() + interval '5 minutes',
           email_status = case when email_status = 'sent' then 'pending' else email_status end
     where id = v_existing;
  else
    insert into public.notifications
      (user_id, type, title, body, link, metadata, email_after)
    values
      (v_target, 'chat_message',
       coalesce(v_sender, '상대방') || '님의 메시지',
       left(p_content, 120),
       '/my-bookings',
       jsonb_build_object('roomId', p_room, 'bookingId', v_room.booking_id),
       -- 채팅은 5분 유예. 그 안에 읽으면 메일을 보내지 않는다.
       now() + interval '5 minutes');
  end if;

  return v_msg;
end;
$$;

grant execute on function public.send_chat_message(uuid, text) to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 읽으면 메일을 취소한다
--    이미 확인한 내용을 메일로 또 받을 이유가 없다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.cancel_email_on_read()
returns trigger
language plpgsql
as $$
begin
  if new.read_at is not null and old.read_at is null and new.email_status = 'pending' then
    new.email_status := 'skipped';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_read_cancel on public.notifications;
create trigger trg_notifications_read_cancel
  before update on public.notifications
  for each row execute function public.cancel_email_on_read();


-- ───────────────────────────────────────────────────────────────────────
-- 4. 발송 대기 목록
--    Edge Function 이 이걸 읽어 메일을 보내고 상태를 바꾼다.
--    수신자 이메일은 profiles 에서 가져온다.
-- ───────────────────────────────────────────────────────────────────────
-- 수신자 언어. 메일 문구를 고르는 데 쓴다.
-- profiles 에 없어서 처음에는 42703 으로 실패했다.
alter table public.profiles
  add column if not exists lang text not null default 'ko'
    check (lang in ('ko','en','ja','zh'));

create or replace function public.pending_notification_emails(p_limit int default 50)
returns table (
  id uuid, user_id uuid, email text, name text,
  type text, title text, body text, link text,
  metadata jsonb, lang text, created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select n.id, n.user_id, p.email,
         coalesce(p.full_name, p.real_name, split_part(p.email, '@', 1)) as name,
         n.type, n.title, n.body, n.link, n.metadata,
         coalesce(p.lang, 'ko') as lang,
         n.created_at
    from public.notifications n
    join public.profiles p on p.id = n.user_id
   where n.email_status = 'pending'
     and n.email_after <= now()
     and n.read_at is null          -- 이미 읽었으면 보내지 않는다
     and p.email is not null
   order by n.email_after
   limit p_limit;
$$;

create or replace function public.mark_notification_email(
  p_id uuid, p_ok boolean, p_error text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set email_status  = case when p_ok then 'sent' else 'failed' end,
         email_sent_at = case when p_ok then now() else email_sent_at end,
         email_error   = p_error
   where id = p_id;
$$;

-- service_role 만 호출한다 (Edge Function 전용)
revoke execute on function public.pending_notification_emails(int) from authenticated, anon;
revoke execute on function public.mark_notification_email(uuid, boolean, text) from authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 5. 기존 알림은 발송 대상에서 제외한다
--    지난 검증 과정에서 쌓인 알림이 한꺼번에 메일로 나가면 곤란하다.
-- ───────────────────────────────────────────────────────────────────────
update public.notifications
   set email_status = 'skipped'
 where email_status = 'pending'
   and created_at < now();


-- ───────────────────────────────────────────────────────────────────────
-- 6. 확인
-- ───────────────────────────────────────────────────────────────────────
select email_status, count(*) from public.notifications group by email_status;
