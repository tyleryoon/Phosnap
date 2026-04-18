import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  signIn, signInWithGoogle, resetPassword,
  switchUserRole, getUserRolesWithFallback, addUserRole,
} from '../lib/supabase';
import TermsAgreement from './TermsModal';
import { TERMS_CUSTOMER, TERMS_VENDOR, REFUND_POLICY, PRIVACY } from '../data/legal';

// ─── Auth Modal — 고객 / 작가 탭 분리 버전 ────────────────────────────

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);


const KakaoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 5.58 2 10c0 3.08 2.3 5.77 5.7 6.8l-.8 2.6c-.1.4.3.8.7.6l3.1-2.1c.4.05.8.1 1.3.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z" fill="currentColor"/>
  </svg>
);

// ─── RoleSelectModal: 새 유저의 역할 선택 ──────────────────────────────
const RoleSelectModal = ({ user, onRoleSelected }) => {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'artist', emoji: '📸', label: t('auth.rolePhotographer') },
    { id: 'stylist', emoji: '💄', label: t('auth.roleStylist') },
    { id: 'vendor', emoji: '👗', label: t('auth.roleVendor') },
    { id: 'customer', emoji: '👤', label: t('auth.roleCustomer') },
  ];

  const handleSelectRole = async (roleId) => {
    setSelectedRole(roleId);
    setLoading(true);
    try {
      const { getSupabase } = await import('../lib/supabase');
      const sb = await getSupabase();
      if (!sb) throw new Error('Supabase not available');

      // Update user metadata
      const { error: metaErr } = await sb.auth.updateUser({
        data: { role: roleId },
      });
      if (metaErr) throw metaErr;

      // Update profiles table
      const { error: profileErr } = await sb.from('profiles').upsert({
        id: user.id,
        role: roleId,
        updated_at: new Date(),
      });
      if (profileErr) throw profileErr;

      onRoleSelected(roleId);
    } catch (err) {
      console.error('Role selection error:', err);
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 14, marginBottom: 4,
          color: 'var(--text)', fontWeight: 500,
        }}>
          {t('auth.selectRole')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
          {t('auth.selectRoleSub')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(({ id, emoji, label }) => (
            <button
              key={id}
              onClick={() => handleSelectRole(id)}
              disabled={loading && selectedRole !== id}
              style={{
                width: '100%', padding: '14px 16px', fontSize: 13,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                background: selectedRole === id ? 'var(--gold)' : 'transparent',
                border: '1px solid ' + (selectedRole === id ? 'var(--gold)' : 'var(--border)'),
                color: selectedRole === id ? '#0B0B0B' : 'var(--text)',
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 4, transition: 'all 0.2s',
                opacity: loading && selectedRole !== id ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span>{label}</span>
              {selectedRole === id && loading && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'inherit' }}>...</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
// ─── EmailVerify / AlreadyExistsBanner 제거됨 (Confirm email OFF) ────

// ─── 휴대폰 인증 컴포넌트 ──────────────────────────────────────────────
// SMS 인증 (Supabase Phone Auth) + SMS 미설정 시 수동 입력 fallback
export const PhoneVerify = ({ onVerified, setError }) => {
  const { t } = useLanguage();
  const [phone,       setPhone]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [resendCool,  setResendCool]  = useState(0);
  const [smsUnavailable, setSmsUnavailable] = useState(false); // SMS 프로바이더 미설정

  const startCooldown = () => {
    setResendCool(60);
    const t = setInterval(() => {
      setResendCool(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  // SMS 미지원 시 번호만 입력하고 바로 인증 완료 처리
  const handleManualConfirm = () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('핸드폰 번호는 최소 10자리여야 합니다.');
      return;
    }
    setOtpVerified(true);
    onVerified(phone);
  };

  const handleSend = async () => {
    if (!phone) return setError(t('auth.phoneRequired'));
    if (phone.replace(/\D/g, '').length < 10) return setError('핸드폰 번호는 최소 10자리여야 합니다.');
    setLoading(true); setError('');
    const { sendPhoneOtp } = await import('../lib/supabase');
    const { error: err } = await sendPhoneOtp(phone);
    setLoading(false);
    if (err) {
      const m = err.message?.toLowerCase() ?? '';
      if (m.includes('sms') || m.includes('provider') || m.includes('not enabled') || m.includes('not supported')) {
        // SMS 프로바이더 미설정 → fallback 모드
        setSmsUnavailable(true);
        setError('');
      } else {
        setError(err.message);
      }
    } else { setOtpSent(true); startCooldown(); }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 4) return setError(t('auth.otpInputRequired'));
    setLoading(true); setError('');
    const { verifyPhoneOtp } = await import('../lib/supabase');
    const { error: err } = await verifyPhoneOtp(phone, otp);
    setLoading(false);
    if (err) setError(t('auth.otpInvalid'));
    else { setOtpVerified(true); onVerified(phone); }
  };

  if (otpVerified) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', marginBottom: 12 }}>
      <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
      <span style={{ fontSize: 12, color: '#4ade80' }}>{t('auth.phoneVerified')} — {phone}</span>
    </div>
  );

  return (
    <div style={{ marginBottom: 4 }}>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">{t('auth.phoneLabel')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" type="tel" placeholder="010-1234-5678"
            value={phone} onChange={e => setPhone(e.target.value)}
            disabled={otpSent} style={{ flex: 1 }} />
          {!smsUnavailable ? (
            <button type="button" onClick={handleSend} disabled={loading || (otpSent && resendCool > 0)}
              style={{
                padding: '0 14px', fontSize: 11, whiteSpace: 'nowrap',
                background: 'transparent', border: '1px solid var(--gold-border)',
                color: (loading || (otpSent && resendCool > 0)) ? 'var(--muted)' : 'var(--gold)',
                cursor: (loading || (otpSent && resendCool > 0)) ? 'not-allowed' : 'pointer',
              }}>
              {otpSent ? (resendCool > 0 ? `${t('auth.resend')} ${resendCool}s` : t('auth.resend')) : (loading ? t('auth.sending') : t('auth.getOtp'))}
            </button>
          ) : (
            <button type="button" onClick={handleManualConfirm}
              style={{
                padding: '0 14px', fontSize: 11, whiteSpace: 'nowrap',
                background: 'var(--gold)', border: 'none', color: '#0B0B0B',
                cursor: 'pointer',
              }}>
              확인
            </button>
          )}
        </div>
        {smsUnavailable && !otpVerified && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
            SMS 인증이 현재 지원되지 않아 번호 입력으로 대체됩니다.
          </p>
        )}
      </div>
      {otpSent && !smsUnavailable && (
        <div className="form-group">
          <label className="form-label">{t('auth.otpLabelShort')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" type="text" inputMode="numeric" maxLength={6}
              placeholder="123456" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, letterSpacing: '0.2em', textAlign: 'center', fontSize: 16 }} />
            <button type="button" onClick={handleVerify} disabled={loading}
              style={{ padding: '0 14px', fontSize: 11, whiteSpace: 'nowrap',
                background: 'var(--gold)', border: 'none', color: '#0B0B0B',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? t('auth.checking') : t('auth.verify')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 로그인 후 역할 선택 모달 ──────────────────────────────────────────
const LoginRolePicker = ({ roles, onSelect, onClose }) => {
  const ROLE_INFO = {
    customer: { emoji: '👤', label: '고객으로 접속', desc: '촬영 예약 및 작가 검색' },
    artist:   { emoji: '📸', label: '작가로 접속',   desc: '스케줄·예약 관리, 실적 확인' },
    vendor:   { emoji: '👗', label: '벤더로 접속',   desc: '의상·서비스 관리' },
    stylist:  { emoji: '💄', label: 'H&M 아티스트로 접속', desc: '헤어메이크업 서비스 관리' },
    admin:    { emoji: '⚙️', label: '관리자로 접속', desc: '시스템 관리' },
  };

  return (
    <div style={{ padding: 4 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
        어떤 역할로 접속하시겠어요?
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
        이 계정에 {roles.length}개의 역할이 등록되어 있습니다.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roles.map(role => {
          const info = ROLE_INFO[role] || { emoji: '❓', label: role, desc: '' };
          return (
            <button
              key={role}
              onClick={() => onSelect(role)}
              style={{
                width: '100%', padding: '14px 16px', fontSize: 13,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer', borderRadius: 4, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(232,160,32,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 20 }}>{info.emoji}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.03em' }}>{info.label}</div>
                {info.desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{info.desc}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── 고객 로그인 / 회원가입 ──────────────────────────────────────────
const CustomerAuth = ({ onClose, onPendingLogin }) => {
  const { t } = useLanguage();
  const [tab, setTab]             = useState('login');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [phone, setPhone]         = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  // 멀티롤 선택
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [loginUserRoles, setLoginUserRoles] = useState([]);

  // 약관 동의 상태
  const [termsAgreed, setTermsAgreed] = useState({
    terms: false, privacy: false, refund: false, marketing: false,
  });
  const toggleTerm = (key) => setTermsAgreed(prev => ({ ...prev, [key]: !prev[key] }));
  const termsItems = [
    { key: 'terms', label: '고객 이용약관 동의', data: TERMS_CUSTOMER, required: true },
    { key: 'privacy', label: '개인정보 처리방침 동의', data: PRIVACY, required: true },
    { key: 'refund', label: '환불/취소 정책 동의', data: REFUND_POLICY, required: true },
    { key: 'marketing', label: '마케팅 정보 수신 동의', data: null, required: false },
  ];
  const requiredTermsOk = termsItems.filter(i => i.required).every(i => termsAgreed[i.key]);

  const reset = () => { setError(''); setSuccess(''); };

  // ── 실명 검증: 특수문자·기호 불가 (한글, 영문, 일본어, 중국어, 공백, 하이픈만 허용) ──
  const REAL_NAME_REGEX = /^[가-힣a-zA-Zぁ-んァ-ヶ一-龥\u3400-\u4DBF\s\-·.]+$/;
  const isRealNameValid = (v) => !v || REAL_NAME_REGEX.test(v);
  const realNameError = name && !isRealNameValid(name);

  // ── 고객 회원가입 유효성 검사 안내 ──
  // 비밀번호 조건 체크 (8~16자, 대문자, 소문자, 숫자, 특수문자)
  const pwChecks = {
    length:  password.length >= 8 && password.length <= 16,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    digit:   /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const pwAllPass = Object.values(pwChecks).every(Boolean);

  const getSignupIssues = () => {
    const issues = [];
    if (!name.trim()) issues.push('실명을 입력해주세요.');
    else if (!isRealNameValid(name)) issues.push('실명에 특수문자나 기호는 사용할 수 없습니다.');
    if (!birthdate) issues.push('생년월일을 선택해주세요.');
    if (!email) issues.push('이메일 주소를 입력해주세요.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('이메일 형식이 올바르지 않습니다. 예) hello@phosnap.com');
    if (!phone) issues.push('핸드폰 번호를 입력해주세요.');
    else if (phone.replace(/\D/g, '').length < 10) issues.push('핸드폰 번호는 최소 10자리여야 합니다.');
    if (phone && !phoneVerified) issues.push('핸드폰 인증을 완료해주세요.');
    if (!password) issues.push('비밀번호를 입력해주세요.');
    else if (!pwAllPass) issues.push('비밀번호 조건을 모두 충족해주세요. (8~16자, 대소문자, 숫자, 특수문자)');
    if (password && pwConfirm && password !== pwConfirm) issues.push('비밀번호가 일치하지 않습니다.');
    else if (!pwConfirm) issues.push('비밀번호 확인을 입력해주세요.');
    if (!requiredTermsOk) issues.push('필수 약관에 동의해주세요.');
    return issues;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    // 회원가입 시 추가 유효성 안내
    if (tab === 'signup') {
      const issues = getSignupIssues();
      if (issues.length > 0) { setError(issues.join('\n')); return; }
    }
    setLoading(true);
    try {
      if (tab === 'signup') {
        const { signUp, upsertProfile } = await import('../lib/supabase');
        const { error: err, data } = await signUp({
          email, password, name, role: 'customer',
        });
        if (err) {
          const m = err.message?.toLowerCase() ?? '';
          if (m.includes('already registered') || m.includes('already exists'))
            setError('이미 등록된 이메일입니다. 로그인을 시도해주세요.');
          else if (m.includes('password'))
            setError('비밀번호가 보안 요건을 충족하지 않습니다. 8자 이상, 영문+숫자 조합을 권장합니다.');
          else
            setError(err.message || t('auth.signupError'));
        } else {
          // 신규 가입: customer 역할 등록 + 핸드폰 저장
          if (data?.user?.id) {
            await addUserRole(data.user.id, 'customer');
            await upsertProfile({
              id: data.user.id,
              full_name: name,
              role: 'customer',
              phone: phone.trim(),
              birthdate: birthdate || null,
            });
          }
          try { await switchUserRole('customer'); } catch (e) { console.warn('switchUserRole failed:', e); }
          onClose();
        }
      } else {
        // ── 로그인 ──
        // CustomerAuth → 고객 역할로 진입 의도를 먼저 sessionStorage에 기록
        // (signIn이 onAuthChange를 트리거하기 전에 설정해야 race condition 방지)
        sessionStorage.setItem('phosnap_active_role', 'customer');

        const { error: err, data } = await signIn({ email, password });
        if (err) {
          sessionStorage.removeItem('phosnap_active_role'); // 로그인 실패 시 롤백
          setError(err.message === 'Invalid login credentials'
            ? t('auth.loginInvalid')
            : err.message);
        } else {
          // CustomerAuth → 항상 고객 역할로 진입
          // sessionStorage에 이미 'customer'가 설정되어 있으므로 덮어쓰지 않음
          try { await switchUserRole('customer'); } catch (e) { console.warn('switchUserRole failed:', e); }
          // sessionStorage는 signIn 전에 이미 'customer'로 설정됨 — 건드리지 않음
          onClose();
        }
      }
    } catch (e) {
      console.error('Auth error:', e);
      setError(e.message || '로그인 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    reset(); setLoading(true);
    // 소셜 로그인 전에 고객 역할 의도 기록 (redirect 후에도 유지)
    sessionStorage.setItem('phosnap_active_role', 'customer');
    const { error: err } = await signInWithGoogle();
    if (err) {
      sessionStorage.removeItem('phosnap_active_role');
      setError(err.message);
    }
    setLoading(false);
  };

  const handleKakaoLogin = async () => {
    reset(); setLoading(true);
    // 소셜 로그인 전에 고객 역할 의도 기록
    sessionStorage.setItem('phosnap_active_role', 'customer');
    const { getSupabase } = await import('../lib/supabase');
    const sb = await getSupabase();
    if (!sb) { setError('Supabase 연결 실패'); setLoading(false); sessionStorage.removeItem('phosnap_active_role'); return; }
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (err) setError(err.message);
    setLoading(false);
  };
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    const { error: err } = await resetPassword(resetEmail);
    if (err) setError(err.message);
    else setSuccess(t('auth.resetSent'));
    setLoading(false);
  };

  // ── 역할 선택 화면 (멀티롤) ──
  const handleRoleSelect = async (role) => {
    try {
      await switchUserRole(role);
      sessionStorage.setItem('phosnap_active_role', role);
    } catch (e) { console.warn('switchUserRole failed:', e); }
    if (onPendingLogin) onPendingLogin(false);
    onClose();
  };

  // 역할 선택 화면에서 X/취소 → 로그인 취소 (signOut 후 모달 닫기)
  const handleRolePickerCancel = async () => {
    try {
      const { getSupabase } = await import('../lib/supabase');
      const sb = await getSupabase();
      if (sb) await sb.auth.signOut();
      sessionStorage.removeItem('phosnap_active_role');
    } catch (_) { /* silent */ }
    setShowRolePicker(false);
    setLoginUserRoles([]);
    if (onPendingLogin) onPendingLogin(false);
  };

  if (showRolePicker) return (
    <div>
      <LoginRolePicker
        roles={loginUserRoles}
        onSelect={handleRoleSelect}
        onClose={handleRolePickerCancel}
      />
      <button
        onClick={handleRolePickerCancel}
        style={{
          marginTop: 16, width: '100%', padding: '10px 0', fontSize: 12,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-serif)',
          letterSpacing: '0.05em', transition: 'all 0.2s',
        }}
      >
        취소 — 로그인 화면으로 돌아가기
      </button>
    </div>
  );

  // ── 비밀번호 재설정 화면 ──
  if (showReset) return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, marginBottom: 6 }}>{t('auth.resetTitle')}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>{t('auth.resetSub')}</div>
      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" value={resetEmail}
            onChange={e => setResetEmail(e.target.value)} placeholder="hello@phosnap.com" required />
        </div>
        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 8 }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginBottom: 8 }}>{success}</p>}
        <button type="submit" className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? t('auth.sendingReset') : t('auth.sendResetLink')}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--gold)', cursor: 'pointer' }}
          onClick={() => { setShowReset(false); reset(); }}>{t('auth.backToLogin')}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 고객 로그인 / 회원가입 타이틀 */}
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text)',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)',
        letterSpacing: '0.04em',
      }}>
        {tab === 'login' ? (t('auth.customerLogin') || '고객 로그인 →') : (t('auth.customerSignup') || '고객 회원가입 →')}
      </div>

      {/* 소셜 로그인 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleGoogle} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#fff', border: '1px solid #e0e0e0',
          color: '#000', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <GoogleIcon />
          {t('auth.googleLogin')}
        </button>
        <button onClick={handleKakaoLogin} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#FEE500', border: '1px solid #FEE500',
          color: '#3C1E1E', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <KakaoIcon />
          {t('auth.kakaoLogin')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {t('auth.orDivider')}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        {tab === 'signup' && (
          <>
            {/* 실명 */}
            <div className="form-group">
              <label className="form-label">실명 *</label>
              <input className="form-input" type="text" placeholder="홍길동"
                value={name} onChange={e => setName(e.target.value)} required
                style={realNameError ? { borderColor: '#e85d5d', background: 'rgba(232,93,93,0.04)' } : {}} />
              {realNameError && <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 4 }}>✗ 특수문자나 기호는 사용할 수 없습니다.</div>}
            </div>
            {/* 생년월일 */}
            <div className="form-group">
              <label className="form-label">생년월일 *</label>
              <input className="form-input" type="date" value={birthdate}
                onChange={e => setBirthdate(e.target.value)} required
                max={new Date().toISOString().split('T')[0]}
                style={{ colorScheme: 'dark' }} />
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" placeholder="hello@phosnap.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.passwordLabel')}</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>

        {/* 회원가입 시 추가 필드 */}
        {tab === 'signup' && (
          <>
            {/* 비밀번호 조건 표시 */}
            {password && (
              <div style={{ fontSize: 11, marginTop: -8, marginBottom: 10, lineHeight: 1.8, color: 'var(--muted)' }}>
                <span style={{ color: pwChecks.length ? '#22c55e' : '#e85d5d' }}>
                  {pwChecks.length ? '✓' : '✗'} 8~16자
                </span>{' · '}
                <span style={{ color: pwChecks.upper ? '#22c55e' : '#e85d5d' }}>
                  {pwChecks.upper ? '✓' : '✗'} 대문자
                </span>{' · '}
                <span style={{ color: pwChecks.lower ? '#22c55e' : '#e85d5d' }}>
                  {pwChecks.lower ? '✓' : '✗'} 소문자
                </span>{' · '}
                <span style={{ color: pwChecks.digit ? '#22c55e' : '#e85d5d' }}>
                  {pwChecks.digit ? '✓' : '✗'} 숫자
                </span>{' · '}
                <span style={{ color: pwChecks.special ? '#22c55e' : '#e85d5d' }}>
                  {pwChecks.special ? '✓' : '✗'} 특수문자
                </span>
              </div>
            )}
            {/* 비밀번호 확인 */}
            <div className="form-group">
              <label className="form-label">비밀번호 확인 *</label>
              <input className="form-input" type="password" placeholder="비밀번호를 한번 더 입력해주세요"
                value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required minLength={8} />
              {pwConfirm && password !== pwConfirm && (
                <p style={{ fontSize: 11, color: '#e85d5d', marginTop: 4 }}>비밀번호가 일치하지 않습니다.</p>
              )}
              {pwConfirm && password === pwConfirm && (
                <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>비밀번호가 일치합니다.</p>
              )}
            </div>
            {/* 핸드폰 인증 */}
            <PhoneVerify
              onVerified={(verifiedPhone) => { setPhone(verifiedPhone); setPhoneVerified(true); }}
              setError={setError}
            />
          </>
        )}

        {/* 회원가입 시 약관 동의 */}
        {tab === 'signup' && (
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <TermsAgreement items={termsItems} agreed={termsAgreed} onToggle={toggleTerm} />
          </div>
        )}

        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{success}</p>}

        <button type="submit" className="btn-primary"
          style={{
            width: '100%', justifyContent: 'center', marginTop: 16,
            opacity: (loading || (tab === 'signup' && !requiredTermsOk)) ? 0.4 : 1,
          }}
          disabled={loading || (tab === 'signup' && !requiredTermsOk)}>
          {loading ? t('auth.processing') : (tab === 'login' ? (t('auth.customerLogin') || '고객 로그인 →') : t('auth.submitSignup'))}
        </button>
      </form>

      {/* 하단: 회원가입/로그인 전환 + 비밀번호 찾기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {tab === 'login' ? (
          <>
            <button
              type="button"
              onClick={() => { setTab('signup'); reset(); }}
              style={{
                width: '100%', padding: '12px 0', fontSize: 13,
                background: 'transparent', border: '1px solid var(--gold-border)',
                color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-serif)',
                letterSpacing: '0.06em', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0B0B0B'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)'; }}
            >
              {t('auth.customerSignup') || '고객 회원가입 →'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }}
                onClick={() => { setShowReset(true); reset(); }}>{t('auth.forgotPassword')}</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {t('auth.alreadyHaveAccount')}{' '}
              <span style={{ color: 'var(--gold)', cursor: 'pointer' }}
                onClick={() => { setTab('login'); reset(); }}>{t('auth.tabLogin')}</span>
            </span>
          </div>
        )}
      </div>
    </>
  );
};

// ─── 작가 로그인 (회원가입은 /artist/register에서 진행) ──────────────
const ArtistAuth = ({ onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { error: err } = await signIn({ email, password });
      if (err) {
        setError(err.message === 'Invalid login credentials'
          ? t('auth.loginInvalid')
          : err.message);
      } else {
        try { await switchUserRole('artist'); } catch (e) { console.warn('switchUserRole failed:', e); }
        onClose();
        navigate('/artist/dashboard');
      }
    } catch (e) {
      console.error('Auth error:', e);
      setError(e.message || '로그인 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    reset(); setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
    setLoading(false);
  };


  const handleKakaoLogin = async () => {
    reset(); setLoading(true);
    const { getSupabase } = await import('../lib/supabase');
    const sb = await getSupabase();
    if (!sb) { setError('Supabase 연결 실패'); setLoading(false); return; }
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    const { error: err } = await resetPassword(resetEmail);
    if (err) setError(err.message);
    else setSuccess(t('auth.resetSent'));
    setLoading(false);
  };

  if (showReset) return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, marginBottom: 6 }}>{t('auth.resetTitle')}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>{t('auth.resetSub')}</div>
      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" value={resetEmail}
            onChange={e => setResetEmail(e.target.value)} placeholder="artist@phosnap.com" required />
        </div>
        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 8 }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginBottom: 8 }}>{success}</p>}
        <button type="submit" className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? t('auth.sendingReset') : t('auth.sendResetLink')}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--gold)', cursor: 'pointer' }}
          onClick={() => { setShowReset(false); reset(); }}>{t('auth.backToLogin')}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 작가 로그인 타이틀 */}
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text)',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)',
        letterSpacing: '0.04em',
      }}>
        {t('auth.artistLogin')}
      </div>

      {/* 소셜 로그인 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleGoogle} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#fff', border: '1px solid #e0e0e0',
          color: '#000', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <GoogleIcon />
          {t('auth.googleLogin')}
        </button>
        <button onClick={handleKakaoLogin} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#FEE500', border: '1px solid #FEE500',
          color: '#3C1E1E', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <KakaoIcon />
          {t('auth.kakaoLogin')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {t('auth.orDivider')}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" placeholder="artist@phosnap.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.passwordLabel')}</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>

        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{success}</p>}

        <button type="submit" className="btn-primary"
          style={{
            width: '100%', justifyContent: 'center', marginTop: 16,
            opacity: loading ? 0.4 : 1,
          }}
          disabled={loading}>
          {loading ? t('auth.processing') : t('auth.artistLogin')}
        </button>
      </form>

      {/* 하단: 작가 회원가입 버튼 + 비밀번호 찾기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={() => { onClose(); navigate('/artist/register'); }}
          style={{
            width: '100%', padding: '12px 0', fontSize: 13,
            background: 'transparent', border: '1px solid var(--gold-border)',
            color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.06em', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0B0B0B'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)'; }}
        >
          {t('auth.artistSignupLink') || '작가 회원가입 →'}
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }}
            onClick={() => { setShowReset(true); reset(); }}>{t('auth.forgotPassword')}</span>
        </div>
      </div>
    </>
  );
};

// ─── 벤더 로그인 (회원가입은 /vendor/register에서 진행) ─────────────
const VendorAuth = ({ onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { error: err } = await signIn({ email, password });
      if (err) {
        setError(err.message === 'Invalid login credentials'
          ? t('auth.loginInvalid')
          : err.message);
      } else {
        try { await switchUserRole('vendor'); } catch (e) { console.warn('switchUserRole failed:', e); }
        onClose();
        navigate('/vendor/dashboard');
      }
    } catch (e) {
      console.error('Auth error:', e);
      setError(e.message || '로그인 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    reset(); setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
    setLoading(false);
  };


  const handleKakaoLogin = async () => {
    reset(); setLoading(true);
    const { getSupabase } = await import('../lib/supabase');
    const sb = await getSupabase();
    if (!sb) { setError('Supabase 연결 실패'); setLoading(false); return; }
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (err) setError(err.message);
    setLoading(false);
  };
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    const { error: err } = await resetPassword(resetEmail);
    if (err) setError(err.message);
    else setSuccess(t('auth.resetSent'));
    setLoading(false);
  };

  if (showReset) return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, marginBottom: 6 }}>{t('auth.resetTitle')}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>{t('auth.resetSub')}</div>
      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" value={resetEmail}
            onChange={e => setResetEmail(e.target.value)} placeholder="vendor@phosnap.com" required />
        </div>
        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 8 }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginBottom: 8 }}>{success}</p>}
        <button type="submit" className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? t('auth.sendingReset') : t('auth.sendResetLink')}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--gold)', cursor: 'pointer' }}
          onClick={() => { setShowReset(false); reset(); }}>{t('auth.backToLogin')}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 벤더 로그인 타이틀 */}
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text)',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)',
        letterSpacing: '0.04em',
      }}>
        벤더 로그인 →
      </div>

      {/* 소셜 로그인 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleGoogle} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#fff', border: '1px solid #e0e0e0',
          color: '#000', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <GoogleIcon />
          {t('auth.googleLogin')}
        </button>
        <button onClick={handleKakaoLogin} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '11px 16px',
          background: '#FEE500', border: '1px solid #FEE500',
          color: '#3C1E1E', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          borderRadius: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <KakaoIcon />
          {t('auth.kakaoLogin')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {t('auth.orDivider')}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">{t('auth.emailLabel')}</label>
          <input className="form-input" type="email" placeholder="vendor@phosnap.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.passwordLabel')}</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>

        {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{error}</p>}
        {success && <p style={{ color: 'var(--gold)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{success}</p>}

        <button type="submit" className="btn-primary"
          style={{
            width: '100%', justifyContent: 'center', marginTop: 16,
            opacity: loading ? 0.4 : 1,
          }}
          disabled={loading}>
          {loading ? t('auth.processing') : '벤더 로그인 →'}
        </button>
      </form>

      {/* 하단: 벤더 회원가입 버튼 + 비밀번호 찾기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={() => { onClose(); navigate('/vendor/register'); }}
          style={{
            width: '100%', padding: '12px 0', fontSize: 13,
            background: 'transparent', border: '1px solid var(--gold-border)',
            color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.06em', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0B0B0B'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)'; }}
        >
          벤더 회원가입 →
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }}
            onClick={() => { setShowReset(true); reset(); }}>{t('auth.forgotPassword')}</span>
        </div>
      </div>
    </>
  );
};

// ─── 메인 AuthModal ────────────────────────────────────────────────────
// mode: 'login' | 'signup' | 'artist-login' | 'vendor-login'
const AuthModal = ({ mode, onClose }) => {
  const { t } = useLanguage();
  const [userType, setUserType] = useState(
    mode === 'artist-login' ? 'artist'
    : mode === 'vendor-login' ? 'vendor'
    : 'customer'
  );
  const [pendingLogin, setPendingLogin] = useState(false); // 역할 선택 대기 중

  // X 버튼: 역할 선택 대기 중이면 signOut 처리
  const handleModalClose = async () => {
    if (pendingLogin) {
      try {
        const { getSupabase } = await import('../lib/supabase');
        const sb = await getSupabase();
        if (sb) await sb.auth.signOut();
        sessionStorage.removeItem('phosnap_active_role');
      } catch (_) { /* silent */ }
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={handleModalClose}><CloseIcon /></button>

        {/* Phosnap 브랜드 */}
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em',
          color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20,
        }}>
          Phosnap
        </div>

        {/* ── 고객 / 작가 / 벤더 최상위 토글 ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden',
        }}>
          {[
            { id: 'customer', label: t('auth.toggleCustomer') },
            { id: 'artist',   label: t('auth.toggleArtist') },
            { id: 'vendor',   label: '🤝 벤더' },
          ].map(({ id, label }) => (
            <button key={id}
              onClick={() => setUserType(id)}
              style={{
                padding: '10px 0', fontSize: 11, border: 'none', cursor: 'pointer',
                background: userType === id ? 'var(--gold)' : 'transparent',
                color:      userType === id ? '#0B0B0B'    : 'var(--muted)',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
                transition: 'all 0.2s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {userType === 'customer' && <CustomerAuth onClose={onClose} onPendingLogin={setPendingLogin} />}
        {userType === 'artist'   && <ArtistAuth   onClose={onClose} />}
        {userType === 'vendor'   && <VendorAuth   onClose={onClose} />}
      </div>
    </div>
  );
};

export default AuthModal;
