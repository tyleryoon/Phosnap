-- ═══════════════════════════════════════════════════════════════════════
-- FIX_44: 작가 스케줄을 provider_* 로 일원화
--
-- 배경
--   FIX_19 에서 세 역할의 스케줄을 provider_schedules / provider_defaults
--   하나로 합쳤다. 그런데 **읽고 쓰는 쪽이 갈라진 채 남았다.**
--
--     작가 대시보드 · 예약 화면        → artist_schedules / artist_defaults
--     헤메 · 벤더 · available_providers → provider_*
--
--   FIX_19 의 이관은 한 번 돌고 끝이라, 그 뒤 작가가 저장한 일정은 옛
--   테이블에만 쌓였다. 고객 예약 화면에서는 달력의 색 원이 전부 사라지고
--   (dbDefaultSlots 가 null → 모든 날짜 'unknown') 예약 가능한 날짜가
--   하나도 안 보인다.
--
--   앱 코드는 이번에 다섯 함수를 provider_* 로 돌렸다(src/lib/supabase.js).
--   그러면 이제 **RPC 쪽이 반대로 눈이 먼다** — artist_slot_open 은 날짜별
--   slots/blocked 를 artist_schedules 에서만 읽으므로, 작가가 막아둔 시각을
--   장바구니가 그대로 팔게 된다. 여기서 순서를 뒤집는다.
--
--   원칙: provider_* 가 정본, artist_* 는 아직 이관되지 않은 옛 데이터용
--   폴백. 옛 테이블은 지우지 않는다 — 한동안 둘 다 읽는다.
--
-- 적용 순서: FIX_43 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 남아 있는 옛 데이터를 다시 한 번 옮긴다
--
--    FIX_19 이후에도 앱이 계속 artist_* 에 썼으므로 그때 없던 행이 있다.
--    같은 (작가, 날짜) 가 양쪽에 있으면 provider_* 를 남긴다 — 새 테이블에
--    이미 있는 값을 옛 값으로 덮어쓸 이유가 없다.
-- ───────────────────────────────────────────────────────────────────────
insert into public.provider_schedules
  (provider_type, provider_id, date, day_off, slots, blocked, created_at)
select 'photographer', s.photographer_id, s.date,
       coalesce(s.day_off, false),
       coalesce(s.slots,   '{}'),
       coalesce(s.blocked, '{}'),
       coalesce(s.created_at, now())
  from public.artist_schedules s
 where exists (select 1 from public.photographers p where p.id = s.photographer_id)
   and not exists (
     select 1 from public.provider_schedules v
      where v.provider_type = 'photographer'
        and v.provider_id   = s.photographer_id
        and v.date          = s.date
   );

insert into public.provider_defaults (provider_type, provider_id, default_slots)
select 'photographer', d.photographer_id, coalesce(d.default_slots, array[
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'
])
  from public.artist_defaults d
 where exists (select 1 from public.photographers p where p.id = d.photographer_id)
   and not exists (
     select 1 from public.provider_defaults v
      where v.provider_type = 'photographer' and v.provider_id = d.photographer_id
   );


-- ───────────────────────────────────────────────────────────────────────
-- 2. 휴무 판정: provider_schedules 를 먼저 본다
--
--    예전에는 작가일 때 artist_schedules 를 먼저 읽었다. 이제 작가가
--    '이 날 쉼' 을 풀면 provider_schedules 만 바뀌는데, 옛 테이블에 남은
--    day_off=true 가 계속 이겨서 **푼 휴무가 안 풀린다.**
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.provider_is_open(
  p_type text,
  p_id   uuid,
  p_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_day_off boolean;
  v_weekly  int[];
  v_dow     int;
begin
  select day_off into v_day_off
    from public.provider_schedules
   where provider_type = p_type and provider_id = p_id and date = p_date;

  -- 아직 이관되지 않은 옛 작가 스케줄
  if v_day_off is null and p_type = 'photographer' then
    select day_off into v_day_off
      from public.artist_schedules
     where photographer_id = p_id and date = p_date;
  end if;

  if v_day_off is not null then
    return not v_day_off;
  end if;

  -- 요일 기본 휴무
  select weekly_off into v_weekly
    from public.provider_defaults
   where provider_type = p_type and provider_id = p_id;

  if v_weekly is not null and array_length(v_weekly, 1) > 0 then
    v_dow := extract(dow from p_date)::int;   -- 0=일 … 6=토
    if v_dow = any(v_weekly) then
      return false;
    end if;
  end if;

  return true;
end $$;

grant execute on function public.provider_is_open(text, uuid, date) to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 작가 운영 시간: provider_schedules → provider_defaults 순으로
--
--    ⚠ slots 와 blocked 는 **같은 행에서 같이** 읽어야 한다.
--      한쪽은 새 테이블, 다른 쪽은 옛 테이블에서 읽으면 "열린 시간은
--      새 값, 막은 시간은 옛 값" 이 되어 이미 푼 차단이 되살아난다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.artist_slot_open(
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
   where provider_type = 'photographer' and provider_id = p_id and date = p_date;

  -- 아직 이관되지 않은 옛 행
  if not v_found then
    select slots, blocked, true into v_slots, v_blocked, v_found
      from public.artist_schedules
     where photographer_id = p_id and date = p_date;
  end if;

  -- 날짜별 slots 가 비어 있으면 기본 운영 시간을 따른다.
  -- (예약 화면의 resolveDateStatus 와 같은 규칙: row.slots?.length ? … : 기본)
  if v_slots is null or array_length(v_slots, 1) is null then
    select default_slots into v_slots
      from public.provider_defaults
     where provider_type = 'photographer' and provider_id = p_id;

    if v_slots is null then
      select default_slots into v_slots
        from public.artist_defaults
       where photographer_id = p_id;
    end if;
  end if;

  -- 운영 시간을 모르면 "가능" 이라고 하지 않는다.
  -- 없는 시간을 팔면 작가가 열지 않은 시각에 예약이 들어온다.
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

grant execute on function public.artist_slot_open(uuid, date, time, numeric) to authenticated, anon;


-- ───────────────────────────────────────────────────────────────────────
-- 4. 확인
-- ───────────────────────────────────────────────────────────────────────
-- select 'provider_schedules(photographer)' as t, count(*) from public.provider_schedules where provider_type='photographer'
-- union all select 'provider_defaults(photographer)', count(*) from public.provider_defaults where provider_type='photographer'
-- union all select 'artist_schedules(잔여)', count(*) from public.artist_schedules
-- union all select 'artist_defaults(잔여)',  count(*) from public.artist_defaults;
