-- FIX_41 — 한 사람은 공급자 레코드를 하나만 갖는다
--
-- 2026-09-13
--
-- 무엇이 문제인가
--   photographers / stylists / dress_vendors / venue_vendors 의
--   user_id 에 unique 제약이 없다.
--
--   그래서 한 사람이 같은 테이블에 레코드를 여러 개 가질 수 있다.
--   그런데 코드는 하나뿐이라고 가정한다.
--
--     ensureArtistRecord()  .eq('user_id', uid).maybeSingle()
--     getMyArtistRecord()   같은 방식
--
--   maybeSingle() 은 행이 2개면 **오류를 던진다**(PGRST116).
--   즉 중복이 생기는 순간 그 사람은 대시보드에 못 들어간다.
--   그때 가서야 알게 된다.
--
--   시드 스크립트가 on_conflict=user_id 로 upsert 하려다 막히면서 드러났다.
--
-- 안전한가
--   · 1번에서 중복이 있는지 먼저 본다. 있으면 제약 추가가 실패하므로
--     2번으로 정리한 뒤 3번을 실행한다.
--   · 중복이 없으면 (보통의 경우) 그냥 3번만 돌면 된다.
--   · 여러 번 실행해도 된다.


-- ── 1. 중복이 있는가 ──────────────────────────────────────────────────

select '작가' as 테이블, user_id::text as 사용자, count(*)::text as 레코드수
  from public.photographers where user_id is not null
 group by user_id having count(*) > 1
union all
select '헤메', user_id::text, count(*)::text
  from public.stylists where user_id is not null
 group by user_id having count(*) > 1
union all
select '의상벤더', user_id::text, count(*)::text
  from public.dress_vendors where user_id is not null
 group by user_id having count(*) > 1
union all
select '장소벤더', user_id::text, count(*)::text
  from public.venue_vendors where user_id is not null
 group by user_id having count(*) > 1;


-- ── 2. 중복 정리 (1번이 비었으면 건너뛴다) ────────────────────────────
--
-- 가장 오래된 것을 남긴다. 예약·상품이 거기 붙어 있을 가능성이 높다.
-- 지우기 전에 무엇이 사라지는지 확인하고 싶으면 아래 select 를 먼저 본다.
/*
with ranked as (
  select id, user_id, created_at,
         row_number() over (partition by user_id order by created_at) as rn
    from public.photographers where user_id is not null
)
select * from ranked where rn > 1;
*/

do $$
declare t text;
begin
  foreach t in array array['photographers','stylists','dress_vendors','venue_vendors'] loop
    execute format($f$
      delete from public.%I a
       using (
         select id, row_number() over (partition by user_id order by created_at) as rn
           from public.%I where user_id is not null
       ) r
       where a.id = r.id and r.rn > 1
    $f$, t, t);
  end loop;
end $$;


-- ── 3. 제약 추가 ──────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['photographers','stylists','dress_vendors','venue_vendors'] loop
    if not exists (
      select 1 from pg_constraint
       where conrelid = format('public.%I', t)::regclass
         and conname  = format('%s_user_id_key', t)
    ) then
      execute format('alter table public.%I add constraint %I unique (user_id)',
                     t, t || '_user_id_key');
    end if;
  end loop;
end $$;


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select '제약 수 (4여야 정상)' as 항목,
       (select count(*)::text from pg_constraint
         where conname in ('photographers_user_id_key','stylists_user_id_key',
                           'dress_vendors_user_id_key','venue_vendors_user_id_key')) as 값
union all
select '남은 중복 (0이어야 정상)',
       (select count(*)::text from (
          select user_id from public.photographers where user_id is not null
           group by user_id having count(*) > 1
          union all
          select user_id from public.stylists where user_id is not null
           group by user_id having count(*) > 1
          union all
          select user_id from public.dress_vendors where user_id is not null
           group by user_id having count(*) > 1
          union all
          select user_id from public.venue_vendors where user_id is not null
           group by user_id having count(*) > 1
        ) x);
