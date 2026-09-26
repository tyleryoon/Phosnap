-- FIX_54 — 웹훅·내부용 함수에서 anon 실행 권한을 회수한다.
--
-- FIX_53 을 하면서 확인해보니, 콜라보뿐 아니라 기존 SECURITY DEFINER
-- 함수 60여 개가 전부 anon 호출 가능한 상태였다. 하나씩 본문을 읽어
-- 추린 결과, '권한 검사 없이 쓰기를 하는' 것은 다섯 종이었다.
--
-- 다만 실제 위험은 낮았다. 다섯 다 임의 값을 넣는 게 아니라
--   · 현재 데이터에서 도출되는 값을 다시 쓰거나 (파생값 재계산)
--   · 이메일 발송 결과를 기록한다 (웹훅)
-- 남의 예약을 마음대로 바꾸는 식의 조작은 되지 않는다.
--
-- 그래도 남는 위험이 둘 있다.
--   1. 거짓 이메일 기록 — 웹훅용인데 누구나 부를 수 있어 발송 로그를
--      오염시킬 수 있다
--   2. 부하 — refresh_provider_listing(null) 은 네 테이블을 통째로 훑는다
--
-- 아래 다섯은 앱 화면이 부르지 않는다. 웹훅(Edge Function)은 service_role
-- 로 호출하므로 anon 을 뺏어도 영향이 없다.
--
--   mark_notification_email   supabase/functions/notify-worker/index.ts
--   record_email_event        supabase/functions/email-webhook/index.ts
--   recompute_booking_status  DB 내부에서만 호출
--   refresh_provider_listing  DB 내부에서만 호출
--
-- expire_stale_bookings 는 일부러 뺐다. src/lib/supabase.js 가 직접
-- 호출하고, 비로그인 방문자 화면에서도 돌 수 있어 끊으면 깨질 수 있다.
-- 그건 호출 맥락을 확인한 뒤 따로 다룬다.

-- ⚠ anon 에서만 회수하면 안 된다.
--
--   처음에 `from anon` 만 썼더니 세 개가 여전히 실행 가능했다.
--   anon 은 PUBLIC 의 멤버라 PUBLIC 에 붙은 권한을 그대로 물려받는다.
--   has_function_privilege('anon', ...) 도 그 합산값을 돌려준다.
--   두 곳 다 뺏어야 막힌다.
--
--   (FIX_53 의 콜라보 함수가 anon 회수만으로 false 가 된 건, FIX_51/52
--    에서 이미 PUBLIC 을 회수해 뒀기 때문이다.)
--
-- 이 다섯은 로그인 사용자도 부를 이유가 없는 내부·웹훅 함수라
-- authenticated 에서도 함께 회수한다. service_role 은 그대로 두므로
-- Edge Function 웹훅은 계속 동작한다.

revoke execute on function
  public.mark_notification_email(uuid, boolean, text) from anon, public, authenticated;

revoke execute on function
  public.mark_notification_email(uuid, boolean, text, text) from anon, public, authenticated;

revoke execute on function
  public.record_email_event(text, text, text, text) from anon, public, authenticated;

revoke execute on function
  public.recompute_booking_status(uuid) from anon, public, authenticated;

revoke execute on function
  public.refresh_provider_listing(uuid) from anon, public, authenticated;

-- 확인 — anon_실행가능 이 모두 false 여야 한다
select p.proname,
       pg_get_function_identity_arguments(p.oid)                 as 인자,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_실행가능,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  as 서버_실행가능
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('mark_notification_email', 'record_email_event',
                     'recompute_booking_status', 'refresh_provider_listing')
 order by p.proname;
