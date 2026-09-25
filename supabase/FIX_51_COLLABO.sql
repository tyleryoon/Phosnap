-- FIX_51 — 콜라보를 실제로 작동하게 만든다.
--
-- 지금까지 콜라보는 localStorage MVP 였다. 눌러보면 이렇게 저장됐다.
--
--   {"fromId":"223c43f0-…(실제 UUID)", "toId":1(시드 배열 번호), …}
--
--   · 상대 목록이 PHOTOGRAPHERS 하드코딩 시드 31명이라, 실제 가입 작가
--     33명은 한 명도 나오지 않았다
--   · 제의는 보낸 사람 브라우저의 localStorage 에만 쌓였다
--   · 받는 쪽 id 는 계정이 아니라 데이터 파일의 줄 번호였다
--
--   화면은 '제의 대기 중' 으로 바뀌고 '보낸 제의 (1)' 이 되니, 작가는
--   상대가 받은 줄 알고 답을 기다렸다. 기능이 없는 것보다 나빴다.
--
-- 제한 규칙(하루 3회 · 동종 월 3회 · 쿨다운 7일 · 월 수락 10회)은 RPC
-- 안에서만 건다. 클라이언트에 두면 콘솔 한 줄로 우회된다. 그래서 테이블
-- 직접 INSERT/UPDATE 는 열지 않고, 아래 함수 두 개로만 쓰게 한다.

-- ═══════════════════════════════════════════════════════════════════
-- 1. 테이블
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.collabo_proposals (
  id            uuid primary key default gen_random_uuid(),

  -- 보내는 쪽 / 받는 쪽. photographers.id 또는 stylists.id 를 가리킨다.
  from_type     text not null check (from_type in ('photographer', 'stylist')),
  from_id       uuid not null,
  to_type       text not null check (to_type in ('photographer', 'stylist')),
  to_id         uuid not null,

  dates         date[] not null,
  location_id   text,
  message       text not null default '',

  -- 동종(사진+사진) 콜라보는 메인/서브 역할 지정이 필수다.
  is_same_type  boolean not null default false,
  collabo_role  text check (collabo_role in ('main', 'sub')),
  revenue_share jsonb,

  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  reject_reason text not null default '',
  responded_at  timestamptz,

  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),

  -- 자기 자신에게는 제의할 수 없다.
  constraint collabo_not_self check (not (from_type = to_type and from_id = to_id))
);

create index if not exists idx_collabo_to
  on public.collabo_proposals (to_type, to_id, status, created_at desc);
create index if not exists idx_collabo_from
  on public.collabo_proposals (from_type, from_id, created_at desc);
create index if not exists idx_collabo_pending_expiry
  on public.collabo_proposals (expires_at) where status = 'pending';

