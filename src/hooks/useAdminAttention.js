import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminAttention } from '../lib/supabase';

const ZERO = { pending_roles: 0, reapplied: 0, failed_emails: 0, stale_bookings: 0 };
const POLL_MS = 60_000;

// ─── useAdminAttention ─────────────────────────────────────────────────
//
// 관리자가 확인해야 할 것이 있는지 알려준다. 빨간 점을 띄우는 데 쓴다.
//
// 왜 필요했나
//   승인 대기가 쌓여도 관리자가 /admin 승인 탭을 직접 열기 전에는 알 수
//   없었다. 신청자는 그동안 계속 기다린다.
//
// 관리자가 아니면 아무것도 하지 않는다. 서버도 0 을 주지만, 애초에
// 부르지 않는 게 맞다.

export const useAdminAttention = () => {
  const { isAdmin, roles } = useAuth();
  // 활성 역할이 관리자가 아니어도 관리자 계정이면 알려줘야 한다.
  // 작가 화면을 보고 있다고 해서 승인 대기를 모르고 있어도 되는 건 아니다.
  const hasAdminRole = isAdmin || (roles || []).includes('admin');

  const [counts, setCounts] = useState(ZERO);

  const refresh = useCallback(async () => {
    if (!hasAdminRole) { setCounts(ZERO); return; }
    const { data } = await getAdminAttention();
    setCounts(data);
  }, [hasAdminRole]);

  useEffect(() => {
    if (!hasAdminRole) { setCounts(ZERO); return; }
    let cancelled = false;
    const tick = async () => {
      const { data } = await getAdminAttention();
      if (!cancelled) setCounts(data);
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [hasAdminRole]);

  const total = counts.pending_roles + counts.failed_emails + counts.stale_bookings;
  return { counts, total, hasAny: total > 0, refresh };
};

export default useAdminAttention;
