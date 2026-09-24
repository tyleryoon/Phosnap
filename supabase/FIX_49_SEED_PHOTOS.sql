-- ═══════════════════════════════════════════════════════════════════════
-- FIX_49: 시드 의상·장소 사진을 분류에 맞는 것으로
--
-- 무엇이 문제였나
--   시드 스크립트(scripts/seed-test-accounts.mjs)가 picsum.photos 를 썼다.
--   seed 를 주면 늘 같은 사진이 나오지만 **그 사진이 무엇인지는 아무도
--   모른다.** 그래서 고객 화면이 이렇게 보였다.
--
--     남성 정장 1      → 카페 테이블 사진
--     웨딩 드레스 1    → 산딸기 사진
--     전통 한복 6      → 사막 사진
--
--   화면에서는 가짜로 보이지 않고 **고장난 데이터로 보인다.** 예약 화면에서
--   제품 사진은 고객이 고르는 근거라 특히 그렇다.
--
-- 무엇을 하나
--   의상·장소 사진을 분류에 맞는 Unsplash 사진으로 바꾼다.
--   아래 id 는 전부 실제로 200 + image/* 응답을 확인한 것이다.
--
--   작가 포트폴리오·아바타는 건드리지 않는다. 그쪽은 어차피 "이 작가가
--   찍은 사진" 이라 무엇을 넣어도 진짜가 아니고, 제품처럼 고르는 근거로
--   쓰이지도 않는다.
--
-- ⚠ 임시 테이블을 쓰지 않는다
--   처음에는 create temporary table 로 사진 목록을 담았는데 **0 건이
--   바뀌었다.** SQL 편집기가 문장을 나눠 실행하면 다음 문장에서 그 표가
--   이미 사라져 있다. 그래서 각 UPDATE 안에 VALUES 로 직접 넣는다 —
--   문장 하나가 그 자체로 완결된다.
--
-- 안전한가
--   picsum 이 든 행만 바꾼다. 벤더가 직접 올린 사진(Supabase storage)은
--   건드리지 않는다. 여러 번 실행해도 된다.
--
-- 선행: 없음 (독립)
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. 의상 — image_url 과 images 를 함께 맞춘다
--
--    둘 중 하나만 바꾸면 목록과 상세가 다른 사진을 보여준다.
--    분류마다 여섯 장을 돌려써서 목록이 한 사진으로 도배되지 않게 한다.
-- ───────────────────────────────────────────────────────────────────────
with photo (kind, idx, id) as (
  values
    ('hanbok', 0, '1711887540798-9d7d720e5319'),
    ('hanbok', 1, '1703437876552-f054cd8e8b88'),
    ('hanbok', 2, '1698880754311-64351d62db07'),
    ('hanbok', 3, '1506480932912-dbbe35e3e516'),
    ('hanbok', 4, '1588676907230-020a495f4cc9'),
    ('hanbok', 5, '1627630228445-942830cb4982'),
    ('dress',  0, '1591604466107-ec97de577aff'),
    ('dress',  1, '1549488497-94b52bddac5d'),
    ('dress',  2, '1622277430358-f4d134452e2e'),
    ('dress',  3, '1532454781337-fc3edff34f91'),
    ('dress',  4, '1579583764988-3e08c6132d2a'),
    ('dress',  5, '1550005809-91ad75fb315f'),
    ('suit',   0, '1617127365659-c47fa864d8bc'),
    ('suit',   1, '1600091166971-7f9faad6c1e2'),
    ('suit',   2, '1522968439036-e6338d0ed84f'),
    ('suit',   3, '1598808503746-f34c53b9323e'),
    ('suit',   4, '1619533394727-57d522857f89'),
    ('suit',   5, '1592878897400-43fb1f1cc324'),
    ('kimono', 0, '1630168343149-9448f0a606ea'),
    ('kimono', 1, '1686397139911-e4c7ff26eb3c'),
    ('kimono', 2, '1608451994760-ea44a25e80a0'),
    ('kimono', 3, '1570503929936-544ba0b1c8f7'),
    ('kimono', 4, '1586434722766-b46308f072ed'),
    ('kimono', 5, '1600566493196-43294a462893')
),
target as (
  select d.id,
         case coalesce(d.category, 'hanbok')
           when 'dress'       then 'dress'
           when 'suit'        then 'suit'
           when 'traditional' then 'kimono'
           else 'hanbok'
         end as kind,
         (row_number() over (partition by d.category order by d.id) - 1) as n
    from public.dress_items d
   where coalesce(d.image_url, '') like '%picsum%'
      or coalesce(d.images::text, '') like '%picsum%'
),
pick as (
  select t.id,
         'https://images.unsplash.com/photo-' || p.id || '?w=900&q=80' as url
    from target t
    join photo p
      on p.kind = t.kind
     and p.idx  = (t.n % 6)
)
update public.dress_items d
   set image_url = k.url,
       images    = jsonb_build_array(k.url)
  from pick k
 where d.id = k.id;


-- ───────────────────────────────────────────────────────────────────────
-- 2. 장소
--
--    venue_items.images 는 [{url}] 모양이다 (시드 스크립트).
-- ───────────────────────────────────────────────────────────────────────
with photo (kind, idx, id) as (
  values
    ('hanok',  0, '1647168585205-e56ebb24a669'),
    ('hanok',  1, '1618237600880-fb9d72e98393'),
    ('hanok',  2, '1712651070716-3ee47e717581'),
    ('hanok',  3, '1619193099934-3cbd46f6f02f'),
    ('hanok',  4, '1597554031118-c5852b661724'),
    ('hanok',  5, '1609764180801-03501ad3af02'),
    ('studio', 0, '1627917932033-74123f070958'),
    ('studio', 1, '1718876302125-857ddada8d4e'),
    ('studio', 2, '1718876393903-be984c74f8a3'),
    ('studio', 3, '1643783618238-cf60bed60ab9'),
    ('studio', 4, '1558423039-2d4b02e50953'),
    ('studio', 5, '1718876331083-95db24a9f335')
),
target as (
  select v.id,
         case coalesce(v.category, 'studio')
           when 'traditional_space' then 'hanok'
           else 'studio'
         end as kind,
         (row_number() over (partition by v.category order by v.id) - 1) as n
    from public.venue_items v
   where coalesce(v.images::text, '') like '%picsum%'
),
pick as (
  select t.id,
         'https://images.unsplash.com/photo-' || p.id || '?w=1200&q=80' as url
    from target t
    join photo p
      on p.kind = t.kind
     and p.idx  = (t.n % 6)
)
update public.venue_items v
   set images = jsonb_build_array(jsonb_build_object('url', k.url))
  from pick k
 where v.id = k.id;


-- ───────────────────────────────────────────────────────────────────────
-- 3. 벤더 대표 사진도 같이 (목록 카드에 쓰인다)
-- ───────────────────────────────────────────────────────────────────────
update public.dress_vendors
   set img = 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80'
 where coalesce(img, '') like '%picsum%';

update public.venue_vendors
   set img = 'https://images.unsplash.com/photo-1627917932033-74123f070958?w=600&q=80'
 where coalesce(img, '') like '%picsum%';


-- ───────────────────────────────────────────────────────────────────────
-- 4. 확인 — 남은 picsum 이 전부 0 이어야 한다
--
--  select category,
--         count(*) filter (where image_url like '%picsum%') as 남은picsum,
--         count(*) as 전체
--    from public.dress_items group by category;
--
--  select category,
--         count(*) filter (where images::text like '%picsum%') as 남은picsum,
--         count(*) as 전체
--    from public.venue_items group by category;
-- ───────────────────────────────────────────────────────────────────────
