-- FIX_43 — 활동 지역을 여러 개 갖게 하고, 의상에 수령 방식·보증금을 붙인다
--
-- 2026-09-23
--
-- ── 무엇이 문제였나 ──────────────────────────────────────────────────
--
-- 1) 활동 지역이 하나뿐이었다
--    헤메·의상·장소는 location_id 가 단일 컬럼이다. 헤메가 서울·부산·교토
--    에서 활동해도 한 곳밖에 못 적어서, 부산 촬영에는 아예 안 나왔다.
--    작가만 artist_locations 로 여러 곳을 적을 수 있었는데 —
--    정작 available_providers 는 그 테이블을 안 보고 p.location_id 만 봤다.
--    있는데 안 쓰이고 있었다.
--
-- 2) '전 지역' 으로 조회하면 지역이 섞였다
--    p_location 이 null 이면 지역 조건이 통째로 빠진다. 그래서 서울 헤메와
--    부산 장소가 한 화면에 나오고, 그대로 담겨서 결제까지 갈 수 있었다.
--    한 촬영에 서로 다른 도시의 사람과 장소를 부를 수는 없다.
--
-- 3) 의상에 수령 방식이 없었다
--    현장에서 받는지 배송받는지 구분이 없었고, 옷이 상했을 때 기댈
--    보증금도 없었다.
--
-- ── 무엇을 하나 ─────────────────────────────────────────────────────
--
--   provider_locations       네 유형 공용 활동 지역 (provider_schedules 와 같은 꼴)
--   dress_items.deposit      의상별 보증금 (벤더가 정한다)
--   dress_items.fulfillment  가능한 수령 방식
--   available_providers      지역 판정을 provider_locations 로 옮긴다
--
-- ── 보증금 규칙 ─────────────────────────────────────────────────────
--
--   주인이 현장에 들고 오는 의상(byOwner)은 보증금이 없다. 옷이 주인
--   손을 떠나지 않기 때문이다. 헤메가 자기 옷을 입혀주는 경우가 그렇다.
--   같은 옷이라도 고객이 픽업하거나 배송받으면 보증금을 받는다 —
--   그때부터는 옷이 주인 손을 떠난다.
--
-- ── 안전한가 ────────────────────────────────────────────────────────
--
--   칸과 테이블을 더하기만 한다. 기존 location_id 컬럼은 지우지 않는다
--   (아직 읽는 화면이 있다). 여러 번 실행해도 된다.
--
-- 선행: FIX_42


-- ══════════════════════════════════════════════════════════════════
-- 1. provider_locations — 네 유형 공용 활동 지역
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.provider_locations (
  id            uuid primary key default uuid_generate_v4(),
  provider_type text not null check (provider_type in ('photographer','stylist','dress','venue')),
  provider_id   uuid not null,
  location_id   text not null,               -- 'seoul', 'busan', 'kyoto' …
  period_start  date,                        -- null = 상시
  period_end    date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (provider_type, provider_id, location_id)
);

create index if not exists idx_provider_locations_lookup
  on public.provider_locations(provider_type, provider_id, is_active);
create index if not exists idx_provider_locations_loc
  on public.provider_locations(location_id, is_active);

alter table public.provider_locations enable row level security;

drop policy if exists "활동지역 공개 조회" on public.provider_locations;
create policy "활동지역 공개 조회" on public.provider_locations
  for select using (is_active = true);

-- 쓰기는 본인만. provider_id 가 유형마다 다른 테이블을 가리키므로
-- 유형별로 소유자를 확인한다.
drop policy if exists "활동지역 본인 수정" on public.provider_locations;
create policy "활동지역 본인 수정" on public.provider_locations
  for all using (
    case provider_type
      when 'photographer' then exists (select 1 from public.photographers  t where t.id = provider_id and t.user_id = auth.uid())
      when 'stylist'      then exists (select 1 from public.stylists       t where t.id = provider_id and t.user_id = auth.uid())
      when 'dress'        then exists (select 1 from public.dress_vendors  t where t.id = provider_id and t.user_id = auth.uid())
      when 'venue'        then exists (select 1 from public.venue_vendors  t where t.id = provider_id and t.user_id = auth.uid())
      else false
    end
  );


