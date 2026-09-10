-- ============================================================
-- FIX 9: notifications 테이블 컬럼 보강
--
-- 코드(createNotification / sendNotificationTo / NotificationBell)는
-- link · metadata 를 사용하는데 테이블에는 data jsonb 만 있어
-- 알림 insert 가 항상 실패하고 있었다.
-- ============================================================

alter table public.notifications add column if not exists link     text;
alter table public.notifications add column if not exists metadata jsonb default '{}';

-- 다른 사용자에게 알림을 보내려면(작가 -> 고객) 본인 행만 insert 하도록
-- 제한하면 안 된다. 기존 정책은 with check (true) 라 그대로 두되,
-- 읽기는 본인 것만 가능하도록 유지한다.
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

-- ============================================================
-- 검증
-- ============================================================
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'notifications'
order by ordinal_position;
