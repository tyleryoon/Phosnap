-- ═══════════════════════════════════════════════════════════════════════
-- FIX_48: 동행비를 시간당으로도 받을 수 있게
--
-- 왜
--   FIX_47 에서 동행비를 건당 정액으로 뒀는데, 종일 동행은 촬영 길이만큼
--   붙어 있는다. 2시간 촬영과 8시간 촬영에 같은 값을 받는 건 맞지 않는다.
--
--   반대로 '촬영 중 합류' 는 duration_minutes 만큼만 있다가 간다 —
--   촬영이 길어져도 그 사람이 머무는 시간은 그대로다. 정액이 맞다.
--
--   그래서 단위를 헤메가 고르게 하고, 기본값만 시점에 따라 나눈다.
--
--     full    시간당 (hour)  — 촬영 길이만큼 함께 있는다
--     during  정액  (flat)   — 머무는 시간이 시술 길이로 고정이다
--
-- 계산
--   hour 이면 동행비 × 촬영 시간. 촬영 시간은 고객이 고른 길이다.
--   화면에서도 "동행 30,000/시간 × 4시간" 으로 풀어 보여준다.
--
-- 안전한가
--   칸을 더하기만 한다. 기존 시술은 정액으로 남으므로 값이 바뀌지 않는다.
--   여러 번 실행해도 된다.
--
-- 선행: FIX_47
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 단위 칸
-- ───────────────────────────────────────────────────────────────────────
alter table public.stylist_services
  add column if not exists accompany_fee_unit text not null default 'flat';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'stylist_services_accompany_fee_unit_check'
  ) then
    alter table public.stylist_services
      add constraint stylist_services_accompany_fee_unit_check
      check (accompany_fee_unit in ('flat', 'hour'));
  end if;
end $$;

comment on column public.stylist_services.accompany_fee_unit is
  '동행비 단위. flat = 건당 정액, hour = 시간당(촬영 길이를 곱한다). 종일 동행은 hour 가 기본이다.';

-- 이미 등록된 종일 동행을 시간당으로 옮기지 않는다.
-- 지금 값은 '정액' 을 전제로 정해진 값이라, 단위만 바꾸면 요금이
-- 몇 배로 튄다. 헤메가 직접 고르게 둔다.


-- ───────────────────────────────────────────────────────────────────────
-- 2. 조회 결과에 실어 보낸다
-- ───────────────────────────────────────────────────────────────────────
do $mig$
declare
  v_src    text;
  v_anchor text := 'then 0 else coalesce(sv.accompany_fee, 0) end as accompany_fee,';
  v_add    text := 'then 0 else coalesce(sv.accompany_fee, 0) end as accompany_fee,
                 coalesce(sv.accompany_fee_unit, ''flat'') as accompany_fee_unit,';
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'available_providers'
   limit 1;

  if v_src is null then
    raise exception 'available_providers 가 없습니다. FIX_43 을 먼저 적용하세요.';
  end if;

  if position('accompany_fee_unit' in v_src) > 0 then
    raise notice 'FIX_48: 이미 적용되어 있습니다.';
    return;
  end if;

  if position(v_anchor in v_src) = 0 then
    raise exception 'FIX_48: 동행비 칸을 찾지 못했습니다. FIX_47 을 먼저 적용하세요.';
  end if;

  execute replace(v_src, v_anchor, v_add);
  raise notice 'FIX_48: 동행비 단위를 조회 결과에 추가했습니다.';
end $mig$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 확인
--
--  select y ->> 'name_ko'            as 헤메,
--         y ->> 'timing'             as 시점,
--         y ->> 'price'              as 시술비,
--         y ->> 'accompany_fee'      as 동행비,
--         y ->> 'accompany_fee_unit' as 단위
--    from public.available_providers('seoul', '2026-10-15', '10:00', 2) r,
--         jsonb_array_elements(r -> 'stylists') y;
-- ───────────────────────────────────────────────────────────────────────
