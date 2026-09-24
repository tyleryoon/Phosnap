-- ═══════════════════════════════════════════════════════════════════════
-- FIX_46: 헤메도 운영 시간을 본다 — 단, 시술 시점대로
--
-- 배경
--   FIX_45 로 장소를 막고 나니 헤메만 남았다.
--
--     서울 / 2026-10-15 / 19:00 / 2시간
--       작가  0명   FIX_44
--       장소  0곳   FIX_45
--       헤메  9건   ← 그대로 나온다
--
--   등록된 헤메 11명은 전부 09:00~18:00 운영인데 19~21시 촬영에도 나온다.
--
--   그런데 **촬영 구간으로 재면 틀린다.** 헤메는 촬영 시각이 아니라
--   시술 시점에 맞춰 일한다.
--
--     10시 촬영 · 90분 시술 기준
--       before  08:00~10:00   촬영 전에 끝내고 현장에 남지 않는다
--       during  10:30~11:00   촬영 중 합류
--       full    09:00~12:00   끝까지 동행
--
--   촬영 구간(10~12시)을 그대로 대조하면 before 시술이 엉뚱하게 판정된다.
--   각 시술이 **실제로 일하는 구간**을 재야 한다.
--
-- 정한 규칙 (2026-09-24)
--   운영 시간은 헤메가 정한 그대로 믿는다. 07시를 열어두면 07시 시술이
--   가능하다. 예외를 따로 두지 않고, 시술의 실제 작업 구간이 그 사람의
--   운영 시간 안에 들어오는지만 본다.
--
-- 무엇을 하나
--   provider_window_open  현지 벽시계 구간 [from, to) 이 열려 있는가
--   available_providers   헤메 조건에 그 검사를 추가
--
-- 안전한가
--   함수만 바꾼다. 테이블·칼럼은 손대지 않는다. 여러 번 실행해도 된다.
--
-- 선행: FIX_45
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 구간 단위 운영 시간 검사
--
--    provider_slot_open 은 "몇 시부터 몇 시간" 을 받는다. 헤메는 시술마다
--    시작도 길이도 달라 분 단위로 어긋나므로, 구간을 받아 그 구간이
--    걸치는 모든 1시간 슬롯이 열려 있는지 본다.
--
--    ⚠ 자정을 넘는 구간은 판정하지 않고 막는다. 새벽 시술이 전날로
--      역산되면 그 날짜의 slots 만으로는 확인할 수 없다. 모를 때 파는
--      것보다 막는 게 낫다 — 열어두려면 헤메가 그 날짜를 직접 연다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.provider_window_open(
  p_type text,
  p_id   uuid,
  p_date date,
  p_from time,
  p_to   time
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
  v_cur     time;
  v_need    text;
  i int;
begin
  -- 구간이 뒤집혀 있으면(자정을 넘었다는 뜻) 판정하지 않는다
  if p_from is null or p_to is null or p_to <= p_from then
    return false;
  end if;

  select slots, blocked, true into v_slots, v_blocked, v_found
    from public.provider_schedules
   where provider_type = p_type and provider_id = p_id and date = p_date;

  if v_slots is null or array_length(v_slots, 1) is null then
    select default_slots into v_slots
      from public.provider_defaults
     where provider_type = p_type and provider_id = p_id;
  end if;

  -- 운영 시간을 모르면 "가능" 이라고 하지 않는다
  if v_slots is null or array_length(v_slots, 1) is null then
    return false;
  end if;

  -- [from, to) 가 걸치는 매 시간 슬롯. 10:30~11:00 은 '10:00' 하나,
  -- 08:00~10:00 은 '08:00' 과 '09:00' 두 개를 요구한다.
  v_cur := date_trunc('hour', p_from - time '00:00') + time '00:00';
  for i in 0 .. 23 loop
    exit when v_cur >= p_to;
    v_need := to_char(v_cur, 'HH24:MI');
    if not (v_need = any(v_slots)) then
      return false;
    end if;
    if v_blocked is not null and v_need = any(v_blocked) then
      return false;
    end if;
    -- 자정을 넘기면 그 다음은 다른 날짜다
    exit when v_cur >= time '23:00';
    v_cur := v_cur + interval '1 hour';
  end loop;

  return true;
end $$;

grant execute on function public.provider_window_open(text, uuid, date, time, time)
  to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 헤메 조건에 시술 구간 검사를 더한다
--
--    시술 구간을 현지 벽시계로 다시 계산한다 — provider_busy_window 는
--    timestamptz 라 여기 slots('10:00')과 바로 비교할 수 없다.
--    계산 규칙은 provider_busy_window 와 같아야 한다:
--      before  p_start - offset - duration  ~  p_start
--      during  p_start + offset             ~  min(+duration, 촬영 종료)
--      full    p_start - offset - duration  ~  촬영 종료
-- ───────────────────────────────────────────────────────────────────────
do $mig$
declare
  v_src    text;
  v_anchor text := 'and public.provider_is_open(''stylist'', s.id, p_date)';
  v_add    text := 'and public.provider_is_open(''stylist'', s.id, p_date)
             and public.provider_window_open(''stylist'', s.id, p_date,
                   case coalesce(sv.timing, ''before'')
                     when ''during'' then p_start + make_interval(mins => greatest(coalesce(sv.offset_minutes, 30), 0))
                     else p_start - make_interval(mins => greatest(coalesce(sv.offset_minutes, 30), 0)
                                                        + greatest(coalesce(sv.duration_minutes, 0), 0))
                   end,
                   case coalesce(sv.timing, ''before'')
                     when ''before'' then p_start
                     when ''during'' then least(
                       p_start + make_interval(mins => greatest(coalesce(sv.offset_minutes, 30), 0)
                                                     + greatest(coalesce(sv.duration_minutes, 0), 0)),
                       p_start + make_interval(hours => ceil(p_hours)::int))
                     else p_start + make_interval(hours => ceil(p_hours)::int)
                   end)';
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'available_providers'
   limit 1;

  if v_src is null then
    raise exception 'available_providers 가 없습니다. FIX_43 을 먼저 적용하세요.';
  end if;

  if position('provider_window_open(''stylist''' in v_src) > 0 then
    raise notice 'FIX_46: 이미 적용되어 있습니다.';
    return;
  end if;

  if position(v_anchor in v_src) = 0 then
    raise exception 'FIX_46: 헤메 조건을 찾지 못했습니다. available_providers 를 직접 확인하세요.';
  end if;

  execute replace(v_src, v_anchor, v_add);
  raise notice 'FIX_46: 헤메 시술 구간 검사를 추가했습니다.';
end $mig$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 확인
--
--    19시 촬영: 셋 다 0 이어야 한다 (등록된 헤메는 전부 09~18시 운영)
--
--  select jsonb_array_length(r -> 'photographers') as 작가,
--         jsonb_array_length(r -> 'stylists')      as 헤메,
--         jsonb_array_length(r -> 'venues')        as 장소
--    from public.available_providers('seoul', '2026-10-15', '19:00', 2) r;
--
--    10시 촬영: 줄어든다. before 90분 시술은 08:00 부터라 09시에 문 여는
--    헤메에게는 걸린다 — 09시 시작인 사람이 08시 시술을 받을 수는 없다.
--
--  select jsonb_array_length(r -> 'stylists') as 헤메
--    from public.available_providers('seoul', '2026-10-15', '10:00', 2) r;
--
--    헤메가 07시를 열면 그때 다시 나온다:
--
--  update public.provider_defaults
--     set default_slots = array['07:00','08:00','09:00','10:00','11:00','12:00',
--                               '13:00','14:00','15:00','16:00','17:00','18:00']
--   where provider_type = 'stylist' and provider_id = '<헤메 id>';
-- ───────────────────────────────────────────────────────────────────────
