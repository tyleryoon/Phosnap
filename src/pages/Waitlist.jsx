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
  const [instagram, setInstagram] = useState('');
  const [done, setDone]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const activeRole = ROLES.find(r => r.id === role);

  const benefits = [
    { key: 'b1', n: '01', title: t('waitlist.b1Title'), desc: t('waitlist.b1Desc') },
    { key: 'b2', n: '02', title: t('waitlist.b2Title'), desc: t('waitlist.b2Desc') },
    { key: 'b3', n: '03', title: t('waitlist.b3Title'), desc: t('waitlist.b3Desc') },
    { key: 'b4', n: '04', title: t('waitlist.b4Title'), desc: t('waitlist.b4Desc') },
    { key: 'b5', n: '05', title: t('waitlist.b5Title'), desc: t('waitlist.b5Desc') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await submitWaitlist({ email, name, role, instagram });
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

        {/* ── 역할 선택 카드 ── */}
        <div className="waitlist-roles">
          {ROLES.map(r => {
            const isActive = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  background: isActive ? 'var(--bg2)' : 'var(--bg)',
                  border: `1px solid ${isActive ? r.color : 'var(--border)'}`,
                  padding: '24px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s',
                  outline: 'none',
                  boxShadow: isActive ? `0 0 20px rgba(0,0,0,0.3)` : 'none',
                }}
              >
                {isActive && <Corners />}
                <div style={{ fontSize: 26, marginBottom: 10 }}>{r.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: isActive ? r.color : 'var(--muted)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  transition: 'color 0.25s',
                }}>
                  {t(r.labelKey)}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {t(r.descKey)}
                </p>
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: 12, right: 14,
                    width: 8, height: 8, borderRadius: '50%',
                    background: r.color,
                  }} />
                )}
              </button>
            );
          })}
        </div>

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

            {/* 역할 표시 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{activeRole.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '0.08em', color: activeRole.color }}>
                {t(activeRole.labelKey)}
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>
              {t('waitlist.formNote')}
            </p>

            <form onSubmit={handleSubmit}>

              {/* 이름 */}
              <div className="form-group">
                <label className="form-label">{t('waitlist.nameLabel')}</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t('waitlist.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              {/* 이메일 */}
              <div className="form-group">
                <label className="form-label">{t('waitlist.emailLabel')}</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="hello@phosnap.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
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
