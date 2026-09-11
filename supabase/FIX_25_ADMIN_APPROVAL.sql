-- ═══════════════════════════════════════════════════════════════════════
-- FIX_25 — 관리자 승인 도구 + 역할 테이블 잠그기
--
-- 2026-09-11
--
-- ⚠ 순서대로 한 번에 실행해라. 중간에 끊으면 관리자 접근을 잃을 수 있다.
--   SQL Editor 는 스크립트 전체를 한 트랜잭션으로 돌리므로 실패하면
--   전부 되돌아간다. 그건 안전하다. 부분 실행이 위험하다.
--
--
-- ── 왜 이 파일이 필요한가 ─────────────────────────────────────────────
--
-- FIX_23 이 공급자 레코드 생성에 "역할이 있을 것" 을 요구하게 만들었다.
-- 그런데 역할 자체를 스스로 부여할 수 있으면 그 가드는 의미가 없다.
-- 지금 상태가 정확히 그렇다.
--
--   문제 1) user_roles 를 본인이 마음대로 쓴다
--       user_roles_self_insert  with check (auth.uid() = user_id)
--       user_roles_self_update  using      (auth.uid() = user_id)
--
--       role 과 status 에 아무 제약이 없다. 브라우저 콘솔에서
--         insert { user_id: 나, role: 'admin', status: 'active' }
--       가 그대로 통한다. 승인 절차가 있으나 마나다.
--
--       (UPDATE 정책에 with check 가 없으면 using 이 검사로 재사용된다.
--        user_id 만 고정될 뿐 role·status 는 자유롭게 바뀐다.)
--
--   문제 2) is_admin() 이 profiles.role 을 읽는다
--       그런데 profiles.role 은 switchUserRole() 이 매번 업데이트하는,
--       본인이 쓸 수 있는 값이다.
--         update profiles set role = 'admin' where id = 나
--       한 줄로 is_admin() 이 true 가 되고, 이 함수를 쓰는 **전 DB의
--       관리자 정책이 한꺼번에 열린다.** 지금까지 중 가장 무거운 구멍이다.
--
--   문제 3) status 에 'rejected' 가 없다
--       check (status in ('active','pending','suspended'))
--       ProtectedRoute 는 'rejected' 를 검사하지만 그 값이 들어갈 수
--       없으므로 반려 화면은 한 번도 뜬 적이 없다. 반려 기능이 없었다.
--
--
-- ── 무엇을 하나 ───────────────────────────────────────────────────────
--   1. user_roles 에 심사 컬럼 추가 + 'rejected' 허용
--   2. 기존 관리자를 user_roles 로 옮긴다 (권한 잃지 않게 먼저 한다)
--   3. is_admin() 을 user_roles 기반으로 교체
--   4. user_roles 정책을 조인다
--   5. 관리자용 RPC 3개 (목록 · 승인 · 반려) — 알림·메일 포함
--
-- 안전한가
--   · 2번이 3번보다 먼저다. 관리자 행을 만든 뒤에 판정 기준을 바꾼다.
--   · 5번은 SECURITY DEFINER 다. 규칙 5-11 — 권한이 걸린 쓰기는
--     클라이언트에 두지 않는다. RLS 가 막으면 조용히 0행이 되기 때문이다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. user_roles 확장
-- ───────────────────────────────────────────────────────────────────────

alter table public.user_roles
  add column if not exists reject_reason text,
  add column if not exists reviewed_at   timestamptz,
  add column if not exists reviewed_by   uuid references auth.users(id);

-- 'rejected' 를 허용한다. 제약 이름은 환경마다 다를 수 있어 찾아서 지운다.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.user_roles'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%';
  if c is not null then
    execute format('alter table public.user_roles drop constraint %I', c);
  end if;
end $$;

alter table public.user_roles
  add constraint user_roles_status_check
  check (status in ('active','pending','suspended','rejected'));


-- ───────────────────────────────────────────────────────────────────────
-- 2. 기존 관리자를 user_roles 로 옮긴다  ★ 3번보다 먼저 ★
--
--    profiles.role = 'admin' 인 사람에게 user_roles 행을 만들어 준다.
--    이걸 건너뛰고 3번을 실행하면 아무도 관리자가 아니게 된다.
-- ───────────────────────────────────────────────────────────────────────

