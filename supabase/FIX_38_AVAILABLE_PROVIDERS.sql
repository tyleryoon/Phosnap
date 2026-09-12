-- FIX_38 — "이 시간에 가능한 공급자" 를 서버가 판정한다
--
-- 2026-09-12
--
-- 왜 서버로 옮기나
--   새 예약 흐름은 지역·날짜·시각·길이를 먼저 정하고, 그 조건에
--   가능한 공급자만 보여준다. 그러려면 작가 전원의 스케줄을 한 번에
--   판정해야 한다.
--
--   지금은 작가 한 명을 고른 뒤에야 그 사람 스케줄을 가져온다.
--   작가가 100명이면 요청이 100번 나간다. 클라이언트에서 할 일이 아니다.
--
-- 판정 규칙 — src/lib/scheduling.js 와 같아야 한다
--
--   촬영 16:00 ~ 19:00 인 경우 참여자마다 묶이는 구간이 다르다.
--     작가 · 장소   16:00 ~ 19:00   촬영 시간 그대로
--     샵 헤메       14:00 ~ 16:00   시술 90분 + 이동 30분 (촬영 전 완료)
--     헤어변형      16:30 ~ 17:00   촬영 시작 30분 후 현장 합류
--     종일 동행     15:00 ~ 19:00   현장 시술 60분 후 종료까지 상주
--     의상          하루 단위
--
--   "16시에 가능한 헤메" 를 찾으면 전원 오답이다.
--   샵 헤메는 그 시각에 이미 끝나 있어야 하고,
--   헤어변형은 아직 시작도 안 했다.
--
--   ⚠ 이 규칙이 JS 와 SQL 두 곳에 생겼다. 한쪽만 고치면 어긋난다.
--     computeSlot 을 고칠 일이 있으면 provider_busy_window 도 같이 고쳐라.
--     VERIFY.sql 이 두 판정이 어긋난 예약을 잡아준다.
--
-- 무엇을 돌려주나
--   available_providers(지역, 날짜, 시각, 길이) →
--     { photographers: [...], stylists: [...], dresses: [...], venues: [...] }
--
--   각 항목에 왜 가능한지/불가능한지가 아니라 **가능한 것만** 담는다.
--   화면은 이걸 그대로 늘어놓으면 된다.
--
-- 안전한가
--   · 읽기 전용 함수다. 아무것도 바꾸지 않는다.
--   · 기존 예약 화면은 영향받지 않는다.
--   · 여러 번 실행해도 된다.


-- ── 0. 예약 아이템에 시술 시간을 남긴다 ──────────────────────────────
--
-- booking_items 에는 timing 은 있는데 duration_minutes / offset_minutes 가
-- 없다. 그래서 "이 헤메 시술이 몇 분짜리였는가" 가 예약 기록에 안 남는다.
--
-- 지금은 start_at / end_at 만 있어서
--   · 나중에 촬영 시간이 바뀌면 다시 계산할 수가 없다
--   · 점유 계산이 JS 와 SQL 에서 어긋나도 대조할 근거가 없다
--
-- 값을 받아놓고 버리고 있었던 것이다.

alter table public.booking_items
  add column if not exists duration_minutes int,
  add column if not exists offset_minutes   int;

comment on column public.booking_items.duration_minutes is
  '시술 소요 시간(분). 점유 구간을 다시 계산할 때 쓴다.';


-- ── 1. 점유 구간 계산 ─────────────────────────────────────────────────
--
-- scheduling.js 의 computeSlot 과 같은 규칙.
-- 시술 구간이 아니라 **점유 구간**(이동 포함)을 돌려준다.

