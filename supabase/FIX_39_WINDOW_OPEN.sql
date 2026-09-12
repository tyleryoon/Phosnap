-- FIX_39 — 운영 시간 밖의 시술을 팔지 않는다
--
-- 2026-09-12
--
-- 무엇이 틀렸나
--   FIX_38 을 검증하다 찾았다.
--
--     09:00 촬영 2시간으로 조회 → 헤메 메뉴 3개가 전부 "가능" 으로 나왔다.
--
--   그런데 '웨딩 헤어메이크' 는 시술 90분 + 이동 30분이라
--   **07:00 에 시작**해야 한다. 헤메가 새벽 7시에 일할 리 없다.
--
--   provider_is_open() 은 휴무만 본다. 운영 **시간대**는 안 봤다.
--   작가만 artist_slot_open() 으로 시간을 검사하고 있었다.
--
-- 더 근본적인 문제
--   헤메의 provider_defaults 행이 **아예 없다.**
--   작가 3건, 장소 1건, 의상 1건은 있는데 헤메는 0건이다.
--   운영 시간을 등록할 자리는 있는데 아무도 안 넣었고,
--   아무도 그걸 확인하지 않았다.
--
-- 두 가지를 한다
--   1) 점유 구간이 운영 시간 안에 들어오는지 검사한다.
--   2) 운영 시간이 없으면 **고객에게 노출하지 않는다.**
--      작가 판정과 같은 원칙이다 — 모르면 팔지 않는다.
--      대시보드 배너가 "운영 시간 설정" 을 빠진 항목으로 알려준다.
--
-- 필요한 것
--   FIX_35 · FIX_38 이 먼저 적용돼 있어야 한다.
--
-- 안전한가
--   · 마지막에 누가 노출에서 빠지는지 표로 보여준다.
--   · 운영 시간을 등록하면 트리거가 자동으로 다시 켠다.


-- ── 1. 점유 구간이 운영 시간 안인가 ───────────────────────────────────
--
-- 슬롯은 'HH:MM' 1시간 단위 문자열 배열이다.
-- 점유 구간이 걸치는 매 시간이 슬롯에 있어야 한다.
--
-- 시작은 내림, 끝은 올림으로 본다.
--   12:00~14:00 점유 → 12, 13 시가 열려 있어야 한다 (14시는 끝나는 시각)

