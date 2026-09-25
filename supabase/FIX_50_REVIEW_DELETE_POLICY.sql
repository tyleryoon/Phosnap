-- FIX_50 — 고객이 자기 리뷰를 지울 수 있게 한다.
--
-- photographer_reviews 에는 SELECT / INSERT / UPDATE 정책만 있고
-- DELETE 가 없었다. 마이페이지의 '삭제' 버튼은 눌러도 0 행을 지우고
-- 끝났다 — RLS 는 거부를 에러로 주지 않고 그냥 아무것도 안 한다.
--
-- booking_id 가 UNIQUE 라 한 예약에 리뷰는 하나다. 즉 고쳐 쓰려면
-- 지우고 다시 쓰는 길밖에 없다. 삭제를 막아두면 오타 하나도 영구히 남는다.

alter table public.photographer_reviews enable row level security;

drop policy if exists "Users can delete their own photographer reviews"
  on public.photographer_reviews;

create policy "Users can delete their own photographer reviews"
  on public.photographer_reviews
  for delete
  using (auth.uid() = customer_id);

-- 같은 구멍이 나머지 리뷰 테이블에도 있다. 있는 것만 골라 한 번에 막는다.
do $$
begin
  if to_regclass('public.package_reviews') is not null then
    execute 'alter table public.package_reviews enable row level security';
    execute 'drop policy if exists "Users can delete their own package reviews" on public.package_reviews';
    execute 'create policy "Users can delete their own package reviews"
             on public.package_reviews for delete using (auth.uid() = customer_id)';
  end if;

  if to_regclass('public.vendor_reviews') is not null then
    execute 'alter table public.vendor_reviews enable row level security';
    execute 'drop policy if exists "Users can delete their own vendor reviews" on public.vendor_reviews';
    execute 'create policy "Users can delete their own vendor reviews"
             on public.vendor_reviews for delete using (auth.uid() = customer_id)';
  end if;
end $$;

-- 확인 — 세 줄(또는 존재하는 테이블 수만큼)이 나오면 성공.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('photographer_reviews', 'package_reviews', 'vendor_reviews')
  and cmd = 'DELETE'
order by tablename;
