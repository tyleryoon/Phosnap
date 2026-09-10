-- ============================================================
-- FIX 1: profiles RLS 무한 재귀 해결 (42P17)
-- 원인: "관리자 전체 조회" 정책이 profiles를 다시 SELECT
-- 해결: SECURITY DEFINER 함수로 role 조회 (RLS 우회)
-- ============================================================

-- 재귀를 유발하는 정책 제거
drop policy if exists "관리자 전체 조회" on public.profiles;

-- RLS를 우회하는 관리자 판별 함수
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- 재귀 없는 관리자 조회 정책
create policy "관리자 전체 조회"
  on public.profiles for select
  using (public.is_admin());

-- ============================================================
-- FIX 2: 테이블 권한 누락 해결 (42501 permission denied)
-- DROP SCHEMA public CASCADE 이후 GRANT가 일부만 복구된 문제
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- 앞으로 생성될 객체에도 동일 권한 자동 적용
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;

-- ============================================================
-- 검증
-- ============================================================
select 'profiles' as t, count(*) from public.profiles
union all select 'photographers', count(*) from public.photographers
union all select 'stylists', count(*) from public.stylists
union all select 'dress_vendors', count(*) from public.dress_vendors
union all select 'venue_vendors', count(*) from public.venue_vendors;
