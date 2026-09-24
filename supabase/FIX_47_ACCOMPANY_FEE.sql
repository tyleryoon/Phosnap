-- ═══════════════════════════════════════════════════════════════════════
-- FIX_47: 동행은 별도 요금
--
-- 정한 것 (2026-09-24)
--   헤메가 현장에 함께 있어주는 값은 시술값에 섞지 않고 따로 받는다.
--   고객은 "시술 120,000 + 동행 50,000" 으로 보고, 둘을 합쳐 낸다.
--
-- 왜
--   지금은 종일 동행 시술의 price 한 칸에 시술값과 동행값이 뭉쳐 있다.
--   고객은 왜 비싼지 알 수 없고, 헤메는 동행만 값을 올리거나 내릴 수
--   없다. 같은 헤어메이크업인데 동행 여부로 값이 두 배가 되면 바가지로
--   보인다 — 나뉘어 있으면 납득이 된다.
--
-- 단위는 정액이다
--   시간당이 아니라 건당 정액으로 받는다. 종일 동행은 max_hours 로
--   감당 가능한 촬영 길이를 헤메가 이미 묶어두므로(FIX_38), 정액이
--   그 범위 안에서 성립한다. 시간당이 필요해지면 단위 칸을 따로 둔다.
--
-- 촬영 전 시술(before)에는 붙지 않는다
--   현장에 남지 않으므로 동행이 아니다. 화면에서도 묻지 않는다.
--
-- 안전한가
--   칸을 더하기만 한다. 기본값 0 이라 기존 시술의 값은 그대로다.
--   여러 번 실행해도 된다.
--
-- 선행: FIX_46
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 동행비 칸
-- ───────────────────────────────────────────────────────────────────────
alter table public.stylist_services
  add column if not exists accompany_fee int not null default 0;

comment on column public.stylist_services.accompany_fee is
  '현장 동행 추가 요금(원, 건당 정액). timing 이 during/full 일 때만 의미가 있다 — before 는 현장에 남지 않는다.';

-- 촬영 전 시술에 값이 들어가 있으면 지운다. 안 받는 돈이다.
update public.stylist_services
   set accompany_fee = 0
 where coalesce(timing, 'before') = 'before'
   and accompany_fee <> 0;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 조회 결과에 실어 보낸다
--
--    available_providers 본체는 그대로 두고 헤메 select 에 한 칸만
--    더한다. 현재 정의를 읽어 끼워 넣으므로 본체가 또 바뀌어도 된다.
-- ───────────────────────────────────────────────────────────────────────
do $mig$
declare
  v_src    text;
  v_anchor text := 'sv.timing, sv.duration_minutes, sv.offset_minutes, sv.max_hours,';
  v_add    text := 'sv.timing, sv.duration_minutes, sv.offset_minutes, sv.max_hours,
                 case when coalesce(sv.timing, ''before'') = ''before''
                      then 0 else coalesce(sv.accompany_fee, 0) end as accompany_fee,';
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'available_providers'
   limit 1;

  if v_src is null then
    raise exception 'available_providers 가 없습니다. FIX_43 을 먼저 적용하세요.';
  end if;

  if position('accompany_fee' in v_src) > 0 then
    raise notice 'FIX_47: 이미 적용되어 있습니다.';
    return;
  end if;

  if position(v_anchor in v_src) = 0 then
    raise exception 'FIX_47: 헤메 select 를 찾지 못했습니다. available_providers 를 직접 확인하세요.';
  end if;

  execute replace(v_src, v_anchor, v_add);
  raise notice 'FIX_47: 동행비를 조회 결과에 추가했습니다.';
end $mig$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 확인
--
--    헤메 항목마다 accompany_fee 가 실려 오고, before 는 0 이어야 한다.
--
--  select y ->> 'name_ko'        as 헤메,
--         y ->> 'service_name'   as 시술,
--         y ->> 'timing'         as 시점,
--         y ->> 'price'          as 시술비,
--         y ->> 'accompany_fee'  as 동행비
--    from public.available_providers('seoul', '2026-10-15', '10:00', 2) r,
--         jsonb_array_elements(r -> 'stylists') y;
-- ───────────────────────────────────────────────────────────────────────
