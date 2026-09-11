-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY_COMBO — 예약 6단계가 작가별로 실제로 채워지는지
--
-- 읽기 전용이다. 아무것도 바꾸지 않는다.
--
-- 왜 만들었나
--   작가 유형(사진/영상/사진+영상) × 자체 헤메 × 자체 의상 × 장소.
--   조합이 많아서 브라우저로 하나씩 눌러 보면 빠뜨린다.
--   그리고 지금까지 이 프로젝트에서 나온 문제 대부분은 같은 모양이었다 —
--   **화면은 멀쩡한데 보여줄 데이터가 그 사람에게 안 닿는다.**
--
--   예약 흐름의 실제 조회 조건을 그대로 옮겨 놓고, 작가마다
--   각 단계에 몇 개가 뜨는지 센다.
--
-- 예약 6단계와 데이터 출처 (Booking.jsx 기준)
--   STEP 01 날짜   provider_schedules + provider_defaults
--   STEP 02 패키지 packages (type in 'snap','tour')
--   STEP 03 H&M   stylists  WHERE location_id = 작가 지역 AND is_active
--   STEP 04 의상   작가가 dress_self 면 packages(type='costume'),
--                  아니면 dress_items JOIN dress_vendors (같은 지역)
--   STEP 05 장소   venue_items JOIN venue_vendors (같은 지역)
--   STEP 06 확인
--
-- 보는 법
--   0 이 있어도 무조건 문제는 아니다. 3·4·5 단계는 선택사항이다.
--   다만 **02 가 0이면 예약 자체가 불가능**하고,
--   자체 의상이라고 해 놓고 costume 이 0이면 고객에게 빈 목록이 뜬다.
--   판정 칸이 그걸 구분해 준다.
-- ═══════════════════════════════════════════════════════════════════════

with a as (
  select p.id, p.user_id,
         coalesce(p.name_ko, p.name)          as 작가,
         coalesce(p.artist_type,'(미설정)')    as 유형,
         coalesce(p.location_id,'(없음)')      as 지역,
         coalesce(p.hmk_self,false)            as 자체헤메,
         coalesce(p.dress_self,false)          as 자체의상,
         pr.email
    from public.photographers p
    left join public.profiles pr on pr.id = p.user_id
   where p.is_active
),
m as (
  select a.*,
    -- STEP 02 촬영 상품
    (select count(*) from public.packages k
      where k.photographer_id = a.id and coalesce(k.type,'snap') in ('snap','tour')) as s02_패키지,
    -- STEP 03 같은 지역 헤메
    (select count(*) from public.stylists s
      where s.is_active and s.location_id = a.지역)                                   as s03_헤메,
    -- 그 헤메들이 제공하는 시술 시점 (before/during/full 이 골고루 있나)
    (select count(distinct sv.timing) from public.stylist_services sv
       join public.stylists s on s.id = sv.stylist_id
      where s.is_active and s.location_id = a.지역)                                   as s03_시점종류,
    -- STEP 04 자체 의상 (packages type='costume')
    (select count(*) from public.packages k
      where k.photographer_id = a.id and k.type = 'costume')                          as s04_자체의상,
    -- STEP 04 벤더 의상 (같은 지역)
    (select count(*) from public.dress_items d
       join public.dress_vendors v on v.id = d.vendor_id
      where d.is_available and v.is_active and v.location_id = a.지역)                as s04_벤더의상,
    -- STEP 05 같은 지역 장소
    (select count(*) from public.venue_items i
       join public.venue_vendors v on v.id = i.vendor_id
      where i.is_available and v.is_active and v.location_id = a.지역)                as s05_장소,
    -- STEP 01 운영 시간
    (select count(*) from public.provider_defaults d
      where d.provider_type = 'photographer' and d.provider_id = a.id)                as s01_기본시간,
    -- 작가가 가입 때 입력한 자체 헤메 메뉴 (profiles.hmk_options)
    (select jsonb_array_length(coalesce(pr2.hmk_options, '[]'::jsonb))
       from public.profiles pr2 where pr2.id = a.user_id)                             as 헤메메뉴_입력값
  from a
)
select 작가, 유형, 지역,
       s01_기본시간 as "01일정", s02_패키지 as "02상품",
       s03_헤메     as "03헤메",  s03_시점종류 as "03시점",
       case when 자체의상 then s04_자체의상 else s04_벤더의상 end as "04의상",
       case when 자체의상 then '자체' else '벤더' end             as "04출처",
       s05_장소 as "05장소",
       case
         when 지역 = '(없음)'      then '✗ 지역 없음 — 3·4·5 단계가 통째로 빈다'
         when s02_패키지 = 0       then '✗ 촬영 상품 없음 — 예약 불가'
         when s01_기본시간 = 0     then '✗ 운영시간 없음 — 날짜 선택 불가'
         when 자체의상 and s04_자체의상 = 0
                                   then '✗ 자체 의상인데 costume 상품 0'
         when 자체헤메 and coalesce(헤메메뉴_입력값,0) > 0
                                   then '⚠ 자체 헤메 메뉴가 예약에 안 쓰임'
         when s03_헤메 = 0 and s04_벤더의상 = 0 and s05_장소 = 0
                                   then '⚠ 작가 단독만 가능 (협업 공급 없음)'
         else '정상'
       end as 판정
  from m
 order by 유형, 작가;


