-- ============================================================
-- FIX 17: stylists 컬럼 보강 + RLS 확인
--
-- StylistDashboard 의 프로필 저장이 display_name 을 넘기는데
-- stylists 에는 name_ko / name_en 만 있어 update 가 42703 으로 실패한다.
-- (벤더 dress_vendors 와 동일한 패턴)
-- ============================================================

alter table public.stylists add column if not exists display_name text;

-- display_name 과 name_ko 동기화 + 노출 조건 자동화
create or replace function public.sync_stylist_name()
returns trigger language plpgsql as $$
begin
  if new.display_name is not null and length(trim(new.display_name)) > 0 then
    new.name_ko := new.display_name;
  elsif new.name_ko is not null and length(trim(new.name_ko)) > 0
        and new.name_ko <> '이름 미설정' then
    new.display_name := new.name_ko;
  end if;

  if new.name_ko is null or length(trim(new.name_ko)) = 0 then
    new.name_ko := '이름 미설정';
  end if;

  -- 이름과 전문분야가 채워지면 고객에게 노출
  new.is_active := (
    new.name_ko is not null
    and new.name_ko <> '이름 미설정'
    and new.specialty is not null and length(trim(new.specialty)) > 0
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_stylist_name on public.stylists;
create trigger trg_sync_stylist_name
  before insert or update on public.stylists
  for each row execute procedure public.sync_stylist_name();

-- ── stylist_services RLS (헤메가 자기 시술 메뉴를 관리) ────────
alter table public.stylist_services enable row level security;

drop policy if exists "stylist_services_public_read" on public.stylist_services;
create policy "stylist_services_public_read" on public.stylist_services
  for select using (true);

drop policy if exists "stylist_services_owner_all" on public.stylist_services;
create policy "stylist_services_owner_all" on public.stylist_services
  for all to authenticated
  using (stylist_id in (select id from public.stylists where user_id = auth.uid()))
  with check (stylist_id in (select id from public.stylists where user_id = auth.uid()));

-- ── stylist_schedules RLS ─────────────────────────────────────
alter table public.stylist_schedules enable row level security;

drop policy if exists "stylist_schedules_public_read" on public.stylist_schedules;
create policy "stylist_schedules_public_read" on public.stylist_schedules
  for select using (true);

drop policy if exists "stylist_schedules_owner_all" on public.stylist_schedules;
create policy "stylist_schedules_owner_all" on public.stylist_schedules
  for all to authenticated
  using (stylist_id in (select id from public.stylists where user_id = auth.uid()))
  with check (stylist_id in (select id from public.stylists where user_id = auth.uid()));

-- ============================================================
-- 검증
-- ============================================================
select column_name from information_schema.columns
where table_schema='public' and table_name='stylists' order by ordinal_position;
