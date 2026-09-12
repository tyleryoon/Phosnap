-- FIX_33 — 헤메 작가도 자체 의상을 가질 수 있게 한다
--
-- 2026-09-12
--
-- 왜
--   작가에게는 "자체 의상 보유" 를 물어보는데 헤메에게는 안 물어봤다.
--   헤메가 한복·드레스를 들고 다니는 경우가 많은데 등록할 자리가 없었다.
--
--   이게 되면 이런 조합이 성립한다.
--     작가(사진만, 자체 헤메 X, 자체 의상 X) + 헤메(자체 의상 O)
--   고객은 한 번에 사진·헤메·의상을 다 받고, 우리는 공급자를 둘만 붙인다.
--
-- 어떻게
--   dress_items 를 벤더와 헤메가 함께 쓴다.
--   vendor_id 와 stylist_id 중 정확히 하나만 채워진다.
--
--   따로 테이블을 만들지 않는 이유 — 사이즈·재고·이미지·카테고리 렌더링
--   코드가 이미 dress_items 기준으로 다 돌아간다. 두 벌로 나누면
--   한쪽만 고치는 버그가 반드시 생긴다.
--
-- 안전한가
--   · 컬럼 추가와 정책 교체뿐이다. 기존 벤더 의상은 그대로다.
--   · 여러 번 실행해도 된다.
--   · 앱을 배포하지 않아도 아무 문제 없다.


-- ── 1. 헤메에게 "자체 의상 보유" 플래그 ───────────────────────────────

alter table public.stylists
  add column if not exists dress_self boolean not null default false;

comment on column public.stylists.dress_self is
  '자체 의상 보유 여부. photographers.dress_self 와 같은 뜻이다.';


-- ── 2. dress_items 에 헤메 소유 경로 ──────────────────────────────────

alter table public.dress_items
  add column if not exists stylist_id uuid references public.stylists(id) on delete cascade;

-- 헤메 소유 의상은 vendor_id 가 비어 있다. NOT NULL 이 걸려 있으면 못 넣는다.
-- 아래 배타 제약이 "둘 중 하나는 반드시 있다" 를 대신 보장한다.
alter table public.dress_items
  alter column vendor_id drop not null;

-- 소유자는 둘 중 하나다. 둘 다 비면 주인 없는 의상이 되고,
-- 둘 다 차면 정산 대상이 둘이 된다. 어느 쪽도 허용하지 않는다.
alter table public.dress_items
  drop constraint if exists dress_items_owner_check;

alter table public.dress_items
  add constraint dress_items_owner_check
  check (
    (vendor_id is not null and stylist_id is null)
    or
    (vendor_id is null and stylist_id is not null)
  );

create index if not exists idx_dress_items_stylist
  on public.dress_items (stylist_id) where stylist_id is not null;


-- ── 3. RLS — 헤메도 자기 의상을 관리한다 ──────────────────────────────
--
-- 정책은 OR 로 합쳐진다. 벤더용 정책은 그대로 두고 헤메용을 더한다.
-- 단, 벤더용 정책이 stylist_id 행까지 허용하면 안 되므로
-- vendor_id is not null 조건을 명시해 다시 만든다.

drop policy if exists "Vendors can insert their own dress items" on public.dress_items;
create policy "Vendors can insert their own dress items"
  on public.dress_items for insert to authenticated
  with check (
    vendor_id is not null
    and exists (select 1 from public.dress_vendors v
                 where v.id = dress_items.vendor_id and v.user_id = auth.uid())
  );

drop policy if exists "Vendors can update their own dress items" on public.dress_items;
create policy "Vendors can update their own dress items"
  on public.dress_items for update to authenticated
  using (
    vendor_id is not null
    and exists (select 1 from public.dress_vendors v
                 where v.id = dress_items.vendor_id and v.user_id = auth.uid())
  )
  with check (
    vendor_id is not null
    and exists (select 1 from public.dress_vendors v
                 where v.id = dress_items.vendor_id and v.user_id = auth.uid())
  );