-- ══════════════════════════════════════════════════════════════════
-- 2. 기존 지역을 옮긴다 (있는 것만, 중복 없이)
-- ══════════════════════════════════════════════════════════════════

insert into public.provider_locations (provider_type, provider_id, location_id)
select 'photographer', p.id, p.location_id
  from public.photographers p
 where p.location_id is not null
on conflict do nothing;

-- 작가는 artist_locations 에 이미 여러 곳을 적어둔 사람이 있다. 그것도 옮긴다.
insert into public.provider_locations (provider_type, provider_id, location_id, period_start, period_end, is_active)
select 'photographer', al.photographer_id, al.location_id, al.period_start, al.period_end, coalesce(al.is_active, true)
  from public.artist_locations al
 where al.location_id is not null
on conflict do nothing;

insert into public.provider_locations (provider_type, provider_id, location_id)
select 'stylist', s.id, s.location_id
  from public.stylists s
 where s.location_id is not null
on conflict do nothing;

insert into public.provider_locations (provider_type, provider_id, location_id)
select 'dress', v.id, v.location_id
  from public.dress_vendors v
 where v.location_id is not null
on conflict do nothing;

insert into public.provider_locations (provider_type, provider_id, location_id)
select 'venue', vv.id, vv.location_id
  from public.venue_vendors vv
 where vv.location_id is not null
on conflict do nothing;


-- ══════════════════════════════════════════════════════════════════
-- 3. 그 날 그 지역에서 활동하는가
-- ══════════════════════════════════════════════════════════════════
--
-- p_location 이 null 이면 true 를 준다. 화면이 '전 지역' 을 고른 경우이고,
-- 그때의 지역 일치는 담는 단계에서 본다 (한 촬영 안에서 서로 맞는지).