-- ═══════════════════════════════════════════════════════════════════
-- 2. 공급자 주인 찾기
--
--    photographers 와 stylists 두 테이블에 흩어져 있어, 정책마다
--    분기를 쓰면 금방 어긋난다. 한 곳에 모은다.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.provider_owner(p_type text, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'photographer' then (select user_id from public.photographers where id = p_id)
    when 'stylist'      then (select user_id from public.stylists      where id = p_id)
  end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. RLS — 읽기는 당사자 둘만. 쓰기는 RPC 로만.
-- ═══════════════════════════════════════════════════════════════════

alter table public.collabo_proposals enable row level security;

drop policy if exists "collabo_read_own" on public.collabo_proposals;
create policy "collabo_read_own"
  on public.collabo_proposals
  for select
  using (
    auth.uid() = public.provider_owner(from_type, from_id)
    or auth.uid() = public.provider_owner(to_type, to_id)
  );

-- INSERT / UPDATE / DELETE 정책은 일부러 만들지 않는다.
-- 제한 검사를 건너뛴 쓰기를 막기 위해서다. 아래 RPC 만 쓰기를 한다.

-- ═══════════════════════════════════════════════════════════════════
-- 4. 제의 보내기
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.create_collabo_proposal(
  p_from_type    text,
  p_from_id      uuid,
  p_to_type      text,
  p_to_id        uuid,
  p_dates        date[],
  p_location_id  text default null,
  p_message      text default '',
  p_is_same_type boolean default false,
  p_collabo_role text default null
)
returns public.collabo_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me          uuid := auth.uid();
  v_owner       uuid;
  v_to_user     uuid;
  v_daily       int;
  v_same_month  int;
  v_last_to     timestamptz;
  v_row         public.collabo_proposals;
  v_from_name   text;
begin
  if v_me is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  -- 남의 이름으로 보내지 못하게 한다.
  v_owner := public.provider_owner(p_from_type, p_from_id);
  if v_owner is null or v_owner <> v_me then
    raise exception '본인 계정으로만 제의할 수 있습니다.' using errcode = '42501';
  end if;

  v_to_user := public.provider_owner(p_to_type, p_to_id);
  if v_to_user is null then
    raise exception '상대 작가를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  if p_dates is null or array_length(p_dates, 1) is null then
    raise exception '콜라보 희망 날짜를 선택해주세요.' using errcode = '22023';
  end if;

  -- 동종 콜라보는 역할 지정 필수 (COLLABO_RULES.sameTypeRequiresRole)
  if p_is_same_type and p_collabo_role is null then
    raise exception '동종 콜라보 시 메인/서브 역할을 지정해주세요.' using errcode = '22023';
  end if;

  -- 하루 제안 3회 (COLLABO_RULES.maxDailyProposals)
  select count(*) into v_daily
    from public.collabo_proposals
   where from_type = p_from_type and from_id = p_from_id
     and created_at >= date_trunc('day', now());
  if v_daily >= 3 then
    raise exception '하루 최대 3회까지 제안할 수 있습니다.' using errcode = 'P0001';
  end if;

  -- 동종 콜라보 월 3회 (COLLABO_RULES.maxSameTypePerMonth)
  if p_is_same_type then
    select count(*) into v_same_month
      from public.collabo_proposals
     where from_type = p_from_type and from_id = p_from_id
       and is_same_type
       and created_at >= date_trunc('month', now());
    if v_same_month >= 3 then
      raise exception '동종 콜라보는 월 3회까지 제안할 수 있습니다.' using errcode = 'P0001';
    end if;
  end if;

  -- 같은 사람에게 7일 쿨다운 (COLLABO_RULES.cooldownSamePerson)
  select max(created_at) into v_last_to
    from public.collabo_proposals
   where from_type = p_from_type and from_id = p_from_id
     and to_type = p_to_type and to_id = p_to_id;
  if v_last_to is not null and v_last_to > now() - interval '7 days' then
    raise exception '같은 작가에게 7일 이내 재요청할 수 없습니다.' using errcode = 'P0001';
  end if;

  insert into public.collabo_proposals (
    from_type, from_id, to_type, to_id, dates, location_id, message,
    is_same_type, collabo_role, revenue_share, expires_at
  ) values (
    p_from_type, p_from_id, p_to_type, p_to_id, p_dates, p_location_id,
    coalesce(p_message, ''), p_is_same_type, p_collabo_role,
    case when p_is_same_type then '{"main":60,"sub":40}'::jsonb else null end,
    -- 미응답 7일 후 자동 만료 (COLLABO_RULES.autoExpireDays)
    now() + interval '7 days'
  )
  returning * into v_row;

  -- 상대에게 알린다. 이게 없으면 예전처럼 상대는 영영 모른다.
  select case p_from_type
    when 'photographer' then (select name from public.photographers where id = p_from_id)
    when 'stylist'      then (select name_ko from public.stylists    where id = p_from_id)
  end into v_from_name;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_to_user,
    'collabo_proposal',
    '콜라보 제의가 도착했습니다',
    coalesce(v_from_name, '다른 작가') || ' 님이 콜라보를 제의했습니다.',
    jsonb_build_object('proposalId', v_row.id, 'fromType', p_from_type, 'fromId', p_from_id)
  );

  return v_row;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. 제의 응답
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.respond_collabo_proposal(
  p_id            uuid,
  p_status        text,
  p_reject_reason text default ''
)
returns public.collabo_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me        uuid := auth.uid();
  v_row       public.collabo_proposals;
  v_owner     uuid;
  v_from_user uuid;
  v_accepted  int;
  v_to_name   text;