create or replace function public.provider_window_open(
  p_type  text,
  p_id    uuid,
  p_date  date,
  p_from  timestamptz,
  p_to    timestamptz
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
  v_from    timestamp;
  v_to      timestamp;
  v_cur     timestamp;
  v_key     text;
begin
  select slots, blocked into v_slots, v_blocked
    from public.provider_schedules
   where provider_type = p_type and provider_id = p_id and date = p_date;

  if v_slots is null then
    select default_slots into v_slots
      from public.provider_defaults
     where provider_type = p_type and provider_id = p_id;
  end if;

  -- 운영 시간을 모르면 "가능" 이라고 하지 않는다.
  -- 없는 시간을 팔면 공급자가 열지 않은 시각에 예약이 들어온다.
  if v_slots is null or array_length(v_slots, 1) is null then
    return false;
  end if;

  v_from := date_trunc('hour', p_from at time zone 'Asia/Seoul');
  v_to   := p_to at time zone 'Asia/Seoul';

  v_cur := v_from;
  while v_cur < v_to loop
    v_key := to_char(v_cur, 'HH24:MI');
    if not (v_key = any(v_slots)) then
      return false;
    end if;
    if v_blocked is not null and v_key = any(v_blocked) then
      return false;
    end if;
    v_cur := v_cur + interval '1 hour';
  end loop;

  return true;
end $$;

grant execute on function public.provider_window_open(text, uuid, date, timestamptz, timestamptz)
  to authenticated, anon;


-- ── 2. 헤메·장소 판정에 운영 시간을 넣는다 ────────────────────────────
--
-- 의상은 하루 단위라 시간대 판정이 의미 없다. 휴무만 본다.

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
             and exists (
               select 1 from public.packages k
                where k.photographer_id = p.id
                  and k.type = 'snap'
                  and coalesce(k.duration_hours, 2) = p_hours)
             and public.provider_is_open('photographer', p.id, p_date)
             and public.artist_slot_open(p.id, p_date, p_start, p_hours)
             and not public.provider_is_busy('photographer', p.id, v_shoot)
        ) x), '[]'::jsonb),

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
             and (sv.timing <> 'full' or sv.max_hours is null or p_hours <= sv.max_hours)
             and public.provider_is_open('stylist', s.id, p_date)
             -- 점유 구간이 운영 시간 안에 들어와야 한다 (FIX_39).
             -- 09시 촬영이면 샵 시술은 07시에 시작해야 하는데,
             -- 예전에는 그걸 "가능" 이라고 답했다.
             and public.provider_window_open('stylist', s.id, p_date,
                   lower(public.provider_busy_window(
                     sv.timing, v_start, v_end,
                     sv.duration_minutes, coalesce(sv.offset_minutes, 30))),
                   upper(public.provider_busy_window(
                     sv.timing, v_start, v_end,
                     sv.duration_minutes, coalesce(sv.offset_minutes, 30))))
             and lower(public.provider_busy_window(
                   sv.timing, v_start, v_end,
                   sv.duration_minutes, coalesce(sv.offset_minutes, 30))) > now()
             and not public.provider_is_busy('stylist', s.id,
                   public.provider_busy_window(
                     sv.timing, v_start, v_end,
                     sv.duration_minutes, coalesce(sv.offset_minutes, 30)))
        ) y), '[]'::jsonb),

    'dresses', coalesce((
      select jsonb_agg(to_jsonb(z) order by z.name_ko)
        from (
          select d.id, d.name_ko, d.name_en, d.category, d.price,
                 d.sizes, d.size_stock, d.color, d.image_url, d.images,
                 d.description,
                 d.vendor_id, v.name_ko as vendor_name,
                 public.dress_booked_sizes(d.id, p_date) as booked_sizes
            from public.dress_items d
            join public.dress_vendors v on v.id = d.vendor_id
           where d.is_available
             and v.is_active
             and (p_location is null or v.location_id = p_location)
             -- 의상은 하루 단위다. 시간대 판정은 의미가 없고 휴무만 본다.
             and public.provider_is_open('dress', v.id, p_date)
        ) z), '[]'::jsonb),

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
             and public.provider_window_open('venue', vv.id, p_date, v_start, v_end)
             and not public.item_is_busy(vi.id, v_shoot)
        ) w), '[]'::jsonb)
  ) into v_out;

  return v_out;
end $$;

grant execute on function public.available_providers(text, date, time, numeric)
  to authenticated, anon;


-- ── 3. 운영 시간이 없으면 노출하지 않는다 ─────────────────────────────
--
-- 작가와 같은 원칙이다. 모르면 팔지 않는다.
-- 등록하는 순간 트리거가 자동으로 다시 켠다.

