import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import PhotographerCard from '../components/PhotographerCard';
import WorldMap from '../components/WorldMap';
import Footer from '../components/Footer';
import { SearchIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { submitWaitlist } from '../lib/waitlist';
import { PHOTOGRAPHERS } from '../data/photographers';
import { getMergedProfile } from '../data/artistProfile';
import { getAllLocationsSorted } from '../data/locationUtils';
import { HomeSEO } from '../components/SEO';
import { fetchFeaturedPhotographers } from '../lib/supabase';
import CarbonFootprint from '../components/CarbonFootprint';

// ─── Instagram 피드 미리보기 이미지 (포트폴리오에서 큐레이션) ──────────
const INSTA_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80',
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80',
  'https://images.unsplash.com/photo-1537907510278-e4d87a5f79ab?w=400&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=400&q=80',
];

// ─── Instagram 섹션 ────────────────────────────────────────────────────
const InstagramSection = () => {
  const { t } = useLanguage();
  return (
    <div className="section-pad-hero" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
      <div className="section-label">{t('home.instagramLabel')}</div>
      <h2 className="section-title" style={{ fontSize: 'clamp(22px, 3.5vw, 36px)' }}>
        {t('home.instagramTitle')}
      </h2>
      <p className="section-sub">{t('home.instagramSub')}</p>

      {/* 피드 그리드 */}
      <div className="instagram-grid">
        {INSTA_IMAGES.map((src, i) => (
          <a
            key={i}
            href="https://instagram.com/phosnap.kr"
            target="_blank"
            rel="noreferrer"
            style={{
              aspectRatio: '1 / 1',
              display: 'block',
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--bg3)',
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'transform 0.5s ease, filter 0.4s ease',
              filter: 'brightness(0.82)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.filter = 'brightness(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(0.82)'; }}
            />
            {/* Instagram hover overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0)',
              transition: 'background 0.3s',
              color: 'transparent',
              fontSize: 20,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.color = 'transparent'; }}
            >
              ♥
            </div>
          </a>
        ))}
      </div>

      <a href="https://instagram.com/phosnap.kr" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
        <button className="btn-outline" style={{ fontSize: '12px', letterSpacing: '0.12em', padding: '14px 32px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {/* Instagram icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
          {t('home.instagramCta')}
        </button>
      </a>
    </div>
  );
};

// ─── Waitlist Section ──────────────────────────────────────────────────
const WaitlistSection = () => {
  const [email, setEmail]   = useState('');
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await submitWaitlist({ email, role: 'customer' });
      setDone(true);
    } catch {
      setDone(true); // 폼은 닫되 에러는 조용히 처리
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waitlist-section">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(232,160,32,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div className="waitlist-inner">
        <div className="section-label">{t('section.earlyAccess')}</div>
        <h2 className="section-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px,4vw,40px)', letterSpacing: '0.05em' }}>
          {t('home.waitlistTitle')}
        </h2>
        <p style={{ fontFamily: 'var(--font-elegant)', fontStyle: 'italic', color: 'var(--muted)', fontSize: 18, marginTop: 8 }}>
          {t('home.waitlistSub')}
        </p>
        {done ? (
          <div style={{ marginTop: 32, padding: '20px 32px', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em' }}>
            {t('home.waitlistDone')}
          </div>
        ) : (
          <form className="waitlist-form" onSubmit={handleSubmit}>
            <input
              className="waitlist-input"
              type="email"
              placeholder={t('home.waitlistPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? '···' : t('home.waitlistBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Home Page ─────────────────────────────────────────────────────────
const Home = ({ onAuthOpen }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { t, lang } = useLanguage();
  const featuredLocations = getAllLocationsSorted().slice(0, 8);

  // Fetch featured photographers from DB with fallback to mock
  const [featuredPhotographers, setFeaturedPhotographers] = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      setFeaturedLoading(true);
      const { data } = await fetchFeaturedPhotographers(6);
      if (data && data.length > 0) {
        setFeaturedPhotographers(data);
      }
      setFeaturedLoading(false);
    };
    fetchFeatured();
  }, []);

  const steps = [
    { n: '01', titleKey: 'home.step1Title', descKey: 'home.step1Desc' },
    { n: '02', titleKey: 'home.step2Title', descKey: 'home.step2Desc' },
    { n: '03', titleKey: 'home.step3Title', descKey: 'home.step3Desc' },
    { n: '04', titleKey: 'home.step4Title', descKey: 'home.step4Desc' },
  ];

  return (
    <div className="page-enter">
      <HomeSEO lang={lang} />

      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-eyebrow">{t('hero.eyebrow')}</div>
        <h1 className="hero-title">
          Light captured.<br />Moments made.
        </h1>
        <p className="hero-subtitle">{t('hero.subtitle')}</p>

        {/* Search box */}
        <div className="search-box">
          <Corners />
          <input
            className="search-input"
            placeholder={t('hero.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && query.trim() && navigate('/photographers', { state: { searchQuery: query.trim() } })}
          />
          <button className="search-btn" onClick={() => query.trim() && navigate('/photographers', { state: { searchQuery: query.trim() } })}>
            <SearchIcon />
          </button>
          <div className="search-tags">
            {(t('hero.searchTags') || ['Seoul','Kyoto','Paris','Jeju','Bali','Tokyo']).map(loc => (
              <span key={loc} className="search-tag" onClick={() => navigate('/photographers', { state: { searchQuery: loc } })}>
                {loc}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-ctas">
          <button className="btn-primary" style={{ fontSize: '14px', padding: '16px 36px', letterSpacing: '0.12em' }} onClick={() => navigate('/photographers')}>
            {t('hero.ctaPrimary')}
          </button>
          <button className="btn-outline" style={{ fontSize: '14px', padding: '15px 36px', letterSpacing: '0.12em' }} onClick={() => onAuthOpen('signup')}>
            {t('hero.ctaSecondary')}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="stats-bar" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {[
          { num: '2,400+', labelKey: 'stats.photographers' },
          { num: '48',     labelKey: 'stats.cities' },
          { num: '18,000+', labelKey: 'stats.sessions' },
          { num: '4.93',   labelKey: 'stats.rating' },
        ].map(s => (
          <div key={s.labelKey} className="stat-item">
            <span className="stat-num">{s.num}</span>
            <span className="stat-label">{t(s.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* ── World Map ── */}
      <div className="section">
        <div className="section-label">
          {lang === 'ko' ? '세계 곳곳에서' : lang === 'ja' ? '世界中で' : 'WORLDWIDE'}
        </div>
        <h2 className="section-title" style={{ fontSize: 'clamp(20px, 3vw, 32px)' }}>
          {lang === 'ko' ? '당신이 어디에 있든, 작가가 기다립니다' :
           lang === 'ja' ? 'どこにいても、フォトグラファーがお待ちしています' :
           'Wherever you are, a photographer awaits'}
        </h2>
        <p className="section-sub">
          {lang === 'ko' ? '지도에서 도시를 클릭하면 해당 지역의 작가를 바로 만나보실 수 있습니다.' :
           lang === 'ja' ? '地図上の都市をクリックすると、その地域のフォトグラファーをご覧いただけます。' :
           'Click a city on the map to discover photographers in that area.'}
        </p>
        <WorldMap />
      </div>

      <div className="divider" />

      {/* ── Explore by Location ── */}
      <div className="section">
        <div className="section-label">{t('section.discover')}</div>
        <h2 className="section-title">{t('home.discoverTitle')}</h2>
        <p className="section-sub">{t('home.discoverSub')}</p>

        <div className="location-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {featuredLocations.map(loc => (
            <div key={loc.id} className="location-card" onClick={() => navigate('/photographers', { state: { locationId: loc.id } })}>
              <div className="location-img">
                <div className="location-img-inner" style={{ backgroundImage: `url(${loc.img})` }} />
              </div>
              <div className="location-overlay">
                <div className="location-name">{loc.nameI18n?.[lang] ?? loc.en}</div>
                <div className="location-count">{loc.count}{t('home.locationCount')}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button className="btn-outline" onClick={() => navigate('/explore')}>{t('home.seeAllLocations')}</button>
        </div>
      </div>

      <div className="divider" />

      {/* ── Featured Photographers ── */}
      <div className="section">
        <div className="section-label">{t('section.featured')}</div>
        <h2 className="section-title">{t('home.featuredTitle')}</h2>
        <p className="section-sub">{t('home.featuredSub')}</p>
        <div className="photo-grid">
          {featuredLoading ? (
            // Loading skeleton: 6 placeholder cards
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                style={{
                  aspectRatio: '1 / 1.2',
                  background: 'var(--bg2)',
                  borderRadius: 8,
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))
          ) : (featuredPhotographers && featuredPhotographers.length > 0) ? (
            featuredPhotographers.map(p => (
              <PhotographerCard key={p.id} p={p} />
            ))
          ) : (
            // mock 폴백 제거: 등록된 작가가 없으면 빈 상태를 정직하게 보여준다.
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
                아직 등록된 작가가 없습니다
              </div>
              <div style={{ fontSize: 13 }}>곧 멋진 작가들을 만나보실 수 있습니다.</div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="btn-outline" onClick={() => navigate('/photographers')}>{t('home.seeAllPhotographers')}</button>
        </div>
      </div>

      <div className="divider" />

      {/* ── How it works ── */}
      <div className="section">
        <div className="section-label">{t('section.process')}</div>
        <h2 className="section-title">{t('home.howTitle')}</h2>
        <p className="section-sub">{t('home.howSub')}</p>
        <div className="steps">
          {steps.map(s => (
            <div key={s.n} className="step">
              <Corners />
              <div className="step-num">{s.n}</div>
              <div className="step-title">{t(s.titleKey)}</div>
              <p className="step-desc">{t(s.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── For Photographers CTA ── */}
      <div className="section-pad-hero">
        <div className="section-label">{t('section.forArtists')}</div>
        <h2 className="section-title">{t('home.forArtistLabel')}</h2>
        <p className="section-sub">{t('home.forArtistSub')}</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => onAuthOpen('signup')}>{t('home.joinArtist')}</button>
          <button className="btn-outline" onClick={() => navigate('/for-artists')}>{t('home.learnMore')}</button>
        </div>
      </div>

      {/* ── Instagram ── */}
      <InstagramSection />

      {/* ── Waitlist ── */}
      <WaitlistSection />

      {/* ── ESG 환경 기여 ── */}
      <div className="section">
        <CarbonFootprint mode="platform" allBookings={[]} />
      </div>

      <div className="divider" />

      <Footer />
    </div>
  );
};

export default Home;
