-- ============================================================
-- FIX 5: 작가 관련 RLS 정책 정비
--
-- 문제 A) photographers 에 INSERT 정책이 실제로 적용되지 않아
--         작가가 자기 공개 레코드를 만들 수 없음 (42501)
-- 문제 B) SELECT 정책이 is_active = true 뿐이라, 작가가 아직 공개하지
--         않은 자기 레코드를 스스로 조회하지 못함 → 대시보드가 매번
--         "레코드 없음"으로 판단하고 임시 ID 로 폴백
-- 문제 C) for all ... using(...) 만 있고 with check 가 없어 INSERT 가 막힘
--         (packages / artist_locations / artist_schedules / artist_defaults)
-- ============================================================

-- ── 공통 헬퍼: 내가 소유한 photographer id 목록 ─────────────────
create or replace function public.my_photographer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.photographers where user_id = auth.uid();
$$;

grant execute on function public.my_photographer_ids() to authenticated;

-- ── photographers ──────────────────────────────────────────────
alter table public.photographers enable row level security;

drop policy if exists "작가 공개 조회" on public.photographers;
create policy "작가 공개 조회" on public.photographers
  for select using (is_active = true or auth.uid() = user_id);

drop policy if exists "작가 본인 삽입" on public.photographers;
create policy "작가 본인 삽입" on public.photographers
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "작가 본인 수정" on public.photographers;
create policy "작가 본인 수정" on public.photographers
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "작가 본인 삭제" on public.photographers;
create policy "작가 본인 삭제" on public.photographers
  for delete to authenticated using (auth.uid() = user_id);

-- ── stylists (헤메) ────────────────────────────────────────────
alter table public.stylists enable row level security;

drop policy if exists "Stylists are viewable by everyone" on public.stylists;
create policy "Stylists are viewable by everyone" on public.stylists
  for select using (is_active = true or auth.uid() = user_id);

drop policy if exists "Users can insert their own stylist profile" on public.stylists;
create policy "Users can insert their own stylist profile" on public.stylists
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Stylists can update their own profile" on public.stylists;
create policy "Stylists can update their own profile" on public.stylists
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── packages ───────────────────────────────────────────────────
alter table public.packages enable row level security;

drop policy if exists "packages_public_read" on public.packages;
create policy "packages_public_read" on public.packages
  for select using (
    is_active = true or photographer_id in (select public.my_photographer_ids())
  );

drop policy if exists "packages_owner_all" on public.packages;
create policy "packages_owner_all" on public.packages
  for all to authenticated
  using      (photographer_id in (select public.my_photographer_ids()))
  with check (photographer_id in (select public.my_photographer_ids()));

-- ── artist_locations ───────────────────────────────────────────
alter table public.artist_locations enable row level security;

drop policy if exists "지역 공개 조회" on public.artist_locations;
create policy "지역 공개 조회" on public.artist_locations
  for select using (
    is_active = true or photographer_id in (select public.my_photographer_ids())
  );

drop policy if exists "지역 본인 수정" on public.artist_locations;
create policy "지역 본인 수정" on public.artist_locations
  for all to authenticated
  using      (photographer_id in (select public.my_photographer_ids()))
  with check (photographer_id in (select public.my_photographer_ids()));

-- ── artist_schedules ───────────────────────────────────────────
alter table public.artist_schedules enable row level security;

drop policy if exists "스케줄 공개 조회" on public.artist_schedules;
create policy "스케줄 공개 조회" on public.artist_schedules
  for select using (true);

drop policy if exists "스케줄 본인 수정" on public.artist_schedules;
create policy "스케줄 본인 수정" on public.artist_schedules
  for all to authenticated
  using      (photographer_id in (select public.my_photographer_ids()))
  with check (photographer_id in (select public.my_photographer_ids()));

-- ── artist_defaults ────────────────────────────────────────────
alter table public.artist_defaults enable row level security;

drop policy if exists "기본시간 공개 조회" on public.artist_defaults;
create policy "기본시간 공개 조회" on public.artist_defaults
  for select using (true);

drop policy if exists "기본시간 본인 수정" on public.artist_defaults;
create policy "기본시간 본인 수정" on public.artist_defaults
  for all to authenticated
  using      (photographer_id in (select public.my_photographer_ids()))
  with check (photographer_id in (select public.my_photographer_ids()));

-- ============================================================
-- 검증: 각 테이블의 정책 목록
-- ============================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('photographers','stylists','packages',
                    'artist_locations','artist_schedules','artist_defaults')
order by tablename, cmd, policyname;
