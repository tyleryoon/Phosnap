-- ═══════════════════════════════════════════════════════════════════════
-- FIX_32 — 반송 메일 처리
--
-- 2026-09-12
--
-- 문제
--   `email_status = 'sent'` 은 **Resend 가 접수했다**는 뜻이지
--   받는 사람에게 도착했다는 뜻이 아니다.
--
--   실제로 겪었다 — photo2@gmail.com 은 존재하지 않는 주소인데
--   email_status 가 'sent' 로 남았다. Resend 는 200 을 주고 나서
--   반송(bounce)시킨다. 우리 DB 는 그걸 영영 모른다.
--
--   그대로 두면 두 가지가 나빠진다.
--     1) 작가가 예약 알림을 못 받는데 우리는 보냈다고 믿는다
--     2) 반송률이 높아지면 도메인 평판이 떨어져 정상 메일까지 스팸으로 간다
--
-- 하는 일
--   Resend 웹훅을 받아 상태를 갱신한다.
--     email.bounced    → 'bounced'
--     email.complained → 'complained'  (수신자가 스팸 신고)
--     email.delivered  → 'delivered'   (진짜 도착)
--
--   그리고 반송 주소를 profiles 에 표시해 둔다. 계속 보내면 안 된다.
--
-- 필요한 것
--   1) 이 SQL
--   2) Edge Function 배포 — --no-verify-jwt 를 반드시 붙인다
--        npx supabase functions deploy email-webhook --no-verify-jwt
--      안 붙이면 Supabase 게이트웨이가 401 로 막는다. Resend 는 JWT 를
--      보낼 수 없다. 함수가 Svix 서명을 직접 검증하므로 안전하다.
--   3) Resend 대시보드 → Webhooks → Add Webhook
--      https://<project>.supabase.co/functions/v1/email-webhook
--      이벤트: email.bounced, email.complained, email.delivered
--   4) 서명 검증 키를 Vault 에 저장 (아래 안내)
--
-- 안전한가
--   · 컬럼·함수 추가뿐이다. 기존 발송 흐름은 그대로다.
--   · 웹훅을 설정하지 않아도 아무 문제 없다. 지금과 똑같이 동작한다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. 상태 확장 ──────────────────────────────────────────────────────

do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.notifications'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%email_status%';
  if c is not null then
    execute format('alter table public.notifications drop constraint %I', c);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_email_status_check
  check (email_status in (
    'pending',     -- 아직 안 보냄
    'sent',        -- Resend 가 접수함 (도착 보장 아님)
    'delivered',   -- 받는 서버가 수락함
    'bounced',     -- 반송됨
    'complained',  -- 스팸 신고됨
    'skipped',     -- 읽어서 안 보냄
    'failed'       -- 발송 시도 자체가 실패
  ));

alter table public.notifications
  add column if not exists email_id text,          -- Resend 메시지 id
  add column if not exists email_event_at timestamptz;

create index if not exists idx_notifications_email_id
  on public.notifications (email_id) where email_id is not null;


-- ── 2. 발송 불가 주소 표시 ────────────────────────────────────────────
--
-- 반송된 주소로 계속 보내면 도메인 평판이 나빠진다.
-- 워커가 이 값을 보고 건너뛴다.

alter table public.profiles
  add column if not exists email_bounced_at timestamptz,
  add column if not exists email_bounce_reason text;


-- ── 3. 발송 시 메시지 id 기록 ─────────────────────────────────────────
--
-- 웹훅이 돌아왔을 때 어느 알림인지 찾으려면 id 가 필요하다.