create or replace function public.provider_listable(p_kind text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user uuid; v_loc text; v_has boolean; v_hours boolean;
begin
  if p_kind = 'photographer' then
    select user_id, location_id into v_user, v_loc from public.photographers where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'artist') then return false; end if;
    select exists (select 1 from public.packages k where k.photographer_id = p_id) into v_has;
    select exists (
      select 1 from public.artist_defaults where photographer_id = p_id
       and array_length(default_slots, 1) > 0
      union all
      select 1 from public.provider_defaults
       where provider_type = 'photographer' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;

  elsif p_kind = 'stylist' then
    select user_id, location_id into v_user, v_loc from public.stylists where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'stylist') then return false; end if;
    select exists (select 1 from public.stylist_services s where s.stylist_id = p_id) into v_has;
    select exists (select 1 from public.provider_defaults
       where provider_type = 'stylist' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;

  elsif p_kind = 'dress_vendor' then
    select user_id, location_id into v_user, v_loc from public.dress_vendors where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'vendor') then return false; end if;
    select exists (select 1 from public.dress_items i where i.vendor_id = p_id) into v_has;
    -- 의상은 하루 단위 대여라 운영 시간대를 따지지 않는다.
    v_hours := true;

  elsif p_kind = 'venue_vendor' then
    select user_id, location_id into v_user, v_loc from public.venue_vendors where id = p_id;
    if v_user is null then return false; end if;
    if not public.is_provider_approved(v_user, 'vendor') then return false; end if;
    select exists (select 1 from public.venue_items i where i.vendor_id = p_id) into v_has;
    select exists (select 1 from public.provider_defaults
       where provider_type = 'venue' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;

  else
    return false;
  end if;

  if coalesce(v_loc, '') = '' then return false; end if;
  return coalesce(v_has, false) and coalesce(v_hours, false);
end $$;

grant execute on function public.provider_listable(text, uuid) to authenticated, service_role;


-- ── 4. 배너에도 '운영 시간' 을 넣는다 ─────────────────────────────────

create or replace function public.provider_listing_status(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user uuid; v_loc text; v_has boolean; v_role text; v_active boolean;
  v_hours boolean := true;
  v_missing text[] := array[]::text[];
begin
  if p_kind = 'photographer' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.photographers where id = p_id;
    v_role := 'artist';
    select exists (select 1 from public.packages k where k.photographer_id = p_id) into v_has;
    select exists (
      select 1 from public.artist_defaults where photographer_id = p_id
       and array_length(default_slots, 1) > 0
      union all
      select 1 from public.provider_defaults
       where provider_type = 'photographer' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;
  elsif p_kind = 'stylist' then
    select user_id, location_id, is_active into v_user, v_loc, v_active
      from public.stylists where id = p_id;
    v_role := 'stylist';
    select exists (select 1 from public.stylist_services s where s.stylist_id = p_id) into v_has;
    select exists (select 1 from public.provider_defaults
       where provider_type = 'stylist' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;
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
    select exists (select 1 from public.provider_defaults
       where provider_type = 'venue' and provider_id = p_id
         and array_length(default_slots, 1) > 0) into v_hours;
  else
    return jsonb_build_object('ok', false, 'listed', false,
                              'missing', to_jsonb(array['알 수 없는 유형']));
  end if;

  if v_user is null then
    return jsonb_build_object('ok', false, 'listed', false,
                              'missing', to_jsonb(array['레코드를 찾을 수 없습니다']));
  end if;

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
  if not coalesce(v_hours, true) then
    v_missing := array_append(v_missing, '운영 시간 설정');
  end if;

  return jsonb_build_object(
    'ok',      cardinality(v_missing) = 0,
    'listed',  coalesce(v_active, false),
    'missing', to_jsonb(v_missing)
  );
end $$;

grant execute on function public.provider_listing_status(text, uuid) to authenticated;


-- ── 5. 누가 빠지는지 보고, 자격대로 맞춘다 ────────────────────────────

select '작가' as 유형, coalesce(name_ko, name) as 이름,
       is_active as 현재, public.provider_listable('photographer', id) as 자격,
       public.provider_listing_status('photographer', id) -> 'missing' as 빠진것
  from public.photographers
union all
select '헤메', coalesce(name_ko, display_name),
       is_active, public.provider_listable('stylist', id),
       public.provider_listing_status('stylist', id) -> 'missing'
  from public.stylists
union all
select '의상벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('dress_vendor', id),
       public.provider_listing_status('dress_vendor', id) -> 'missing'
  from public.dress_vendors
union all
select '장소벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('venue_vendor', id),
       public.provider_listing_status('venue_vendor', id) -> 'missing'
  from public.venue_vendors
order by 1, 2;


select public.refresh_provider_listing() as 변경건수;


-- ── 6. 확인 — 09시는 헤메가 빠져야 한다 ───────────────────────────────

select '14시 촬영 2시간' as 조건,
       jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'photographers') as 작가,
       jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'stylists') as 헤메메뉴,
       jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'dresses') as 의상,
       jsonb_array_length(public.available_providers('seoul','2026-09-20','14:00',2) -> 'venues') as 장소
union all
select '09시 촬영 2시간 (샵 헤메는 07시 시작 → 빠져야 함)',
       jsonb_array_length(public.available_providers('seoul','2026-09-20','09:00',2) -> 'photographers'),
       jsonb_array_length(public.available_providers('seoul','2026-09-20','09:00',2) -> 'stylists'),
       jsonb_array_length(public.available_providers('seoul','2026-09-20','09:00',2) -> 'dresses'),
       jsonb_array_length(public.available_providers('seoul','2026-09-20','09:00',2) -> 'venues');
