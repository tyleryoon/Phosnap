-- ═══════════════════════════════════════════════════════════════════════
-- FIX_22: 정기 작업 스케줄 (pg_cron)
--
-- 두 가지를 자동화한다.
--
--   1) 알림 이메일 발송 — 1분마다
--      notify-worker Edge Function 이 발송 대기 중인 알림을 집어간다.
--
--   2) 응답 없는 예약 자동 취소 — 10분마다
--      expire_stale_bookings() 는 원래 작가가 대시보드를 열 때만
--      실행됐다. 응답이 없는 작가일수록 대시보드에 들어오지 않으므로
--      정작 만료돼야 할 예약이 만료되지 않는 모순이 있었다.
--      (인수인계 문서의 기술 부채 항목)
--
-- ⚠ 실행 전에 service_role 키를 Vault 에 저장해야 한다. 아래 0번 참조.
--   키를 SQL 본문에 직접 적지 말 것. Vault 는 암호화해서 보관한다.
--
-- 적용 순서: FIX_21 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 0. 준비 — 이 블록은 키를 넣어 한 번만 따로 실행한다
--
--    Supabase 대시보드 → Settings → API → service_role 키 복사
--
--      select vault.create_secret(
--        '여기에_service_role_키',
--        'service_role_key',
--        'pg_cron 이 Edge Function 을 호출할 때 사용'
--      );
--
--    이미 넣었다면 건너뛴다. 확인:
--      select name, created_at from vault.secrets;
-- ───────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

grant usage on schema cron to postgres;


-- ───────────────────────────────────────────────────────────────────────
-- 1. 알림 이메일 발송 — 1분마다
--
--    워커는 멱등하다. 보낼 게 없으면 아무 일도 하지 않는다.
--    RESEND_API_KEY 가 없으면 워커가 조용히 넘어가므로,
--    메일 설정 전에 이 작업을 켜도 문제되지 않는다.
-- ───────────────────────────────────────────────────────────────────────
select cron.unschedule('notify-worker')
 where exists (select 1 from cron.job where jobname = 'notify-worker');

select cron.schedule(
  'notify-worker',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://znjkyvijjlahsxczweqh.supabase.co/functions/v1/notify-worker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
         where name = 'service_role_key' limit 1
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);


-- ───────────────────────────────────────────────────────────────────────
-- 2. 응답 없는 예약 자동 취소 — 10분마다
--
--    SQL 함수를 직접 부른다. Edge Function 을 거칠 이유가 없다.
--    취소되면 booking_items 도 함께 풀려야 헤메·벤더 일정이 되돌아간다.
-- ───────────────────────────────────────────────────────────────────────
select cron.unschedule('expire-stale-bookings')
 where exists (select 1 from cron.job where jobname = 'expire-stale-bookings');

select cron.schedule(
  'expire-stale-bookings',
  '*/10 * * * *',
  $$select public.expire_stale_bookings()$$
);


-- ───────────────────────────────────────────────────────────────────────
-- 3. 확인
-- ───────────────────────────────────────────────────────────────────────
select jobid, jobname, schedule, active from cron.job order by jobname;

-- 실행 이력 (몇 분 뒤에 확인)
-- select jobname, status, return_message, start_time
--   from cron.job_run_details
--  order by start_time desc limit 20;