insert into public.user_roles (user_id, role, status)
select p.id, 'admin', 'active'
  from public.profiles p
 where p.role = 'admin'
on conflict (user_id, role) do update set status = 'active';

-- 옮겨진 관리자 확인. 최소 1행이 나와야 한다.
-- 0행이면 여기서 멈추고 아래를 먼저 실행해라.
--   insert into public.user_roles (user_id, role, status)
--   select id, 'admin', 'active' from public.profiles
--    where email = 'keonsik806@gmail.com'
--   on conflict (user_id, role) do update set status = 'active';
do $$
declare n int;
begin
  select count(*) into n from public.user_roles
   where role = 'admin' and status = 'active';
  if n = 0 then
    raise exception '관리자가 한 명도 없다. 이대로 진행하면 /admin 에 아무도 못 들어간다. 위 주석의 insert 를 먼저 실행해라.';
  end if;
  raise notice '관리자 % 명 확인', n;
end $$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. is_admin() 교체 — profiles.role → user_roles
--
--    profiles.role 은 그대로 둔다. switchUserRole() 이 "지금 어느 역할로
--    보고 있나" 를 적는 용도로 계속 쓴다. 다만 **권한 판정에는 쓰지 않는다.**
--    사용자가 직접 쓸 수 있는 값이기 때문이다.
-- ───────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = auth.uid()
       and role = 'admin'
       and status = 'active'
  );
$$;

comment on function public.is_admin() is
  '관리자인가. user_roles 만 본다. profiles.role 은 사용자가 쓸 수 있으므로 권한 판정에 쓰지 않는다.';

grant execute on function public.is_admin() to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 4. user_roles 정책 조이기
-- ───────────────────────────────────────────────────────────────────────

-- 4-1. 본인 삽입 — 고객은 즉시, 공급자는 pending 강제, admin 은 금지
drop policy if exists "user_roles_self_insert" on public.user_roles;
create policy "user_roles_self_insert" on public.user_roles
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      (role = 'customer' and coalesce(status,'active') = 'active')
      or (role in ('artist','stylist','dress_vendor','vendor')
          and coalesce(status,'active') = 'pending')
    )
  );

-- 4-2. 본인 수정 — 없앤다.
--      가입자가 자기 역할 행을 고쳐야 할 이유가 없다.
--      승인·반려는 아래 RPC 가 SECURITY DEFINER 로 처리한다.
drop policy if exists "user_roles_self_update" on public.user_roles;

-- 4-3. 관리자 조회는 유지 (이미 is_admin() 기반)
drop policy if exists "user_roles_admin_read" on public.user_roles;
create policy "user_roles_admin_read" on public.user_roles
  for select using (public.is_admin());

-- 4-4. 관리자 수정 — RPC 를 쓰는 게 원칙이지만, 예외 상황에서
--      SQL 없이 손볼 수 있게 열어 둔다.
drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ───────────────────────────────────────────────────────────────────────
-- 5. 관리자용 RPC
-- ───────────────────────────────────────────────────────────────────────

