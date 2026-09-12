-- TEST_STYLIST_HOURS — 헤메에게 운영 시간을 넣어준다 (테스트용)
--
-- 2026-09-12
--
-- 왜 필요한가
--   FIX_39 부터 운영 시간이 없는 공급자는 고객에게 노출되지 않는다.
--   그런데 헤메의 provider_defaults 행이 **하나도 없다.**
--   등록할 자리는 있는데(헤메 대시보드 > 운영 일정) 아무도 안 넣었다.
--
--   실서비스에서는 헤메가 직접 넣어야 한다.
--   이 SQL 은 테스트를 이어가기 위한 임시 조치다.
--
-- 무엇을 넣나
--   09:00 ~ 19:00, 정기 휴무 없음.
--   샵 시술이 이른 아침 촬영에 붙는 경우를 보려면 넉넉해야 한다.
--
-- 안전한가
--   · 이미 넣어둔 헤메는 건드리지 않는다 (on conflict do nothing).
--   · 여러 번 실행해도 된다.

insert into public.provider_defaults (provider_type, provider_id, default_slots, weekly_off)
select 'stylist', s.id,
       array['09:00','10:00','11:00','12:00','13:00','14:00',
             '15:00','16:00','17:00','18:00'],
       '{}'::int[]
  from public.stylists s
 where not exists (
   select 1 from public.provider_defaults d
    where d.provider_type = 'stylist' and d.provider_id = s.id)
on conflict (provider_type, provider_id) do nothing;


-- 노출 자격을 다시 계산한다 (운영 시간이 생겼으므로 켜질 수 있다)
select public.refresh_provider_listing() as 변경건수;


-- 확인
select '헤메 운영시간' as 항목,
       coalesce(s.name_ko, s.display_name) as 이름,
       (select array_length(d.default_slots, 1)
          from public.provider_defaults d
         where d.provider_type = 'stylist' and d.provider_id = s.id) as 슬롯수,
       s.is_active as 노출,
       public.provider_listing_status('stylist', s.id) -> 'missing' as 빠진것
  from public.stylists s
 order by 2;


-- 시간대별 결과 — 09시에는 샵 헤메가 빠지고 헤어변형만 남아야 한다
select '09시 2시간' as 조건,
       public.available_providers('seoul','2026-09-20','09:00',2) -> 'stylists' as 헤메
union all
select '14시 2시간',
       public.available_providers('seoul','2026-09-20','14:00',2) -> 'stylists';
