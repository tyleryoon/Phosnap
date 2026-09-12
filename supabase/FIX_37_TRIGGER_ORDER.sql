-- FIX_37 — 노출을 결정하는 자리는 하나여야 한다
--
-- 2026-09-12
--
-- 왜 stylists 와 dress_vendors 만 안 고쳐졌나
--
--   FIX_14 가 이런 트리거를 만들어 뒀다.
--
--     create trigger trg_sync_stylist_name
--       before insert or update on public.stylists ...
--
--     -- 이름과 전문분야가 채워지면 고객에게 노출
--     new.is_active := (name_ko 있음 and specialty 있음);
--
--   PostgreSQL 은 같은 시점의 트리거를 **이름 알파벳순**으로 실행한다.
--
--     trg_guard_activation   →  is_active := false   (자격 없음)
--     trg_sync_stylist_name  →  is_active := true    (이름 있음)  ← 나중
--
--   guard 가 내려놓은 값을 sync 가 그대로 덮었다.
--   그래서 `update ... set is_active = false` 조차 먹지 않았다.
--   photographers 에는 이 트리거가 없어서 혼자 정상 동작했다.
--
-- 두 가지를 같이 한다
--
--   1) sync 에서 is_active 를 뺀다.
--      노출 판정이 두 군데 있으면 나중에 또 이런 일이 난다.
--      이름 정규화는 그대로 두고 노출만 떼어낸다.
--
--   2) guard 트리거 이름을 zzz_ 로 바꿔 **항상 마지막에** 돌게 한다.
--      아직 못 찾은 트리거가 is_active 를 건드리더라도
--      마지막에 자격대로 되돌린다. 이름 하나로 사는 안전장치다.
--
-- 안전한가
--   · 이름 정규화 동작은 그대로다.
--   · 마지막에 무엇이 바뀌는지 표로 보여준다.
--   · 여러 번 실행해도 된다.


-- ── 0. 지금 어떤 트리거들이 붙어 있나 ─────────────────────────────────
--
-- 실행 순서대로(이름순) 나온다. is_active 를 건드리는 게 또 있는지 본다.

select c.relname as 테이블,
       t.tgname  as 트리거,
       case t.tgenabled when 'O' then '켜짐' when 'D' then '⚠ 꺼짐' else t.tgenabled::text end as 상태,
       case when pg_get_functiondef(t.tgfoid) ilike '%is_active%'
            then '⚠ is_active 를 건드림' else '-' end as 비고
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal
   and c.relname in ('photographers','stylists','dress_vendors','venue_vendors')
 order by c.relname, t.tgname;


-- ── 1. sync_stylist_name 에서 노출 판정을 뺀다 ────────────────────────

create or replace function public.sync_stylist_name()
returns trigger
language plpgsql
as $$
begin
  if new.display_name is null or length(trim(new.display_name)) = 0 then
    new.display_name := new.name_ko;
  end if;

  if new.name_ko is null or length(trim(new.name_ko)) = 0 then
    new.name_ko := '이름 미설정';
  end if;

  -- ⚠ 여기서 is_active 를 정하지 않는다.
  --    노출 판정은 provider_listable() 한 군데다 (FIX_35).
  --    예전에는 이 줄이 있었고, guard 트리거가 내려놓은 값을
  --    이름순으로 나중에 실행되며 그대로 덮어썼다.
  --      new.is_active := (이름 있음 and 전문분야 있음);
  --    그래서 update ... set is_active = false 가 먹지 않았다.

  return new;
end $$;


-- ── 2. guard 를 항상 마지막에 돌린다 ──────────────────────────────────
--
-- 같은 시점 트리거는 이름 알파벳순으로 실행된다.
-- zzz_ 로 시작하면 사실상 마지막이다.
-- 아직 못 찾은 트리거가 is_active 를 건드려도 여기서 되돌린다.

do $$
declare t text;
begin
  foreach t in array array['photographers','stylists','dress_vendors','venue_vendors'] loop
    execute format('drop trigger if exists trg_guard_activation on public.%I', t);
    execute format('drop trigger if exists zzz_guard_activation on public.%I', t);
    execute format(
      'create trigger zzz_guard_activation
         before insert or update on public.%I
         for each row execute function public.guard_provider_activation()', t);
  end loop;
end $$;


-- ── 3. 자격대로 맞춘다 ────────────────────────────────────────────────

select public.refresh_provider_listing() as 변경건수;


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select '작가' as 유형, coalesce(name_ko, name) as 이름,
       is_active as 노출, public.provider_listable('photographer', id) as 자격,
       case when is_active = public.provider_listable('photographer', id)
            then '✅' else '⚠ 불일치' end as 판정
  from public.photographers
union all
select '헤메', coalesce(name_ko, display_name),
       is_active, public.provider_listable('stylist', id),
       case when is_active = public.provider_listable('stylist', id)
            then '✅' else '⚠ 불일치' end
  from public.stylists
union all
select '의상벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('dress_vendor', id),
       case when is_active = public.provider_listable('dress_vendor', id)
            then '✅' else '⚠ 불일치' end
  from public.dress_vendors
union all
select '장소벤더', coalesce(name_ko, name),
       is_active, public.provider_listable('venue_vendor', id),
       case when is_active = public.provider_listable('venue_vendor', id)
            then '✅' else '⚠ 불일치' end
  from public.venue_vendors
order by 1, 2;
