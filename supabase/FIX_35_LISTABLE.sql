-- FIX_35 — 노출은 "켜는 값" 이 아니라 "계산되는 값" 이다
--
-- 2026-09-12
--
-- 내가 만든 회귀를 고친다
--   FIX_34 의 trg_activate_on_approval 은 승인되면 무조건
--   is_active = true 로 켰다. 프로필이 비어 있어도 켰다.
--
--   그래서 윤건식(지역 없음, 상품 없음)이 고객 검색에 노출됐다.
--   고객이 들어가면 예약할 수 있는 게 아무것도 없다.
--
--   원래 설계는 그게 아니었다. ensureArtistRecord 는
--   "필수 정보 입력 전까지 비노출" 이라며 false 로 만든다.
--   승인은 **필요조건**이지 충분조건이 아니다.
--
-- 어떻게 고치나
--   is_active 를 사람이 켜고 끄는 스위치가 아니라
--   조건을 만족하면 켜지는 계산값으로 만든다.
--
--     노출 = 역할 승인됨  AND  지역 있음  AND  팔 것이 하나 이상 있음
--
--   조건이 바뀌는 순간마다 재평가한다.
--     · 역할 승인·반려          → user_roles 트리거
--     · 프로필 수정(지역 등)     → 각 테이블 트리거
--     · 상품·아이템 추가·삭제    → packages / stylist_services /
--                                dress_items / venue_items 트리거
--
--   이러면 VERIFY 의 '활성 작가에 지역 없음', '활성 작가에 상품 없음',
--   '활성 장소벤더에 아이템 0개' 가 구조적으로 0이 된다.
--   사람이 실수로 켤 수 있는 자리를 없앤 것이다.
--
-- 필요한 것
--   FIX_34 를 먼저 실행했어야 한다 (is_provider_approved 함수를 쓴다).
--
-- 안전한가
--   · 조회 정책(SELECT)은 건드리지 않는다.
--   · 조건을 이미 만족하는 공급자는 그대로 켜져 있다.
--   · 마지막에 누가 켜지고 누가 꺼지는지 출력한다.
--   · 여러 번 실행해도 된다.


-- ── 1. 노출 자격 판정 ─────────────────────────────────────────────────
--
-- "팔 것이 하나 이상" 의 기준은 테이블마다 다르다.
--   작가   packages          (스냅 상품)
--   헤메   stylist_services  (시술 메뉴)
--   의상   dress_items
--   장소   venue_items

create or replace function public.provider_listable(p_kind text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user uuid;
  v_loc  text;
  v_has  boolean;
begin
  if p_kind = 'photographer' then
    select user_id, location_id into v_user, v_loc from public.photographers where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'artist') then return false; end if;
    select exists (select 1 from public.packages k where k.photographer_id = p_id) into v_has;

  elsif p_kind = 'stylist' then
    select user_id, location_id into v_user, v_loc from public.stylists where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'stylist') then return false; end if;
    select exists (select 1 from public.stylist_services s where s.stylist_id = p_id) into v_has;

  elsif p_kind = 'dress_vendor' then
    select user_id, location_id into v_user, v_loc from public.dress_vendors where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'vendor') then return false; end if;
    select exists (select 1 from public.dress_items i where i.vendor_id = p_id) into v_has;

  elsif p_kind = 'venue_vendor' then
    select user_id, location_id into v_user, v_loc from public.venue_vendors where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'vendor') then return false; end if;
    select exists (select 1 from public.venue_items i where i.vendor_id = p_id) into v_has;

  else
    return false;
  end if;

  -- 지역이 없으면 고객 검색에 걸리지 않는다. 노출해봐야 아무도 못 찾는다.
  if coalesce(v_loc, '') = '' then return false; end if;

  return coalesce(v_has, false);
end $$;

grant execute on function public.provider_listable(text, uuid) to authenticated, service_role;


-- ── 1-B. 왜 노출되지 않는가 ───────────────────────────────────────────
--
-- 자격 판정만 있으면 공급자는 "왜 내가 안 보이지" 를 알 수 없다.
-- 조건별로 무엇이 비었는지 돌려준다. 대시보드가 이걸 띄운다.

