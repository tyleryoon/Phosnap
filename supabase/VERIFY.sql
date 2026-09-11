-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY — PhoSnap 상태 점검
--
-- 읽기 전용이다. 아무것도 바꾸지 않는다. 몇 번이든 돌려도 된다.
--
-- 왜 만들었나
--   지금까지 브라우저로 하나씩 클릭해서 검증했다. 그 방식은
--     · 느리다 — 계정 전환마다 사람이 필요하다
--     · 불완전하다 — 생각해낸 경로만 확인한다
--     · 반복되지 않는다 — 코드를 고쳐도 이전 경로를 다시 보지 않는다
--
--   그런데 지금까지 찾은 문제 대부분은 한 가지였다.
--   **데이터가 제대로 된 사람에게 닿지 않는다.**
--   그건 클릭으로 찾기엔 비효율적이고 쿼리로 찾기엔 아주 적합하다.
--
-- 쓰는 법
--   Supabase SQL Editor 에 전체를 붙여넣고 실행한다.
--   결과가 세 덩어리로 나온다.
--     1) 정합성 — 데이터가 서로 맞는가
--     2) 도달성 — 각 역할 시점에서 실제로 보이는가 (RLS 시뮬레이션)
--     3) 운영   — 알림·메일·크론이 도는가
--
--   상태 칸이 FAIL 이면 그 줄의 상세를 보고 고친다.
--   WARN 은 지금 당장 문제는 아니지만 알고 있어야 하는 것이다.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. 정합성
-- ───────────────────────────────────────────────────────────────────────
with checks as (

  -- 고객에게 노출되는 작가인데 상품이 없다 → 예약 2단계에서 막힌다
  select '정합성' as 구분, '활성 작가에 상품 없음' as 검사,
         count(*) as 건수,
         string_agg(coalesce(p.name_ko, p.name), ', ') as 상세
    from public.photographers p
   where p.is_active
     and not exists (select 1 from public.packages k where k.photographer_id = p.id)

  union all
  -- 지역이 없으면 헤메·의상·장소가 하나도 안 뜬다 (과거 최대 버그 원인)
  select '정합성', '활성 작가에 지역 없음',
         count(*), string_agg(coalesce(p.name_ko, p.name), ', ')
    from public.photographers p
   where p.is_active and coalesce(p.location_id, '') = ''

  union all
  -- 기본 운영시간이 없으면 달력이 비어 보인다
  select '정합성', '활성 작가에 기본 운영시간 없음',
         count(*), string_agg(coalesce(p.name_ko, p.name), ', ')
    from public.photographers p
   where p.is_active
     and not exists (
       select 1 from public.provider_defaults d
        where d.provider_type = 'photographer' and d.provider_id = p.id)

  union all
  -- 예약 총액과 아이템 합계가 다르면 정산이 어긋난다
  select '정합성', '예약 총액 ≠ 아이템 합계',
         count(*), string_agg(b.date || ' ' || b.total_price || ' vs ' || x.sum_items, ', ')
    from public.bookings b
    join lateral (
      select coalesce(sum(price), 0) as sum_items
        from public.booking_items i
       where i.booking_id = b.id
         and i.status not in ('cancelled','refunded')
    ) x on true
   where b.status not in ('cancelled','refunded')
     and b.total_price <> x.sum_items

  union all
  -- 정산 대상을 못 찾으면 돈을 보낼 수 없다
  select '정합성', '아이템의 공급자를 찾을 수 없음',
         count(*), string_agg(i.provider_type || ':' || i.item_name, ', ')
    from public.booking_items i
   where public.provider_user_id(i.provider_type, i.provider_id) is null

  union all
  -- 확정된 예약인데 일부 아이템이 대기로 남아 있다
  select '정합성', '확정 예약에 대기 아이템 잔류',
         count(*), string_agg(b.date || ' ' || i.item_name, ', ')
    from public.booking_items i
    join public.bookings b on b.id = i.booking_id
   where b.status = 'confirmed' and i.status = 'pending'

  union all
  -- 벤더 지역이 없으면 고객 지역 필터에 영원히 안 걸린다
  select '정합성', '활성 의상벤더에 지역 없음',
         count(*), string_agg(coalesce(v.name_ko, v.name), ', ')
    from public.dress_vendors v
   where v.is_active and coalesce(v.location_id, '') = ''

  union all
  select '정합성', '활성 장소벤더에 지역 없음',
         count(*), string_agg(v.name, ', ')
    from public.venue_vendors v
   where v.is_active and coalesce(v.location_id, '') = ''

  union all
  -- 노출은 켜졌는데 팔 것이 없다
  select '정합성', '활성 장소벤더에 아이템 0개',
         count(*), string_agg(v.name, ', ')
    from public.venue_vendors v
   where v.is_active
     and not exists (select 1 from public.venue_items i where i.vendor_id = v.id)

  union all
  -- 리뷰 집계가 실제와 다르면 목록·정렬이 틀어진다
  select '정합성', '리뷰 집계 불일치',
         count(*), string_agg(coalesce(p.name_ko, p.name) || ' ' ||
                              p.reviews_count || '≠' || r.cnt, ', ')
    from public.photographers p
    join lateral (
      select count(*) as cnt from public.photographer_reviews x
       where x.photographer_id = p.id
    ) r on true
   where coalesce(p.reviews_count, 0) <> r.cnt

  union all
  -- 종일 동행인데 감당 시간이 없으면 어떤 촬영에도 안 뜬다
  select '정합성', '종일 동행 시술에 max_hours 없음',
         count(*), string_agg(s.name_ko, ', ')
    from public.stylist_services s
   where s.timing = 'full' and s.max_hours is null

  union all
  -- 의상은 하루 단위 점유라 재고가 있어야 예약을 받는다
  select '정합성', '판매중 의상에 재고 정보 없음',
         count(*), string_agg(d.name_ko, ', ')
    from public.dress_items d
   where d.is_available
     and (d.size_stock is null or d.size_stock = '{}'::jsonb)
)
select 구분, 검사,
       case when 건수 = 0 then 'PASS' else 'FAIL' end as 상태,
       건수, coalesce(상세, '-') as 상세
  from checks
 order by case when 건수 = 0 then 1 else 0 end, 검사;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 도달성 — 각 역할 시점에서 실제로 보이는가
