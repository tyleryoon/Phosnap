import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';

// ─── For Artists Page ──────────────────────────────────────────────────

const ForArtists = ({ onAuthOpen }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    { n: '01', title: t('forartists.f1Title'), desc: t('forartists.f1Desc') },
    { n: '02', title: t('forartists.f2Title'), desc: t('forartists.f2Desc') },
    { n: '03', title: t('forartists.f3Title'), desc: t('forartists.f3Desc') },
    { n: '04', title: t('forartists.f4Title'), desc: t('forartists.f4Desc') },
  ];

  const steps = [
    { n: '01', title: t('forartists.s1Title'), desc: t('forartists.s1Desc') },
    { n: '02', title: t('forartists.s2Title'), desc: t('forartists.s2Desc') },
    { n: '03', title: t('forartists.s3Title'), desc: t('forartists.s3Desc') },
    { n: '04', title: t('forartists.s4Title'), desc: t('forartists.s4Desc') },
  ];

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>

      {/* Hero */}
      <div className="hero" style={{ minHeight: '60vh' }}>
        <div className="hero-bg" />
        <div className="hero-eyebrow">{t('section.forArtists')}</div>
        <h1 className="hero-title" style={{ fontSize: 'clamp(28px, 5vw, 60px)', whiteSpace: 'pre-line' }}>
          {t('forartists.heroTitle')}
        </h1>
        <p className="hero-subtitle">{t('forartists.heroSub')}</p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => navigate('/waitlist')}>{t('forartists.joinBtn')}</button>
          <button className="btn-outline" onClick={() => onAuthOpen('login')}>{t('forartists.alreadyMember')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {[
          { num: '2,400+', labelKey: 'forartists.statArtists' },
          { num: '48',     labelKey: 'forartists.statCities' },
          { num: '20~30%', labelKey: 'forartists.statFee' },
          { num: '4.93',   labelKey: 'forartists.statRating' },
        ].map(s => (
          <div key={s.labelKey} className="stat-item">
            <span className="stat-num">{s.num}</span>
            <span className="stat-label">{t(s.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="section">
        <div className="section-label">{t('section.whyPhosnap')}</div>
        <h2 className="section-title">{t('forartists.whyTitle')}</h2>
        <p className="section-sub">{t('forartists.whySub')}</p>
        <div className="steps">
          {features.map(f => (
            <div key={f.n} className="step">
              <Corners />
              <div className="step-num">{f.n}</div>
              <div className="step-title">{f.title}</div>
              <p className="step-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* How to join */}
      <div className="section">
        <div className="section-label">{t('section.process')}</div>
        <h2 className="section-title">{t('forartists.processTitle')}</h2>
        <p className="section-sub">{t('forartists.processSub')}</p>
        <div className="steps">
          {steps.map(s => (
            <div key={s.n} className="step">
              <Corners />
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="section-pad-hero">
        <div className="section-label">{t('section.joinUs')}</div>
        <h2 className="section-title">{t('forartists.ctaTitle')}</h2>
        <p style={{ fontFamily: 'var(--font-elegant)', fontStyle: 'italic', color: 'var(--muted)', fontSize: 18, marginBottom: 40 }}>
          {t('forartists.ctaSub')}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/waitlist')}>{t('forartists.ctaWaitlist')}</button>
          <button className="btn-outline" onClick={() => onAuthOpen('signup')}>{t('forartists.ctaSignup')}</button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ForArtists;
