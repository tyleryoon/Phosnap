-- ═══════════════════════════════════════════════════════════════════════
-- FIX_24 — 역할 없이 생긴 공급자 레코드 정리
--
-- 2026-09-11
--
-- FIX_23 이 앞으로를 막는다면, 이 파일은 이미 생긴 것을 치운다.
--
-- 대상 (2026-09-11 기준 확인됨)
--   hnm@gmail.com       윤헤메     stylist 역할만 보유 · photographers 레코드 있음
--   yoonstudio@gmail.com 윤스튜디오 dress_vendor 역할만 보유 · photographers 레코드 있음
--
--   둘 다 상품 0 · 포트폴리오 0 · 지역 없음 · 받은 예약 0 인 빈 껍데기다.
--   is_active = false 라 고객에게는 안 보였지만, 누가 실수로 켜면
--   헤메가 작가 목록에 뜬다.
--
-- 지우지 않는 것
--   keonsik806@gmail.com 윤건식 — artist 역할을 정상 보유한다(계정 생성 +1초에
--   가입 폼이 만든 레코드). 미완성일 뿐 오류가 아니다.
--
-- 안전장치
--   1) 먼저 무엇이 지워질지 **보여주기만** 한다 (1단계).
--   2) 실제 삭제(2단계)는 주석 처리해 뒀다. 1단계 결과를 눈으로 확인하고
--      그때 주석을 풀어라.
--   3) 삭제 조건에 "역할 없음 + 사용 흔적 전무" 를 모두 건다.
--      상품·포트폴리오·예약·지역 중 하나라도 있으면 절대 지우지 않는다.
--      진짜 작가를 실수로 날리는 것이 이 파일에서 제일 무서운 일이다.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1단계. 무엇이 지워질지 확인 (읽기 전용) ───────────────────────────

with orphan as (
  select p.id, p.user_id,
         coalesce(p.name_ko, p.name) as 이름,
         p.is_active,
         p.created_at
    from public.photographers p
   where
     -- 조건 A: artist 역할 행이 아예 없다 (반려 상태도 '있음'으로 친다)
     not exists (
       select 1 from public.user_roles r
        where r.user_id = p.user_id and r.role = 'artist'
     )
     -- 조건 B: 작가로서 쓰인 흔적이 전혀 없다
     and not exists (select 1 from public.packages k where k.photographer_id = p.id)
     and not exists (select 1 from public.booking_items i
                      where i.provider_type = 'photographer' and i.provider_id = p.id)
     and not exists (select 1 from public.photographer_reviews v where v.photographer_id = p.id)
     and coalesce(jsonb_array_length(coalesce(p.portfolio, '[]'::jsonb)), 0) = 0
     and coalesce(p.location_id, '') = ''
     and p.is_active = false
)
select o.이름,
       pr.email,
       (select string_agg(r.role || '/' || coalesce(r.status,'active'), ', ')
          from public.user_roles r where r.user_id = o.user_id) as 실제_보유역할,
       o.created_at as 레코드_생성,
       '삭제 예정' as 처리
  from orphan o
  join public.profiles pr on pr.id = o.user_id
 order by o.created_at;


-- ── 2단계. 실제 삭제 ──────────────────────────────────────────────────
--
-- 위 결과가 예상과 같으면(윤헤메 · 윤스튜디오 2건) 아래 블록의 주석을 풀고
-- 그 부분만 선택해서 실행해라.
--
-- 조건은 1단계와 글자 그대로 같다. 바꾸지 마라.

/*
delete from public.photographers p
 where not exists (
         select 1 from public.user_roles r
          where r.user_id = p.user_id and r.role = 'artist'
       )
   and not exists (select 1 from public.packages k where k.photographer_id = p.id)
   and not exists (select 1 from public.booking_items i
                    where i.provider_type = 'photographer' and i.provider_id = p.id)
   and not exists (select 1 from public.photographer_reviews v where v.photographer_id = p.id)
   and coalesce(jsonb_array_length(coalesce(p.portfolio, '[]'::jsonb)), 0) = 0
   and coalesce(p.location_id, '') = ''
   and p.is_active = false
returning id, coalesce(name_ko, name) as 지운_이름;
*/


-- ── 3단계. 남은 불일치 점검 (읽기 전용) ───────────────────────────────
--
-- 의상벤더·장소벤더 쪽에도 같은 문제가 있는지 본다.
-- 참고: 헤메가 의상 대여를 겸하는 것은 정상이므로 stylist 도 허용으로 본다.

select '의상벤더' as 종류, coalesce(v.name_ko, v.name) as 이름, pr.email,
       (select string_agg(r.role, ', ') from public.user_roles r where r.user_id = v.user_id) as 보유역할
  from public.dress_vendors v join public.profiles pr on pr.id = v.user_id
 where not exists (select 1 from public.user_roles r
                    where r.user_id = v.user_id
                      and r.role in ('dress_vendor','vendor','stylist'))

union all
select '장소벤더', v.name, pr.email,
       (select string_agg(r.role, ', ') from public.user_roles r where r.user_id = v.user_id)
  from public.venue_vendors v join public.profiles pr on pr.id = v.user_id
 where not exists (select 1 from public.user_roles r
                    where r.user_id = v.user_id
                      and r.role in ('dress_vendor','vendor','stylist'))

union all
select '헤메', s.name_ko, pr.email,
       (select string_agg(r.role, ', ') from public.user_roles r where r.user_id = s.user_id)
  from public.stylists s join public.profiles pr on pr.id = s.user_id
 where not exists (select 1 from public.user_roles r
                    where r.user_id = s.user_id and r.role = 'stylist');
