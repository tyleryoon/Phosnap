import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// ─── ProtectedRoute ────────────────────────────────────────────────────
// 비로그인 시 → 로그인 유도 화면 (AuthModal 오픈)
// role 미충족 시 → 권한 없음 안내
//
// Props:
//   children      — 보호 대상 페이지
//   onAuthOpen    — AuthModal 오픈 함수 (App.jsx에서 전달)
//   requiredRole  — 'artist' | 'dress_vendor' | 'admin' (optional)
//                   없으면 로그인만 확인

const MSG = {
  ko: {
    loginTitle: '로그인이 필요합니다',
    loginSub: '이 페이지를 이용하시려면 먼저 로그인해주세요.',
    loginBtn: '로그인',
    noAccess: '접근 권한이 없습니다',
    noAccessSub: '이 페이지는 {role} 계정으로만 이용 가능합니다.',
    pendingTitle: '승인 대기 중',
    pendingSub: '{role} 가입 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다.',
    pendingNote: '승인까지 1~2 영업일이 소요될 수 있습니다.',
    rejectedTitle: '가입이 반려되었습니다',
    rejectedSub: '{role} 가입 신청이 반려되었습니다. 자세한 내용은 고객센터로 문의해주세요.',
  },
  en: {
    loginTitle: 'Login Required',
    loginSub: 'Please log in to access this page.',
    loginBtn: 'Log in',
    noAccess: 'Access Denied',
    noAccessSub: 'This page is only accessible to {role} accounts.',
    pendingTitle: 'Approval Pending',
    pendingSub: 'Your {role} application has been received. Access will be available after admin approval.',
    pendingNote: 'Approval may take 1-2 business days.',
    rejectedTitle: 'Application Rejected',
    rejectedSub: 'Your {role} application has been rejected. Please contact support for details.',
  },
  ja: {
    loginTitle: 'ログインが必要です',
    loginSub: 'このページをご利用いただくにはログインしてください。',
    loginBtn: 'ログイン',
    noAccess: 'アクセス権限がありません',
    noAccessSub: 'このページは{role}アカウントのみ利用可能です。',
    pendingTitle: '承認待ち',
    pendingSub: '{role}の登録申請を受け付けました。管理者の承認後にご利用いただけます。',
    pendingNote: '承認には1〜2営業日かかる場合があります。',
    rejectedTitle: '申請が却下されました',
    rejectedSub: '{role}の登録申請が却下されました。詳細はサポートまでお問い合わせください。',
  },
  zh: {
    loginTitle: '需要登录',
    loginSub: '请先登录以访问此页面。',
    loginBtn: '登录',
    noAccess: '没有访问权限',
    noAccessSub: '此页面仅供{role}账户使用。',
    pendingTitle: '等待审批',
    pendingSub: '您的{role}申请已提交。管理员审批后即可使用。',
    pendingNote: '审批可能需要1-2个工作日。',
    rejectedTitle: '申请被拒绝',
    rejectedSub: '您的{role}申请已被拒绝。详情请联系客服。',
  },
};

const ROLE_LABELS = {
  ko: { artist: '작가', stylist: '스타일리스트', dress_vendor: '의상 업체', vendor: '의상 업체', admin: '관리자', customer: '회원' },
  en: { artist: 'Artist', stylist: 'Stylist', dress_vendor: 'Dress Vendor', vendor: 'Dress Vendor', admin: 'Admin', customer: 'Member' },
  ja: { artist: 'アーティスト', stylist: 'スタイリスト', dress_vendor: '衣装業者', vendor: '衣装業者', admin: '管理者', customer: '会員' },
  zh: { artist: '摄影师', stylist: '造型师', dress_vendor: '服装供应商', vendor: '服装供应商', admin: '管理员', customer: '会员' },
};

const ProtectedRoute = ({ children, onAuthOpen, requiredRole }) => {
  const { isLoggedIn, userRole, loading, roles, switchRole, roleStatuses } = useAuth();
  const { lang } = useLanguage();
  const m = MSG[lang] || MSG.en;

  // 세션 확인 중
  if (loading) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--gold)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  // 비로그인
  if (!isLoggedIn) {
    return (
      <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.1em', marginBottom: 12, color: 'var(--text)' }}>
          {m.loginTitle}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>{m.loginSub}</p>
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: '14px 40px', letterSpacing: '0.1em' }}
          onClick={() => onAuthOpen?.('login')}
        >
          {m.loginBtn}
        </button>
      </div>
    );
  }

  // Role 체크 — activeRole이 다르더라도 roles 배열에 해당 역할이 있으면 자동 전환
  // vendor / dress_vendor 동의어 처리
  const roleAliases = { vendor: 'dress_vendor', dress_vendor: 'vendor' };
  const roleMatches = (role, required) => role === required || role === roleAliases[required];
  if (requiredRole && !roleMatches(userRole, requiredRole) && userRole !== 'admin') {
    // 유저가 해당 역할(또는 alias)을 가지고 있으면 자동 전환
    const matchedRole = roles?.find(r => roleMatches(r, requiredRole));
    if (matchedRole) {
      switchRole(matchedRole);
      return (
        <div style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--gold)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      );
    }
    const roleLabel = ROLE_LABELS[lang]?.[requiredRole] ?? requiredRole;
    return (
      <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.1em', marginBottom: 12, color: 'var(--text)' }}>
          {m.noAccess}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{m.noAccessSub.replace('{role}', roleLabel)}</p>
      </div>
    );
  }

  // 승인 상태 체크 — pending이면 대기 안내, rejected면 반려 안내
  if (requiredRole && requiredRole !== 'customer') {
    const status = roleStatuses?.[requiredRole] || roleStatuses?.[roleAliases[requiredRole]];
    if (status === 'pending') {
      const roleLabel = ROLE_LABELS[lang]?.[requiredRole] ?? requiredRole;
      return (
        <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.1em', marginBottom: 12, color: 'var(--gold)' }}>
            {m.pendingTitle}
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{m.pendingSub.replace('{role}', roleLabel)}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.7 }}>{m.pendingNote}</p>
        </div>
      );
    }
    if (status === 'rejected') {
      const roleLabel = ROLE_LABELS[lang]?.[requiredRole] ?? requiredRole;
      return (
        <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.1em', marginBottom: 12, color: '#e85d5d' }}>
            {m.rejectedTitle}
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{m.rejectedSub.replace('{role}', roleLabel)}</p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