create or replace function public.provider_in_location(
  p_type     text,
  p_id       uuid,
  p_location text,
  p_date     date
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_location is null or exists (
    select 1 from public.provider_locations pl
     where pl.provider_type = p_type
       and pl.provider_id   = p_id
       and pl.location_id   = p_location
       and pl.is_active
       and (pl.period_start is null or pl.period_start <= p_date)
       and (pl.period_end   is null or pl.period_end   >= p_date)
  );
$$;

grant execute on function public.provider_in_location(text, uuid, text, date)
  to authenticated, anon;


-- ══════════════════════════════════════════════════════════════════
-- 4. 의상 — 수령 방식과 보증금
-- ══════════════════════════════════════════════════════════════════

alter table public.dress_items
  add column if not exists deposit int not null default 0;

-- 가능한 수령 방식.
--   byOwner  주인이 현장에 들고 온다 (헤메 자체 의상만 해당, 보증금 없음)
--   pickup   고객이 매장에서 찾아간다
--   delivery 배송
alter table public.dress_items
  add column if not exists fulfillment text[] not null default '{pickup}';

-- 배송비. 배송을 하지 않는 의상은 의미가 없다.
alter table public.dress_items
  add column if not exists delivery_fee int not null default 0;

-- 헤메가 가진 의상은 기본적으로 '들고 온다' 가 가능하다.
-- 그 외에 픽업·배송을 열지는 주인이 정한다.
update public.dress_items
   set fulfillment = array['byOwner']
 where stylist_id is not null
   and fulfillment = array['pickup'];

comment on column public.dress_items.deposit is
  '보증금(원). byOwner 로 받을 때는 받지 않는다 — 옷이 주인 손을 떠나지 않는다.';


-- ══════════════════════════════════════════════════════════════════
-- 5. available_providers — 지역 판정을 provider_locations 로
-- ══════════════════════════════════════════════════════════════════

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
                 -- 그 사람이 이 날 활동하는 지역 전부. 화면이 교차 검증에 쓴다.
                 (select coalesce(array_agg(pl.location_id), '{}')
                    from public.provider_locations pl
                   where pl.provider_type = 'photographer' and pl.provider_id = p.id
                     and pl.is_active
                     and (pl.period_start is null or pl.period_start <= p_date)
                     and (pl.period_end   is null or pl.period_end   >= p_date)) as location_ids,
                 (select min(k.price) from public.packages k
                   where k.photographer_id = p.id and k.type = 'snap') as price_from
            from public.photographers p
           where p.is_active
             and public.provider_in_location('photographer', p.id, p_location, p_date)
             and exists (
               select 1 from public.packages k
                where k.photographer_id = p.id
                  and k.type = 'snap'
                  and coalesce(k.duration_hours, 2) = p_hours)
             and public.provider_is_open('photographer', p.id, p_date)
             and public.artist_slot_open(p.id, p_date, p_start, p_hours)
             and not public.provider_is_busy('photographer', p.id, v_shoot)
        ) x), '[]'::jsonb),

    -- ── 헤메 (시술 메뉴 단위) ──
    'stylists', coalesce((
      select jsonb_agg(to_jsonb(y) order by y.rating desc nulls last, y.name_ko, y.service_name)
        from (
          select s.id as stylist_id, s.name_ko, s.display_name, s.specialty,
                 s.location_id, s.portfolio_images, s.rating, s.review_count,
                 s.dress_self,
                 (select coalesce(array_agg(pl.location_id), '{}')
                    from public.provider_locations pl
                   where pl.provider_type = 'stylist' and pl.provider_id = s.id
                     and pl.is_active
                     and (pl.period_start is null or pl.period_start <= p_date)
                     and (pl.period_end   is null or pl.period_end   >= p_date)) as location_ids,
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
             and public.provider_in_location('stylist', s.id, p_location, p_date)
             and (sv.timing <> 'full' or sv.max_hours is null or p_hours <= sv.max_hours)
             and public.provider_is_open('stylist', s.id, p_date)
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
                 d.deposit, d.fulfillment, d.delivery_fee,   -- FIX_43
                 d.vendor_id, v.name_ko as vendor_name,
                 v.location_id,
                 (select coalesce(array_agg(pl.location_id), '{}')
                    from public.provider_locations pl
                   where pl.provider_type = 'dress' and pl.provider_id = v.id
                     and pl.is_active
                     and (pl.period_start is null or pl.period_start <= p_date)
                     and (pl.period_end   is null or pl.period_end   >= p_date)) as location_ids,
                 public.dress_booked_sizes(d.id, p_date) as booked_sizes
            from public.dress_items d
            join public.dress_vendors v on v.id = d.vendor_id
           where d.is_available
             and v.is_active
             and public.provider_in_location('dress', v.id, p_location, p_date)
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
                 vv.location_id,
                 (select coalesce(array_agg(pl.location_id), '{}')
                    from public.provider_locations pl
                   where pl.provider_type = 'venue' and pl.provider_id = vv.id
                     and pl.is_active
                     and (pl.period_start is null or pl.period_start <= p_date)
                     and (pl.period_end   is null or pl.period_end   >= p_date)) as location_ids
            from public.venue_items vi
            join public.venue_vendors vv on vv.id = vi.vendor_id
           where coalesce(vi.is_available, true)
             and vv.is_active
             and public.provider_in_location('venue', vv.id, p_location, p_date)
             and public.provider_is_open('venue', vv.id, p_date)
             and not public.item_is_busy(vi.id, v_shoot)
        ) w), '[]'::jsonb)
  ) into v_out;

  return v_out;
end $$;

grant execute on function public.available_providers(text, date, time, numeric)
  to authenticated, anon;


-- ══════════════════════════════════════════════════════════════════
-- 6. 확인
-- ══════════════════════════════════════════════════════════════════

select '옮긴 활동지역 수' as 항목, count(*)::text as 값 from public.provider_locations
union all
select '  └ 작가',  (select count(*)::text from public.provider_locations where provider_type = 'photographer')
union all
select '  └ 헤메',  (select count(*)::text from public.provider_locations where provider_type = 'stylist')
union all
select '  └ 의상',  (select count(*)::text from public.provider_locations where provider_type = 'dress')
union all
select '  └ 장소',  (select count(*)::text from public.provider_locations where provider_type = 'venue')
union all
select '주인이 들고오는 의상', (select count(*)::text from public.dress_items where 'byOwner' = any(fulfillment))
union all
select '보증금이 설정된 의상', (select count(*)::text from public.dress_items where deposit > 0);
