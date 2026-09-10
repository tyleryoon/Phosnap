-- ============================================================
-- FIX 10: 채팅 RLS 정비
--
-- 문제 A) chat_rooms 에 INSERT 정책이 없어 채팅방 생성이 항상 거부됨
--         → "Failed to load chat room"
-- 문제 B) 정책이 `auth.uid() = photographer_id` 로 비교하는데
--         chat_rooms.photographer_id 에는 photographers.id(UUID)가
--         들어간다. auth.uid() 와 절대 같지 않아 작가는 자기 채팅방을
--         조회할 수도, 메시지를 보낼 수도 없었다.
-- ============================================================

-- 내가 소유한 photographer id 목록 (FIX_03 에서 생성한 함수 재사용)
create or replace function public.my_photographer_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.photographers where user_id = auth.uid();
$$;
grant execute on function public.my_photographer_ids() to authenticated;

-- 이 채팅방의 당사자인지 판별
create or replace function public.can_access_chat_room(room uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id = room
      and (
        r.customer_id = auth.uid()
        or r.photographer_id in (select id from public.photographers where user_id = auth.uid())
      )
  );
$$;
grant execute on function public.can_access_chat_room(uuid) to authenticated;

-- ── chat_rooms ─────────────────────────────────────────────────
alter table public.chat_rooms enable row level security;

drop policy if exists "Users can see their own chat rooms" on public.chat_rooms;
create policy "chat_rooms_participant_select" on public.chat_rooms
  for select using (
    customer_id = auth.uid()
    or photographer_id in (select public.my_photographer_ids())
  );

-- 방 생성: 해당 예약의 당사자(고객 또는 작가)만
drop policy if exists "chat_rooms_participant_insert" on public.chat_rooms;
create policy "chat_rooms_participant_insert" on public.chat_rooms
  for insert to authenticated with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = auth.uid()
          or b.photographer_id in (select public.my_photographer_ids())
        )
    )
  );

-- ── messages ───────────────────────────────────────────────────
alter table public.messages enable row level security;

drop policy if exists "Users can see messages in their rooms" on public.messages;
create policy "messages_participant_select" on public.messages
  for select using (public.can_access_chat_room(room_id));

drop policy if exists "Users can send messages to their rooms" on public.messages;
create policy "messages_participant_insert" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.can_access_chat_room(room_id)
  );

-- 읽음 처리
drop policy if exists "messages_participant_update" on public.messages;
create policy "messages_participant_update" on public.messages
  for update to authenticated using (public.can_access_chat_room(room_id));

-- ============================================================
-- 검증
-- ============================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('chat_rooms', 'messages')
order by tablename, cmd;
