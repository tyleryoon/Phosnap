-- ═══════════════════════════════════════════════════════════════════════
-- FIX_26 — 관리자 읽기 정책을 is_admin() 으로 통일
--
-- 2026-09-11
--
-- 문제
--   FIX_25 에서 is_admin() 을 user_roles 기반으로 바꿨다.
--   그런데 관리자 정책 중 일부는 is_admin() 을 쓰지 않고
--   profiles.role = 'admin' 을 **정책 안에 직접 박아** 두고 있다.
--
--     MASTER_MIGRATION.sql
--       "관리자 예약 전체 조회" on bookings
--       "관리자 예약 수정"      on bookings
--       "관리자 작가 전체 조회" on photographers
--
--   결과가 두 가지로 나쁘다.
--     1) 지금 관리자가 관리자 화면에서 아무것도 못 본다.
--        profiles.role 은 switchUserRole() 이 "마지막으로 본 역할"로
--        덮어쓴다. 작가 대시보드를 한 번이라도 열었으면 'artist' 다.
--     2) 고치기 전까지 예전 우회가 그대로 살아 있다.
--        update profiles set role='admin' where id=나  → 정책 통과.
--
--   그리고 이게 화면에서 어떻게 보였냐면 — **아무 일도 안 일어난 것처럼
--   보였다.** RLS 는 막힌 행을 조용히 빼고 200 을 돌려주므로 "0건" 이다.
--   AdminDashboard 는 그 0건을 받아 mock 데이터로 대체하고 있었다(방금 제거).
--
-- 하는 일
--   관리자 정책 전부를 is_admin() 기반으로 다시 만든다.
--   관리자 화면이 필요로 하는 테이블에 읽기 정책을 맞춰 준다.
--
-- 안전한가
--   · 읽기 정책만 추가/교체한다. 기존 사용자 정책은 건드리지 않는다.
--   · 정책은 OR 로 합쳐지므로, 관리자 정책을 추가해도
--     일반 사용자가 보던 범위는 줄지 않는다.
--   · 여러 번 실행해도 된다.
--   · FIX_25 를 먼저 실행했어야 한다 (is_admin() 이 user_roles 를 봐야 한다).
-- ═══════════════════════════════════════════════════════════════════════


-- ── 0. 선행 조건 확인 ─────────────────────────────────────────────────
do $$
begin
  if pg_get_functiondef('public.is_admin()'::regprocedure) not ilike '%user_roles%' then
    raise exception 'is_admin() 이 아직 user_roles 를 보지 않는다. FIX_25 를 먼저 실행해라.';
  end if;
end $$;


-- ── 1. 기존 관리자 정책 제거 ──────────────────────────────────────────
--
-- 이름이 파일마다 다르다. 한 번에 정리한다.

drop policy if exists "관리자 전체 조회"      on public.profiles;
drop policy if exists "관리자 예약 전체 조회" on public.bookings;
drop policy if exists "관리자 예약 수정"      on public.bookings;
drop policy if exists "관리자 작가 전체 조회" on public.photographers;


-- ── 2. is_admin() 기반으로 다시 만든다 ────────────────────────────────

-- 2-1. profiles — 회원 관리 탭
create policy "관리자 전체 조회" on public.profiles
  for select using (public.is_admin());

-- 2-2. bookings — 예약 관리 탭
create policy "관리자 예약 전체 조회" on public.bookings
  for select using (public.is_admin());

-- 관리자 수정은 남겨 둔다. 예약 상태를 손으로 고쳐야 하는 상황이 있다.
-- (승인·거절 자체는 approve_booking / reject_booking RPC 를 쓴다)
create policy "관리자 예약 수정" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- 2-3. photographers — 비활성 작가도 봐야 한다
create policy "관리자 작가 전체 조회" on public.photographers
  for select using (public.is_admin());

-- 2-4. 나머지 공급자 — 승인 심사 때 실제 등록 내용을 봐야 한다.
--      공개 조회 정책은 is_active = true 만 보여주므로
--      승인 전 계정은 관리자에게도 보이지 않는다.
drop policy if exists "관리자 헤메 전체 조회" on public.stylists;
create policy "관리자 헤메 전체 조회" on public.stylists
  for select using (public.is_admin());

drop policy if exists "관리자 의상벤더 전체 조회" on public.dress_vendors;
create policy "관리자 의상벤더 전체 조회" on public.dress_vendors
  for select using (public.is_admin());

drop policy if exists "관리자 장소벤더 전체 조회" on public.venue_vendors;
create policy "관리자 장소벤더 전체 조회" on public.venue_vendors
  for select using (public.is_admin());

-- 2-5. booking_items — 예약 하나를 열었을 때 구성 내역
drop policy if exists "관리자 예약아이템 조회" on public.booking_items;
create policy "관리자 예약아이템 조회" on public.booking_items
  for select using (public.is_admin());


-- ── 3. 확인 ───────────────────────────────────────────────────────────
--
-- 8행이 나오고 전부 'is_admin ✅' 이어야 한다.

select tablename as 테이블, policyname as 정책, cmd as 명령,
       case when coalesce(qual,'') ilike '%is_admin%' then 'is_admin ✅'
            else '⚠ 직접 검사' end as 판정방식
  from pg_policies
 where schemaname = 'public'
   and policyname like '관리자%'
 order by tablename, policyname;


-- ── 4. 관리자 시점 실제 조회 (선택) ───────────────────────────────────
--
-- 정책이 걸렸는지 말고 **실제로 보이는지** 확인한다.
-- 아래 uuid 를 네 계정으로 바꿔 블록째 실행해라.
-- (VERIFY.sql 2-C 와 같은 방식이다)

/*
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub','391a4424-d141-466a-ab9d-77f7bcc0e312',
                    'role','authenticated')::text, true);

select 'is_admin()' as 항목, public.is_admin()::text as 값
union all select '프로필',   count(*)::text from public.profiles
union all select '예약',     count(*)::text from public.bookings
union all select '작가',     count(*)::text from public.photographers
union all select '헤메',     count(*)::text from public.stylists
union all select '의상벤더', count(*)::text from public.dress_vendors;

reset role;
*/
