-- ═══════════════════════════════════════════════════════════════════════
-- FIX_31 — 문의 접수 · 관리자 답변
--
-- 2026-09-12
--
-- 왜
--   개인정보 관리의 "유형 변경 문의" 가 mailto: 로 연결돼 있었다.
--     window.open('mailto:support@phosnap.com?subject=작가 유형 변경 요청')
--   메일 클라이언트가 없으면 아무 일도 안 일어나고(웹메일 쓰는 사람이 많다),
--   보냈는지 확인할 수 없고, 어디에도 기록이 안 남는다.
--
--   그리고 문의는 유형 변경만 있는 게 아니다. 예약·정산·오류·계정 등
--   카테고리를 나눠 받아야 관리자가 우선순위를 판단할 수 있다.
--
-- 설계
--   · 접수와 답변 모두 SECURITY DEFINER RPC. 규칙 5-11.
--     특히 답변은 남의 행을 수정하는 일이라 클라이언트에 두면
--     RLS 에 막혀 조용히 0행이 된다.
--   · 알림은 notifications 에 넣기만 하면 메일은 notify-worker 가
--     알아서 가져간다. 새로 붙일 배선이 없다.
--   · 비로그인 문의는 받지 않는다. 답변을 어디로 보낼지 알 수 없고
--     스팸 창구가 된다. (Contact 페이지의 폼은 그대로 둔다)
--
-- 안전한가
--   · 새 테이블뿐이다. 기존 것은 건드리지 않는다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. 테이블 ─────────────────────────────────────────────────────────

create table if not exists public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- 관리자가 분류·우선순위를 잡는 기준
  category     text not null check (category in (
                 'role_change',   -- 작가 유형 변경
                 'account',       -- 계정·로그인·개인정보
                 'booking',       -- 예약·일정
                 'payment',       -- 결제·환불
                 'settlement',    -- 정산·수수료
                 'bug',           -- 오류 신고
                 'suggestion',    -- 개선 제안
                 'other'
               )),
  subject      text not null,
  body         text not null,

  -- 문의 당시 역할. 같은 질문도 작가와 고객에게 답이 다르다.
  role_at_time text,

  status       text not null default 'open'
                 check (status in ('open','answered','closed')),
  answer       text,
  answered_at  timestamptz,
  answered_by  uuid references auth.users(id),

  created_at   timestamptz not null default now()
);

create index if not exists idx_inquiries_user   on public.inquiries(user_id, created_at desc);
create index if not exists idx_inquiries_open   on public.inquiries(created_at) where status = 'open';

alter table public.inquiries enable row level security;


-- ── 2. 정책 ───────────────────────────────────────────────────────────
--
-- 본인은 자기 문의를 읽는다. 쓰기는 RPC 로만 한다
-- (INSERT 정책을 열면 status/answer 를 직접 넣을 수 있다).

drop policy if exists "문의 본인 조회" on public.inquiries;
create policy "문의 본인 조회" on public.inquiries
  for select using (auth.uid() = user_id);

drop policy if exists "문의 관리자 조회" on public.inquiries;
create policy "문의 관리자 조회" on public.inquiries
  for select using (public.is_admin());


-- ── 3. 접수 ───────────────────────────────────────────────────────────

