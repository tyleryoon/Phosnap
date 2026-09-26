-- FIX_52 — 보낸 콜라보 제의를 취소할 수 있게 한다.
--
-- FIX_51 에서 INSERT/UPDATE 정책을 일부러 만들지 않았다. 제한 검사를
-- 건너뛴 쓰기를 막으려는 것이었는데, 그 바람에 보낸 사람이 자기 제의를
-- 거둬들일 방법도 같이 사라졌다.
--
-- 실수로 보냈거나 일정이 바뀌어도 상대의 응답 화면에는 7일 동안 그대로
-- 남는다. 상대는 이미 무의미해진 제의를 붙들고 있게 된다.
--
-- status 에 'cancelled' 는 FIX_51 부터 있었다. 그리로 넘기는 길만 연다.

create or replace function public.cancel_collabo_proposal(p_id uuid)
returns public.collabo_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_row     public.collabo_proposals;
  v_owner   uuid;
  v_to_user uuid;
  v_name    text;
begin
  if v_me is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  select * into v_row from public.collabo_proposals where id = p_id for update;
  if not found then
    raise exception '제의를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  -- 보낸 사람만 취소할 수 있다. 받는 사람이 거두는 건 취소가 아니라 거절이다.
  v_owner := public.provider_owner(v_row.from_type, v_row.from_id);
  if v_owner is null or v_owner <> v_me then
    raise exception '내가 보낸 제의만 취소할 수 있습니다.' using errcode = '42501';
  end if;

  -- 상대가 이미 응답한 뒤에는 되돌리지 못한다. 수락해 놓고 일정까지 잡은
  -- 사람 입장에서 뒤늦게 취소되면 그게 더 나쁘다.
  if v_row.status <> 'pending' then
    raise exception '이미 처리된 제의는 취소할 수 없습니다.' using errcode = 'P0001';
  end if;

  update public.collabo_proposals
     set status = 'cancelled', responded_at = now()
   where id = p_id
  returning * into v_row;

  -- 상대 목록에서 조용히 사라지면 혼란스럽다. 알려준다.
  v_to_user := public.provider_owner(v_row.to_type, v_row.to_id);
  select case v_row.from_type
    when 'photographer' then (select name from public.photographers where id = v_row.from_id)
    when 'stylist'      then (select name_ko from public.stylists    where id = v_row.from_id)
  end into v_name;

  if v_to_user is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_to_user,
      'collabo_cancelled',
      '콜라보 제의가 취소되었습니다',
      coalesce(v_name, '상대 작가') || ' 님이 제의를 취소했습니다.',
      jsonb_build_object('proposalId', v_row.id)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.cancel_collabo_proposal(uuid) from public;
grant execute on function public.cancel_collabo_proposal(uuid) to authenticated;

-- 확인 — 1줄이 나오면 성공
select proname as name
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname = 'cancel_collabo_proposal';
