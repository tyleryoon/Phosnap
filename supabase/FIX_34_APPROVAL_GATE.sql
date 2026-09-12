-- FIX_34 — 승인 전에는 고객에게 노출되지 않는다
--
-- 2026-09-12
--
-- 무엇을 발견했나
--   윤헤메(e074ec24…)는 user_roles.status = 'pending' 인데
--   stylists.is_active = true 였다. 승인 대기 화면을 보면서
--   동시에 고객 예약 화면에는 선택지로 떠 있었다.
--
--   getStylists() 는 is_active 만 본다. 승인 여부는 안 본다.
--   photographers / dress_vendors / venue_vendors 도 같은 구조다.
--
--   즉 승인 절차가 사실상 없는 상태였다.
--   가입만 하면 고객이 예약할 수 있었다.
--
-- 왜 트리거인가
--   앱 코드에서 is_active 를 true 로 만드는 자리는 한 군데뿐인데
--   실제 값은 true 였다. 어디서 켜졌는지 추적하지 못했다.
--   경로를 다 찾아 막는 것보다, 테이블에서 한 번 막는 게 확실하다.
--
--   조회 정책(SELECT)은 건드리지 않는다. 잘못 건드리면 고객 화면이
--   통째로 비어버린다. 쓰기 쪽에서만 막는다.
--
-- 왜 오류를 던지지 않고 false 로 내리나
--   오류를 던지면 승인 대기 중인 작가가 프로필 저장 자체를 못 한다.
--   승인 전에 프로필을 채워두는 건 정상적인 흐름이다.
--   노출만 막으면 된다. 대시보드가 이미 '승인 대기 중' 을 보여준다.
--
-- 안전한가
--   · 조회 정책을 바꾸지 않는다.
--   · 이미 승인된 공급자는 아무 영향이 없다.
--   · 여러 번 실행해도 된다.
--   · 3단계에서 기존 데이터를 정리하는데, 무엇이 꺼졌는지 출력한다.


-- ── 1. 승인 여부 판정 ─────────────────────────────────────────────────

create or replace function public.is_provider_approved(p_user uuid, p_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles r
     where r.user_id = p_user
       and r.status  = 'active'
       and r.role = any(
             case
               when p_role in ('vendor','dress_vendor') then array['vendor','dress_vendor']
               when p_role = 'artist' then array['artist','photographer']
               else array[p_role]
             end)
  );
$$;

comment on function public.is_provider_approved(uuid, text) is
  '해당 사용자의 역할이 승인(active)되었는지. 노출 가드에 쓴다.';

grant execute on function public.is_provider_approved(uuid, text) to authenticated, service_role;


-- ── 2. 승인 전 활성화 차단 트리거 ─────────────────────────────────────

