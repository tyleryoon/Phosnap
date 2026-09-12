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
--   전체를 붙여넣고 실행하면 결과가 **한 표**로 나온다.
--   (SQL Editor 는 여러 SELECT 중 마지막 것만 보여주기 때문에 하나로 합쳤다)
--
--   상태 칸
--     FAIL  고쳐야 한다
--     WARN  당장 문제는 아니지만 알고 있어야 한다
--     INFO  현황 숫자 (좋고 나쁨이 아니라 참고용)
--     PASS  이상 없음
--
--   맨 아래 "역할별 도달성" 은 별도로 실행한다 (RLS 시뮬레이션).
-- ═══════════════════════════════════════════════════════════════════════

with

-- ── 정합성 ────────────────────────────────────────────────────────────
integrity as (
  select '1.정합성' as 구분, '활성 작가에 상품 없음' as 검사, count(*) as 수,
         string_agg(coalesce(p.name_ko, p.name), ', ') as 상세
    from public.photographers p
   where p.is_active
     and not exists (select 1 from public.packages k where k.photographer_id = p.id)

  union all
  select '1.정합성', '활성 작가에 지역 없음', count(*),
         string_agg(coalesce(p.name_ko, p.name), ', ')
    from public.photographers p
   where p.is_active and coalesce(p.location_id, '') = ''

  union all
  select '1.정합성', '활성 작가에 기본 운영시간 없음', count(*),
         string_agg(coalesce(p.name_ko, p.name), ', ')
    from public.photographers p
   where p.is_active
     and not exists (select 1 from public.provider_defaults d
                      where d.provider_type = 'photographer' and d.provider_id = p.id)

  union all
  select '1.정합성', '예약 총액 ≠ 아이템 합계', count(*),
         string_agg(b.date || ' (' || b.total_price || ' vs ' || x.s || ')', ', ')
    from public.bookings b
    join lateral (select coalesce(sum(price),0) s from public.booking_items i
                   where i.booking_id = b.id
                     and i.status not in ('cancelled','refunded')) x on true
   where b.status not in ('cancelled','refunded') and b.total_price <> x.s

  union all
  select '1.정합성', '아이템의 공급자를 찾을 수 없음', count(*),
         string_agg(i.provider_type || ':' || i.item_name, ', ')
    from public.booking_items i
   where public.provider_user_id(i.provider_type, i.provider_id) is null

  union all
  select '1.정합성', '확정 예약에 대기 아이템 잔류', count(*),
         string_agg(b.date || ' ' || i.item_name, ', ')
    from public.booking_items i join public.bookings b on b.id = i.booking_id
   where b.status = 'confirmed' and i.status = 'pending'

  union all
  select '1.정합성', '활성 의상벤더에 지역 없음', count(*),
         string_agg(coalesce(v.name_ko, v.name), ', ')
    from public.dress_vendors v
   where v.is_active and coalesce(v.location_id,'') = ''

  union all
  select '1.정합성', '활성 장소벤더에 지역 없음', count(*), string_agg(v.name, ', ')
    from public.venue_vendors v
   where v.is_active and coalesce(v.location_id,'') = ''

  union all
  select '1.정합성', '활성 장소벤더에 아이템 0개', count(*), string_agg(v.name, ', ')
    from public.venue_vendors v
   where v.is_active
     and not exists (select 1 from public.venue_items i where i.vendor_id = v.id)

  union all
  select '1.정합성', '리뷰 집계 불일치', count(*),
         string_agg(coalesce(p.name_ko,p.name) || ' ' || p.reviews_count || '≠' || r.cnt, ', ')
    from public.photographers p
    join lateral (select count(*) cnt from public.photographer_reviews x
                   where x.photographer_id = p.id) r on true
   where coalesce(p.reviews_count,0) <> r.cnt

  union all
  select '1.정합성', '종일 동행 시술에 max_hours 없음', count(*), string_agg(s.name_ko, ', ')
    from public.stylist_services s where s.timing = 'full' and s.max_hours is null

  union all
  select '1.정합성', '판매중 의상에 재고 정보 없음', count(*), string_agg(d.name_ko, ', ')
    from public.dress_items d
   where d.is_available and (d.size_stock is null or d.size_stock = '{}'::jsonb)

  -- ── 역할 ↔ 공급자 레코드 불일치 ─────────────────────────────────────
  --
  -- 2026-09-11 에 실제로 터진 문제다.
  -- 헤메·의상벤더 계정에 artist 역할 없이 photographers 레코드가 생겼다.
  -- 화면 권한 검사가 localStorage 값을 믿어서 뚫렸고, RLS 는 역할을
  -- 보지 않아서 그대로 통과했다(FIX_23·FIX_24 에서 수정).
  --
  -- is_active=false 라 고객에게는 안 보였다. 즉 **화면으로는 절대 못 찾는다.**
  -- 이런 게 쿼리로 잡아야 하는 종류다.
  union all
  select '1.정합성', '작가 역할 없이 작가 레코드 보유', count(*),
         string_agg(coalesce(p.name_ko, p.name), ', ')
    from public.photographers p
   where not exists (select 1 from public.user_roles r
                      where r.user_id = p.user_id and r.role = 'artist')

  union all
  select '1.정합성', '헤메 역할 없이 헤메 레코드 보유', count(*),
         string_agg(s.name_ko, ', ')
    from public.stylists s
   where not exists (select 1 from public.user_roles r
                      where r.user_id = s.user_id and r.role = 'stylist')

  union all
  -- 헤메가 의상 대여를 겸하는 것은 정상이므로 stylist 도 인정한다.
  select '1.정합성', '벤더 역할 없이 벤더 레코드 보유', count(*),
         string_agg(coalesce(v.name_ko, v.name), ', ')
    from public.dress_vendors v
   where not exists (select 1 from public.user_roles r
                      where r.user_id = v.user_id
                        and r.role in ('dress_vendor','vendor','stylist'))

  union all
  -- 휴무일에 잡힌 예약.
  --
  -- 2026-09-12 에 찾았다. 예약 화면이 getProviderBusyBlocks(booking_items)만
  -- 봤다 — 그건 '이미 잡힌 예약'이지 휴무가 아니다.
  -- 헤메·벤더가 '이 날 휴무' 로 설정하고 저장 성공까지 확인해도
  -- 고객 화면에는 그대로 떴다. 공급자는 쉬는 줄 아는데 예약이 들어온다.
  --
  -- 화면 쪽은 고쳤지만(getProvidersClosedOn), 이미 들어간 예약과
  -- 앞으로 새는 경로를 잡으려면 이 검사가 필요하다.
  select '1.정합성', '휴무일에 잡힌 예약', count(*),
         string_agg(x.provider_type || ' ' || x.d::text, ', ')
    from (
      select distinct bi.provider_type, b.date::date as d
        from public.booking_items bi
        join public.bookings b on b.id = bi.booking_id
        join public.provider_schedules ps
          on ps.provider_type = bi.provider_type
         and ps.provider_id   = bi.provider_id
         and ps.date          = b.date::date
       where b.status in ('pending','confirmed','completed')
         and bi.status <> 'cancelled'
         and ps.day_off
    ) x

  union all
  -- INSERT 정책에 역할 검사가 빠진 테이블이 있는가.
  -- 정책은 OR 로 합쳐지므로 느슨한 게 하나만 남아도 전체가 뚫린다.
  select '1.정합성', 'INSERT 정책에 역할 검사 누락', count(*),
         string_agg(tablename || '.' || policyname, ', ')
    from pg_policies
   where schemaname = 'public'
     and cmd = 'INSERT'
     and tablename in ('photographers','stylists','dress_vendors','venue_vendors')
     and coalesce(with_check, '') not ilike '%has_role%'

  union all
  -- 돈은 받았는데 그 항목이 예약에 없는 경우.
  -- 결제 초안(sessionStorage)이 없으면 작가 항목만 저장되던 적이 있다.
  -- 고객은 헤메·의상·장소 값을 냈는데 공급자는 아무것도 모른다.
  select '1.정합성', '결제했는데 라인 아이템 없는 항목', count(*),
         string_agg(distinct toss_order_id, ', ')
    from (
      select b.toss_order_id
        from public.bookings b
       where b.status <> 'cancelled'
         and (
           (coalesce(b.stylist_price,0) > 0
             and not exists (select 1 from public.booking_items i
                              where i.booking_id = b.id and i.rate_type = 'stylist'))
        or (coalesce(b.dress_price,0) > 0
             and not exists (select 1 from public.booking_items i
                              where i.booking_id = b.id and i.provider_type = 'dress'))
        or (coalesce(b.venue_price,0) > 0
             and not exists (select 1 from public.booking_items i
                              where i.booking_id = b.id and i.provider_type = 'venue'))
         )
    ) x

  union all
  -- 승인되지 않았는데 고객에게 노출되는 공급자.
  -- 이게 있으면 승인 절차 자체가 없는 것과 같다 (FIX_34).
  select '1.정합성', '미승인인데 고객에게 노출', count(*), string_agg(누구, ', ')
    from (
      select coalesce(name_ko, name) || '(작가)' as 누구
        from public.photographers
       where is_active and not public.is_provider_approved(user_id, 'artist')
      union all
      select coalesce(name_ko, display_name) || '(헤메)'
        from public.stylists
       where is_active and not public.is_provider_approved(user_id, 'stylist')
      union all
      select coalesce(name_ko, name) || '(의상)'
        from public.dress_vendors
       where is_active and not public.is_provider_approved(user_id, 'vendor')
      union all
      select coalesce(name_ko, name) || '(장소)'
        from public.venue_vendors
       where is_active and not public.is_provider_approved(user_id, 'vendor')
    ) z

  union all
  -- 노출 자격과 실제 노출이 어긋난 경우. 트리거가 도는 한 0이어야 한다 (FIX_35).
  -- 자격 = 승인됨 AND 지역 있음 AND 팔 것이 하나 이상.
  select '1.정합성', '노출 자격과 실제가 불일치', count(*), string_agg(누구, ', ')
    from (
      select coalesce(name_ko, name) || '(작가)' as 누구
        from public.photographers
       where is_active is distinct from public.provider_listable('photographer', id)
      union all
      select coalesce(name_ko, display_name) || '(헤메)'
        from public.stylists
       where is_active is distinct from public.provider_listable('stylist', id)
      union all
      select coalesce(name_ko, name) || '(의상)'
        from public.dress_vendors
       where is_active is distinct from public.provider_listable('dress_vendor', id)
      union all
      select coalesce(name_ko, name) || '(장소)'
        from public.venue_vendors
       where is_active is distinct from public.provider_listable('venue_vendor', id)
    ) w

  union all
  -- 승인은 났는데 프로필이 덜 채워져 아직 안 보이는 공급자.
  -- 사고는 아니지만 연락해서 채우게 해야 한다. 본인은 승인만 보고 기다린다.
  select '2.대기', '승인됐지만 프로필 미완성', count(*), string_agg(누구, ', ')
    from (
      select coalesce(name_ko, name) || '(작가)' as 누구
        from public.photographers
       where public.is_provider_approved(user_id, 'artist')
         and not public.provider_listable('photographer', id)
      union all
      select coalesce(name_ko, display_name) || '(헤메)'
        from public.stylists
       where public.is_provider_approved(user_id, 'stylist')
         and not public.provider_listable('stylist', id)
    ) u

  union all
  -- 주인 없는 의상. vendor_id 와 stylist_id 가 둘 다 비었거나 둘 다 찼다.
  -- 전자는 정산 대상이 없고, 후자는 둘이 된다.
  select '1.정합성', '소유자가 불명확한 의상', count(*),
         string_agg(name_ko, ', ')
    from public.dress_items
   where (vendor_id is null and stylist_id is null)
      or (vendor_id is not null and stylist_id is not null)

  union all
  -- "자체 의상 보유" 라고 해놓고 하나도 안 올린 헤메.
  -- 고객 화면에서는 의상 칸이 비어 보인다. 막을 일은 아니고 알려줄 일이다.
  select '1.정합성', '자체 의상 보유인데 0벌 (헤메)', count(*),
         string_agg(coalesce(name_ko, display_name, '이름 미설정'), ', ')
    from public.stylists s
   where s.dress_self
     and s.is_active
     and not exists (select 1 from public.dress_items i where i.stylist_id = s.id)

  union all
  -- 같은 문제의 작가 쪽. 자체 의상은 packages(type='costume') 에 있다.
  select '1.정합성', '자체 의상 보유인데 0벌 (작가)', count(*),
         string_agg(coalesce(name_ko, name), ', ')
    from public.photographers p
   where p.dress_self
     and p.is_active
     and not exists (select 1 from public.packages k
                      where k.photographer_id = p.id and k.type = 'costume')

  union all
  -- 자체 헤메라고 해놓고 메뉴가 없는 작가. 예약 화면 헤메 칸이 빈다.
  select '1.정합성', '자체 헤메인데 메뉴 0개', count(*),
         string_agg(coalesce(name_ko, name), ', ')
    from public.photographers p
   where p.hmk_self
     and p.is_active
     and not exists (select 1 from public.packages k
                      where k.photographer_id = p.id and k.type = 'hmk')

  union all
  -- 의상을 팔았는데 의상 요율이 아닌 경우.
  -- 같은 드레스인데 파는 사람에 따라 수수료가 다르면 불만이 생긴다.
  select '1.정합성', '의상 아이템인데 의상 요율이 아님', count(*),
         string_agg(distinct item_name, ', ')
    from public.booking_items
   where item_id in (select id from public.dress_items)
     and coalesce(rate_type, provider_type) <> 'dress'

  union all
  -- 라인 아이템 합계와 결제 총액이 다른 경우.
  -- 어느 쪽이 맞는지 우리가 모른다는 뜻이고, 정산이 틀어진다.
  select '1.정합성', '아이템 합계 ≠ 결제 총액', count(*),
         string_agg(toss_order_id || ' (' || 합계 || ' vs ' || 총액 || ')', ', ')
    from (
      select b.toss_order_id,
             coalesce(sum(i.price * coalesce(i.quantity,1)), 0)::text as 합계,
             b.total_price::text as 총액
        from public.bookings b
        left join public.booking_items i on i.booking_id = b.id
       where b.status <> 'cancelled'
         and b.total_price > 0
       group by b.id, b.toss_order_id, b.total_price
      having coalesce(sum(i.price * coalesce(i.quantity,1)), 0) <> b.total_price
    ) y
),