-- ═══════════════════════════════════════════════════════════════════════
-- 참고 1. 자체 헤메 메뉴가 어디에도 안 쓰인다 (2026-09-11 확인)
--
--   ArtistRegister 는 hmkSelf 를 켠 작가에게 메뉴를 입력받아
--   profiles.hmk_options 에 저장한다.
--   그런데 그 값을 읽는 곳이 **한 군데도 없다.**
--     · Booking.jsx STEP 03 은 getStylists(작가지역) 만 부른다
--     · toPhotographerCard 는 hmk_options 를 매핑하지 않는다
--     · 작가 상세 화면도 쓰지 않는다
--
--   즉 "자체 헤어메이크업 있음" 으로 가입한 작가의 고객은
--   그 작가의 메뉴 대신 **같은 지역 다른 헤메 목록**을 본다.
--
--   의상 쪽은 같은 구조가 제대로 구현돼 있다 —
--   dress_self 면 packages(type='costume') 을 보여준다.
--   헤메만 빠졌다. (예전에 dressSelf 도 toPhotographerCard 가 안 넘겨서
--   분기가 아예 안 탔던 것과 같은 계열의 문제다)
-- ═══════════════════════════════════════════════════════════════════════

select coalesce(p.name_ko, p.name) as 작가,
       p.hmk_self                  as 자체헤메_플래그,
       jsonb_array_length(coalesce(pr.hmk_options,'[]'::jsonb)) as 입력한_메뉴수,
       '예약 화면에서 사용되지 않음' as 현재상태
  from public.photographers p
  join public.profiles pr on pr.id = p.user_id
 where coalesce(p.hmk_self,false)
    or jsonb_array_length(coalesce(pr.hmk_options,'[]'::jsonb)) > 0;


-- ═══════════════════════════════════════════════════════════════════════
-- 참고 2. 지역별 공급 현황 — 어느 지역이 비어 있나
-- ═══════════════════════════════════════════════════════════════════════

with loc as (
  select distinct location_id from public.photographers where is_active and location_id is not null
  union select distinct location_id from public.stylists      where is_active and location_id is not null
  union select distinct location_id from public.dress_vendors where is_active and location_id is not null
  union select distinct location_id from public.venue_vendors where is_active and location_id is not null
)
select l.location_id as 지역,
       (select count(*) from public.photographers x where x.is_active and x.location_id = l.location_id) as 작가,
       (select count(*) from public.stylists      x where x.is_active and x.location_id = l.location_id) as 헤메,
       (select count(*) from public.dress_vendors x where x.is_active and x.location_id = l.location_id) as 의상벤더,
       (select count(*) from public.venue_vendors x where x.is_active and x.location_id = l.location_id) as 장소벤더
  from loc l
 order by 작가 desc;