create or replace function public.mark_notification_email(
  p_id    uuid,
  p_ok    boolean,
  p_error text default null,
  p_email_id text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set email_status  = case when p_ok then 'sent' else 'failed' end,
         email_sent_at = case when p_ok then now() else email_sent_at end,
         email_error   = p_error,
         email_id      = coalesce(p_email_id, email_id)
   where id = p_id;
$$;

revoke all on function public.mark_notification_email(uuid, boolean, text, text) from public;
grant execute on function public.mark_notification_email(uuid, boolean, text, text) to service_role;


-- ── 4. 웹훅이 부르는 함수 ─────────────────────────────────────────────

create or replace function public.record_email_event(
  p_email_id text,
  p_event    text,      -- 'delivered' | 'bounced' | 'complained'
  p_to       text default null,
  p_reason   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_n      int;
begin
  v_status := case p_event
                when 'delivered'  then 'delivered'
                when 'bounced'    then 'bounced'
                when 'complained' then 'complained'
                else null end;
  if v_status is null then
    return jsonb_build_object('ok', false, 'message', '알 수 없는 이벤트: ' || p_event);
  end if;

  update public.notifications
     set email_status   = v_status,
         email_event_at = now(),
         email_error    = coalesce(p_reason, email_error)
   where email_id = p_email_id;
  get diagnostics v_n = row_count;

  -- 반송·스팸신고는 주소 자체에 표시한다.
  -- delivered 는 지운다 — 주소를 고쳐서 다시 받게 된 경우다.
  if p_to is not null then
    if v_status in ('bounced', 'complained') then
      update public.profiles
         set email_bounced_at    = now(),
             email_bounce_reason = coalesce(p_reason, v_status)
       where lower(email) = lower(p_to);
    elsif v_status = 'delivered' then
      update public.profiles
         set email_bounced_at = null, email_bounce_reason = null
       where lower(email) = lower(p_to) and email_bounced_at is not null;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'status', v_status, 'updated', v_n);
end $$;

revoke all on function public.record_email_event(text, text, text, text) from public;
grant execute on function public.record_email_event(text, text, text, text) to service_role;


-- ── 5. 반송 주소에는 보내지 않는다 ────────────────────────────────────
--
-- 워커가 가져가는 목록에서 제외한다. 앱 내 알림은 그대로 남는다.

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
     and n.read_at is null
     -- 반송된 주소로는 다시 보내지 않는다.
     -- 계속 보내면 도메인 평판이 떨어져 정상 메일까지 스팸으로 간다.
     and p.email_bounced_at is null
     and coalesce(p.email, '') <> ''
   order by n.email_after
   limit p_limit;
$$;

grant execute on function public.pending_notification_emails(int) to service_role;


-- ── 6. 운영 점검에 반송 포함 ──────────────────────────────────────────

create or replace function public.admin_attention()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select case when public.is_admin() then
    jsonb_build_object(
      'pending_roles',
        (select count(*) from public.user_roles where status = 'pending'),
      'reapplied',
        (select count(*) from public.user_roles
          where status = 'pending' and coalesce(reapply_count,0) > 0),
      'open_inquiries',
        (select count(*) from public.inquiries where status = 'open'),
      'failed_emails',
        (select count(*) from public.notifications
          where email_status in ('failed','bounced','complained')),
      'stale_bookings',
        (select count(*) from public.bookings
          where status = 'pending' and expires_at < now())
    )
  else
    jsonb_build_object('pending_roles', 0, 'reapplied', 0, 'open_inquiries', 0,
                       'failed_emails', 0, 'stale_bookings', 0)
  end;
$$;

grant execute on function public.admin_attention() to authenticated;


-- ── 7. 웹훅 서명 키 저장 (배포 후에 한다) ─────────────────────────────
--
-- Resend 대시보드에서 웹훅을 만들면 Signing Secret 을 준다.
-- 그 값이 있어야 남이 보낸 가짜 요청을 걸러낼 수 있다.
--
-- Supabase 대시보드 → Edge Functions → Secrets 에
--   RESEND_WEBHOOK_SECRET = whsec_...
-- 로 넣어라. (service_role key 와 달리 이건 Function Secret 이 맞다)


-- ── 8. 확인 ───────────────────────────────────────────────────────────

select '상태 제약' as 항목,
       (select case when pg_get_constraintdef(oid) ilike '%bounced%'
                    then 'bounced 허용 ✅' else '⚠ 아직' end
          from pg_constraint
         where conrelid='public.notifications'::regclass
           and conname='notifications_email_status_check') as 값
union all
select 'email_id 컬럼',
       (select case when count(*)>0 then '있음 ✅' else '⚠ 없음' end
          from information_schema.columns
         where table_name='notifications' and column_name='email_id')
union all
select '반송 표시 컬럼',
       (select count(*)::text from information_schema.columns
         where table_name='profiles'
           and column_name in ('email_bounced_at','email_bounce_reason'))
union all
select 'record_email_event',
       (select case when count(*)>0 then '등록됨 ✅' else '⚠ 없음' end
          from pg_proc where proname='record_email_event'
            and pronamespace='public'::regnamespace)
union all
select '현재 메일 상태',
       (select coalesce(string_agg(email_status || ':' || c, ', '), '(없음)')
          from (select email_status, count(*)::text c
                  from public.notifications group by email_status) x);
