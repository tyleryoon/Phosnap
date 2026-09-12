-- FIX_36 — FIX_35 의 버그 두 개와 옛 구조의 잔재 정리
--
-- 2026-09-12
--
-- 1) provider_listing_status 가 400 을 낸다 (내 버그)
--
--    v_missing := v_missing || '활동 지역';
--
--    Postgres 는 이 `||` 를 anyarray || anyarray 로 먼저 해석해서
--    '활동 지역' 을 배열 리터럴로 캐스팅하려 한다.
--      ERROR: malformed array literal: "활동 지역"
--
--    대시보드 배너가 통째로 동작하지 않는다. array_append 로 바꾼다.
--
-- 2) 헤메가 벤더로 둔갑해 있던 잔재
--
--    옛 DressRentalTab 은 헤메에게 dress_vendors 레코드를 만들었다.
--    윤헤메(c21d6db0)에게 그 레코드가 남아 있고, 의상 1벌이 붙어 있다.
--    vendor 역할이 없으니 '미승인인데 고객에게 노출' 로 잡힌다.
--
--    FIX_33 이후에는 헤메가 dress_items.stylist_id 로 직접 갖는다.
--    의상을 헤메 소유로 옮기고 벤더 레코드는 내린다.
--
-- 3) refresh_provider_listing() 을 다시 돌리고 결과를 보여준다
--
--    FIX_35 실행 후에도 stylists / dress_vendors 가 자격과 어긋나 있었다.
--    이번에는 몇 건이 바뀌었는지 눈으로 확인한다.
--
-- 안전한가
--   · 의상 이관은 "같은 사람이 헤메이면서 vendor 역할이 없는" 경우만 한다.
--   · 진짜 의상 벤더(윤스튜디오)는 건드리지 않는다.
--   · 여러 번 실행해도 된다.


-- ── 1. 배너 함수 수정 ─────────────────────────────────────────────────

create or replace function public.provider_listing_status(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user uuid; v_loc text; v_has boolean; v_role text; v_active boolean;
  v_missing text[] := array[]::text[];
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
    return jsonb_build_object('ok', false, 'listed', false,
                              'missing', to_jsonb(array['알 수 없는 유형']));
  end if;

  if v_user is null then
    return jsonb_build_object('ok', false, 'listed', false,
                              'missing', to_jsonb(array['레코드를 찾을 수 없습니다']));
  end if;

  -- ⚠ `v_missing || '문자열'` 은 쓰지 마라.
  --    Postgres 가 anyarray || anyarray 로 해석해 문자열을 배열로
  --    캐스팅하려다 22P02 로 죽는다. array_append 는 모호하지 않다.
  if not public.is_provider_approved(v_user, v_role) then
    v_missing := array_append(v_missing, '관리자 승인');
  end if;
  if coalesce(v_loc, '') = '' then
    v_missing := array_append(v_missing, '활동 지역');
  end if;
  if not coalesce(v_has, false) then
    v_missing := array_append(v_missing, case p_kind
                                 when 'photographer' then '촬영 상품 1개 이상'
                                 when 'stylist'      then '시술 메뉴 1개 이상'
                                 when 'dress_vendor' then '의상 1벌 이상'
                                 else '장소 1개 이상' end);
  end if;

  return jsonb_build_object(
    'ok',      cardinality(v_missing) = 0,
    'listed',  coalesce(v_active, false),
    'missing', to_jsonb(v_missing)
  );
end $$;

grant execute on function public.provider_listing_status(text, uuid) to authenticated;


-- ── 2. 헤메 소유 의상을 헤메에게 돌려준다 ─────────────────────────────
--
-- 대상: dress_vendors 의 주인이 stylists 의 주인과 같고,
--       그 사람에게 vendor 역할이 없는 경우.
--       (= 옛 DressRentalTab 이 만든 가짜 벤더)

select '이관 대상' as 단계,
       v.name as 벤더, s.name_ko as 헤메,
       (select count(*) from public.dress_items i where i.vendor_id = v.id) as 의상수
  from public.dress_vendors v
  join public.stylists s on s.user_id = v.user_id
 where not public.is_provider_approved(v.user_id, 'vendor');


-- 2-B. 의상 이관
update public.dress_items i
   set stylist_id = s.id,
       vendor_id  = null
  from public.dress_vendors v
  join public.stylists s on s.user_id = v.user_id
 where i.vendor_id = v.id
   and not public.is_provider_approved(v.user_id, 'vendor');

-- 2-C. 헤메에게 '자체 의상 보유' 표시
update public.stylists s
   set dress_self = true
 where exists (select 1 from public.dress_items i where i.stylist_id = s.id)
   and not s.dress_self;

-- 2-D. 빈 껍데기 벤더 레코드는 내린다.
--      삭제하지는 않는다 — 예전 예약이 vendor_id 를 참조할 수 있다.
update public.dress_vendors v
   set is_active = false
 where not public.is_provider_approved(v.user_id, 'vendor');


-- ── 3. 트리거가 실제로 붙어 있는지 ────────────────────────────────────
--
-- FIX_35 를 돌린 뒤에도 stylists / dress_vendors 가 자격과 어긋나 있었다.
-- 트리거가 안 붙었는지, 붙었는데 안 먹었는지 먼저 본다.

select c.relname as 테이블, t.tgname as 트리거,
       case t.tgenabled when 'O' then '켜짐' when 'D' then '⚠ 꺼짐' else t.tgenabled::text end as 상태
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal
   and t.tgname in ('trg_guard_activation', 'trg_refresh_listing', 'trg_activate_on_approval')
 order by 1, 2;


-- ── 3-B. 자격대로 다시 맞춘다 ─────────────────────────────────────────

select public.refresh_provider_listing() as 변경건수;


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select '작가' as 유형, coalesce(name_ko, name) as 이름,
       is_active as 노출, public.provider_listable('photographer', id) as 자격,
       case when is_active = public.provider_listable('photographer', id)
            then '✅' else '⚠ 불일치' end as 판정
  from public.photographers
union all
select '헤메', coalesce(name_ko, display_name),
       is_active, public.provider_listable('stylist', id),
       case when is_active = public.provider_listable('stylist', id)
            then '✅' else '⚠ 불일치' end
  from public.stylists
union all
select '의상벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('dress_vendor', id),
       case when is_active = public.provider_listable('dress_vendor', id)
            then '✅' else '⚠ 불일치' end
  from public.dress_vendors
union all
select '장소벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('venue_vendor', id),
       case when is_active = public.provider_listable('venue_vendor', id)
            then '✅' else '⚠ 불일치' end
  from public.venue_vendors
order by 1, 2;