create or replace function public.provider_listing_status(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user uuid; v_loc text; v_has boolean; v_role text; v_active boolean;
  v_missing text[] := '{}';
begin
  if p_kind = 'photographer' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.photographers where id = p_id;
    v_role := 'artist';
    select exists (select 1 from public.packages k where k.photographer_id = p_id) into v_has;
  elsif p_kind = 'stylist' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.stylists where id = p_id;
    v_role := 'stylist';
    select exists (select 1 from public.stylist_services s where s.stylist_id = p_id) into v_has;
  elsif p_kind = 'dress_vendor' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.dress_vendors where id = p_id;
    v_role := 'vendor';
    select exists (select 1 from public.dress_items i where i.vendor_id = p_id) into v_has;
  elsif p_kind = 'venue_vendor' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.venue_vendors where id = p_id;
    v_role := 'vendor';
    select exists (select 1 from public.venue_items i where i.vendor_id = p_id) into v_has;
  else
    return jsonb_build_object('ok', false, 'missing', array['알 수 없는 유형']);
  end if;

  if v_user is null then
    return jsonb_build_object('ok', false, 'missing', array['레코드를 찾을 수 없습니다']);
  end if;

  if not public.is_provider_approved(v_user, v_role) then
    v_missing := v_missing || '관리자 승인';
  end if;
  if coalesce(v_loc, '') = '' then
    v_missing := v_missing || '활동 지역';
  end if;
  if not coalesce(v_has, false) then
    v_missing := v_missing || (case p_kind
                                 when 'photographer' then '촬영 상품 1개 이상'
                                 when 'stylist'      then '시술 메뉴 1개 이상'
                                 when 'dress_vendor' then '의상 1벌 이상'
                                 else '장소 1개 이상' end);
  end if;

  return jsonb_build_object(
    'ok',       array_length(v_missing, 1) is null,
    'listed',   coalesce(v_active, false),
    'missing',  v_missing
  );
end $$;

grant execute on function public.provider_listing_status(text, uuid) to authenticated;


-- ── 2. 재평가 ─────────────────────────────────────────────────────────
--
-- 한 사용자의 모든 공급자 레코드를 다시 계산한다.
-- p_user 가 null 이면 전체를 훑는다 (초기 정리용).

create or replace function public.refresh_provider_listing(p_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n int := 0; v_total int := 0;
begin
  update public.photographers t
     set is_active = public.provider_listable('photographer', t.id)
   where (p_user is null or t.user_id = p_user)
     and t.is_active is distinct from public.provider_listable('photographer', t.id);
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  update public.stylists t
     set is_active = public.provider_listable('stylist', t.id)
   where (p_user is null or t.user_id = p_user)
     and t.is_active is distinct from public.provider_listable('stylist', t.id);
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  update public.dress_vendors t
     set is_active = public.provider_listable('dress_vendor', t.id)
   where (p_user is null or t.user_id = p_user)
     and t.is_active is distinct from public.provider_listable('dress_vendor', t.id);
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  update public.venue_vendors t
     set is_active = public.provider_listable('venue_vendor', t.id)
   where (p_user is null or t.user_id = p_user)
     and t.is_active is distinct from public.provider_listable('venue_vendor', t.id);
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  return jsonb_build_object('changed', v_total);
end $$;

grant execute on function public.refresh_provider_listing(uuid) to authenticated, service_role;


-- ── 3. 승인 트리거 교체 ───────────────────────────────────────────────
--
-- FIX_34 는 승인되면 무조건 켰다. 이제는 자격을 다시 계산한다.
-- 승인만으로는 켜지지 않는다 — 지역과 상품이 있어야 켜진다.

create or replace function public.activate_on_role_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from coalesce(old.status, '') then
    perform public.refresh_provider_listing(new.user_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_activate_on_approval on public.user_roles;
create trigger trg_activate_on_approval
  after update of status on public.user_roles
  for each row execute function public.activate_on_role_approval();


-- ── 4. 조건이 바뀌는 자리마다 재평가 ──────────────────────────────────
--
-- 작가가 첫 상품을 올리는 순간 노출돼야 하고,
-- 마지막 상품을 지우는 순간 내려가야 한다.

create or replace function public.refresh_listing_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_user uuid;
begin
  v_row := coalesce(new, old);

  if tg_table_name = 'packages' then
    select user_id into v_user from public.photographers where id = v_row.photographer_id;
  elsif tg_table_name = 'stylist_services' then
    select user_id into v_user from public.stylists where id = v_row.stylist_id;
  elsif tg_table_name = 'dress_items' then
    -- 헤메 소유 의상은 벤더가 아니라 헤메의 노출에 영향을 준다.
    if v_row.stylist_id is not null then
      select user_id into v_user from public.stylists where id = v_row.stylist_id;
    else
      select user_id into v_user from public.dress_vendors where id = v_row.vendor_id;
    end if;
  elsif tg_table_name = 'venue_items' then
    select user_id into v_user from public.venue_vendors where id = v_row.vendor_id;
  end if;

  if v_user is not null then
    perform public.refresh_provider_listing(v_user);
  end if;

  return null;   -- AFTER 트리거라 반환값은 쓰이지 않는다
end $$;

do $$
declare t text;
begin
  foreach t in array array['packages','stylist_services','dress_items','venue_items'] loop
    execute format('drop trigger if exists trg_refresh_listing on public.%I', t);
    execute format(
      'create trigger trg_refresh_listing
         after insert or delete on public.%I
         for each row execute function public.refresh_listing_from_child()', t);
  end loop;
end $$;


-- ── 5. 프로필(지역) 수정 시 재평가 ────────────────────────────────────
--
-- FIX_34 의 guard_provider_activation 을 대체한다.
-- "미승인이면 끈다" 가 아니라 "자격대로 맞춘다" 로 넓힌다.
-- 사람이 is_active 를 손으로 켜도 자격이 없으면 되돌아간다.

create or replace function public.guard_provider_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_has  boolean;
begin
  -- 새 레코드는 언제나 비노출로 시작한다. 상품도 지역도 아직 없다.
  if tg_op = 'INSERT' then
    new.is_active := false;
    return new;
  end if;

  -- ⚠ provider_listable(kind, id) 를 쓰면 안 된다.
  --    BEFORE UPDATE 시점에 그 함수는 **아직 커밋되지 않은 new 가 아니라
  --    테이블의 옛 행**을 읽는다. 작가가 지역을 처음 입력하는 순간
  --    옛 값(null)을 보고 계속 꺼둬서, 저장해도 노출되지 않는다.
  --    그래서 여기서는 new 의 값으로 직접 계산한다.
  v_role := case tg_table_name
              when 'photographers' then 'artist'
              when 'stylists'      then 'stylist'
              else 'vendor'
            end;

  if not public.is_provider_approved(new.user_id, v_role)
     or coalesce(new.location_id, '') = '' then
    new.is_active := false;
    return new;
  end if;

  if tg_table_name = 'photographers' then
    select exists (select 1 from public.packages k where k.photographer_id = new.id) into v_has;
  elsif tg_table_name = 'stylists' then
    select exists (select 1 from public.stylist_services s where s.stylist_id = new.id) into v_has;
  elsif tg_table_name = 'dress_vendors' then
    select exists (select 1 from public.dress_items i where i.vendor_id = new.id) into v_has;
  else
    select exists (select 1 from public.venue_items i where i.vendor_id = new.id) into v_has;
  end if;

  new.is_active := coalesce(v_has, false);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['photographers','stylists','dress_vendors','venue_vendors'] loop
    execute format('drop trigger if exists trg_guard_activation on public.%I', t);
    -- of is_active 를 빼서 지역 수정 같은 일반 UPDATE 에도 반응하게 한다
    execute format(
      'create trigger trg_guard_activation
         before insert or update on public.%I
         for each row execute function public.guard_provider_activation()', t);
  end loop;
end $$;


-- ── 6. 지금 상태를 자격대로 맞춘다 ────────────────────────────────────

select '정리 전' as 단계, '작가' as 구분, coalesce(name_ko, name) as 이름,
       is_active as 현재, public.provider_listable('photographer', id) as 자격
  from public.photographers
union all
select '정리 전', '헤메', coalesce(name_ko, display_name),
       is_active, public.provider_listable('stylist', id)
  from public.stylists
union all
select '정리 전', '의상벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('dress_vendor', id)
  from public.dress_vendors
union all
select '정리 전', '장소벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('venue_vendor', id)
  from public.venue_vendors
order by 2, 3;


select public.refresh_provider_listing() as 변경건수;


-- ── 7. 확인 ───────────────────────────────────────────────────────────

select '자격 없는데 노출 (0이어야 정상)' as 항목,
       ((select count(*) from public.photographers
          where is_active and not public.provider_listable('photographer', id))
      + (select count(*) from public.stylists
          where is_active and not public.provider_listable('stylist', id))
      + (select count(*) from public.dress_vendors
          where is_active and not public.provider_listable('dress_vendor', id))
      + (select count(*) from public.venue_vendors
          where is_active and not public.provider_listable('venue_vendor', id))
       )::text as 값
union all
select '자격 있는데 비노출 (0이어야 정상)',
       ((select count(*) from public.photographers
          where not is_active and public.provider_listable('photographer', id))
      + (select count(*) from public.stylists
          where not is_active and public.provider_listable('stylist', id))
      + (select count(*) from public.dress_vendors
          where not is_active and public.provider_listable('dress_vendor', id))
      + (select count(*) from public.venue_vendors
          where not is_active and public.provider_listable('venue_vendor', id))
       )::text
union all
select '고객에게 보이는 작가',
       (select count(*)::text from public.photographers where is_active)
union all
select '고객에게 보이는 헤메',
       (select count(*)::text from public.stylists where is_active)
union all
select '재평가 트리거 (4여야 정상)',
       (select count(*)::text from pg_trigger
         where tgname = 'trg_refresh_listing' and not tgisinternal)
union all
select '노출 가드 트리거 (4여야 정상)',
       (select count(*)::text from pg_trigger
         where tgname = 'trg_guard_activation' and not tgisinternal);
