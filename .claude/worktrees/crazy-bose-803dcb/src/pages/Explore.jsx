import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { getDomesticLocations, getOverseasLocations, refreshRegistryFromDB } from '../data/locationUtils';
import { ExploreSEO } from '../components/SEO';

// ─── Explore Page ──────────────────────────────────────────────────────
// 작가 데이터에서 동적 파생 — 새 작가가 새 지역으로 등록되면 자동 반영

const Explore = () => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('domestic');

  // TASK 1C: 마운트 시 DB에서 지역 레지스트리 새로고침
  useEffect(() => {
    refreshRegistryFromDB().catch(() => {});
  }, []);

  const domestic = getDomesticLocations();
  const overseas = getOverseasLocations();
  const locs = tab === 'domestic' ? domestic : overseas;

  const handleLocationClick = (locId) => {
    // 작가 목록 페이지로 이동 + 해당 지역 필터 적용
    navigate('/photographers', { state: { locationId: locId } });
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <ExploreSEO lang={lang} />
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
            const displayName = loc.nameI18n?.[lang] ?? loc.en;
            const subName = lang === 'ko' ? loc.en : (lang !== 'en' ? loc.en : null);

            return (
              <div
                key={loc.id}
                className="location-card"
                onClick={() => handleLocationClick(loc.id)}
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

        {/* 지역이 없을 때 */}
        {locs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em' }}>
              {t('explore.noLocations') || '등록된 지역이 없습니다'}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Explore;
