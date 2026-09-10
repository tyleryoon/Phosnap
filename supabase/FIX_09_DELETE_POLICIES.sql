-- ============================================================
-- FIX 12: DELETE 정책 누락 보완
--
-- notifications / messages 에 DELETE 정책이 없어 삭제 요청이 조용히
-- 무시된다. PostgREST 는 "0건 삭제"도 204 를 반환하므로 클라이언트는
-- 성공으로 착각한다. (지웠는데 새로고침하면 되살아나는 형태의 버그)
-- ============================================================

-- ── 알림: 본인 것만 삭제 ───────────────────────────────────────
drop policy if exists "notifications_self_delete" on public.notifications;
create policy "notifications_self_delete" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- ── 메시지: 보낸 사람만 삭제 ───────────────────────────────────
drop policy if exists "messages_sender_delete" on public.messages;
create policy "messages_sender_delete" on public.messages
  for delete to authenticated using (sender_id = auth.uid());

-- ============================================================
-- 검증
-- ============================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('notifications', 'messages')
order by tablename, cmd, policyname;
