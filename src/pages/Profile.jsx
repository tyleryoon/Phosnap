import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { ArrowLeftIcon, MapPinIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS, fmt } from '../data/photographers';

// ─── Photographer Profile Page ─────────────────────────────────────────

const Profile = ({ onAuthOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('portfolio');
  const [selectedPackage, setSelectedPackage] = useState(null);

  const p = PHOTOGRAPHERS.find(ph => ph.id === Number(id));

  if (!p) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 16 }}>
          {t('profile.notFound')}
        </div>
        <button className="btn-outline" onClick={() => navigate('/photographers')}>
          {t('profile.backToList')}
        </button>
      </div>
    );
  }

  // ── 언어별 데이터 ─────────────────────────────────────────────────────
  // 이름: KO → 한국어명, 그 외 → 영문명
  const displayName    = lang === 'ko' && p.nameKo ? p.nameKo   : p.name;
  // 부제목 이름 (KO일 땐 영문, 그 외엔 한국어 병기 생략)
  const subName        = lang === 'ko' ? p.name : (p.nameKo ?? null);
  // Bio: 언어별 번역, 없으면 한국어 원문
  const bio            = p.bioI18n?.[lang] ?? p.bio;
  // 지역명
  const locationLabel  = p.locationNames?.[lang] ?? p.location;

  const pkg = p.packages.find(pk => pk.popular) || p.packages[0];
  const initPackage = selectedPackage ?? pkg.name;

  const tabs = [
    { id: 'portfolio', label: t('profile.tabPortfolio') },
    { id: 'packages',  label: t('profile.tabPackages') },
    { id: 'reviews',   label: `${t('profile.tabReviews')} (${p.reviews})` },
    { id: 'schedule',  label: t('profile.tabSchedule') },
  ];

  return (
    <div className="page-enter" style={{ paddingTop: 80 }}>
      <div className="section" style={{ paddingTop: 40 }}>

        {/* Back button */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftIcon /> {t('profile.backBtn')}
        </button>

        {/* Profile hero */}
        <div className="profile-hero">
          {/* Left: photo */}
          <div className="profile-photo">
            <Corners />
            <div className="profile-photo-inner" style={{ backgroundImage: `url(${p.img})` }} />
          </div>

          {/* Right: info */}
          <div className="profile-info">
            <div className="profile-name">{displayName}</div>
            {subName && (
              <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>
                {subName}
              </div>
            )}
            <div className="profile-location">
              <MapPinIcon /> {locationLabel}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {p.tags.map(tagKey => (
                <span key={tagKey} className="tag">{t(`tags.${tagKey}`)}</span>
              ))}
              {p.hmk && <span className="tag gold">{t('tags.hmk')}</span>}
            </div>

            {/* Languages */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {p.languages.map(l => <span key={l} className="lang-chip">{l}</span>)}
            </div>

            {/* Bio */}
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>{bio}</p>

            {/* Meta stats */}
            <div className="profile-meta">
              <div className="meta-item">
                <div className="meta-val">★ {p.rating}</div>
                <div className="meta-label">{t('profile.rating')}</div>
              </div>
              <div className="meta-item">
                <div className="meta-val">{p.reviews}</div>
                <div className="meta-label">{t('profile.reviews')}</div>
              </div>
              <div className="meta-item">
                <div className="meta-val">₩{fmt(p.price)}~</div>
                <div className="meta-label">{t('profile.startingPrice')}</div>
              </div>
            </div>

            {/* Props */}
            {p.props && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('profile.props')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(p.propsI18n?.[lang] ?? p.props).map(prop => <span key={prop} className="tag">{prop}</span>)}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate(`/booking/${p.id}`)}
            >
              {t('profile.book')}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="tab-nav" style={{ marginTop: 64 }}>
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={`tab-btn ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {tab === 'portfolio' && (
          <div className="gallery-grid">
            {p.portfolio.map((img, i) => (
              <div key={i} className="gallery-item">
                <div className="gallery-item-inner" style={{ backgroundImage: `url(${img})` }} />
              </div>
            ))}
          </div>
        )}

        {/* Packages tab */}
        {tab === 'packages' && (
          <div className="packages">
            {p.packages.map(pkg => (
              <div
                key={pkg.name}
                className={`package ${pkg.popular ? 'recommended' : ''} ${initPackage === pkg.name ? 'selected' : ''}`}
                onClick={() => setSelectedPackage(pkg.name)}
              >
                <Corners />
                <div className="package-name">{pkg.name}</div>
                <div className="package-price">₩{fmt(pkg.price)}<span>/ session</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {pkg.hours}{t('profile.hours')} · {pkg.photos}{t('profile.photos')}
                </div>
                <div className="package-desc">{pkg.descI18n?.[lang] ?? pkg.desc}</div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 20, fontSize: 10 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/booking/${p.id}`); }}
                >
                  {t('profile.bookPackage')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reviews tab */}
        {tab === 'reviews' && (
          <div className="reviews">
            {p.reviewList.map((r, i) => (
              <div key={i} className="review">
                <div className="review-stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                <div className="review-text">"{r.text}"</div>
                <div className="review-author">{r.author}</div>
                <div className="review-date">{r.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule tab */}
        {tab === 'schedule' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
              {t('profile.scheduleTitle')}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
              {t('profile.scheduleSub')}
            </p>
            <button className="btn-primary" onClick={() => navigate(`/booking/${p.id}`)}>
              {t('profile.scheduleBtn')}
            </button>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
};

export default Profile;
