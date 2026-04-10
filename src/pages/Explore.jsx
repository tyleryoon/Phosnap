import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { LOCATIONS_DOMESTIC, LOCATIONS_OVERSEAS } from '../data/locations';

// ─── Explore Page ──────────────────────────────────────────────────────

const Explore = () => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('domestic');
  const locs = tab === 'domestic' ? LOCATIONS_DOMESTIC : LOCATIONS_OVERSEAS;

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        <div className="section-label">Explore</div>
        <h2 className="section-title">{t('explore.title')}</h2>
        <p className="section-sub">{t('explore.sub')}</p>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          <button
            className={`filter-btn ${tab === 'domestic' ? 'active' : ''}`}
            onClick={() => setTab('domestic')}
          >
            {t('explore.domestic')}
          </button>
          <button
            className={`filter-btn ${tab === 'overseas' ? 'active' : ''}`}
            onClick={() => setTab('overseas')}
          >
            {t('explore.overseas')}
          </button>
        </div>

        {/* Location grid */}
        <div className="location-grid">
          {locs.map(loc => {
            const displayName = loc.nameI18n?.[lang] ?? loc.nameEn;
            // 한국어일 때는 한국어 이름만, 그 외엔 영문명 + 현지명 병기
            const subName = lang === 'ko' ? loc.nameEn : (lang !== 'en' ? loc.nameEn : null);

            return (
              <div
                key={loc.id}
                className="location-card"
                onClick={() => navigate('/photographers')}
              >
                <div className="location-img">
                  <div
                    className="location-img-inner"
                    style={{ backgroundImage: `url(${loc.img})` }}
                  />
                </div>
                <div className="location-overlay">
                  <div className="location-name">{displayName}</div>
                  {subName && (
                    <div style={{ fontSize: 11, color: 'rgba(242,242,242,0.55)', marginBottom: 2, letterSpacing: '0.05em' }}>
                      {subName}
                    </div>
                  )}
                  <div className="location-count">{loc.count}{t('explore.artistCount')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Explore;
