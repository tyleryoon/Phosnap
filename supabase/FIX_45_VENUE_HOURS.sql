-- ═══════════════════════════════════════════════════════════════════════
-- FIX_45: 장소도 운영 시간을 본다
--
-- 배경
--   FIX_44 를 넣고 예약 가용성을 확인하다 같은 종류의 구멍을 찾았다.
--
--     서울 / 2026-10-15 / 19:00 / 2시간 으로 조회하면
--       작가  0명   ← artist_slot_open 이 막는다 (운영 시간 밖)
--       장소  3곳   ← 그대로 나온다
--
--   등록된 장소 7곳은 전부 09:00~18:00 운영인데 19~21시 촬영에도
--   목록에 뜬다. 고객이 문 닫은 시간의 장소를 담고 결제까지 간다.
--
--   원인은 단순하다. available_providers 가 시간대 검사(artist_slot_open)를
--   **작가에게만** 걸고 있었다. 장소·헤메·의상은 provider_is_open —
--   즉 "그 날 쉬는가" 만 봤다.
--
--   의상은 하루 단위 대여라 시간대를 따지지 않는 게 맞다.
--   헤메는 시술 시점(before/during/full)에 따라 촬영 시각과 **다른**
--   시간에 일한다 — 촬영 구간으로 재면 안 되므로 여기서 다루지 않는다.
--   장소는 촬영 구간을 그대로 쓴다(item_is_busy 도 v_shoot 로 잰다).
--   그래서 이번에는 장소만 고친다.
--
-- 무엇을 하나
--   provider_slot_open   유형을 받는 시간대 검사 (provider_* 를 본다)
--   artist_slot_open     위 함수를 부르는 얇은 껍데기로 (시그니처 유지)
--   available_providers  장소 조건에 provider_slot_open 추가
--
-- 안전한가
--   함수만 바꾼다. 테이블·칼럼은 손대지 않는다. 여러 번 실행해도 된다.
--
-- 선행: FIX_44
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 유형을 받는 시간대 검사
--
--    슬롯은 1시간 단위의 현지 벽시계 문자열('10:00')이고 p_start 도
--    고객이 고른 현지 시각이다. 시간대 변환을 하지 않는 게 기존 규칙이고
--    여기서도 그대로 따른다 — 파리 촬영은 파리 시각으로 비교된다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.provider_slot_open(
  p_type  text,
  p_id    uuid,
  p_date  date,
  p_start time,
  p_hours numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_slots   text[];
  v_blocked text[];
  v_found   boolean := false;
  v_need    text;
  i int;
begin
  -- 날짜별 설정 (정본)
  select slots, blocked, true into v_slots, v_blocked, v_found
    from public.provider_schedules
   where provider_type = p_type and provider_id = p_id and date = p_date;

  -- 아직 이관되지 않은 옛 작가 스케줄
  if not v_found and p_type = 'photographer' then
    select slots, blocked, true into v_slots, v_blocked, v_found
      from public.artist_schedules
     where photographer_id = p_id and date = p_date;
  end if;

  -- 날짜별 slots 가 비어 있으면 기본 운영 시간을 따른다
  if v_slots is null or array_length(v_slots, 1) is null then
    select default_slots into v_slots
      from public.provider_defaults
     where provider_type = p_type and provider_id = p_id;

    if v_slots is null and p_type = 'photographer' then
      select default_slots into v_slots
        from public.artist_defaults
       where photographer_id = p_id;
    end if;
  end if;

  -- 운영 시간을 모르면 "가능" 이라고 하지 않는다.
  -- 없는 시간을 팔면 아무도 열지 않은 시각에 예약이 들어온다.
  if v_slots is null or array_length(v_slots, 1) is null then
    return false;
  end if;

  for i in 0 .. ceil(p_hours)::int - 1 loop
    v_need := to_char(p_start + make_interval(hours => i), 'HH24:MI');
    if not (v_need = any(v_slots)) then
      return false;
    end if;
    if v_blocked is not null and v_need = any(v_blocked) then
      return false;
    end if;
  end loop;

  return true;
end $$;

grant execute on function public.provider_slot_open(text, uuid, date, time, numeric)
  to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 작가용은 껍데기만 남긴다
--
--    시그니처를 그대로 둬서 available_providers 의 작가 조건은 손대지
--    않는다. 규칙이 한 곳에만 있게 된다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.artist_slot_open(
  p_id    uuid,
  p_date  date,
  p_start time,
  p_hours numeric
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.provider_slot_open('photographer', p_id, p_date, p_start, p_hours);
$$;

grant execute on function public.artist_slot_open(uuid, date, time, numeric)
  to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 장소 조건에 시간대 검사를 더한다
--
--    available_providers 본체는 FIX_43 의 것을 그대로 두고 장소
--    서브쿼리에 한 줄만 붙인다. 현재 정의를 읽어 그 자리에 끼워 넣으므로,
--    나중에 본체가 또 바뀌어도 이 파일을 고칠 필요가 없다.
-- ───────────────────────────────────────────────────────────────────────
do $mig$
declare
  v_src    text;
  v_anchor text := 'and public.provider_is_open(''venue'', vv.id, p_date)';
  v_add    text := 'and public.provider_is_open(''venue'', vv.id, p_date)
             and public.provider_slot_open(''venue'', vv.id, p_date, p_start, p_hours)';
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'available_providers'
   limit 1;

  if v_src is null then
    raise exception 'available_providers 가 없습니다. FIX_43 을 먼저 적용하세요.';
  end if;

  -- 이미 적용됐으면 아무것도 하지 않는다 (여러 번 실행해도 안전)
  if position('provider_slot_open(''venue''' in v_src) > 0 then
    raise notice 'FIX_45: 이미 적용되어 있습니다.';
    return;
  end if;

  if position(v_anchor in v_src) = 0 then
    raise exception 'FIX_45: 장소 조건을 찾지 못했습니다. available_providers 를 직접 확인하세요.';
  end if;

  execute replace(v_src, v_anchor, v_add);
  raise notice 'FIX_45: 장소 운영 시간 검사를 추가했습니다.';
end $mig$;


-- ───────────────────────────────────────────────────────────────────────
-- 4. 확인
--
--    19시 촬영: 작가 0 · 장소 0 이어야 한다
--      (등록된 장소는 전부 09:00~18:00 운영)
--
--  select jsonb_array_length(r -> 'photographers') as 작가,
--         jsonb_array_length(r -> 'venues')        as 장소
--    from public.available_providers('seoul', '2026-10-15', '19:00', 2) r;
--
--    같은 날 10시: 둘 다 그대로 나와야 한다
--
--  select jsonb_array_length(r -> 'photographers') as 작가,
--         jsonb_array_length(r -> 'venues')        as 장소
--    from public.available_providers('seoul', '2026-10-15', '10:00', 2) r;
-- ───────────────────────────────────────────────────────────────────────
