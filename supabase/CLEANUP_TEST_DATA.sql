-- ═══════════════════════════════════════════════════════════════════════
-- CLEANUP_TEST_DATA — 실서비스 전 테스트 데이터 정리
--
-- 2026-09-12
--
-- ⚠ 아직 돌리지 마라.
--   지금 남아 있는 테스트 계정은 검증에 쓰인다.
--   VERIFY_COMBO 가 "작가 유형 3종 × 헤메 × 벤더" 를 확인할 수 있는 건
--   이 데이터가 있어서다. 지우면 다음 검증 때 다시 만들어야 한다.
--
--   **실제 작가를 받기 직전에** 실행해라.
--
-- 쓰는 법
--   1단계로 무엇이 지워질지 본다 → 눈으로 확인 → 2단계 주석을 푼다.
--   auth.users 를 지우면 on delete cascade 로 profiles·user_roles·
--   photographers·packages·bookings·notifications 가 함께 사라진다.
--
-- 남기는 것
--   keonsik806@gmail.com — 관리자 계정. 절대 지우지 않는다.
--   지우면 /admin 에 아무도 못 들어가고 되돌릴 방법도 없다.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1단계. 무엇이 지워질지 확인 ───────────────────────────────────────

with target as (
  select id, email from auth.users
   where email in (
     'photo@gmail.com',        -- 윤작가   (사진)
     'video@gmail.com',        -- 윤비디오 (영상)
     'both@gmail.com',         -- 윤둘다   (사진+영상)
     'photo2@gmail.com',       -- 윤겔라   (승인/반려 테스트)
     'hnm@gmail.com',          -- 윤헤메
     'yoonstudio@gmail.com',   -- 윤스튜디오 (벤더)
     'customer@gmail.com'      -- 테스트 고객
   )
     -- 안전장치. 관리자 계정은 목록에 넣어도 걸러진다.
     and email <> 'keonsik806@gmail.com'
)
select t.email,
       (select count(*) from public.user_roles      x where x.user_id = t.id) as 역할,
       (select count(*) from public.photographers   x where x.user_id = t.id) as 작가,
       (select count(*) from public.stylists        x where x.user_id = t.id) as 헤메,
       (select count(*) from public.dress_vendors   x where x.user_id = t.id) as 의상벤더,
       (select count(*) from public.venue_vendors   x where x.user_id = t.id) as 장소벤더,
       (select count(*) from public.bookings        x where x.customer_id = t.id) as 고객예약,
       (select count(*) from public.notifications   x where x.user_id = t.id) as 알림,
       (select count(*) from public.inquiries       x where x.user_id = t.id) as 문의
  from target t
 order by t.email;


-- 관리자 계정이 목록에 없는지 한 번 더 확인 (0 이어야 한다)
select count(*) as "⚠ 관리자가 삭제 대상에 포함됨"
  from auth.users
 where email = 'keonsik806@gmail.com'
   and email in ('photo@gmail.com','video@gmail.com','both@gmail.com',
                 'photo2@gmail.com','hnm@gmail.com','yoonstudio@gmail.com',
                 'customer@gmail.com');


-- ── 2단계. 삭제 ───────────────────────────────────────────────────────
--
-- 1단계 결과가 예상과 같으면 아래 주석을 풀고 실행한다.
--
-- auth.users 삭제는 되돌릴 수 없다. 예약·정산 기록도 함께 사라진다.
-- 실제 거래가 한 건이라도 있었다면 그 계정은 목록에서 빼라.

/*
delete from auth.users
 where email in (
   'photo@gmail.com',
   'video@gmail.com',
   'both@gmail.com',
   'photo2@gmail.com',
   'hnm@gmail.com',
   'yoonstudio@gmail.com',
   'customer@gmail.com'
 )
   and email <> 'keonsik806@gmail.com'
returning email;
*/


-- ── 3단계. 남은 부스러기 ──────────────────────────────────────────────
--
-- cascade 로 안 지워지는 것들. 계정 삭제 후 실행한다.

/*
-- 주인 없는 예약 아이템
delete from public.booking_items bi
 where not exists (select 1 from public.bookings b where b.id = bi.booking_id);

-- 주인 없는 패키지
delete from public.packages k
 where not exists (select 1 from public.photographers p where p.id = k.photographer_id);

-- 주인 없는 스케줄
delete from public.provider_schedules s
 where public.provider_user_id(s.provider_type, s.provider_id) is null;
delete from public.provider_defaults d
 where public.provider_user_id(d.provider_type, d.provider_id) is null;

-- 관리자 본인의 테스트 알림·문의 (원하면)
-- delete from public.notifications
--  where type in ('inquiry_new','inquiry_received','inquiry_answered')
--    and created_at < now();
-- delete from public.inquiries where subject like '%테스트%';
*/


-- ── 4단계. 정리 후 확인 ───────────────────────────────────────────────
--
-- VERIFY.sql 을 다시 돌려라. 모든 검사가 PASS 여야 한다.
-- 특히 아래가 0 인지 본다.

/*
select '주인 없는 예약아이템' as 항목, count(*)::text as 수
  from public.booking_items bi
 where not exists (select 1 from public.bookings b where b.id = bi.booking_id)
union all
select '주인 없는 패키지',
       (select count(*)::text from public.packages k
         where not exists (select 1 from public.photographers p where p.id = k.photographer_id))
union all
select '남은 계정 수', (select count(*)::text from auth.users)
union all
select '관리자 수', (select count(*)::text from public.user_roles
                      where role = 'admin' and status = 'active');
*/