begin
  if v_me is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception '수락 또는 거절만 가능합니다.' using errcode = '22023';
  end if;

  select * into v_row from public.collabo_proposals where id = p_id for update;
  if not found then
    raise exception '제의를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  -- 받는 사람만 응답할 수 있다.
  v_owner := public.provider_owner(v_row.to_type, v_row.to_id);
  if v_owner is null or v_owner <> v_me then
    raise exception '내가 받은 제의만 응답할 수 있습니다.' using errcode = '42501';
  end if;

  -- 이미 처리된 건 다시 못 건드린다. 두 번 눌러도 한 번만 반영된다.
  if v_row.status <> 'pending' then
    raise exception '이미 처리된 제의입니다.' using errcode = 'P0001';
  end if;

  if v_row.expires_at < now() then
    update public.collabo_proposals set status = 'expired' where id = p_id;
    raise exception '만료된 제의입니다.' using errcode = 'P0001';
  end if;

  -- 월 수락 10회 (COLLABO_RULES.maxProposalsPerMonth).
  -- 거절·미응답은 차감하지 않는다 (rejectDoesNotCount).
  if p_status = 'accepted' then
    select count(*) into v_accepted
      from public.collabo_proposals
     where to_type = v_row.to_type and to_id = v_row.to_id
       and status = 'accepted'
       and responded_at >= date_trunc('month', now());
    if v_accepted >= 10 then
      raise exception '이번 달 콜라보 수락 한도(10회)를 채웠습니다.' using errcode = 'P0001';
    end if;
  end if;

  update public.collabo_proposals
     set status        = p_status,
         reject_reason = case when p_status = 'rejected' then coalesce(p_reject_reason, '') else '' end,
         responded_at  = now()
   where id = p_id
  returning * into v_row;

  -- 보낸 사람에게 결과를 알린다.
  v_from_user := public.provider_owner(v_row.from_type, v_row.from_id);
  select case v_row.to_type
    when 'photographer' then (select name from public.photographers where id = v_row.to_id)
    when 'stylist'      then (select name_ko from public.stylists    where id = v_row.to_id)
  end into v_to_name;

  if v_from_user is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_from_user,
      'collabo_response',
      case when p_status = 'accepted' then '콜라보 제의가 수락되었습니다' else '콜라보 제의가 거절되었습니다' end,
      coalesce(v_to_name, '상대 작가') || ' 님이 제의를 ' ||
        case when p_status = 'accepted' then '수락했습니다.' else '거절했습니다.' end,
      jsonb_build_object('proposalId', v_row.id, 'status', p_status)
    );
  end if;

  return v_row;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. 만료 처리
--
--    예약 쪽 expireStaleBookings 와 같은 방식이다. 화면이 열릴 때
--    한 번 부른다. 크론이 없어도 동작하고, 여러 번 불러도 안전하다.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.expire_collabo_proposals()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.collabo_proposals
     set status = 'expired'
   where status = 'pending' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. 권한
-- ═══════════════════════════════════════════════════════════════════

revoke all on function public.create_collabo_proposal(text, uuid, text, uuid, date[], text, text, boolean, text) from public;
revoke all on function public.respond_collabo_proposal(uuid, text, text) from public;
revoke all on function public.expire_collabo_proposals() from public;

grant execute on function public.create_collabo_proposal(text, uuid, text, uuid, date[], text, text, boolean, text) to authenticated;
grant execute on function public.respond_collabo_proposal(uuid, text, text) to authenticated;
grant execute on function public.expire_collabo_proposals() to authenticated;
grant execute on function public.provider_owner(text, uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 확인 — 함수 3개 + 정책 1개, 모두 4줄이 나오면 성공
-- ═══════════════════════════════════════════════════════════════════

select 'function' as kind, proname as name
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('create_collabo_proposal', 'respond_collabo_proposal', 'expire_collabo_proposals')
union all
select 'policy', policyname
  from pg_policies
 where schemaname = 'public' and tablename = 'collabo_proposals'
order by kind, name;