-- ── 운영 ──────────────────────────────────────────────────────────────
ops as (
  select '3.운영' as 구분, '메일 발송 지연(10분 초과)' as 검사, count(*) as 수,
         '워커가 돌지 않는 신호' as 상세
    from public.notifications
   where email_status = 'pending' and email_after < now() - interval '10 minutes'
     and read_at is null

  union all
  select '3.운영', '메일 발송 실패', count(*),
         coalesce(string_agg(distinct left(email_error, 60), ' | '), '-')
    from public.notifications where email_status = 'failed'

  union all
  -- 반송·스팸신고. 'sent' 는 Resend 가 접수했다는 뜻일 뿐이라
  -- 도착 여부는 웹훅(FIX_32)이 되받아야 알 수 있다.
  -- 반송 주소로 계속 보내면 도메인 평판이 떨어져 정상 메일까지 스팸으로 간다.
  select '3.운영', '반송·스팸신고된 메일', count(*),
         coalesce(string_agg(distinct left(coalesce(email_error,''), 60), ' | '), '-')
    from public.notifications where email_status in ('bounced','complained')

  union all
  select '3.운영', '발송 불가로 표시된 주소', count(*),
         coalesce(string_agg(email, ', '), '-')
    from public.profiles where email_bounced_at is not null

  union all
  select '3.운영', '만료 시각 지난 대기 예약', count(*),
         '크론이 돌지 않는 신호' from public.bookings
   where status = 'pending' and expires_at < now()

  union all
  select '3.운영', '크론 미등록', 2 - count(*),
         coalesce(string_agg(jobname, ', '), '(없음)')
    from cron.job where jobname in ('notify-worker','expire-stale-bookings')

  union all
  select '3.운영', '최근 1시간 크론 실패', count(*),
         coalesce(string_agg(distinct left(coalesce(d.return_message,''), 60), ' | '), '-')
    from cron.job_run_details d
   where d.start_time > now() - interval '1 hour' and d.status <> 'succeeded'
),

