-- ═══════════════════════════════════════════════════════════════════════
-- FIX_19: 작가·헤메·벤더 스케줄을 공통 테이블로 통합
--
-- 배경
--   역할마다 스케줄 저장 방식이 제각각이었다.
--     작가 : artist_schedules + artist_defaults (DB)      정상
--     헤메 : stylist_schedules 테이블은 있으나 관리 화면 없음 → 휴무 설정 불가
--     벤더 : localStorage('phosnap_vendor_schedule_*')    고객이 볼 수 없음
--
--   1차 검증에서 작가 스케줄이 localStorage 전용이라 고객 화면에서
--   모든 날짜가 '휴무'로 보이던 문제를 고쳤는데, 벤더는 그대로 남아 있었다.
--
--   같은 로직을 세 벌 쓰면 규칙이 바뀔 때마다 세 군데를 고쳐야 하고,
--   "날짜 범위 일괄 오픈/클로즈" 같은 기능도 세 번 만들어야 한다.
--   booking_items 와 같은 방식으로 하나에 담는다.
--
-- 적용 순서: FIX_18 다음
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 기본 운영 시간
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.provider_defaults (
  provider_type text not null
    check (provider_type in ('photographer','stylist','dress','venue')),
  provider_id   uuid not null,

  -- 평상시 운영 슬롯. 날짜별 설정이 없으면 이걸 쓴다.
  default_slots text[] not null default array[
    '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'
  ],

  -- 정기 휴무 요일 (0=일 … 6=토).
  -- 일괄 오픈 시 이 요일은 건너뛴다.
  weekly_off    int[] not null default '{}',

  updated_at    timestamptz not null default now(),
  primary key (provider_type, provider_id)
);


-- ───────────────────────────────────────────────────────────────────────
-- 2. 날짜별 스케줄
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.provider_schedules (
  id            uuid primary key default uuid_generate_v4(),
  provider_type text not null
    check (provider_type in ('photographer','stylist','dress','venue')),
  provider_id   uuid not null,
  date          date not null,

  day_off       boolean not null default false,
  -- 이 날만 다르게 운영할 때. 비어 있으면 provider_defaults 를 따른다.
  slots         text[] not null default '{}',
  -- 운영은 하지만 막아둔 시간
  blocked       text[] not null default '{}',
  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (provider_type, provider_id, date)
);

drop trigger if exists trg_provider_schedules_updated on public.provider_schedules;
create trigger trg_provider_schedules_updated
  before update on public.provider_schedules
  for each row execute function public.set_updated_at();

create index if not exists idx_provider_schedules_lookup
  on public.provider_schedules (provider_type, provider_id, date);


-- ───────────────────────────────────────────────────────────────────────
-- 3. RLS
--    고객이 가용 여부를 봐야 하므로 조회는 공개.
--    쓰기는 본인만 (owns_provider 는 FIX_15 에서 만든 SECURITY DEFINER).
-- ───────────────────────────────────────────────────────────────────────
alter table public.provider_schedules enable row level security;
alter table public.provider_defaults  enable row level security;

drop policy if exists "스케줄 공개 조회" on public.provider_schedules;
create policy "스케줄 공개 조회" on public.provider_schedules
  for select using (true);

drop policy if exists "스케줄 본인 관리" on public.provider_schedules;
create policy "스케줄 본인 관리" on public.provider_schedules
  for all using    (public.owns_provider(provider_type, provider_id))
       with check  (public.owns_provider(provider_type, provider_id));

drop policy if exists "기본시간 공개 조회" on public.provider_defaults;
create policy "기본시간 공개 조회" on public.provider_defaults
  for select using (true);

drop policy if exists "기본시간 본인 관리" on public.provider_defaults;
create policy "기본시간 본인 관리" on public.provider_defaults
  for all using    (public.owns_provider(provider_type, provider_id))
       with check  (public.owns_provider(provider_type, provider_id));

grant select on public.provider_schedules, public.provider_defaults to anon, authenticated;
grant insert, update, delete on public.provider_schedules to authenticated;
grant insert, update, delete on public.provider_defaults  to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 4. 기존 작가 스케줄 이관
--    artist_schedules / artist_defaults 는 삭제하지 않는다.
--    코드가 전부 넘어간 뒤에 정리한다.
-- ───────────────────────────────────────────────────────────────────────
insert into public.provider_schedules
  (provider_type, provider_id, date, day_off, slots, blocked, created_at)
