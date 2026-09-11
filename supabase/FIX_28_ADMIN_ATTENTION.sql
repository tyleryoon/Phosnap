-- ═══════════════════════════════════════════════════════════════════════
-- FIX_28 — 관리자가 볼 것이 있는지 알려주는 카운트
--
-- 2026-09-11
--
-- 왜
--   승인 대기가 쌓여도 관리자가 /admin 승인 탭을 직접 열어보기 전에는
--   알 수가 없다. 신청자는 그동안 계속 기다린다.
--   메일 알림은 가지만 메일을 놓칠 수 있다.
--
-- 무엇을
--   숫자만 돌려주는 가벼운 함수를 만든다. Nav 와 관리자 탭에서
--   1분에 한 번 정도 불러 빨간 점을 띄운다.
--
--   목록 조회(pending_role_requests)를 그 용도로 쓰지 않는다.
--   프로필·포트폴리오까지 끌고 오는 무거운 쿼리를 1분마다 돌릴 이유가 없다.
--
-- 안전한가
--   · 읽기 전용. 관리자가 아니면 전부 0 을 돌려준다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.admin_attention()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select case when public.is_admin() then
    jsonb_build_object(
      -- 승인/재심사 대기
      'pending_roles',
        (select count(*) from public.user_roles where status = 'pending'),
      -- 그중 재신청 건 (먼저 봐야 한다)
      'reapplied',
        (select count(*) from public.user_roles
          where status = 'pending' and coalesce(reapply_count,0) > 0),
      -- 메일이 안 나간 건 — 워커가 멈췄다는 신호
      'failed_emails',
        (select count(*) from public.notifications where email_status = 'failed'),
      -- 만료 시각이 지났는데 아직 대기인 예약 — 크론이 멈췄다는 신호
      'stale_bookings',
        (select count(*) from public.bookings
          where status = 'pending' and expires_at < now())
    )
  else
    jsonb_build_object('pending_roles', 0, 'reapplied', 0,
                       'failed_emails', 0, 'stale_bookings', 0)
  end;
$$;

comment on function public.admin_attention() is
  '관리자 확인이 필요한 항목 수. Nav 배지용 — 가볍게 자주 불린다.';

grant execute on function public.admin_attention() to authenticated;


-- 확인
select public.admin_attention() as 관리자_확인필요;
