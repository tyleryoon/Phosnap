import { useState } from 'react';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { submitWaitlist } from '../lib/waitlist';

// ─── Waitlist / Early Access Page ─────────────────────────────────────

// 역할별 혜택 카드 구성
const ROLE_BENEFITS = {
  customer: ['b1', 'b2', 'b3', 'b4'],
  photographer: ['b1', 'b3', 'b4'],   // 작가는 수익/글로벌 관련
  stylist: ['b1', 'b3', 'b4'],
  vendor: ['b1', 'b3', 'b4'],         // 벤더(의상/장소 등)
};

// 역할 탭 정의
const ROLES = [
  {
    id: 'customer',
    icon: '📸',
    labelKey: 'waitlist.sectionCustomer',
    descKey: 'waitlist.customerDesc',
    color: 'var(--text)',
  },
  {
    id: 'photographer',
    icon: '🎬',
    labelKey: 'waitlist.sectionArtist',
    descKey: 'waitlist.artistDesc',
    color: 'var(--gold)',
  },
  {
    id: 'stylist',
    icon: '✂️',
    labelKey: 'waitlist.sectionStylist',
    descKey: 'waitlist.stylistDesc',
    color: '#b8a0c8',
  },
  {
    id: 'vendor',
    icon: '🏪',
    labelKey: 'waitlist.sectionVendor',
    descKey: 'waitlist.vendorDesc',
    color: '#4caf50',
  },
];

const getHonorific = (name, lang) => {
  if (!name) return '';
  if (lang === 'ko') return `${name}님, `;
  if (lang === 'ja') return `${name}様、`;
  if (lang === 'zh') return `您好，${name}！`;
  return `${name}, `;
};

