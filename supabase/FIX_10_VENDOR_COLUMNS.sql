-- ============================================================
-- FIX 13: dress_vendors / venue_vendors 컬럼 보강
--
-- 벤더 가입 코드(VendorRegister)가 넣는 필드와 실제 스키마가 거의
-- 전부 어긋나 있다.
--   코드: vendor_type, name_ko, name_en, contact_phone, contact_email,
--         contact_instagram, contact_website, address, address_detail
--   실제: name, name_i18n, contact_info(jsonb) ...
-- → insert 가 42703 으로 실패하고, 벤더가 가입해도 업체 레코드가
--   만들어지지 않는다. (VendorRegister 의 재시도 로직은 vendor_types
--   복수형만 처리해 vendor_type 단수형 실패는 걸러내지 못한다)
-- ============================================================

alter table public.dress_vendors add column if not exists vendor_type       text;
alter table public.dress_vendors add column if not exists vendor_types      text[];
alter table public.dress_vendors add column if not exists name_ko           text;
alter table public.dress_vendors add column if not exists name_en           text;
alter table public.dress_vendors add column if not exists contact_phone     text;
alter table public.dress_vendors add column if not exists contact_email     text;
alter table public.dress_vendors add column if not exists contact_instagram text;
alter table public.dress_vendors add column if not exists contact_website   text;
alter table public.dress_vendors add column if not exists address           text;
alter table public.dress_vendors add column if not exists address_detail    text;

-- name 은 not null 이므로 name_ko 로부터 채워지도록 기본값을 완화한다
alter table public.dress_vendors alter column name drop not null;

-- name / name_ko 동기화 (어느 쪽으로 저장해도 양쪽이 채워지게)
create or replace function public.sync_vendor_name()
returns trigger language plpgsql as $$
begin
  if new.name is null and new.name_ko is not null then
    new.name := new.name_ko;
  end if;
  if new.name_ko is null and new.name is not null then
    new.name_ko := new.name;
  end if;
  if new.name is null then
    new.name := '이름 미설정';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_vendor_name on public.dress_vendors;
create trigger trg_sync_vendor_name
  before insert or update on public.dress_vendors
  for each row execute procedure public.sync_vendor_name();

-- ── venue_vendors 도 동일하게 ─────────────────────────────────
alter table public.venue_vendors add column if not exists name_ko           text;
alter table public.venue_vendors add column if not exists name_en           text;
alter table public.venue_vendors add column if not exists contact_phone     text;
alter table public.venue_vendors add column if not exists contact_email     text;
alter table public.venue_vendors add column if not exists contact_instagram text;
alter table public.venue_vendors add column if not exists contact_website   text;
alter table public.venue_vendors add column if not exists address           text;
alter table public.venue_vendors add column if not exists address_detail    text;

-- ── 벤더 본인 레코드 접근을 위한 인덱스 ───────────────────────
create index if not exists idx_dress_vendors_user_id on public.dress_vendors(user_id);
create index if not exists idx_venue_vendors_user_id on public.venue_vendors(user_id);

-- ── RLS: 벤더가 자기 레코드를 만들고 수정할 수 있어야 한다 ────
alter table public.dress_vendors enable row level security;

drop policy if exists "dress_vendors_public_read" on public.dress_vendors;
create policy "dress_vendors_public_read" on public.dress_vendors
  for select using (is_active = true or user_id = auth.uid());

drop policy if exists "dress_vendors_owner_insert" on public.dress_vendors;
create policy "dress_vendors_owner_insert" on public.dress_vendors
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "dress_vendors_owner_update" on public.dress_vendors;
create policy "dress_vendors_owner_update" on public.dress_vendors
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.venue_vendors enable row level security;

drop policy if exists "venue_vendors_public_read" on public.venue_vendors;
create policy "venue_vendors_public_read" on public.venue_vendors
  for select using (true);

drop policy if exists "venue_vendors_owner_insert" on public.venue_vendors;
create policy "venue_vendors_owner_insert" on public.venue_vendors
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "venue_vendors_owner_update" on public.venue_vendors;
create policy "venue_vendors_owner_update" on public.venue_vendors
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 검증
-- ============================================================
select p.email, p.role,
       (select count(*) from public.dress_vendors d where d.user_id = p.id) as dress_vendor_rows,
       (select count(*) from public.venue_vendors v where v.user_id = p.id) as venue_vendor_rows,
       (select count(*) from public.stylists  s where s.user_id = p.id) as stylist_rows
from public.profiles p
order by p.created_at;
