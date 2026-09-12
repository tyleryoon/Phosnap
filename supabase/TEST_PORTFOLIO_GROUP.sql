-- TEST_PORTFOLIO_GROUP — 흩어진 포트폴리오 사진을 한 게시물로 묶는다
--
-- 2026-09-12
--
-- 왜
--   윤작가의 사진 3장이 **각각 별도 게시물**로 저장돼 있다.
--     [{url, caption, regionId}, {url,...}, {url,...}]
--   그래서 대표사진을 눌러도 그 안에 다른 사진이 없다.
--   인스타그램처럼 "대표 한 장 + 안에 여러 장" 이 되려면
--   게시물 형식이어야 한다.
--
--     [{ id, images: [url, url, url], coverIdx: 0, caption, regionId }]
--
--   작가 대시보드의 포트폴리오 편집기는 이미 이 형식으로 저장한다.
--   가입 때 올린 사진만 옛 평면 형식으로 남아 있다.
--
-- 무엇을 하나
--   지역이 같은 평면 사진들을 지역별로 한 게시물씩 묶는다.
--   사진 순서는 그대로, 첫 장이 대표(coverIdx=0)가 된다.
--
-- 안전한가
--   · 이미 게시물 형식인 작가는 건드리지 않는다.
--   · 사진 URL 은 하나도 버리지 않는다 — 묶기만 한다.
--   · 되돌리고 싶으면 5번 블록을 쓴다.
--   · 실행 전후를 표로 보여준다.


-- ── 1. 지금 상태 ──────────────────────────────────────────────────────

select name_ko as 작가,
       jsonb_array_length(coalesce(portfolio, '[]'::jsonb)) as 항목수,
       case when portfolio -> 0 ? 'images' then '게시물 형식' else '평면 형식' end as 형식
  from public.photographers
 where jsonb_typeof(portfolio) = 'array'
   and jsonb_array_length(portfolio) > 0
 order by 1;


-- ── 2. 백업 ───────────────────────────────────────────────────────────
--
-- 되돌릴 수 있어야 한다. 사진은 지우면 끝이다.

create table if not exists public.portfolio_backup_20260912 (
  photographer_id uuid primary key,
  portfolio jsonb,
  saved_at timestamptz default now()
);

insert into public.portfolio_backup_20260912 (photographer_id, portfolio)
select id, portfolio
  from public.photographers
 where jsonb_typeof(portfolio) = 'array'
   and jsonb_array_length(portfolio) > 0
   and not (portfolio -> 0 ? 'images')
on conflict (photographer_id) do nothing;


-- ── 3. 평면 → 게시물 (지역별로 묶는다) ────────────────────────────────

with flat as (
  select p.id as pid,
         coalesce(e ->> 'regionId', e ->> 'location', p.location_id, 'unknown') as region,
         coalesce(e ->> 'url', e ->> 'cover', e #>> '{}') as url,
         coalesce(e ->> 'caption', '') as caption,
         ord
    from public.photographers p
    cross join lateral jsonb_array_elements(p.portfolio) with ordinality as t(e, ord)
   where jsonb_typeof(p.portfolio) = 'array'
     and jsonb_array_length(p.portfolio) > 0
     and not (p.portfolio -> 0 ? 'images')
),
grouped as (
  select pid, region,
         jsonb_agg(url order by ord) filter (where url is not null and url <> '') as images,
         min(nullif(caption, '')) as caption
    from flat
   group by pid, region
),
posts as (
  select pid,
         jsonb_agg(
           jsonb_build_object(
             'id',       pid::text || '-' || region,
             'images',   images,
             'coverIdx', 0,
             'caption',  coalesce(caption, ''),
             'regionId', region
           )
           order by region
         ) as portfolio
    from grouped
   where images is not null
   group by pid
)
update public.photographers ph
   set portfolio = posts.portfolio
  from posts
 where ph.id = posts.pid;


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select name_ko as 작가,
       jsonb_array_length(portfolio) as 게시물수,
       (select sum(jsonb_array_length(e -> 'images'))
          from jsonb_array_elements(portfolio) e) as 총사진수,
       case when portfolio -> 0 ? 'images' then '게시물 형식 ✅' else '⚠ 평면' end as 형식,
       portfolio -> 0 ->> 'regionId' as 첫게시물_지역
  from public.photographers
 where jsonb_typeof(portfolio) = 'array'
   and jsonb_array_length(portfolio) > 0
 order by 1;


-- ── 5. 되돌리기 (필요할 때만 블록 실행) ───────────────────────────────
/*
update public.photographers ph
   set portfolio = b.portfolio
  from public.portfolio_backup_20260912 b
 where ph.id = b.photographer_id;
*/
