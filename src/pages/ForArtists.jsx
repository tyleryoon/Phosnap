import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import { ARTIST_COMMISSION_STEPS, COMMISSION_TIERS } from '../lib/commission';

const LOW = Math.round(COMMISSION_TIERS.early_access.rate * 100);
const HIGH = Math.round(ARTIST_COMMISSION_STEPS[0].rate * 100);
const STEP_LOW = Math.round(ARTIST_COMMISSION_STEPS[ARTIST_COMMISSION_STEPS.length - 1].rate * 100);
/** 통계 칸용 — 얼리엑세스를 뺀 일반 요율 범위 */
const FEE_RANGE_TEXT = `${STEP_LOW}~${HIGH}%`;
/** 설명문용 — 얼리엑세스를 포함한 전체 범위 */
const FEE_FULL_RANGE = `${LOW}~${HIGH}%`;

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

  // SEO
  const { lang } = useLanguage();
  const seoTitles = {
    ko: '작가로 참여하기',
    en: 'For Photographers',
    ja: 'フォトグラファーの方へ',
    zh: '摄影师专区',
  };
  const seoDescs = {
    ko: `Phosnap 작가 커뮤니티에 참여하여 수익을 창출하고 클라이언트와 직접 연결되세요. 수수료 ${FEE_FULL_RANGE}, 투명한 정산 시스템.`,
    en: `Join Phosnap photographer community. Earn money, connect with clients directly. Commission ${FEE_FULL_RANGE}, transparent settlement system.`,
    ja: `Phosnap 写真家コミュニティに参加。直接クライアントと繋がり、収入を増やしましょう。手数料${FEE_FULL_RANGE}、透明な精算システム。`,
    zh: `加入Phosnap摄影师社区。直接与客户联系，增加收入。佣金${FEE_FULL_RANGE}，透明清晰的结算系统。`,
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <SEO
        title={seoTitles[lang] || seoTitles.en}
        description={seoDescs[lang] || seoDescs.en}
        lang={lang}
      />

      {/* Hero */}
      <div className="hero" style={{ minHeight: '60vh' }}>
        <div className="hero-bg" />
        <div className="hero-eyebrow">{t('section.forArtists')}</div>
        <h1
          className="hero-title"
          style={{ fontSize: 'clamp(28px, 5vw, 60px)', whiteSpace: 'pre-line' }}
        >
          {t('forartists.heroTitle')}
        </h1>
        <p className="hero-subtitle">{t('forartists.heroSub')}</p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => navigate('/artist/register')}>
            {t('forartists.joinBtn')}
          </button>
          <button className="btn-outline" onClick={() => onAuthOpen('artist-login')}>
            {t('forartists.alreadyMember')}
          </button>
        </div>
      </div>

      {/* Stats
          '2,400+ 작가 · 48개 도시 · 평점 4.93' 이 있었다. 실제 작가는 33명이다.
          규모를 부풀려 데려온 작가는 들어와서 33명을 보고 떠난다.
          숫자가 자랑할 만해지면 그때 다시 넣는다.

          수수료만 남긴다. 규모가 아니라 조건이고, 작가가 가입 전에 알아야
          하는 값이다. (예전엔 '8~15%' 였는데 실제 요율은 11~18% 였다.
          이제 commission.js 에서 온다.) */}
      <div className="stats-bar" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="stat-item">
          <span className="stat-num">{FEE_RANGE_TEXT}</span>
          <span className="stat-label">{t('forartists.statFee')}</span>
        </div>
      </div>

      {/* Features */}
      <div className="section">
        <div className="section-label">{t('section.whyPhosnap')}</div>
        <h2 className="section-title">{t('forartists.whyTitle')}</h2>
        <p className="section-sub">{t('forartists.whySub')}</p>
        <div className="steps">
          {features.map((f) => (
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
          {steps.map((s) => (
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
        <p
          style={{
            fontFamily: 'var(--font-elegant)',
            fontStyle: 'italic',
            color: 'var(--muted)',
            fontSize: 18,
            marginBottom: 40,
          }}
        >
          {t('forartists.ctaSub')}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/waitlist')}>
            {t('forartists.ctaWaitlist')}
          </button>
          <button className="btn-outline" onClick={() => onAuthOpen('signup')}>
            {t('forartists.ctaSignup')}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ForArtists;