create or replace function public.guard_provider_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- 끄는 건 언제나 허용한다. 켤 때만 본다.
  if coalesce(new.is_active, false) = false then
    return new;
  end if;

  v_role := case tg_table_name
              when 'photographers' then 'artist'
              when 'stylists'      then 'stylist'
              else 'vendor'
            end;

  if not public.is_provider_approved(new.user_id, v_role) then
    -- 막되, 저장 자체는 되게 둔다. 승인 전 프로필 작성은 정상 흐름이다.
    new.is_active := false;
    raise notice '[guard_provider_activation] % 미승인 — is_active 를 false 로 유지합니다 (user %)',
      tg_table_name, new.user_id;
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['photographers','stylists','dress_vendors','venue_vendors'] loop
    execute format('drop trigger if exists trg_guard_activation on public.%I', t);
    execute format(
      'create trigger trg_guard_activation
         before insert or update of is_active on public.%I
         for each row execute function public.guard_provider_activation()', t);
  end loop;
end $$;


-- ── 3. 이미 새어 나간 것 정리 ─────────────────────────────────────────
--
-- 무엇을 껐는지 먼저 보여주고 끈다.

select '끄기 전 확인' as 단계, 'photographers' as 테이블,
       coalesce(name_ko, name) as 이름, user_id
  from public.photographers
 where is_active and not public.is_provider_approved(user_id, 'artist')
union all
select '끄기 전 확인', 'stylists', coalesce(name_ko, display_name), user_id
  from public.stylists
 where is_active and not public.is_provider_approved(user_id, 'stylist')
union all
select '끄기 전 확인', 'dress_vendors', coalesce(name_ko, name), user_id
  from public.dress_vendors
 where is_active and not public.is_provider_approved(user_id, 'vendor')
union all
select '끄기 전 확인', 'venue_vendors', coalesce(name_ko, name), user_id
  from public.venue_vendors
 where is_active and not public.is_provider_approved(user_id, 'vendor');


update public.photographers
   set is_active = false
 where is_active and not public.is_provider_approved(user_id, 'artist');

update public.stylists
   set is_active = false
 where is_active and not public.is_provider_approved(user_id, 'stylist');

update public.dress_vendors
   set is_active = false
 where is_active and not public.is_provider_approved(user_id, 'vendor');

update public.venue_vendors
   set is_active = false
 where is_active and not public.is_provider_approved(user_id, 'vendor');


-- ── 3-B. 승인하면 다시 켜준다 ─────────────────────────────────────────
--
-- 가드만 걸고 끝내면 승인해도 영영 비노출이다.
-- 코드 어디에도 is_active 를 켜는 자리가 없기 때문이다.
-- 승인 = 고객에게 보여도 된다는 관리자의 판단이므로 여기서 켠다.
--
-- approve_role 을 통째로 다시 만들지 않고 트리거로 붙인다.
-- FIX_25 를 다시 실행해도 이 트리거는 살아남는다.

create or replace function public.activate_on_role_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and coalesce(old.status, '') <> 'active' then
    if new.role in ('artist', 'photographer') then
      update public.photographers set is_active = true where user_id = new.user_id;
    elsif new.role = 'stylist' then
      update public.stylists set is_active = true where user_id = new.user_id;
    elsif new.role in ('vendor', 'dress_vendor') then
      update public.dress_vendors set is_active = true where user_id = new.user_id;
      update public.venue_vendors set is_active = true where user_id = new.user_id;
    end if;
  end if;

  -- 반려·정지는 즉시 내린다. 반려했는데 고객 화면에 남아 있으면 안 된다.
  if new.status <> 'active' and coalesce(old.status, '') = 'active' then
    if new.role in ('artist', 'photographer') then
      update public.photographers set is_active = false where user_id = new.user_id;
    elsif new.role = 'stylist' then
      update public.stylists set is_active = false where user_id = new.user_id;
    elsif new.role in ('vendor', 'dress_vendor') then
      update public.dress_vendors set is_active = false where user_id = new.user_id;
      update public.venue_vendors set is_active = false where user_id = new.user_id;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_activate_on_approval on public.user_roles;
create trigger trg_activate_on_approval
  after update of status on public.user_roles
  for each row execute function public.activate_on_role_approval();


-- ── 4. 확인 ───────────────────────────────────────────────────────────

select '노출 가드 트리거 (4여야 정상)' as 항목,
       (select count(*)::text from pg_trigger
         where tgname = 'trg_guard_activation' and not tgisinternal) as 값
union all
select '승인 시 활성화 트리거',
       (select case when count(*) > 0 then '등록됨 ✅' else '⚠ 없음' end
          from pg_trigger where tgname = 'trg_activate_on_approval' and not tgisinternal)
union all
select '미승인인데 활성 (0이어야 정상)',
       ((select count(*) from public.photographers
          where is_active and not public.is_provider_approved(user_id, 'artist'))
      + (select count(*) from public.stylists
          where is_active and not public.is_provider_approved(user_id, 'stylist'))
      + (select count(*) from public.dress_vendors
          where is_active and not public.is_provider_approved(user_id, 'vendor'))
      + (select count(*) from public.venue_vendors
          where is_active and not public.is_provider_approved(user_id, 'vendor'))
       )::text
union all
select '고객에게 보이는 작가',
       (select count(*)::text from public.photographers where is_active)
union all
select '고객에게 보이는 헤메',
       (select count(*)::text from public.stylists where is_active)
union all
select '고객에게 보이는 의상벤더',
       (select count(*)::text from public.dress_vendors where is_active)
union all
select '고객에게 보이는 장소벤더',
       (select count(*)::text from public.venue_vendors where is_active)
union all
select '승인 대기 중인 역할',
       (select coalesce(string_agg(role || ':' || c, ', '), '(없음)')
          from (select role, count(*)::text c from public.user_roles
                 where status = 'pending' group by role) x);