-- 5-1. 승인 대기 목록
--
--   관리자가 판단하는 데 필요한 것을 한 번에 모아 준다.
--   포트폴리오·연락처까지 붙여 두면 신청서를 따로 열 필요가 없다.
create or replace function public.pending_role_requests()
returns table (
  user_id       uuid,
  email         text,
  full_name     text,
  real_name     text,
  phone         text,
  role          text,
  status        text,
  artist_type   text,
  instagram     text,
  website       text,
  portfolio_urls jsonb,
  requested_at  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.user_id, p.email, p.full_name, p.real_name, p.phone,
         r.role, r.status, p.artist_type, p.instagram, p.website,
         coalesce(p.portfolio_urls, '[]'::jsonb),
         r.created_at
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
   where r.status = 'pending'
     and public.is_admin()          -- 관리자가 아니면 0행
   order by r.created_at;
$$;

grant execute on function public.pending_role_requests() to authenticated;


-- 5-2. 승인
create or replace function public.approve_role(p_user uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_label  text;
begin
  if not public.is_admin() then
    raise exception '관리자만 승인할 수 있습니다';
  end if;

  select status into v_status
    from public.user_roles
   where user_id = p_user and role = p_role;

  if v_status is null then
    raise exception '해당 역할 신청을 찾을 수 없습니다 (%, %)', p_user, p_role;
  end if;
  -- 이미 처리된 건을 다시 누르는 실수를 막는다.
  -- FIX_18 의 approve_booking 과 같은 방식이다.
  if v_status <> 'pending' then
    return jsonb_build_object('ok', false, 'message',
      format('이미 처리된 신청입니다 (%s)', v_status));
  end if;

  update public.user_roles
     set status = 'active',
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         reject_reason = null
   where user_id = p_user and role = p_role;

  v_label := case p_role
               when 'artist' then '작가'
               when 'stylist' then '헤어메이크업'
               when 'dress_vendor' then '의상 업체'
               when 'vendor' then '의상 업체'
               else p_role end;

  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (p_user, 'role_approved',
          v_label || ' 가입이 승인되었습니다',
          '이제 대시보드에서 상품과 일정을 등록하실 수 있습니다. 등록을 마치면 고객에게 노출됩니다.',
          -- provider_link() 는 역할이 아니라 공급자 유형('photographer' 등)을
          -- 받는다. 'artist' 를 넘기면 else 로 떨어져 벤더 대시보드로 간다.
          -- 역할 → 경로는 여기서 직접 매핑한다.
          case p_role
            when 'artist'       then '/artist/dashboard'
            when 'stylist'      then '/stylist/dashboard'
            when 'dress_vendor' then '/vendor/dashboard'
            when 'vendor'       then '/vendor/dashboard'
            else '/'
          end,
          jsonb_build_object('role', p_role));

  return jsonb_build_object('ok', true, 'role', p_role, 'status', 'active');
end $$;

grant execute on function public.approve_role(uuid, text) to authenticated;


-- 5-3. 반려
create or replace function public.reject_role(p_user uuid, p_role text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_label  text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception '관리자만 반려할 수 있습니다';
  end if;
  -- 사유 없는 반려는 받지 않는다. 신청자가 뭘 고쳐야 할지 알 수 없다.
  if v_reason is null then
    raise exception '반려 사유를 입력해주세요';
  end if;

  select status into v_status
    from public.user_roles
   where user_id = p_user and role = p_role;

  if v_status is null then
    raise exception '해당 역할 신청을 찾을 수 없습니다 (%, %)', p_user, p_role;
  end if;
  if v_status <> 'pending' then
    return jsonb_build_object('ok', false, 'message',
      format('이미 처리된 신청입니다 (%s)', v_status));
  end if;

  update public.user_roles
     set status = 'rejected',
         reject_reason = v_reason,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where user_id = p_user and role = p_role;

  v_label := case p_role
               when 'artist' then '작가'
               when 'stylist' then '헤어메이크업'
               when 'dress_vendor' then '의상 업체'
               when 'vendor' then '의상 업체'
               else p_role end;

  insert into public.notifications (user_id, type, title, body, link, metadata)
  values (p_user, 'role_rejected',
          v_label || ' 가입이 반려되었습니다',
          v_reason,
          '/',
          jsonb_build_object('role', p_role, 'reason', v_reason));

  return jsonb_build_object('ok', true, 'role', p_role, 'status', 'rejected');
end $$;

grant execute on function public.reject_role(uuid, text, text) to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 6. 확인
-- ───────────────────────────────────────────────────────────────────────

select '관리자 수' as 항목,
       (select count(*)::text from public.user_roles
         where role = 'admin' and status = 'active') as 값,
       '1 이상이어야 한다' as 기대
union all
select 'is_admin() 출처',
       case when pg_get_functiondef('public.is_admin()'::regprocedure) ilike '%user_roles%'
            then 'user_roles ✅' else '⚠ 아직 profiles' end,
       'user_roles ✅'
union all
select 'user_roles 본인수정 정책',
       case when exists (select 1 from pg_policies
                          where tablename='user_roles' and policyname='user_roles_self_update')
            then '⚠ 아직 있음' else '제거됨 ✅' end,
       '제거됨 ✅'
union all
select '승인 대기 건수',
       (select count(*)::text from public.user_roles where status = 'pending'),
       '참고용'
union all
select 'RPC 등록',
       (select count(*)::text from pg_proc
         where pronamespace = 'public'::regnamespace
           and proname in ('pending_role_requests','approve_role','reject_role')),
       '3';
