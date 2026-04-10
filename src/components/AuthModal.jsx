import { useState } from 'react';
import { CloseIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Auth Modal (Login / Signup) ───────────────────────────────────────

const isArtistRole = (role) => role === 'photographer' || role === 'stylist';

const AuthModal = ({ mode, onClose }) => {
  const { t } = useLanguage();

  const ROLES = [
    { id: 'customer',     label: t('auth.roleCustomer') },
    { id: 'photographer', label: t('auth.rolePhotographer') },
    { id: 'stylist',      label: t('auth.roleStylist') },
  ];

  const [tab, setTab]               = useState(mode);   // 'login' | 'signup'
  const [role, setRole]             = useState('customer');
  const [nativeName, setNativeName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [agreeVisa, setAgreeVisa]   = useState(false);
  const [agreePayment, setAgreePayment] = useState(false);
  const [consentError, setConsentError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 작가 회원가입 시 필수 동의 체크
    if (tab === 'signup' && isArtistRole(role)) {
      if (!agreeVisa || !agreePayment) {
        setConsentError(t('auth.consentRequired'));
        return;
      }
    }
    setConsentError('');
    alert(t('auth.comingSoon'));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}><CloseIcon /></button>

        <div className="modal-title">
          {tab === 'login' ? t('auth.titleLogin') : t('auth.titleSignup')}
        </div>
        <div className="modal-sub">
          {tab === 'login' ? t('auth.subLogin') : t('auth.subSignup')}
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
          {['login', 'signup'].map(tKey => (
            <button
              key={tKey}
              className={`tab-btn ${tab === tKey ? 'active' : ''}`}
              onClick={() => setTab(tKey)}
              style={{ flex: 1 }}
            >
              {tKey === 'login' ? t('auth.tabLogin') : t('auth.tabSignup')}
            </button>
          ))}
        </div>

        {/* Role selector (signup only) */}
        {tab === 'signup' && (
          <div className="role-tabs">
            {ROLES.map(r => (
              <button
                key={r.id}
                className={`role-tab ${role === r.id ? 'active' : ''}`}
                onClick={() => setRole(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── 이름 필드 (회원가입만) ── */}
          {tab === 'signup' && (
            isArtistRole(role) ? (
              <>
                {/* 작가 / 스타일리스트: 자국어 + 영문 이름 2개 */}
                <div style={{
                  background: 'rgba(232,160,32,0.05)',
                  border: '1px solid var(--gold-border)',
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'rgba(242,242,242,0.55)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.6,
                }}>
                  {t('auth.artistNameInfo')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      {t('auth.nativeNameLabel')}
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>Native</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="정미나 / 田中花子"
                      value={nativeName}
                      onChange={e => setNativeName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      {t('auth.englishNameLabel')}
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>English</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Mina J. / Tanaka H."
                      value={englishName}
                      onChange={e => setEnglishName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              /* 고객: 이름 1개 */
              <div className="form-group">
                <label className="form-label">{t('auth.nameLabel')}</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )
          )}

          {/* ── 이메일 ── */}
          <div className="form-group">
            <label className="form-label">{t('auth.emailLabel')}</label>
            <input
              className="form-input"
              type="email"
              placeholder="hello@phosnap.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* ── 비밀번호 ── */}
          <div className="form-group">
            <label className="form-label">{t('auth.passwordLabel')}</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {/* ── 작가 필수 동의 체크박스 (회원가입만) ── */}
          {tab === 'signup' && isArtistRole(role) && (
            <div style={{ marginTop: 20, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 동의 1 — 비자/취업 자격 책임 */}
              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={agreeVisa}
                  onChange={e => { setAgreeVisa(e.target.checked); setConsentError(''); }}
                  style={{ marginTop: 3, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, color: 'rgba(242,242,242,0.55)', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                  {t('auth.consentVisa')}
                </span>
              </label>
              {/* 동의 2 — 플랫폼 결제 전용 */}
              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={agreePayment}
                  onChange={e => { setAgreePayment(e.target.checked); setConsentError(''); }}
                  style={{ marginTop: 3, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, color: 'rgba(242,242,242,0.55)', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                  {t('auth.consentPayment')}
                </span>
              </label>
              {/* 에러 메시지 */}
              {consentError && (
                <p style={{ fontSize: 11, color: '#e85d5d', letterSpacing: '0.02em', margin: 0 }}>
                  {consentError}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {tab === 'login' ? t('auth.submitLogin') : t('auth.submitSignup')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
          {tab === 'login' ? (
            <><span>{t('auth.switchToSignup')} </span><span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setTab('signup')}>{t('auth.switchSignupLink')}</span></>
          ) : (
            <><span>{t('auth.switchToLogin')} </span><span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setTab('login')}>{t('auth.switchLoginLink')}</span></>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
