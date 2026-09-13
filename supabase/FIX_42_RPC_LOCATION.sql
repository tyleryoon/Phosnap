-- FIX_42 — available_providers 가 의상·장소에도 location_id 를 돌려준다
--
-- 2026-09-13
--
-- 무엇이 문제인가
--   찾기 페이지는 조회 경로가 둘이다.
--
--     날짜를 안 넣으면 → 테이블 조회 (둘러보기)
--     날짜를 넣으면    → available_providers (그때 가능한 것만)
--
--   같은 화면, 같은 카드인데 데이터가 오는 길이 다르다.
--   그런데 RPC 는 의상·장소에 location_id 를 안 실어 보낸다.
--   테이블 조회(dress_vendors.location_id)는 실어 보낸다.
--
--   결과 — **날짜를 넣는 순간 카드에서 지역 뱃지만 사라진다.**
--   오류도 없고 목록도 정상이다. 한 줄이 조용히 없어질 뿐이라
--   보고도 못 알아챈다. (규칙 5-18)
--
--   작가·헤메는 이미 location_id 를 돌려주고 있었다. 의상·장소만 빠졌다.
--
-- 왜 화면에서 안 메우고 여기서 고치나
--   "p_location 으로 조회했으니 그 지역이겠지" 하고 화면에서 채울 수도 있다.
--   그런데 전 지역 조회(p_location = null)면 그 추측이 틀린다.
--   아는 쪽이 말해주는 게 맞다.
--
-- 이 파일은 FIX_38 의 함수 본문을 **그대로 복사**하고 select 목록에
-- 두 줄만 더한 것이다. 손으로 옮겨 적지 않았다 —
-- 옮기다 함수명 하나만 틀려도 예약 조회가 통째로 깨진다.
--
-- 안전한가
--   칸을 더하기만 한다. 기존 화면은 모르는 칸을 무시한다.
--   여러 번 실행해도 된다.
--
-- 선행: FIX_38

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
                 v.location_id,   -- FIX_42
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
                 vi.vendor_id, vv.name_ko as vendor_name,
                 vv.location_id   -- FIX_42
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

-- ── 확인 ──────────────────────────────────────────────────────────────
--
-- 네 유형 모두 true 여야 한다. 하나라도 false 면 그 유형은
-- 날짜를 넣는 순간 지역 정보를 잃는다.

with r as (
  select public.available_providers('seoul','2026-09-25','14:00',3) as j
)
select '작가 location_id' as 항목,
       coalesce((select (j->'photographers'->0) ? 'location_id' from r), false)::text as 값
union all
select '헤메 location_id',
       coalesce((select (j->'stylists'->0) ? 'location_id' from r), false)::text
union all
select '의상 location_id',
       coalesce((select (j->'dresses'->0) ? 'location_id' from r), false)::text
union all
select '장소 location_id',
       coalesce((select (j->'venues'->0) ? 'location_id' from r), false)::text;
