import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, onAuthChange, signOut as sbSignOut, getUserRolesWithFallback, getUserRoles, switchUserRole, addUserRole } from '../lib/supabase';

// ─── AuthContext ────────────────────────────────────────────────────────
// 앱 전체에서 로그인 상태 공유
// 멀티롤 지원: 한 이메일로 고객/작가/벤더 역할 보유 가능
// 사용법: const { user, roles, activeRole, switchRole, ... } = useAuth();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);   // 초기 세션 확인 중

  // 멀티롤
  const [roles, setRoles]           = useState([]);       // ['customer', 'artist', ...]
  const [roleStatuses, setRoleStatuses] = useState({});   // { artist: 'pending', customer: 'active', ... }
  const [activeRole, setActiveRole] = useState(null);     // 현재 활성 역할
  const [roleLoading, setRoleLoading] = useState(false);

  // 역할 로드
  const loadRoles = useCallback(async (userId) => {
    if (!userId) { setRoles([]); setActiveRole(null); setRoleStatuses({}); return; }
    setRoleLoading(true);
    try {
      const userRoles = await getUserRolesWithFallback(userId);
      setRoles(userRoles);
      // status 정보도 로드
      try {
        const rawRoles = await getUserRoles(userId);
        const statusMap = {};
        rawRoles.forEach(r => { statusMap[r.role] = r.status || 'active'; });
        setRoleStatuses(statusMap);
      } catch { setRoleStatuses({}); }

      // activeRole 결정: sessionStorage 값 절대 우선
      // 로그인 시 AuthModal에서 sessionStorage에 역할을 먼저 기록하므로,
      // 이 값이 존재하면 무조건 신뢰 (customer / artist / vendor / dress_vendor 모두)
      const storedRole = sessionStorage.getItem('phosnap_active_role');
      if (storedRole) {
        setActiveRole(storedRole);
      } else {
        // sessionStorage 없을 때만 fallback: user_metadata.role → 첫 번째 역할
        const metaRole = session?.user?.user_metadata?.role;
        const defaultRole = metaRole && userRoles.includes(metaRole) ? metaRole : userRoles[0] || 'customer';
        setActiveRole(defaultRole);
        sessionStorage.setItem('phosnap_active_role', defaultRole);
      }
    } catch {
      setRoles(['customer']);
      setActiveRole('customer');
    }
    setRoleLoading(false);
  }, [session]);

  useEffect(() => {
    let subscription = null;

    const init = async () => {
      // 1. 현재 세션 확인 (페이지 새로고침 후 복원)
      const currentSession = await getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      // 역할 로드
      if (currentSession?.user?.id) {
        await loadRoles(currentSession.user.id);
      }

      // 2. 이후 auth 상태 변경 리스닝
      const result = await onAuthChange((event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user?.id) {
          loadRoles(newSession.user.id);
        } else {
          setRoles([]);
          setActiveRole(null);
        }
      });
      subscription = result?.data?.subscription;
    };

    init();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  // 역할 전환
  const switchRole = useCallback(async (role) => {
    if (!user?.id || !roles.includes(role)) return;
    setActiveRole(role);
    sessionStorage.setItem('phosnap_active_role', role);
    try {
      await switchUserRole(role);
    } catch (e) {
      // Silently ignore role switch errors
    }
  }, [user, roles]);

  // 역할 추가 (작가/벤더 가입 시)
  const addRole = useCallback(async (role) => {
    if (!user?.id) return;
    await addUserRole(user.id, role);
    if (!roles.includes(role)) {
      setRoles(prev => [...prev, role]);
    }
  }, [user, roles]);

  const logout = async () => {
    await sbSignOut();
    setSession(null);
    setUser(null);
    setRoles([]);
    setActiveRole(null);
    sessionStorage.removeItem('phosnap_active_role');
  };

  // 편의 getter — activeRole 기반 (sessionStorage를 먼저 확인하여 race condition 방지)
  const storedRole = typeof window !== 'undefined' ? sessionStorage.getItem('phosnap_active_role') : null;
  const userRole = activeRole ?? storedRole ?? user?.user_metadata?.role ?? 'customer';
  // ⚠ Privacy: full_name = 활동명(작가) / 업체명(벤더) / 입력이름(고객). 실명(real_name)은 절대 노출 안 함.
  const userName = user?.user_metadata?.full_name ?? user?.email ?? '';
  const isArtist = userRole === 'artist';
  const isVendor = userRole === 'vendor' || userRole === 'dress_vendor';
  const isAdmin  = userRole === 'admin';
  const isLoggedIn = !!user;
  const hasMultipleRoles = roles.length > 1;

  return (
    <AuthContext.Provider value={{
      session, user, loading, logout,
      // 멀티롤
      roles, activeRole, switchRole, addRole, hasMultipleRoles, roleLoading, roleStatuses,
      // 편의 (기존 호환)
      userRole, userName, isArtist, isVendor, isAdmin, isLoggedIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