create or replace function public.provider_busy_window(
  p_timing     text,
  p_shoot_start timestamptz,
  p_shoot_end   timestamptz,
  p_duration_min int default 0,
  p_offset_min   int default 0
)
returns tstzrange
language sql
immutable
as $$
  select case coalesce(p_timing, 'shoot')
    -- 작가 · 장소 — 촬영 시간 그대로
    when 'shoot' then tstzrange(p_shoot_start, p_shoot_end, '[)')

    -- 촬영 전 완료 + 이동. 시술 시작 ~ 촬영 시작까지 묶인다.
    when 'before' then tstzrange(
      p_shoot_start
        - make_interval(mins => greatest(coalesce(p_offset_min, 0), 0))
        - make_interval(mins => greatest(coalesce(p_duration_min, 0), 0)),
      p_shoot_start, '[)')

    -- 촬영 중 합류 — 이동 버퍼 없음. 촬영 종료를 넘지 않는다.
    when 'during' then tstzrange(
      p_shoot_start + make_interval(mins => greatest(coalesce(p_offset_min, 0), 0)),
      least(
        p_shoot_start
          + make_interval(mins => greatest(coalesce(p_offset_min, 0), 0))
          + make_interval(mins => greatest(coalesce(p_duration_min, 0), 0)),
        p_shoot_end
      ), '[)')

    -- 촬영 전 시술 후 종료까지 상주
    when 'full' then tstzrange(
      p_shoot_start
        - make_interval(mins => greatest(coalesce(p_offset_min, 0), 0)
                              + greatest(coalesce(p_duration_min, 0), 0)),
      p_shoot_end, '[)')

    -- 의상 — 하루 단위
    when 'day' then tstzrange(
      date_trunc('day', p_shoot_start),
      date_trunc('day', p_shoot_start) + interval '1 day', '[)')

    else tstzrange(p_shoot_start, p_shoot_end, '[)')
  end;
$$;

comment on function public.provider_busy_window(text, timestamptz, timestamptz, int, int) is
  '참여자가 묶이는 구간. src/lib/scheduling.js 의 computeSlot 과 같은 규칙이어야 한다.';

grant execute on function public.provider_busy_window(text, timestamptz, timestamptz, int, int)
  to authenticated, anon;


-- ── 2. 그 구간에 이미 묶여 있는가 ─────────────────────────────────────
--
-- 같은 공급자가 여러 아이템을 맡으면 중간 공백은 무시하고 통으로 막는다
-- (mergeProviderBlocks 와 같은 이유 — 그 30분에 다른 예약을 받을 수 없다).

create or replace function public.provider_is_busy(
  p_type  text,
  p_id    uuid,
  p_range tstzrange
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.booking_items i
      join public.bookings b on b.id = i.booking_id
     where i.provider_id = p_id
       and i.provider_type = p_type
       and i.status <> 'cancelled'
       and b.status in ('pending', 'confirmed', 'completed')
       and i.start_at is not null
       and i.end_at is not null
       and tstzrange(i.start_at, i.end_at, '[)') && p_range
  );
$$;

grant execute on function public.provider_is_busy(text, uuid, tstzrange) to authenticated, anon;


-- ── 2-B. 그 **아이템**이 이미 나갔는가 ────────────────────────────────
--
-- 의상과 장소는 공급자 단위로 막으면 안 된다.
--   · 의상 벤더가 드레스 A 를 빌려줬다고 드레스 B 까지 막히면 안 된다
--   · 스튜디오 1호실이 찼다고 2호실까지 막히면 안 된다
-- 아이템(+사이즈)이 단위다.

create or replace function public.item_is_busy(
  p_item  uuid,
  p_range tstzrange,
  p_option text default null      -- 의상 사이즈. null 이면 사이즈 무관
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.booking_items i
      join public.bookings b on b.id = i.booking_id
     where i.item_id = p_item
       and i.status <> 'cancelled'
       and b.status in ('pending', 'confirmed', 'completed')
       and i.start_at is not null
       and i.end_at is not null
       and tstzrange(i.start_at, i.end_at, '[)') && p_range
       and (p_option is null or i.item_option = p_option)
  );
$$;

grant execute on function public.item_is_busy(uuid, tstzrange, text) to authenticated, anon;


/** 그 날 이미 나간 사이즈별 개수. 화면이 재고와 비교해 판정한다. */
create or replace function public.dress_booked_sizes(p_item uuid, p_date date)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_object_agg(opt, cnt), '{}'::jsonb)
    from (
      select coalesce(i.item_option, '-') as opt, count(*) as cnt
        from public.booking_items i
        join public.bookings b on b.id = i.booking_id
       where i.item_id = p_item
         and i.status <> 'cancelled'
         and b.status in ('pending', 'confirmed', 'completed')
         and i.start_at is not null
         and i.start_at >= (p_date::timestamp at time zone 'Asia/Seoul')
         and i.start_at <  ((p_date + 1)::timestamp at time zone 'Asia/Seoul')
       group by 1
    ) t;
$$;

grant execute on function public.dress_booked_sizes(uuid, date) to authenticated, anon;


