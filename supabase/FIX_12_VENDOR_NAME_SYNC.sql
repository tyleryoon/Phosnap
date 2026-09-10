-- ============================================================
-- FIX 15: 벤더 name / name_ko 동기화 + 노출 조건
--
-- 문제 A) sync_vendor_name 트리거가 "name 이 null 일 때"만 채우므로,
--         insert 때 '이름 미설정' 이 들어간 뒤 업체명을 저장해도
--         name 은 계속 '이름 미설정' 이다.
--         고객 화면은 name 을 쓰므로 실제 업체명이 노출되지 않는다.
-- 문제 B) is_active 가 false 로 남아 고객에게 노출되지 않는다.
--         업체명과 소개가 채워지면 자동으로 노출한다.
-- ============================================================

create or replace function public.sync_vendor_name()
returns trigger language plpgsql as $$
begin
  -- name_ko 가 있으면 name 을 항상 따라가게 한다 (update 포함)
  if new.name_ko is not null and length(trim(new.name_ko)) > 0 then
    new.name := new.name_ko;
  elsif new.name is not null and length(trim(new.name)) > 0
        and new.name <> '이름 미설정' then
    new.name_ko := new.name;
  end if;

  if new.name is null or length(trim(new.name)) = 0 then
    new.name := '이름 미설정';
  end if;

  -- 업체명과 소개가 모두 채워지면 고객에게 노출한다
  new.is_active := (
    new.name_ko is not null and length(trim(new.name_ko)) > 0
    and new.name_ko <> '이름 미설정'
    and new.intro is not null and length(trim(new.intro)) > 0
  );

  return new;
end;
$$;

drop trigger if exists trg_sync_vendor_name on public.dress_vendors;
create trigger trg_sync_vendor_name
  before insert or update on public.dress_vendors
  for each row execute procedure public.sync_vendor_name();

-- 기존 행 정합성 맞추기 (트리거를 태우기 위해 자기 자신으로 update)
update public.dress_vendors set updated_at = now();

-- ============================================================
-- 검증
-- ============================================================
select name, name_ko, name_en, is_active, intro
from public.dress_vendors;
