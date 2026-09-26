-- FIX_53 — 콜라보 함수에서 anon 실행 권한을 회수한다.
--
-- FIX_51 · FIX_52 에 이렇게 썼다.
--
--   revoke all on function ... from public;
--   grant execute on function ... to authenticated;
--
-- 이걸로 비로그인은 못 부른다고 생각했는데 아니었다. `public` 은
-- 의사-롤이고, Supabase 는 `anon` 과 `authenticated` 에게 별도로 권한을
-- 준다. PUBLIC 에서 회수해도 anon 에 직접 붙은 권한은 그대로 남는다.
--
-- 실제로 확인해보니 네 함수 모두 anon 이 호출 가능한 상태였다.
--
-- 피해는 없었다. 함수 첫 줄이 auth.uid() 가 null 이면
-- '로그인이 필요합니다' 로 막기 때문에, anon 이 불러도 아무것도 못 한다.
-- 방어가 두 겹이었고 바깥 겹이 안 걸려 있었을 뿐이다. 그래도 바깥 겹을
-- 믿고 안쪽을 빼먹는 날이 오면 그때 뚫린다. 지금 채운다.

revoke execute on function
  public.create_collabo_proposal(text, uuid, text, uuid, date[], text, text, boolean, text)
  from anon;

revoke execute on function
  public.respond_collabo_proposal(uuid, text, text)
  from anon;

revoke execute on function
  public.cancel_collabo_proposal(uuid)
  from anon;

revoke execute on function
  public.expire_collabo_proposals()
  from anon;

-- provider_owner 는 남겨 둔다. RLS 정책(collabo_read_own)이 이 함수를
-- 쓰는데 정책 평가는 호출자 롤로 일어난다. anon 에게서 뺏으면 비로그인
-- 요청이 정책 평가 단계에서 권한 오류로 터진다.

-- 확인 — anon_실행가능 이 모두 false 여야 한다
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_실행가능,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as 로그인_실행가능
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('create_collabo_proposal', 'respond_collabo_proposal',
                     'cancel_collabo_proposal', 'expire_collabo_proposals')
 order by p.proname;