create or replace function public.submit_inquiry(
  p_category text,
  p_subject  text,
  p_body     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_subject text := nullif(btrim(coalesce(p_subject,'')), '');
  v_body    text := nullif(btrim(coalesce(p_body,'')), '');
  v_id      uuid;
  v_name    text;
  v_role    text;
  v_recent  int;
  v_admin   record;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;
  if v_subject is null then raise exception '제목을 입력해주세요'; end if;
  if v_body    is null then raise exception '문의 내용을 입력해주세요'; end if;
  if length(v_subject) > 200  then raise exception '제목은 200자 이내로 입력해주세요'; end if;
  if length(v_body)    > 5000 then raise exception '문의 내용은 5000자 이내로 입력해주세요'; end if;

  -- 같은 사람이 짧은 시간에 쏟아내는 걸 막는다.
  -- 실수로 버튼을 두 번 누르는 경우가 대부분이다.
  select count(*) into v_recent
    from public.inquiries
   where user_id = v_uid and created_at > now() - interval '1 minute';
  if v_recent >= 3 then
    return jsonb_build_object('ok', false,
      'message', '잠시 후 다시 시도해주세요. 1분에 3건까지 접수할 수 있습니다.');
  end if;

  select coalesce(p.full_name, p.real_name, p.email), p.role
    into v_name, v_role
    from public.profiles p where p.id = v_uid;

  insert into public.inquiries (user_id, category, subject, body, role_at_time)
  values (v_uid, p_category, v_subject, v_body, v_role)
  returning id into v_id;

  -- 접수 확인은 문의자 본인에게도 남긴다. "보냈는지" 를 알 수 있어야 한다.
  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (v_uid, 'inquiry_received',
          '문의가 접수되었습니다',
          v_subject,
          '/support',
          jsonb_build_object('inquiryId', v_id, 'category', p_category));

  -- 관리자 전원
  for v_admin in
    select user_id from public.user_roles where role = 'admin' and status = 'active'
  loop
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (v_admin.user_id, 'inquiry_new',
            '새 문의가 접수되었습니다',
            coalesce(v_name, '사용자') || ' · ' || p_category || E'\n' || v_subject,
            '/admin',
            jsonb_build_object('inquiryId', v_id, 'category', p_category));
  end loop;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

grant execute on function public.submit_inquiry(text, text, text) to authenticated;


-- ── 4. 답변 ───────────────────────────────────────────────────────────

create or replace function public.answer_inquiry(p_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer  text := nullif(btrim(coalesce(p_answer,'')), '');
  v_row     public.inquiries;
begin
  if not public.is_admin() then
    raise exception '관리자만 답변할 수 있습니다';
  end if;
  if v_answer is null then
    raise exception '답변 내용을 입력해주세요';
  end if;

  select * into v_row from public.inquiries where id = p_id;
  if v_row.id is null then
    raise exception '문의를 찾을 수 없습니다';
  end if;

  update public.inquiries
     set answer      = v_answer,
         status      = 'answered',
         answered_at = now(),
         answered_by = auth.uid()
   where id = p_id;

  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (v_row.user_id, 'inquiry_answered',
          '문의에 답변이 등록되었습니다',
          v_answer,
          '/support',
          jsonb_build_object('inquiryId', p_id));

  return jsonb_build_object('ok', true, 'status', 'answered');
end $$;

grant execute on function public.answer_inquiry(uuid, text) to authenticated;


-- ── 5. 종료 ───────────────────────────────────────────────────────────
-- 답변이 필요 없는 문의(중복·해결됨)를 닫는다. 알림은 보내지 않는다.

create or replace function public.close_inquiry(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 처리할 수 있습니다';
  end if;
  update public.inquiries
     set status = 'closed', answered_at = now(), answered_by = auth.uid()
   where id = p_id;
  return jsonb_build_object('ok', true, 'status', 'closed');
end $$;

grant execute on function public.close_inquiry(uuid) to authenticated;


-- ── 6. 관리자 목록 ────────────────────────────────────────────────────
--
-- RLS 로도 읽히지만, 문의자 이름·이메일을 붙이려면 profiles 를 조인해야 한다.
-- 관리자에게는 profiles 읽기 정책이 있으나 한 번에 주는 게 명확하다.

create or replace function public.admin_inquiries(p_status text default null)
returns table (
  id           uuid,
  user_id      uuid,
  email        text,
  full_name    text,
  role_at_time text,
  category     text,
  subject      text,
  body         text,
  status       text,
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, i.user_id, p.email, p.full_name, i.role_at_time,
         i.category, i.subject, i.body, i.status, i.answer,
         i.answered_at, i.created_at
    from public.inquiries i
    join public.profiles p on p.id = i.user_id
   where public.is_admin()
     and (p_status is null or i.status = p_status)
   -- 미답변을 위로. 오래 기다린 것부터.
   order by (i.status = 'open') desc, i.created_at;
$$;

grant execute on function public.admin_inquiries(text) to authenticated;


-- ── 7. 관리자 배지에 문의 포함 ────────────────────────────────────────

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
        (select count(*) from public.notifications where email_status = 'failed'),
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


-- ── 8. 확인 ───────────────────────────────────────────────────────────

select '테이블' as 항목,
       (select case when count(*) > 0 then 'inquiries 있음 ✅' else '⚠ 없음' end
          from information_schema.tables
         where table_schema='public' and table_name='inquiries') as 값,
       '있음' as 기대
union all
select 'RPC 등록',
       (select count(*)::text from pg_proc
         where pronamespace='public'::regnamespace
           and proname in ('submit_inquiry','answer_inquiry','close_inquiry','admin_inquiries')),
       '4'
union all
select 'admin_attention 에 문의 포함',
       (select case when pg_get_functiondef('public.admin_attention()'::regprocedure)
                         ilike '%open_inquiries%' then '포함됨 ✅' else '⚠ 아직' end),
       '포함됨 ✅'
union all
select '접수된 문의',
       (select count(*)::text from public.inquiries),
       '참고용';