-- ── 공급 현황 (INFO — 조합 검증의 전제) ───────────────────────────────
supply as (
  select '4.공급' as 구분, '작가 유형: ' || coalesce(artist_type,'(미설정)') as 검사,
         count(*) as 수, '' as 상세
    from public.photographers where is_active group by artist_type

  union all
  select '4.공급', '헤메 시술 시점: ' || timing, count(*), ''
    from public.stylist_services s
    join public.stylists t on t.id = s.stylist_id
   where t.is_active group by timing

  union all
  select '4.공급', '벤더 유형: ' || coalesce(vendor_type,'(미설정)'), count(*), ''
    from public.dress_vendors where is_active group by vendor_type

  union all
  select '4.공급', '장소 유형: ' || category, count(*), ''
    from public.venue_items i join public.venue_vendors v on v.id = i.vendor_id
   where v.is_active and i.is_available group by category

  union all
  select '4.공급', '메일 상태: ' || email_status, count(*), ''
    from public.notifications group by email_status
),

all_rows as (
  select 구분, 검사, 수, 상세, 'check' as kind from integrity
  union all select 구분, 검사, 수, 상세, 'check' from ops
  union all select 구분, 검사, 수, 상세, 'info'  from supply
)

select 구분,
       검사,
       case when kind = 'info'           then 'INFO'
            when 수 = 0                   then 'PASS'
            -- '2.대기' 는 사고가 아니라 사람이 챙길 일이다.
            -- 승인은 났는데 프로필이 덜 채워진 공급자 같은 것.
            when 구분 like '2.%'          then 'WARN'
            else 'FAIL' end as 상태,
       수,
       coalesce(nullif(상세,''), '-') as 상세
  from all_rows
 order by 구분,
          case when kind = 'info' then 2
               when 수 > 0 then 0 else 1 end,
          검사;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. 도달성 — RLS 시뮬레이션 (별도로 실행한다)
