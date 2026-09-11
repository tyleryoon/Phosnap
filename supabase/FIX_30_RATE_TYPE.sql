-- ═══════════════════════════════════════════════════════════════════════
-- FIX_30 — 요율 기준을 정산 대상과 분리한다
--
-- 2026-09-11
--
-- 문제
--   작가가 자체 헤어메이크업을 제공하면 그 아이템은
--   provider_type='photographer' 로 들어간다. 정산이 작가에게 가야 하고,
--   provider_type 이 provider_user_id()·owns_provider() 에도 쓰이기 때문이다.
--   여기를 'stylist' 로 바꾸면 작가가 자기 예약 아이템을 못 보게 된다.
--
--   그런데 그 결과 **작가 요율(18/14/11%)** 이 적용됐다.
--   같은 헤메 시술인데 외부 헤메가 하면 15/12/10%, 작가가 하면 18/14/11%.
--   같은 금액 같은 일인데 수수료가 다르면 설명할 수 없고,
--   작가가 자체 헤메를 숨기고 외부로 돌리는 유인이 생긴다.
--
-- 해법
--   "돈이 누구에게 가나" 와 "무슨 일에 대한 수수료인가" 를 나눈다.
--
--     provider_type  정산 대상 · 권한 판정   (기존 그대로)
--     rate_type      요율 기준               (새로 추가)
--
--   대부분은 둘이 같다. 작가 자체 헤메만 다르다.
--     provider_type = 'photographer'  (작가에게 정산)
--     rate_type     = 'stylist'       (헤메 요율)
--
--   콜라보 할인은 그대로 사람 수 기준이다. 작가가 혼자 헤메까지 하면
--   1인이므로 할인이 없고, 외부 헤메와 협업하면 2인이라 할인이 붙는다.
--   Tyler 의 기준 — 같은 일이면 같은 요율, 협업하면 혜택.
--
-- 안전한가
--   · 컬럼 추가뿐이다. 기존 행은 provider_type 과 같은 값으로 채운다.
--   · 이미 저장된 수수료 금액(commission_amount)은 바꾸지 않는다.
--     지난 예약을 소급 재계산하지 않는다.
--   · 여러 번 실행해도 된다.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.booking_items
  add column if not exists rate_type text;

-- 기존 행은 provider_type 과 같다고 본다.
update public.booking_items
   set rate_type = provider_type
 where rate_type is null;

alter table public.booking_items
  alter column rate_type set default 'photographer';

-- 제약은 provider_type 과 같은 집합.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.booking_items'::regclass
       and conname = 'booking_items_rate_type_check'
  ) then
    alter table public.booking_items
      add constraint booking_items_rate_type_check
      check (rate_type in ('photographer','stylist','dress','venue'));
  end if;
end $$;

comment on column public.booking_items.rate_type is
  '수수료 요율 기준. 보통 provider_type 과 같다. 작가 자체 헤메는 photographer/stylist 로 갈린다.';


-- ── 확인 ──────────────────────────────────────────────────────────────

select '컬럼' as 항목,
       (select case when count(*) > 0 then 'rate_type 있음 ✅' else '⚠ 없음' end
          from information_schema.columns
         where table_name='booking_items' and column_name='rate_type') as 값
union all
select 'null 남은 행',
       (select count(*)::text from public.booking_items where rate_type is null)
union all
select 'provider_type 과 다른 행',
       (select count(*)::text from public.booking_items where rate_type <> provider_type);
