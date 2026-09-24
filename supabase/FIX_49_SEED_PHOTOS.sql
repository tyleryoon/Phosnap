-- ═══════════════════════════════════════════════════════════════════════
-- FIX_49: 시드 의상·장소 사진을 분류에 맞는 것으로
--
-- 무엇이 문제였나
--   시드 스크립트가 picsum.photos 를 썼다. seed 를 주면 늘 같은 사진이
--   나오지만 **그 사진이 무엇인지는 아무도 모른다.** 그래서 고객 화면이
--   이렇게 보였다.
--
--     남성 정장 1      → 카페 테이블 사진
--     웨딩 드레스 1    → 산딸기 사진
--     전통 한복 6      → 사막 사진
--
--   가짜로 보이는 게 아니라 **고장난 데이터로 보인다.** 예약 화면에서
--   제품 사진은 고객이 고르는 근거라 특히 그렇다.
--
-- ⚠ 앞선 두 판이 왜 0 건을 걸었나 (같은 실수를 되풀이하지 않으려 남긴다)
--
--   1판  create temporary table 로 사진 목록을 담았다. SQL 편집기가 문장을
--        나눠 실행하면 다음 문장에서 그 표가 이미 사라져 있다.
--   2판  images 에 jsonb_build_array() 를 썼다. 그런데
--        **dress_items.images 는 text[] 다** (udt_name = _text).
--        venue_items.images 만 jsonb 다. 둘을 같게 쓴 게 잘못이었다.
--        타입이 안 맞아 문장이 통째로 실패했고, 확인 쿼리만 보면
--        "아무 일도 없었다" 로 보인다.
--
--   그래서 이 판은 CTE·조인·임시 테이블을 전혀 쓰지 않는다. 분류마다
--   UPDATE 한 문장이고, 각 문장이 그 자체로 완결된다.
--
-- 사진 고르기
--   uuid 의 마지막 글자로 여섯 장 중 하나를 고른다. 표준 함수만 쓰고
--   같은 행은 늘 같은 사진이 나온다. 목록이 한 사진으로 도배되지 않는다.
--
-- 안전한가
--   picsum 이 든 행만 바꾼다. 벤더가 직접 올린 사진(Supabase storage)은
--   건드리지 않는다. 여러 번 실행해도 된다.
--
-- 선행: 없음 (독립)
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 의상 — 분류마다 한 문장
--
--    image_url 만 먼저 맞추고, images(text[]) 는 5번에서 한 번에 맞춘다.
-- ───────────────────────────────────────────────────────────────────────