--
--    RLS 는 관리자에게 적용되지 않는다. 역할을 바꿔야 실제로 검증된다.
--    로그인 없이 정책만으로 확인하므로 안전하고 반복 가능하다.
--
--    가장 비싸게 배운 영역이다.
--      · 헤메·벤더가 자기 예약을 볼 수 없었다 (bookings 정책 누락)
--      · 알림이 한 번도 발송되지 않았다 (notifications INSERT 정책)
--    둘 다 "조회는 되는데 빈 결과" 라 에러 없이 넘어갔다.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 2-A. 손님(비로그인) 시점 — 아래 4줄만 블록 실행 ──────────────────
/*
set local role anon;
select 'anon' as 시점, '작가' as 대상, count(*) as 보임 from public.photographers
union all select 'anon','헤메',count(*) from public.stylists
union all select 'anon','의상',count(*) from public.dress_items
union all select 'anon','장소',count(*) from public.venue_items
union all select 'anon','스케줄',count(*) from public.provider_schedules
union all select 'anon','예약(0이어야 정상)',count(*) from public.bookings;
reset role;
*/

-- ── 2-B. 대상 uuid 찾기 ───────────────────────────────────────────────
/*
select p.id, p.email,
       (select count(*) from public.photographers x where x.user_id = p.id) 작가,
       (select count(*) from public.stylists      x where x.user_id = p.id) 헤메,
       (select count(*) from public.dress_vendors x where x.user_id = p.id) 의상,
       (select count(*) from public.venue_vendors x where x.user_id = p.id) 장소
  from public.profiles p order by p.created_at;
*/

-- ── 2-C. 특정 사용자 시점 — uuid 를 바꿔서 블록 실행 ──────────────────
/*
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub','여기에_user_id','role','authenticated')::text, true);

select '내 시점' as 시점, '내 예약 아이템' as 대상, count(*) as 보임
  from public.booking_items
union all select '내 시점','예약 본문(조인 대상)', count(*) from public.bookings
union all select '내 시점','내 알림',             count(*) from public.notifications
union all select '내 시점','내 채팅방',           count(*) from public.chat_rooms;

reset role;
*/