-- ── 3. 그 날 문을 여는가 ──────────────────────────────────────────────
--
-- 휴무는 두 군데에 있다.
--   날짜별   provider_schedules.day_off / artist_schedules.day_off
--   요일별   provider_defaults.weekly_off
--
-- 날짜별 레코드가 있으면 그게 우선이다. 없으면 요일 기본값을 본다.
-- 둘 다 없으면 "연다" 로 본다 (예약 화면과 같은 규칙).

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
  if p_type = 'photographer' then
    select day_off into v_day_off
      from public.artist_schedules
     where photographer_id = p_id and date = p_date;
  end if;

  -- 작가도 provider_schedules 를 쓰는 경우가 있다 (운영 일정 탭).
  if v_day_off is null then
    select day_off into v_day_off
      from public.provider_schedules
     where provider_type = p_type and provider_id = p_id and date = p_date;
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


-- ── 4. 그 시각이 운영 시간에 들어 있는가 (작가 전용) ──────────────────
--
-- 작가는 시작 시각이 열려 있어야 하고, 촬영이 끝날 때까지
-- 연속으로 열려 있어야 한다. 시간 슬롯은 1시간 단위다.

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
  v_need    text;
  i int;
begin
  select slots, blocked into v_slots, v_blocked
    from public.artist_schedules
   where photographer_id = p_id and date = p_date;

  if v_slots is null then
    select default_slots into v_slots
      from public.artist_defaults
     where photographer_id = p_id;
  end if;

  if v_slots is null then
    select default_slots into v_slots
      from public.provider_defaults
     where provider_type = 'photographer' and provider_id = p_id;
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


-- ── 5. 본체 ───────────────────────────────────────────────────────────