drop policy if exists "Vendors can delete their own dress items" on public.dress_items;
create policy "Vendors can delete their own dress items"
  on public.dress_items for delete to authenticated
  using (
    vendor_id is not null
    and exists (select 1 from public.dress_vendors v
                 where v.id = dress_items.vendor_id and v.user_id = auth.uid())
  );

-- 헤메용. has_role('stylist') 을 함께 본다 —
-- stylists 행만 있고 역할이 없는 상태를 막는다 (FIX_23 과 같은 이유).
drop policy if exists "헤메 본인 의상 삽입" on public.dress_items;
create policy "헤메 본인 의상 삽입"
  on public.dress_items for insert to authenticated
  with check (
    stylist_id is not null
    and public.has_role('stylist')
    and exists (select 1 from public.stylists s
                 where s.id = dress_items.stylist_id and s.user_id = auth.uid())
  );

drop policy if exists "헤메 본인 의상 수정" on public.dress_items;
create policy "헤메 본인 의상 수정"
  on public.dress_items for update to authenticated
  using (
    stylist_id is not null
    and exists (select 1 from public.stylists s
                 where s.id = dress_items.stylist_id and s.user_id = auth.uid())
  )
  with check (
    stylist_id is not null
    and exists (select 1 from public.stylists s
                 where s.id = dress_items.stylist_id and s.user_id = auth.uid())
  );

drop policy if exists "헤메 본인 의상 삭제" on public.dress_items;
create policy "헤메 본인 의상 삭제"
  on public.dress_items for delete to authenticated
  using (
    stylist_id is not null
    and exists (select 1 from public.stylists s
                 where s.id = dress_items.stylist_id and s.user_id = auth.uid())
  );


-- ── 4. 소유자 조회 — 정산이 누구에게 가는가 ───────────────────────────
--
-- booking_items.provider_id 로 들어온 값이 벤더인지 헤메인지 구분해
-- 실제 auth uid 를 돌려준다. 프론트의 attachProviderOwners 가 쓴다.

create or replace function public.dress_item_owner(p_item uuid)
returns table (provider_type text, provider_id uuid, owner_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select case when i.stylist_id is not null then 'stylist' else 'dress' end,
         coalesce(i.stylist_id, i.vendor_id),
         coalesce(s.user_id, v.user_id)
    from public.dress_items i
    left join public.stylists      s on s.id = i.stylist_id
    left join public.dress_vendors v on v.id = i.vendor_id
   where i.id = p_item;
$$;

grant execute on function public.dress_item_owner(uuid) to authenticated, anon;


-- ── 5. 확인 ───────────────────────────────────────────────────────────

select '헤메 dress_self 컬럼' as 항목,
       (select case when count(*) > 0 then '있음 ✅' else '⚠ 없음' end
          from information_schema.columns
         where table_name = 'stylists' and column_name = 'dress_self') as 값
union all
select 'dress_items.stylist_id',
       (select case when count(*) > 0 then '있음 ✅' else '⚠ 없음' end
          from information_schema.columns
         where table_name = 'dress_items' and column_name = 'stylist_id')
union all
select '소유자 배타 제약',
       (select case when count(*) > 0 then '걸림 ✅' else '⚠ 없음' end
          from pg_constraint
         where conrelid = 'public.dress_items'::regclass
           and conname = 'dress_items_owner_check')
union all
select '의상 정책 수',
       (select count(*)::text from pg_policies
         where schemaname = 'public' and tablename = 'dress_items')
union all
select '주인 없는 의상(0이어야 정상)',
       (select count(*)::text from public.dress_items
         where vendor_id is null and stylist_id is null)
union all
select 'dress_item_owner 함수',
       (select case when count(*) > 0 then '등록됨 ✅' else '⚠ 없음' end
          from pg_proc where proname = 'dress_item_owner'
            and pronamespace = 'public'::regnamespace);