-- 한복
update public.dress_items
   set image_url = (array[
         'https://images.unsplash.com/photo-1711887540798-9d7d720e5319?w=900&q=80',
         'https://images.unsplash.com/photo-1703437876552-f054cd8e8b88?w=900&q=80',
         'https://images.unsplash.com/photo-1698880754311-64351d62db07?w=900&q=80',
         'https://images.unsplash.com/photo-1506480932912-dbbe35e3e516?w=900&q=80',
         'https://images.unsplash.com/photo-1588676907230-020a495f4cc9?w=900&q=80',
         'https://images.unsplash.com/photo-1627630228445-942830cb4982?w=900&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]
 where coalesce(category, 'hanbok') = 'hanbok'
   and (coalesce(image_url, '') like '%picsum%'
     or coalesce(array_to_string(images, ','), '') like '%picsum%');

-- 웨딩 드레스
update public.dress_items
   set image_url = (array[
         'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=900&q=80',
         'https://images.unsplash.com/photo-1549488497-94b52bddac5d?w=900&q=80',
         'https://images.unsplash.com/photo-1622277430358-f4d134452e2e?w=900&q=80',
         'https://images.unsplash.com/photo-1532454781337-fc3edff34f91?w=900&q=80',
         'https://images.unsplash.com/photo-1579583764988-3e08c6132d2a?w=900&q=80',
         'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=900&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]
 where category = 'dress'
   and (coalesce(image_url, '') like '%picsum%'
     or coalesce(array_to_string(images, ','), '') like '%picsum%');

-- 정장 · 턱시도
update public.dress_items
   set image_url = (array[
         'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=900&q=80',
         'https://images.unsplash.com/photo-1600091166971-7f9faad6c1e2?w=900&q=80',
         'https://images.unsplash.com/photo-1522968439036-e6338d0ed84f?w=900&q=80',
         'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?w=900&q=80',
         'https://images.unsplash.com/photo-1619533394727-57d522857f89?w=900&q=80',
         'https://images.unsplash.com/photo-1592878897400-43fb1f1cc324?w=900&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]
 where category = 'suit'
   and (coalesce(image_url, '') like '%picsum%'
     or coalesce(array_to_string(images, ','), '') like '%picsum%');

-- 기모노 등 (traditional)
update public.dress_items
   set image_url = (array[
         'https://images.unsplash.com/photo-1630168343149-9448f0a606ea?w=900&q=80',
         'https://images.unsplash.com/photo-1686397139911-e4c7ff26eb3c?w=900&q=80',
         'https://images.unsplash.com/photo-1608451994760-ea44a25e80a0?w=900&q=80',
         'https://images.unsplash.com/photo-1570503929936-544ba0b1c8f7?w=900&q=80',
         'https://images.unsplash.com/photo-1586434722766-b46308f072ed?w=900&q=80',
         'https://images.unsplash.com/photo-1600566493196-43294a462893?w=900&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]
 where category = 'traditional'
   and (coalesce(image_url, '') like '%picsum%'
     or coalesce(array_to_string(images, ','), '') like '%picsum%');


-- ───────────────────────────────────────────────────────────────────────
-- 2. 장소 — venue_items.images 는 jsonb ([{url}] 모양)
-- ───────────────────────────────────────────────────────────────────────

-- 한옥 · 전통 공간
update public.venue_items
   set images = jsonb_build_array(jsonb_build_object('url', (array[
         'https://images.unsplash.com/photo-1647168585205-e56ebb24a669?w=1200&q=80',
         'https://images.unsplash.com/photo-1618237600880-fb9d72e98393?w=1200&q=80',
         'https://images.unsplash.com/photo-1712651070716-3ee47e717581?w=1200&q=80',
         'https://images.unsplash.com/photo-1619193099934-3cbd46f6f02f?w=1200&q=80',
         'https://images.unsplash.com/photo-1597554031118-c5852b661724?w=1200&q=80',
         'https://images.unsplash.com/photo-1609764180801-03501ad3af02?w=1200&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]))
 where category = 'traditional_space'
   and coalesce(images::text, '') like '%picsum%';

-- 스튜디오 · 그 외
update public.venue_items
   set images = jsonb_build_array(jsonb_build_object('url', (array[
         'https://images.unsplash.com/photo-1627917932033-74123f070958?w=1200&q=80',
         'https://images.unsplash.com/photo-1718876302125-857ddada8d4e?w=1200&q=80',
         'https://images.unsplash.com/photo-1718876393903-be984c74f8a3?w=1200&q=80',
         'https://images.unsplash.com/photo-1643783618238-cf60bed60ab9?w=1200&q=80',
         'https://images.unsplash.com/photo-1558423039-2d4b02e50953?w=1200&q=80',
         'https://images.unsplash.com/photo-1718876331083-95db24a9f335?w=1200&q=80'
       ])[1 + (position(right(id::text, 1) in '0123456789abcdef') % 6)]))
 where coalesce(category, 'studio') <> 'traditional_space'
   and coalesce(images::text, '') like '%picsum%';


-- ───────────────────────────────────────────────────────────────────────
-- 3. 벤더 대표 사진 (목록 카드에 쓰인다)
-- ───────────────────────────────────────────────────────────────────────
update public.dress_vendors
   set img = 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80'
 where coalesce(img, '') like '%picsum%';

update public.venue_vendors
   set img = 'https://images.unsplash.com/photo-1627917932033-74123f070958?w=600&q=80'
 where coalesce(img, '') like '%picsum%';


-- ───────────────────────────────────────────────────────────────────────
-- 4. 분류가 비어 있거나 위에서 안 걸린 의상이 있으면 한복으로 채운다
-- ───────────────────────────────────────────────────────────────────────
update public.dress_items
   set image_url = 'https://images.unsplash.com/photo-1711887540798-9d7d720e5319?w=900&q=80'
 where coalesce(image_url, '') like '%picsum%';


-- ───────────────────────────────────────────────────────────────────────
-- 5. images(text[]) 를 image_url 과 맞춘다
--
--    둘이 다르면 목록과 상세가 서로 다른 사진을 보여준다.
-- ───────────────────────────────────────────────────────────────────────
update public.dress_items
   set images = array[image_url]
 where coalesce(image_url, '') like '%unsplash%'
   and coalesce(array_to_string(images, ','), '') is distinct from image_url;


-- ───────────────────────────────────────────────────────────────────────
-- 6. 확인 — 전부 0 이어야 한다
--
--  select category,
--         count(*) filter (where image_url like '%picsum%') as url_picsum,
--         count(*) filter (where array_to_string(images, ',') like '%picsum%') as arr_picsum,
--         count(*) as 전체
--    from public.dress_items group by category;
--
--  select category,
--         count(*) filter (where images::text like '%picsum%') as 남은picsum,
--         count(*) as 전체
--    from public.venue_items group by category;
-- ───────────────────────────────────────────────────────────────────────
