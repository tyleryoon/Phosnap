-- ═══════════════════════════════════════════════════════════════════════
-- FIX_29 — 작가 자체 헤어메이크업을 고객이 볼 수 있게
--
-- 2026-09-11
--
-- 문제
--   ArtistRegister 는 "자체 H&M 있음" 작가에게 메뉴를 입력받아
--   profiles.hmk_options 에 저장한다. 그런데 그 값을 읽는 코드가 없다.
--
--   연결을 빠뜨린 게 아니라 **연결할 수가 없었다.**
--     create policy "본인 프로필 조회" on public.profiles
--       for select using (auth.uid() = id);
--   profiles 는 본인(과 관리자)만 읽는다. 고객이 남의 프로필을 못 읽으니
--   그 작가의 헤메 메뉴도 볼 방법이 없다. 데이터가 잘못된 테이블에 있었다.
--
--   그래서 "자체 헤어메이크업 있음" 으로 가입한 작가의 고객은
--   그 작가 메뉴 대신 같은 지역 **다른** 헤메 목록을 봤다.
--
-- 자체 의상은 왜 되나
--   packages(type='costume') 에 있기 때문이다. packages 는 공개 조회가 된다.
--   헤메도 같은 자리로 옮긴다 — type='hmk'.
--   같은 문제를 같은 방법으로 푸는 게 나중에 헷갈리지 않는다.
--
-- 하는 일
--   1. packages.type 에 'hmk' 허용
--   2. 이미 입력된 profiles.hmk_options 를 packages 로 옮긴다
--   3. profiles.hmk_options 는 지우지 않는다 (원본 보존)
--
-- 안전한가
--   · 기존 packages 행은 건드리지 않는다.
--   · 이미 옮긴 메뉴는 다시 만들지 않는다 (이름 기준 중복 제거).
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. type 제약 넓히기 ───────────────────────────────────────────────
--
-- 제약 이름이 환경마다 다를 수 있어 찾아서 지운다.

do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.packages'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%type%'
     and pg_get_constraintdef(oid) ilike '%snap%';
  if c is not null then
    execute format('alter table public.packages drop constraint %I', c);
  end if;
end $$;

alter table public.packages
  add constraint packages_type_check
  check (type in ('snap','tour','costume','prop','hmk'));


-- ── 2. 이미 입력된 메뉴 이관 ──────────────────────────────────────────
--
-- profiles.hmk_options 형태: [{ name, price, desc }, ...]

insert into public.packages (photographer_id, type, name, price, description)
select ph.id,
       'hmk',
       coalesce(o->>'name', '헤어메이크업'),
       coalesce((o->>'price')::int, 0),
       nullif(o->>'desc', '')
  from public.photographers ph
  join public.profiles pr on pr.id = ph.user_id
  cross join lateral jsonb_array_elements(coalesce(pr.hmk_options, '[]'::jsonb)) o
 where coalesce(ph.hmk_self, false)
   -- 이미 옮긴 것은 건너뛴다
   and not exists (
     select 1 from public.packages k
      where k.photographer_id = ph.id
        and k.type = 'hmk'
        and k.name = coalesce(o->>'name', '헤어메이크업')
   );


-- ── 3. 확인 ───────────────────────────────────────────────────────────

select 'type 제약' as 항목,
       (select case when pg_get_constraintdef(oid) ilike '%hmk%' then 'hmk 허용 ✅' else '⚠ 아직 없음' end
          from pg_constraint
         where conrelid = 'public.packages'::regclass and conname = 'packages_type_check') as 값
union all
select '자체 헤메 작가 수',
       (select count(*)::text from public.photographers where coalesce(hmk_self,false))
union all
select '이관된 hmk 상품 수',
       (select count(*)::text from public.packages where type = 'hmk');


-- 작가별 상세 (참고용 — 안 돌려도 된다)
/*
select coalesce(ph.name_ko, ph.name) as 작가,
       ph.hmk_self,
       jsonb_array_length(coalesce(pr.hmk_options,'[]'::jsonb)) as 프로필_원본,
       (select count(*) from public.packages k
         where k.photographer_id = ph.id and k.type = 'hmk')    as packages_이관
  from public.photographers ph
  join public.profiles pr on pr.id = ph.user_id
 where coalesce(ph.hmk_self,false)
    or jsonb_array_length(coalesce(pr.hmk_options,'[]'::jsonb)) > 0;
*/
