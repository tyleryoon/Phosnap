-- CLEANUP_TEST_ACCOUNTS — 시드로 만든 테스트 계정을 지운다
--
-- 2026-09-13
--
-- 대상
--   scripts/seed-test-accounts.mjs 가 만든 계정만 지운다.
--     customer1@gmail.com · photo1@gmail.com · video1@gmail.com
--     both1@gmail.com · hnm1@gmail.com · vendor1@gmail.com  …
--
--   윤작가·윤헤메·윤스튜디오 같은 손으로 만든 계정은 건드리지 않는다.
--
-- ⚠ 실행 전에 1번 블록으로 **무엇이 지워지는지 먼저 본다.**
--   예약이 걸린 계정이 있으면 2-B 가 막는다.
--
-- 순서가 중요하다
--   자식 → 부모 순으로 지운다. auth.users 를 먼저 지우면
--   on delete cascade 가 도는 테이블과 안 도는 테이블이 섞여
--   고아 레코드가 남는다.


-- ── 1. 무엇이 지워지나 ────────────────────────────────────────────────

with seed as (
  select id, email from auth.users
   where email ~ '^(customer|photo|video|both|hnm|vendor)[0-9]+@gmail\.com$'
)
select '지울 계정 수' as 항목, count(*)::text as 값 from seed
union all
select '작가 레코드',
       (select count(*)::text from public.photographers p
         where p.user_id in (select id from seed))
union all
select '헤메 레코드',
       (select count(*)::text from public.stylists s
         where s.user_id in (select id from seed))
union all
select '의상벤더',
       (select count(*)::text from public.dress_vendors v
         where v.user_id in (select id from seed))
union all
select '장소벤더',
       (select count(*)::text from public.venue_vendors v
         where v.user_id in (select id from seed))
union all
select '⚠ 예약이 걸린 계정',
       (select count(distinct b.id)::text
          from public.bookings b
         where b.customer_id in (select id from seed)
            or b.photographer_id in (select p.id from public.photographers p
                                      where p.user_id in (select id from seed)));


-- ── 2. 정리 ───────────────────────────────────────────────────────────
--
-- 예약이 걸려 있으면 지우지 않는다. 결제·정산 기록이 사라지면
-- 나중에 무슨 일이 있었는지 복원할 수 없다.
-- 예약까지 지우려면 아래 3번을 따로 실행한다.

do $$
declare
  v_seed uuid[];
  v_booked int;
begin
  select array_agg(id) into v_seed
    from auth.users
   where email ~ '^(customer|photo|video|both|hnm|vendor)[0-9]+@gmail\.com$';

  if v_seed is null then
    raise notice '지울 테스트 계정이 없습니다.';
    return;
  end if;

  select count(*) into v_booked
    from public.bookings b
   where b.customer_id = any(v_seed)
      or b.photographer_id in (select p.id from public.photographers p where p.user_id = any(v_seed));

  if v_booked > 0 then
    raise exception '예약 %건이 걸려 있습니다. 3번 블록으로 예약을 먼저 처리하세요.', v_booked;
  end if;

  -- 자식부터
  delete from public.packages
   where photographer_id in (select id from public.photographers where user_id = any(v_seed));
  delete from public.stylist_services
   where stylist_id in (select id from public.stylists where user_id = any(v_seed));
  delete from public.dress_items
   where vendor_id in (select id from public.dress_vendors where user_id = any(v_seed))
      or stylist_id in (select id from public.stylists where user_id = any(v_seed));
  delete from public.venue_items
   where vendor_id in (select id from public.venue_vendors where user_id = any(v_seed));

  delete from public.provider_defaults
   where provider_id in (
     select id from public.photographers where user_id = any(v_seed)
     union all select id from public.stylists      where user_id = any(v_seed)
     union all select id from public.dress_vendors where user_id = any(v_seed)
     union all select id from public.venue_vendors where user_id = any(v_seed));
  delete from public.provider_schedules
   where provider_id in (
     select id from public.photographers where user_id = any(v_seed)
     union all select id from public.stylists      where user_id = any(v_seed)
     union all select id from public.dress_vendors where user_id = any(v_seed)
     union all select id from public.venue_vendors where user_id = any(v_seed));
  delete from public.artist_defaults
   where photographer_id in (select id from public.photographers where user_id = any(v_seed));
  delete from public.artist_schedules
   where photographer_id in (select id from public.photographers where user_id = any(v_seed));

  -- 공급자 레코드
  delete from public.photographers where user_id = any(v_seed);
  delete from public.stylists      where user_id = any(v_seed);
  delete from public.dress_vendors where user_id = any(v_seed);
  delete from public.venue_vendors where user_id = any(v_seed);

  -- 계정 주변
  delete from public.notifications where user_id = any(v_seed);
  delete from public.inquiries     where user_id = any(v_seed);
  delete from public.user_roles    where user_id = any(v_seed);
  delete from public.profiles      where id = any(v_seed);

  -- 마지막에 계정
  delete from auth.users where id = any(v_seed);

  raise notice '테스트 계정 %개를 정리했습니다.', array_length(v_seed, 1);
end $$;


-- ── 3. 예약까지 지워야 할 때만 (블록 실행) ────────────────────────────
/*
with seed as (
  select id from auth.users
   where email ~ '^(customer|photo|video|both|hnm|vendor)[0-9]+@gmail\.com$'
),
bk as (
  select b.id from public.bookings b
   where b.customer_id in (select id from seed)
      or b.photographer_id in (select p.id from public.photographers p
                                where p.user_id in (select id from seed))
)
delete from public.booking_items where booking_id in (select id from bk);

with seed as (
  select id from auth.users
   where email ~ '^(customer|photo|video|both|hnm|vendor)[0-9]+@gmail\.com$'
)
delete from public.bookings b
 where b.customer_id in (select id from seed)
    or b.photographer_id in (select p.id from public.photographers p
                              where p.user_id in (select id from seed));
*/


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select '남은 테스트 계정 (0이어야 정상)' as 항목,
       (select count(*)::text from auth.users
         where email ~ '^(customer|photo|video|both|hnm|vendor)[0-9]+@gmail\.com$') as 값
union all
select '고객에게 보이는 작가',
       (select count(*)::text from public.photographers where is_active)
union all
select '고객에게 보이는 헤메',
       (select count(*)::text from public.stylists where is_active);
