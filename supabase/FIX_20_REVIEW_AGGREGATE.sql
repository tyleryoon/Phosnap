-- ═══════════════════════════════════════════════════════════════════════
-- FIX_20: 리뷰 집계(평점·후기 수)를 트리거로 자동 갱신
--
-- 증상
--   photographers.rating = 5 인데 reviews_count = 0.
--   리뷰는 photographer_reviews 에 정상적으로 들어가 있다.
--
-- 원인
--   submitPhotographerReview() 는 리뷰만 INSERT 하고 집계는 갱신하지 않는다.
--   rating 5 는 어딘가에서 수동으로 들어간 값이고 실제 리뷰와 무관하다.
--
--   작가 목록 카드는 reviews_count 를 그대로 읽고(toPhotographerCard),
--   인기순 정렬도 .order('reviews_count') 로 한다.
--   즉 리뷰를 아무리 받아도 목록에서는 후기 0개로 보이고
--   정렬에서도 밀린다.
--
-- 왜 트리거인가
--   집계를 클라이언트에서 갱신하려면 고객이 photographers 행을
--   UPDATE 할 수 있어야 한다. 그러면 아무나 남의 평점을 조작할 수 있다.
--   FIX_18 에서 알림을 서버로 옮긴 것과 같은 이유다.
--
-- 적용 순서: FIX_19 다음
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.refresh_photographer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid := coalesce(new.photographer_id, old.photographer_id);
  v_avg numeric;
  v_cnt int;
begin
  select round(avg(rating)::numeric, 1), count(*)
    into v_avg, v_cnt
    from public.photographer_reviews
   where photographer_id = v_id;

  update public.photographers
     set rating        = coalesce(v_avg, 0),
         reviews_count = coalesce(v_cnt, 0)
   where id = v_id;

  return null;
end;
$$;

drop trigger if exists trg_photographer_review_agg on public.photographer_reviews;
create trigger trg_photographer_review_agg
  after insert or update or delete on public.photographer_reviews
  for each row execute function public.refresh_photographer_rating();


-- ───────────────────────────────────────────────────────────────────────
-- 헤메·벤더도 같은 문제를 갖고 있다면 함께 맞춰둔다.
-- (vendor_reviews 는 대상 유형이 섞여 있어 유형별로 집계한다)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.refresh_stylist_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid := coalesce(new.stylist_id, old.stylist_id);
  v_avg numeric;
  v_cnt int;
begin
  if v_id is null then return null; end if;

  select round(avg(rating)::numeric, 1), count(*)
    into v_avg, v_cnt
    from public.vendor_reviews
   where stylist_id = v_id;

  update public.stylists
     set rating       = coalesce(v_avg, 0),
         review_count = coalesce(v_cnt, 0)
   where id = v_id;

  return null;
end;
$$;

-- vendor_reviews 에 stylist_id 가 있을 때만 트리거를 건다
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'vendor_reviews'
       and column_name  = 'stylist_id'
  ) then
    execute 'drop trigger if exists trg_stylist_review_agg on public.vendor_reviews';
    execute 'create trigger trg_stylist_review_agg
               after insert or update or delete on public.vendor_reviews
               for each row execute function public.refresh_stylist_rating()';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────
-- 기존 데이터 재집계
--   리뷰가 없는 작가의 rating 도 0 으로 맞춘다.
--   지금 윤작가는 리뷰 1건인데 reviews_count 가 0 이고,
--   rating 5 는 실제 리뷰와 무관하게 들어가 있던 값이다.
-- ───────────────────────────────────────────────────────────────────────
update public.photographers p
   set rating        = coalesce(a.avg_rating, 0),
       reviews_count = coalesce(a.cnt, 0)
  from (
    select ph.id,
           (select round(avg(r.rating)::numeric, 1)
              from public.photographer_reviews r where r.photographer_id = ph.id) as avg_rating,
           (select count(*)
              from public.photographer_reviews r where r.photographer_id = ph.id) as cnt
      from public.photographers ph
  ) a
 where a.id = p.id;


-- ───────────────────────────────────────────────────────────────────────
-- 확인
-- ───────────────────────────────────────────────────────────────────────
select p.name_ko, p.rating, p.reviews_count,
       (select count(*) from public.photographer_reviews r where r.photographer_id = p.id) as 실제리뷰수
  from public.photographers p;