--
--    RLS 는 관리자에게는 적용되지 않는다. 역할을 바꿔야 실제로 검증된다.
--    로그인 없이 정책만으로 시뮬레이션하므로 안전하고 반복 가능하다.
--
--    지금까지 가장 비싸게 배운 것이 이 영역이다.
--      · 헤메·벤더가 자기 예약을 볼 수 없었다 (bookings 정책 누락)
--      · 알림이 한 번도 발송되지 않았다 (notifications INSERT 정책)
--    둘 다 "조회는 되는데 빈 결과" 라서 에러 없이 넘어갔다.
-- ───────────────────────────────────────────────────────────────────────

-- 손님(비로그인) 시점 — 고객이 둘러볼 때 보이는 것
set local role anon;
select 'anon' as 시점, '작가 목록' as 대상, count(*) as 보이는수 from public.photographers
union all select 'anon', '헤메 목록',     count(*) from public.stylists
union all select 'anon', '의상 아이템',   count(*) from public.dress_items
union all select 'anon', '장소 아이템',   count(*) from public.venue_items
union all select 'anon', '공개 스케줄',   count(*) from public.provider_schedules
union all select 'anon', '예약(0이어야 정상)', count(*) from public.bookings;
reset role;


-- ───────────────────────────────────────────────────────────────────────
-- 역할별 시점을 보려면 아래 블록의 uuid 를 바꿔가며 실행한다.
-- 대상 uuid 는 이 쿼리로 찾는다.
--
--   select p.id, p.email, p.full_name,
--          (select count(*) from public.photographers x where x.user_id = p.id) as 작가,
--          (select count(*) from public.stylists      x where x.user_id = p.id) as 헤메,
--          (select count(*) from public.dress_vendors x where x.user_id = p.id) as 의상,
--          (select count(*) from public.venue_vendors x where x.user_id = p.id) as 장소
--     from public.profiles p order by p.created_at;
-- ───────────────────────────────────────────────────────────────────────

-- 예시: 헤메 시점 (uuid 를 실제 값으로 바꿔서 실행)
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub','여기에_user_id','role','authenticated')::text, true);
--
-- select '헤메 시점' as 시점, '내 예약 아이템' as 대상, count(*) as 보이는수
--   from public.booking_items
-- union all
-- select '헤메 시점', '예약 본문(조인 대상)', count(*) from public.bookings
-- union all
-- select '헤메 시점', '내 알림', count(*) from public.notifications;
--
-- reset role;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 운영 — 알림·메일·크론
-- ───────────────────────────────────────────────────────────────────────
select '운영' as 구분, '메일 발송 상태' as 검사,
       email_status as 값, count(*) as 건수
  from public.notifications
 group by email_status

union all
-- 보낼 때가 지났는데 아직 대기 중이면 워커가 안 도는 것이다
select '운영', '발송 지연(10분 초과 대기)',
       case when count(*) = 0 then 'PASS' else 'FAIL' end, count(*)
  from public.notifications
 where email_status = 'pending'
   and email_after < now() - interval '10 minutes'
   and read_at is null

union all
select '운영', '발송 실패',
       case when count(*) = 0 then 'PASS' else 'FAIL' end, count(*)
  from public.notifications
 where email_status = 'failed'

union all
-- 만료됐어야 할 예약이 남아 있으면 크론이 안 도는 것이다
select '운영', '만료 시각 지난 대기 예약',
       case when count(*) = 0 then 'PASS' else 'FAIL' end, count(*)
  from public.bookings
 where status = 'pending' and expires_at < now();

-- 크론 등록 상태
select '운영' as 구분, jobname as 작업, schedule as 주기,
       case when active then 'ON' else 'OFF' end as 상태
  from cron.job order by jobname;

-- 최근 크론 실행 (실패가 있으면 여기서 보인다)
select j.jobname as 작업, d.status as 결과, count(*) as 횟수,
       max(d.start_time) as 최근실행
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
 where d.start_time > now() - interval '1 hour'
 group by j.jobname, d.status
 order by j.jobname, d.status;


-- ───────────────────────────────────────────────────────────────────────
-- 4. 현재 공급 현황 — 무엇을 테스트할 수 있는 상태인가
--
--    조합 검증을 하려면 그 조합에 해당하는 데이터가 먼저 있어야 한다.
--    "데이터가 없어서 통과한 검증은 검증이 아니다" 를 두 번 겪었다.
-- ───────────────────────────────────────────────────────────────────────
select '공급' as 구분, '작가 유형별' as 항목,
       coalesce(artist_type, '(미설정)') as 값, count(*) as 수
  from public.photographers where is_active group by artist_type

union all
select '공급', '헤메 시술 시점별', timing, count(*)
  from public.stylist_services
  join public.stylists s on s.id = stylist_services.stylist_id
 where s.is_active group by timing

union all
select '공급', '벤더 유형별', coalesce(vendor_type, '(미설정)'), count(*)
  from public.dress_vendors where is_active group by vendor_type

union all
select '공급', '장소 유형별', category, count(*)
  from public.venue_items i
  join public.venue_vendors v on v.id = i.vendor_id
 where v.is_active and i.is_available group by category

order by 항목, 값;
