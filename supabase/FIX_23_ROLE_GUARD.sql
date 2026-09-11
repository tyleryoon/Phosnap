-- ═══════════════════════════════════════════════════════════════════════
-- FIX_23 — 공급자 레코드 생성에 역할 검사를 건다
--
-- 2026-09-11
--
-- 무슨 일이 있었나
--   헤메(hnm@gmail.com) 와 의상벤더(yoonstudio@gmail.com) 계정에
--   비어 있는 photographers 레코드가 만들어져 있었다.
--   둘 다 user_roles 에 artist 행이 없다.
--
--   경로는 이랬다.
--     1) getUserRolesWithFallback 이 localStorage 의 역할을 DB 결과에 병합
--     2) ProtectedRoute 가 그걸 보고 /artist/dashboard 를 열어 줌
--     3) roleStatuses 는 DB 전용이라 주입된 역할은 status 가 undefined
--        → 승인대기(pending) 검사까지 통과
--     4) ArtistDashboard 진입 시 ensureArtistRecord 가 레코드 생성
--     5) RLS 는 auth.uid() = user_id 만 봐서 그대로 통과
--
--   1~4 는 코드에서 고쳤다. 이 파일은 5번을 고친다.
--   화면 가드는 UI 사정으로 언제든 느슨해지므로 마지막 방어선은 DB에 둔다.
--
-- 무엇이 바뀌나
--   INSERT 할 때 "그 역할 행이 user_roles 에 있고 반려되지 않았을 것" 을 요구한다.
--   승인(active)까지 요구하지는 않는다. 가입 절차가 pending 상태에서
--   공개 레코드를 만들기 때문이다. 승인 전 노출은 is_active = false 가 막는다.
--
-- 안전한가
--   · 읽기 정책은 건드리지 않는다 — 고객 화면에 영향 없다.
--   · UPDATE/DELETE 정책도 건드리지 않는다 — 기존 공급자 작업에 영향 없다.
--   · 이미 있는 레코드는 그대로 둔다. 정리는 FIX_24 에서 따로 한다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. 역할 보유 확인 헬퍼 ────────────────────────────────────────────
--
-- SECURITY DEFINER 로 두는 이유
--   정책 안에서 user_roles 를 직접 조회하면 user_roles 자신의 RLS 가
--   다시 평가되어 42P17(무한 재귀)이 날 수 있다. 지금까지 이 프로젝트에서
--   같은 이유로 여러 번 겪었다.

create or replace function public.has_role(p_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles r
     where r.user_id = auth.uid()
       and r.role = any(
             case
               when p_role in ('vendor','dress_vendor') then array['vendor','dress_vendor']
               else array[p_role]
             end)
       and coalesce(r.status, 'active') <> 'rejected'
  );
$$;

comment on function public.has_role(text) is
  '현재 로그인 사용자가 해당 역할 행을 갖고 있는가(반려 제외). RLS 정책 전용.';

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated, service_role;


-- ── 2. INSERT 정책 교체 ───────────────────────────────────────────────
--
-- 기존:  with check (auth.uid() = user_id)
-- 변경:  with check (auth.uid() = user_id and public.has_role('...'))
--
-- ⚠ 같은 테이블·같은 명령에 정책이 여러 개 있으면 Postgres 는 **OR** 로 합친다.
--   느슨한 옛 정책을 하나라도 남기면 새 정책은 아무 의미가 없다.
--   이 프로젝트는 영문 이름으로 만든 정책과 한글 이름으로 만든 정책이
--   마이그레이션 파일마다 섞여 있으므로, 아래에서 이름을 전부 지운다.

-- 2-1. photographers ← artist
drop policy if exists "작가 본인 삽입" on public.photographers;
drop policy if exists "Users can insert their own photographer profile" on public.photographers;
drop policy if exists "photographers_owner_insert" on public.photographers;
create policy "작가 본인 삽입" on public.photographers
  for insert with check (
    auth.uid() = user_id
    and public.has_role('artist')
  );

-- 2-2. stylists ← stylist
drop policy if exists "헤메 본인 삽입" on public.stylists;
drop policy if exists "스타일리스트 본인 삽입" on public.stylists;
drop policy if exists "Users can insert their own stylist profile" on public.stylists;
drop policy if exists "stylists_owner_insert" on public.stylists;
create policy "헤메 본인 삽입" on public.stylists
  for insert with check (
    auth.uid() = user_id
    and public.has_role('stylist')
  );

-- 2-3. dress_vendors ← dress_vendor 또는 stylist
--
--   헤메가 의상 대여도 하는 경우가 실제로 있다(헤메 대시보드의 의상 탭).
--   그래서 stylist 도 허용한다. 작가(artist)는 허용하지 않는다 —
--   작가의 '자체 의상'은 photographers.dress_self 플래그로 표현하지
--   별도 벤더 레코드를 만들지 않는다.
drop policy if exists "벤더 본인 삽입" on public.dress_vendors;
drop policy if exists "의상 벤더 본인 삽입" on public.dress_vendors;
drop policy if exists "dress_vendors_owner_insert" on public.dress_vendors;
drop policy if exists "의상업체 본인 삽입" on public.dress_vendors;
create policy "벤더 본인 삽입" on public.dress_vendors
  for insert with check (
    auth.uid() = user_id
    and (public.has_role('dress_vendor') or public.has_role('stylist'))
  );

-- 2-4. venue_vendors ← dress_vendor 또는 stylist
--
--   장소 벤더 레코드는 의상 벤더가 장소 상품을 등록할 때 파생된다
--   (ensureVenueVendor 가 dress_vendors 를 찾아 지역을 승계한다).
--   전용 역할이 따로 없으므로 같은 범위로 맞춘다.
drop policy if exists "장소벤더 본인 삽입" on public.venue_vendors;
drop policy if exists "venue_vendors_owner_insert" on public.venue_vendors;
drop policy if exists "촬영장소업체 본인 삽입" on public.venue_vendors;
create policy "장소벤더 본인 삽입" on public.venue_vendors
  for insert with check (
    auth.uid() = user_id
    and (public.has_role('dress_vendor') or public.has_role('stylist'))
  );


-- ── 3. 확인 ───────────────────────────────────────────────────────────
--
-- 테이블당 정확히 1행, 전부 '역할검사 있음' 이어야 한다.
-- 행이 더 있거나 '⚠ 역할검사 없음' 이 하나라도 보이면 옛 정책이 남은 것이고,
-- 그 경우 OR 로 합쳐지므로 이 패치는 효과가 없다. 그 이름을 위 drop 목록에 추가해라.

select tablename  as 테이블,
       policyname as 정책,
       case when with_check ilike '%has_role%' then '역할검사 있음'
            else '⚠ 역할검사 없음' end as 상태
  from pg_policies
 where schemaname = 'public'
   and cmd = 'INSERT'
   and tablename in ('photographers','stylists','dress_vendors','venue_vendors')
 order by tablename;