create or replace function public.available_providers(
  p_location text,
  p_date     date,
  p_start    time,
  p_hours    numeric default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_shoot tstzrange;
  v_out   jsonb;
begin
  if p_date is null or p_start is null then
    return jsonb_build_object('error', '날짜와 시각이 필요합니다');
  end if;

  v_start := (p_date + p_start) at time zone 'Asia/Seoul';
  v_end   := v_start + make_interval(mins => (greatest(coalesce(p_hours, 2), 0.5) * 60)::int);
  v_shoot := tstzrange(v_start, v_end, '[)');

  select jsonb_build_object(
    'shootStart', v_start,
    'shootEnd',   v_end,

    -- ── 작가 ──
    'photographers', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.rating desc nulls last, x.name_ko)
        from (
          select p.id, p.name, p.name_ko, p.artist_type, p.location_id,
                 p.img, p.portfolio, p.rating, p.reviews_count,
                 p.hmk_self, p.dress_self, p.languages, p.tags,
                 (select min(k.price) from public.packages k
                   where k.photographer_id = p.id and k.type = 'snap') as price_from
            from public.photographers p
           where p.is_active
             and (p_location is null or p.location_id = p_location)
             -- 그 길이의 촬영 상품이 있어야 한다.
             -- 2시간짜리만 파는 작가에게 4시간을 예약할 수는 없다.
             and exists (
               select 1 from public.packages k
                where k.photographer_id = p.id
                  and k.type = 'snap'
                  and coalesce(k.duration_hours, 2) = p_hours)
             and public.provider_is_open('photographer', p.id, p_date)
             and public.artist_slot_open(p.id, p_date, p_start, p_hours)
             and not public.provider_is_busy('photographer', p.id, v_shoot)
        ) x), '[]'::jsonb),

    -- ── 헤메 (시술 메뉴 단위로 판정한다) ──
    --
    -- 헤메 한 사람이 아니라 **메뉴 하나**가 단위다.
    -- 같은 헤메라도 샵 시술은 되는데 종일 동행은 안 될 수 있다.
    'stylists', coalesce((
      select jsonb_agg(to_jsonb(y) order by y.rating desc nulls last, y.name_ko, y.service_name)
        from (
          select s.id as stylist_id, s.name_ko, s.display_name, s.specialty,
                 s.location_id, s.portfolio_images, s.rating, s.review_count,
                 s.dress_self,
                 sv.id as service_id, sv.name_ko as service_name, sv.price,
                 sv.timing, sv.duration_minutes, sv.offset_minutes, sv.max_hours,
                 lower(public.provider_busy_window(
                   sv.timing, v_start, v_end,
                   sv.duration_minutes, coalesce(sv.offset_minutes, 30))) as busy_from,
                 upper(public.provider_busy_window(
                   sv.timing, v_start, v_end,
                   sv.duration_minutes, coalesce(sv.offset_minutes, 30))) as busy_to
            from public.stylists s
            join public.stylist_services sv on sv.stylist_id = s.id
           where s.is_active
             and coalesce(sv.is_active, true)
             and (p_location is null or s.location_id = p_location)
             -- 종일 동행은 감당 가능한 촬영 길이가 정해져 있다
             and (sv.timing <> 'full' or sv.max_hours is null or p_hours <= sv.max_hours)
             and public.provider_is_open('stylist', s.id, p_date)
             -- 새벽으로 역산되는 시술은 제외한다 (지금보다 과거)
             and lower(public.provider_busy_window(
                   sv.timing, v_start, v_end,
                   sv.duration_minutes, coalesce(sv.offset_minutes, 30))) > now()
             and not public.provider_is_busy('stylist', s.id,
                   public.provider_busy_window(
                     sv.timing, v_start, v_end,
                     sv.duration_minutes, coalesce(sv.offset_minutes, 30)))
        ) y), '[]'::jsonb),

    -- ── 의상 (벤더 것만. 헤메 자체 의상은 그 헤메를 골랐을 때 붙는다) ──
    'dresses', coalesce((
      select jsonb_agg(to_jsonb(z) order by z.name_ko)
        from (
          select d.id, d.name_ko, d.name_en, d.category, d.price,
                 d.sizes, d.size_stock, d.color, d.image_url, d.images,
                 d.description,
                 d.vendor_id, v.name_ko as vendor_name,
                 -- 그 날 이미 나간 사이즈. 화면이 size_stock 과 비교해
                 -- 사이즈 버튼을 잠근다. 여기서 통째로 빼지는 않는다 —
                 -- M 이 나갔다고 L 까지 못 고르면 안 되니까.
                 public.dress_booked_sizes(d.id, p_date) as booked_sizes
            from public.dress_items d
            join public.dress_vendors v on v.id = d.vendor_id
           where d.is_available
             and v.is_active
             and (p_location is null or v.location_id = p_location)
             and public.provider_is_open('dress', v.id, p_date)
        ) z), '[]'::jsonb),

    -- ── 장소 ──
    'venues', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.name)
        from (
          select vi.id, vi.name, vi.name_i18n, vi.category, vi.capacity,
                 vi.price, vi.price_unit, vi.images, vi.description,
                 vi.description_i18n, vi.amenities,
                 vi.vendor_id, vv.name_ko as vendor_name
            from public.venue_items vi
            join public.venue_vendors vv on vv.id = vi.vendor_id
           where coalesce(vi.is_available, true)
             and vv.is_active
             and (p_location is null or vv.location_id = p_location)
             and public.provider_is_open('venue', vv.id, p_date)
             -- 아이템 단위다. 1호실이 찼다고 2호실까지 막으면 안 된다.
             and not public.item_is_busy(vi.id, v_shoot)
        ) w), '[]'::jsonb)
  ) into v_out;

  return v_out;
end $$;

grant execute on function public.available_providers(text, date, time, numeric)
  to authenticated, anon;


-- ── 6. 확인 ───────────────────────────────────────────────────────────

select '함수 4개' as 항목,
       (select count(*)::text from pg_proc
         where proname in ('provider_busy_window','provider_is_busy',
                           'provider_is_open','artist_slot_open','available_providers')
           and pronamespace = 'public'::regnamespace) as 값
union all
select '점유 계산 — 샵 헤메 (16시 촬영, 시술 90분, 이동 30분)',
       public.provider_busy_window('before',
         '2026-09-20 16:00+09', '2026-09-20 19:00+09', 90, 30)::text
union all
select '점유 계산 — 헤어변형 (촬영 중 합류 30분 후, 30분)',
       public.provider_busy_window('during',
         '2026-09-20 16:00+09', '2026-09-20 19:00+09', 30, 30)::text
union all
select '점유 계산 — 종일 동행 (시술 60분, 버퍼 0)',
       public.provider_busy_window('full',
         '2026-09-20 16:00+09', '2026-09-20 19:00+09', 60, 0)::text;


-- 실제 조회 — 서울, 2026-09-20, 14:00, 2시간
select jsonb_pretty(
  jsonb_build_object(
    '작가',   jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'photographers'),
    '헤메메뉴', jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'stylists'),
    '의상',   jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'dresses'),
    '장소',   jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'venues')
  )
) as 결과;