const Waitlist = () => {
  const { t, lang } = useLanguage();

  const [role, setRole]           = useState('customer');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [sentCode, setSentCode]   = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [instagram, setInstagram] = useState('');
  const [done, setDone]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [verifyError, setVerifyError] = useState('');

  const activeRole = ROLES.find(r => r.id === role);

  const benefits = [
    { key: 'b1', n: '01', title: t('waitlist.b1Title'), desc: t('waitlist.b1Desc') },
    { key: 'b2', n: '02', title: t('waitlist.b2Title'), desc: t('waitlist.b2Desc') },
    { key: 'b3', n: '03', title: t('waitlist.b3Title'), desc: t('waitlist.b3Desc') },
    { key: 'b4', n: '04', title: t('waitlist.b4Title'), desc: t('waitlist.b4Desc') },
    { key: 'b5', n: '05', title: t('waitlist.b5Title'), desc: t('waitlist.b5Desc') },
  ];

  // 인증번호 발송 (프로토타입: 실제 SMS 연동 전까지 자동 인증)
  const handleSendCode = () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setVerifyError(lang === 'ko' ? '올바른 핸드폰 번호를 입력해주세요.' : lang === 'ja' ? '正しい電話番号を入力してください。' : 'Please enter a valid phone number.');
      return;
    }
    setVerifyError('');
    setSentCode(true);
    // 프로토타입: 6자리 코드 자동 생성 & 저장 (실서비스 시 SMS API 연동)
    window.__phosnapVerifyCode = String(Math.floor(100000 + Math.random() * 900000));
    // alert 대신 콘솔에만 표시 (개발용)
    console.log('[Phosnap] Verification code:', window.__phosnapVerifyCode);
  };

  const handleVerifyCode = () => {
    if (phoneCode === window.__phosnapVerifyCode) {
      setPhoneVerified(true);
      setVerifyError('');
    } else {
      setVerifyError(lang === 'ko' ? '인증번호가 일치하지 않습니다.' : lang === 'ja' ? '認証番号が一致しません。' : 'Verification code does not match.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name?.trim()) {
      setError(lang === 'ko' ? '이름을 입력해주세요.' : lang === 'ja' ? '名前を入力してください。' : 'Please enter your name.');
      return;
    }
    if (!email) return;
    if (!phoneVerified) {
      setError(lang === 'ko' ? '핸드폰 인증을 완료해주세요.' : lang === 'ja' ? '電話番号の認証を完了してください。' : 'Please verify your phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await submitWaitlist({ email, name, role, instagram, phone });
      setDone(true);
    } catch (err) {
      setError(err.message || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section" style={{ maxWidth: 860, margin: '0 auto' }}>

        <div className="section-label">{t('section.earlyAccess')}</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(26px, 4.5vw, 48px)', whiteSpace: 'pre-line' }}>
          {t('waitlist.pageTitle')}
        </h1>
        <p className="section-sub">{t('waitlist.pageSub')}</p>

        {/* 역할 선택 카드는 폼 내부로 이동됨 */}

        {/* ── 혜택 (3+2 레이아웃) ── */}
        <div style={{ marginBottom: 64 }}>
          {/* 상단 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {benefits.slice(0, 3).map(b => (
              <div key={b.key} className="step">
                <Corners />
                <div className="step-num">{b.n}</div>
                <div className="step-title">{b.title}</div>
                <p className="step-desc">{b.desc}</p>
              </div>
            ))}
          </div>
          {/* 하단 2개 — 중앙 정렬 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: '66%', margin: '0 auto' }}>
            {benefits.slice(3).map(b => (
              <div key={b.key} className="step">
                <Corners />
                <div className="step-num">{b.n}</div>
                <div className="step-title">{b.title}</div>
                <p className="step-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 등록 폼 / 완료 ── */}
        {done ? (
          <div style={{
            border: '1px solid var(--gold-border)',
            padding: '56px 40px',
            textAlign: 'center',
            background: 'var(--gold-dim)',
            position: 'relative',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: '0.1em', marginBottom: 12, color: 'var(--gold)' }}>
              {t('waitlist.doneTitle')}
            </div>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-elegant)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.8 }}>
              {getHonorific(name, lang)}{t('waitlist.doneMsg')}
            </p>
            {instagram && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gold)' }}>
                Instagram: {instagram}
              </p>
            )}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', padding: '48px 40px', background: 'var(--bg2)', position: 'relative' }}>
            <Corners />

            {/* 역할 선택 카드 (폼 내부) */}
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
              {lang === 'ko' ? '등록 유형 선택' : lang === 'ja' ? '登録タイプ選択' : 'Select Registration Type'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ROLES.length}, 1fr)`, gap: 10, marginBottom: 28 }}>
              {ROLES.map(r => {
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    style={{
                      background: isActive ? `${r.color}10` : 'var(--bg)',
                      border: `1px solid ${isActive ? r.color : 'var(--border)'}`,
                      padding: '16px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.25s',
                      outline: 'none',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: isActive ? r.color : 'var(--muted)',
                      textTransform: 'uppercase',
                      transition: 'color 0.25s',
                    }}>
                      {t(r.labelKey)}
                    </div>
                    {isActive && (
                      <div style={{
                        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                        width: 6, height: 6, borderRadius: '50%',
                        background: r.color,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 역할 설명 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{activeRole.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '0.08em', color: activeRole.color }}>
                {t(activeRole.labelKey)}
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>
              {t(activeRole.descKey)}
            </p>

            <form onSubmit={handleSubmit}>

              {/* 이름 (필수) */}
              <div className="form-group">
                <label className="form-label">
                  {lang === 'ko' ? '이름' : lang === 'ja' ? '名前' : 'Name'} <span style={{ color: '#e85d5d', fontSize: 11 }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t('waitlist.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              {/* 이메일 */}
              <div className="form-group">
                <label className="form-label">
                  {t('waitlist.emailLabel')} <span style={{ color: '#e85d5d', fontSize: 11 }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="hello@phosnap.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* 핸드폰 번호 + 인증 */}
              <div className="form-group">
                <label className="form-label">
                  {lang === 'ko' ? '핸드폰 번호' : lang === 'ja' ? '電話番号' : 'Phone Number'} <span style={{ color: '#e85d5d', fontSize: 11 }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder={lang === 'ko' ? '010-0000-0000' : '+82 10-0000-0000'}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={phoneVerified}
                    style={{ flex: 1, opacity: phoneVerified ? 0.6 : 1 }}
                  />
                  {!phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      style={{
                        padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-serif)',
                        background: sentCode ? 'transparent' : 'var(--gold)',
                        color: sentCode ? 'var(--gold)' : '#000',
                        border: sentCode ? '1px solid var(--gold-border)' : '1px solid var(--gold)',
                        cursor: 'pointer', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}
                    >
                      {sentCode
                        ? (lang === 'ko' ? '재발송' : lang === 'ja' ? '再送信' : 'Resend')
                        : (lang === 'ko' ? '인증번호 발송' : lang === 'ja' ? '認証番号送信' : 'Send Code')}
                    </button>
                  )}
                  {phoneVerified && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#22c55e', fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      ✓ {lang === 'ko' ? '인증완료' : lang === 'ja' ? '認証済み' : 'Verified'}
                    </div>
                  )}
                </div>

                {/* 인증번호 입력 */}
                {sentCode && !phoneVerified && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      className="form-input"
                      type="text"
                      maxLength={6}
                      placeholder={lang === 'ko' ? '인증번호 6자리' : lang === 'ja' ? '認証番号6桁' : '6-digit code'}
                      value={phoneCode}
                      onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      style={{
                        padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-serif)',
                        background: 'transparent', color: 'var(--text)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}
                    >
                      {lang === 'ko' ? '확인' : lang === 'ja' ? '確認' : 'Verify'}
                    </button>
                  </div>
                )}

                {verifyError && (
                  <p style={{ color: '#e85d5d', fontSize: 11, marginTop: 6 }}>{verifyError}</p>
                )}
              </div>

              {/* 인스타그램 */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t('waitlist.instagramLabel')}
                  <span style={{ fontSize: 10, color: 'var(--gold)', background: 'rgba(232,160,32,0.1)', border: '1px solid var(--gold-border)', padding: '2px 8px', borderRadius: 0, letterSpacing: '0.08em' }}>
                    DM
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted)', fontSize: 14, pointerEvents: 'none',
                  }}>@</span>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="phosnap.kr"
                    value={instagram.replace(/^@/, '')}
                    onChange={e => setInstagram('@' + e.target.value.replace(/^@/, ''))}
                    style={{ paddingLeft: 28 }}
                  />
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.02em' }}>
                  {t('waitlist.contactNote')}
                </p>
              </div>

              {error && (
                <p style={{ color: '#e85d5d', fontSize: 13, marginTop: 8, letterSpacing: '0.02em' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '16px', marginTop: 8, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '···' : t('waitlist.submitBtn')}
              </button>
            </form>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Waitlist;