select 'photographer', s.photographer_id, s.date,
       coalesce(s.day_off, false),
       coalesce(s.slots, '{}'),
       coalesce(s.blocked, '{}'),
       coalesce(s.created_at, now())
  from public.artist_schedules s
 where not exists (
   select 1 from public.provider_schedules p
    where p.provider_type = 'photographer'
      and p.provider_id   = s.photographer_id
      and p.date          = s.date
 );

insert into public.provider_defaults (provider_type, provider_id, default_slots)
select 'photographer', d.photographer_id, coalesce(d.default_slots, array[
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'
])
  from public.artist_defaults d
 where not exists (
   select 1 from public.provider_defaults p
    where p.provider_type = 'photographer' and p.provider_id = d.photographer_id
 );


-- ───────────────────────────────────────────────────────────────────────
-- 5. 날짜 범위 일괄 오픈/클로즈
--
--    ⚠ 확정된 예약이 있는 날짜는 닫지 않는다.
--      닫아버리면 고객은 예약을 들고 있는데 공급자 일정에는 없는
--      상태가 되어 촬영 당일 아무도 나오지 않는다.
--      건너뛴 날짜는 목록으로 돌려주어 화면에서 안내한다.
--
--    p_open = true  → 영업일로 열기 (slots 지정 없으면 기본 운영시간)
--    p_open = false → 휴무로 닫기
--    정기 휴무 요일(weekly_off)은 열 때 건너뛴다.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.bulk_set_schedule(
  p_type   text,
  p_id     uuid,
  p_from   date,
  p_to     date,
  p_open   boolean,
  p_slots  text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date     date;
  v_weekly   int[];
  v_updated  int := 0;
  v_skipped  date[] := '{}';
  v_holiday  date[] := '{}';
  v_busy     boolean;
begin
  if not public.owns_provider(p_type, p_id) then
    raise exception '이 일정을 변경할 권한이 없습니다';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception '기간이 올바르지 않습니다';
  end if;

  if p_to - p_from > 366 then
    raise exception '한 번에 최대 1년까지 설정할 수 있습니다';
  end if;

  select weekly_off into v_weekly
    from public.provider_defaults
   where provider_type = p_type and provider_id = p_id;
  v_weekly := coalesce(v_weekly, '{}');

  v_date := p_from;
  while v_date <= p_to loop
    -- 정기 휴무 요일은 열지 않는다
    if p_open and extract(dow from v_date)::int = any (v_weekly) then
      v_holiday := v_holiday || v_date;
    else
      v_busy := false;

      -- 닫으려는 날에 살아 있는 예약이 있는지 확인
      if not p_open then
        select exists (
          select 1
            from public.booking_items bi
            join public.bookings b on b.id = bi.booking_id
           where bi.provider_type = p_type
             and bi.provider_id   = p_id
             and b.date           = v_date
             and bi.status in ('pending','confirmed','completed')
        ) into v_busy;
      end if;

      if v_busy then
        v_skipped := v_skipped || v_date;
      else
        insert into public.provider_schedules
          (provider_type, provider_id, date, day_off, slots)
        values
          (p_type, p_id, v_date, not p_open,
           case when p_open then coalesce(p_slots, '{}') else '{}' end)
        on conflict (provider_type, provider_id, date) do update
          set day_off = excluded.day_off,
              slots   = case when p_open then excluded.slots
                             else public.provider_schedules.slots end,
              updated_at = now();
        v_updated := v_updated + 1;
      end if;
    end if;

    v_date := v_date + 1;
  end loop;

  return jsonb_build_object(
    'updated', v_updated,
    'skipped', to_jsonb(v_skipped),   -- 예약이 있어 닫지 못한 날짜
    'holiday', to_jsonb(v_holiday)    -- 정기 휴무라 건너뛴 날짜
  );
end;
$$;

grant execute on function public.bulk_set_schedule(text, uuid, date, date, boolean, text[])
  to authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- 6. 확인
-- ───────────────────────────────────────────────────────────────────────
select provider_type, count(*) as 날짜수, min(date) as 시작, max(date) as 끝
  from public.provider_schedules
 group by provider_type;

select provider_type, provider_id, array_length(default_slots, 1) as 기본슬롯수, weekly_off
  from public.provider_defaults;
