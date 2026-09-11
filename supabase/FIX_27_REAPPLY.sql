-- ═══════════════════════════════════════════════════════════════════════
-- FIX_27 — 반려된 신청의 재신청 경로
--
-- 2026-09-11
--
-- 문제
--   FIX_25 로 반려가 가능해졌는데, 반려되면 **막다른 길**이다.
--     · user_roles 는 (user_id, role) 유니크 → 새 행을 못 만든다
--     · user_roles_self_update 정책을 없앴다 → 본인이 못 고친다
--   즉 포트폴리오를 보완해도 다시 신청할 방법이 없다.
--   관리자가 SQL 을 돌려 주는 수밖에 없는데, 그러면 승인 도구를 만든
--   의미가 없다.
--
-- 설계
--   재신청도 서버 함수로 한다. 본인이 user_roles 를 직접 쓰게 열어 주면
--   pending → active 로 스스로 올리는 길이 다시 생긴다.
--
--   reapply_role(role, note)
--     · 호출자 본인의 행만 건드린다
--     · 'rejected' 일 때만 동작한다 (pending/active 는 그대로)
--     · status 를 'pending' 으로 되돌리고 재신청 횟수를 센다
--     · **보완 메모를 필수로 받는다** — 무엇을 고쳤는지 적게 한다.
--       그냥 버튼만 다시 누르는 재신청을 막고, 관리자가 재심사할 때
--       이전 반려 사유와 나란히 비교할 수 있게 한다
--     · 이전 반려 사유는 지우지 않는다. 관리자가 맥락을 봐야 한다
--     · 관리자 전원에게 알림을 넣는다
--
-- 안전한가
--   · 정책은 건드리지 않는다. 함수만 추가한다.
--   · 'rejected' 아닌 상태는 바꾸지 않는다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. 재심사 이력 컬럼 ───────────────────────────────────────────────

alter table public.user_roles
  add column if not exists reapply_count int not null default 0,
  add column if not exists reapply_note  text,
  add column if not exists reapplied_at  timestamptz;


-- ── 2. 재신청 ─────────────────────────────────────────────────────────

create or replace function public.reapply_role(p_role text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_count  int;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_admin  record;
  v_name   text;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;
  if v_note is null then
    raise exception '무엇을 보완했는지 적어주세요';
  end if;
  if length(v_note) > 1000 then
    raise exception '보완 내용은 1000자 이내로 적어주세요';
  end if;

  select status, reapply_count into v_status, v_count
    from public.user_roles
   where user_id = v_uid and role = p_role;

  if v_status is null then
    raise exception '신청 기록을 찾을 수 없습니다';
  end if;
  if v_status <> 'rejected' then
    return jsonb_build_object('ok', false, 'message',
      format('재신청할 수 있는 상태가 아닙니다 (%s)', v_status));
  end if;

  update public.user_roles
     set status        = 'pending',
         reapply_count = coalesce(reapply_count, 0) + 1,
         reapply_note  = v_note,
         reapplied_at  = now(),
         -- reviewed_* 는 지운다. 이번 건은 아직 아무도 안 봤다.
         reviewed_at   = null,
         reviewed_by   = null
         -- reject_reason 은 남긴다. 관리자가 이전에 뭘 지적했는지 봐야 한다.
   where user_id = v_uid and role = p_role;

  select coalesce(full_name, real_name, email) into v_name
    from public.profiles where id = v_uid;

  -- 관리자 전원에게 알림. 대기 목록을 매번 들여다볼 수는 없다.
  for v_admin in
    select user_id from public.user_roles
     where role = 'admin' and status = 'active'
  loop
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (v_admin.user_id, 'role_reapplied',
            '보완 후 재신청이 접수되었습니다',
            coalesce(v_name, '신청자') || ' · ' || p_role || E'\n' || v_note,
            '/admin',
            jsonb_build_object('role', p_role, 'applicant', v_uid));
  end loop;

  return jsonb_build_object('ok', true, 'status', 'pending',
                            'reapply_count', coalesce(v_count, 0) + 1);
end $$;

grant execute on function public.reapply_role(text, text) to authenticated;


-- ── 3. 본인 신청 상태 조회 ────────────────────────────────────────────
--
-- 반려 화면에서 사유를 보여주려면 본인이 자기 행을 읽을 수 있어야 한다.
-- user_roles_self_read 정책이 이미 있으므로 클라이언트가 직접 조회해도
-- 되지만, 필요한 컬럼만 주는 쪽이 명확하다.

create or replace function public.my_role_status(p_role text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
           'status',        r.status,
           'reject_reason', r.reject_reason,
           'reapply_count', coalesce(r.reapply_count, 0),
           'reviewed_at',   r.reviewed_at
         )
    from public.user_roles r
   where r.user_id = auth.uid() and r.role = p_role;
$$;

grant execute on function public.my_role_status(text) to authenticated;


-- ── 4. 승인 대기 목록에 재심사 맥락 추가 ──────────────────────────────
--
-- 반환 타입이 바뀌므로 create or replace 로는 안 된다. 먼저 지운다.

drop function if exists public.pending_role_requests();

create function public.pending_role_requests()
returns table (
  user_id        uuid,
  email          text,
  full_name      text,
  real_name      text,
  phone          text,
  role           text,
  status         text,
  artist_type    text,
  instagram      text,
  website        text,
  portfolio_urls jsonb,
  requested_at   timestamptz,
  reject_reason  text,   -- 이전에 왜 반려했는지
  reapply_count  int,    -- 몇 번째 재신청인지
  reapply_note   text,   -- 이번에 뭘 보완했다는지
  reapplied_at   timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.user_id, p.email, p.full_name, p.real_name, p.phone,
         r.role, r.status, p.artist_type, p.instagram, p.website,
         coalesce(p.portfolio_urls, '[]'::jsonb),
         r.created_at,
         r.reject_reason,
         coalesce(r.reapply_count, 0),
         r.reapply_note,
         r.reapplied_at
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
   where r.status = 'pending'
     and public.is_admin()
   -- 재신청 건을 위로 올린다. 기다린 시간이 더 길다.
   order by (r.reapply_count > 0) desc, coalesce(r.reapplied_at, r.created_at);
$$;

grant execute on function public.pending_role_requests() to authenticated;


-- ── 5. 확인 ───────────────────────────────────────────────────────────

select 'RPC 등록' as 항목,
       (select count(*)::text from pg_proc
         where pronamespace = 'public'::regnamespace
           and proname in ('reapply_role','my_role_status','pending_role_requests')) as 값,
       '3' as 기대
union all
select '재심사 컬럼',
       (select count(*)::text from information_schema.columns
         where table_name = 'user_roles'
           and column_name in ('reapply_count','reapply_note','reapplied_at')),
       '3'
union all
select '현재 승인 대기',
       (select count(*)::text from public.user_roles where status = 'pending'),
       '참고용';
