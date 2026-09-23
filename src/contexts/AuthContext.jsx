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
      // 단, 그 역할을 실제로 보유한 경우에만 신뢰한다.
      // 이전 계정의 값이 남아 있으면(로그아웃 없이 계정 전환 등) 엉뚱한
      // 대시보드로 보내거나 권한 검사에 걸린다.
      const storedRole = sessionStorage.getItem('phosnap_active_role');
      if (storedRole && userRoles.includes(storedRole)) {
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

  // 편의 getter — activeRole 기반
  //
  // ⚠ sessionStorage / user_metadata 로 내려가지 않는다.
  //   예전에는 activeRole 이 아직 null 인 동안(loadRoles 진행 중)
  //   sessionStorage 값을 그대로 썼다. 그 값은 검증을 거치지 않으므로
  //   이전 계정의 잔여값이나 손으로 넣은 값이 곧바로 권한이 됐다.
  //   loadRoles 는 sessionStorage 값을 쓸 때 userRoles.includes() 로
  //   확인하는데, 이 getter 가 그 확인을 우회하고 있었다.
  //
  //   역할이 아직 안 정해졌으면 가장 낮은 권한으로 둔다. 로딩 중인지는
  //   roleLoading 으로 구분하므로 화면이 잘못 튕기지 않는다.
  const userRole = activeRole ?? 'customer';
  // ⚠ Privacy: full_name = 활동명(작가) / 업체명(벤더) / 입력이름(고객). 실명(real_name)은 절대 노출 안 함.
  const userName = user?.user_metadata?.full_name ?? user?.email ?? '';
  const isArtist = userRole === 'artist';
  const isVendor = userRole === 'vendor' || userRole === 'dress_vendor';
  const isAdmin  = userRole === 'admin';
  // 헤메만 빠져 있었다. 그래서 Nav 가 헤메를 '나머지' 로 분류해
  // 고객용 마이페이지 링크를 보여줬고, 자기 대시보드로 가는 길이 없었다.
  const isStylist = userRole === 'stylist';
  const isLoggedIn = !!user;
  const hasMultipleRoles = roles.length > 1;

  return (
    <AuthContext.Provider value={{
      session, user, loading, logout,
      // 멀티롤
      roles, activeRole, switchRole, addRole, hasMultipleRoles, roleLoading, roleStatuses,
      // 편의 (기존 호환)
      userRole, userName, isArtist, isVendor, isStylist, isAdmin, isLoggedIn,
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
