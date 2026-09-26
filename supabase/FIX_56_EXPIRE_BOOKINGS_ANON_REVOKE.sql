-- FIX_56 — expire_stale_bookings 에서 anon 실행 권한을 회수한다.
--
-- FIX_54 에서 이 함수만 남겨뒀다. 앱이 직접 부르고 있어 끊으면 깨질까
-- 봐서였다. 호출부를 따라가보니 ArtistDashboard(402행) 한 곳뿐이고,
-- 그 화면은 로그인해야 들어간다. utils/bookingExpiry.js 의 래퍼는
-- 어디서도 쓰지 않는다.
--
-- 인자 없이 '만료 규칙대로' 도는 함수라 조작 위험은 낮다. 다만 비로그인이
-- 반복 호출해 부하를 줄 수는 있다.
--
-- authenticated 는 유지한다 (작가 대시보드가 쓴다).
-- service_role 도 유지한다 (Edge Function 에서 주기 실행할 수 있다).
--
-- 실제 적용본은 Supabase MCP apply_migration 으로 올렸다
-- (마이그레이션 이름 fix_56_expire_stale_bookings_anon_revoke).

revoke execute on function public.expire_stale_bookings() from anon, public;

-- 확인 — 권한 검사 없이 anon 이 쓰기를 할 수 있는 함수가 남았는지
with f as (
  select p.oid, p.proname,
         pg_get_function_identity_arguments(p.oid) as args,
         pg_get_functiondef(p.oid) as src,
         p.prorettype::regtype::text as rettype
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prosecdef
     and has_function_privilege('anon', p.oid, 'EXECUTE')
)
select proname, args
  from f
 where rettype <> 'trigger'
   and (src ~* '\minsert\s+into|\mupdate\s+|\mdelete\s+from')
   and src !~* 'auth\.uid|is_admin|has_role|owns_provider|owns_booking_item|is_booking_provider|is_provider_approved|provider_user_id|dress_item_owner|can_access_chat_room|my_photographer_ids'
 order by proname;
-- 결과가 0 줄이면 성공.
